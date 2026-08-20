import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db, factLedger, graphEdge, graphNode, interpretationLedger, observation, provenanceRecord, sourceVault, universalObject } from "@workspace/db";
import { bootstrapStatus, createFilesystemDevelopmentProvider, runBootstrap } from "../src/lib/project-bootstrap";
import { queryTimeline } from "../src/lib/timeline";

const leakedSecret = "BOOTSTRAP_SHOULD_NEVER_PERSIST_THIS_VALUE";

test("Project Bootstrap inventories a real repository through DevelopmentProvider without reading secrets", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "lee-bootstrap-"));
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "docs"), { recursive: true });
    await mkdir(path.join(root, ".secrets"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Controlled Project\n\nArchitecture is split into src and API routes.\n");
    await writeFile(path.join(root, "package.json"), JSON.stringify({ engines: { node: ">=20" }, dependencies: { react: "^19.0.0", "drizzle-orm": "^0.40.0" }, devDependencies: { vitest: "^3.0.0" } }));
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    await writeFile(path.join(root, "lee.system.contract.json"), JSON.stringify({
      identity: { name: "Controlled Project", version: "1.0.0" },
      runtime: { type: "node" },
      health: { endpoint: "/health" },
      capabilities: ["status.read"],
      requestSchemas: { "status.read": {} },
      responseSchemas: { "status.read": {} },
      events: ["StatusChanged"],
      permissions: { "status.read": "observe" },
      risk: { "status.read": "low" },
      governance: { "status.read": "none" },
      humanConfirmation: { "status.read": false },
      economics: { estimatedCostUsd: 0 },
      dependencies: ["postgres"],
    }));
    await writeFile(path.join(root, "src", "index.ts"), "export const answer = 42;\n");
    await writeFile(path.join(root, "docs", "architecture.md"), "The API is read-only during bootstrap.\n");
    await writeFile(path.join(root, ".env"), `DATABASE_URL=${leakedSecret}\n`);
    await writeFile(path.join(root, "src", "credentials.txt"), leakedSecret);
    await writeFile(path.join(root, ".secrets", "api-key.txt"), leakedSecret);

    const repositoryId = `controlled-repository-${randomUUID()}`;
    const provider = createFilesystemDevelopmentProvider(root);
    const snapshot = await provider.inspectRepository!(repositoryId);
    const excluded = snapshot.files.filter((file) => file.contentExcluded);
    assert.ok(excluded.some((file) => file.path === ".env"));
    assert.ok(excluded.some((file) => file.path === "src/credentials.txt"));
    assert.ok(excluded.some((file) => file.path === ".secrets/api-key.txt"));
    assert.ok(excluded.every((file) => file.content === undefined));

    const run = await runBootstrap("bootstrap-test-project", repositoryId, provider);
    assert.equal(run.status, "completed");
    assert.equal(run.factsCreatedCount, 6);
    assert.equal(run.interpretationsCreatedCount, 1);
    assert.equal(run.graphNodesCreatedCount, 2);
    assert.equal(run.relationshipsDetected, 1);
    assert.ok(run.questionsGenerated >= 1);

    const reportText = JSON.stringify(run.report);
    assert.ok(!reportText.includes(leakedSecret));
    assert.ok(Array.isArray(run.report.evidenceManifest));
    assert.ok((run.report as any).technologyStack.frameworks.includes("react"));
    assert.equal((run.report as any).systemContract.present, true);
    assert.deepEqual((run.report as any).systemContract.missing, []);
    assert.equal((run.report as any).systemContract.contract.identity.name, "Controlled Project");
    assert.ok((run.report as any).configuration.includes(".env"));
    assert.ok((run.report as any).documentation.files.includes("docs/architecture.md"));
    assert.ok((run.report as any).questions.length > 0);

    const source = (await db.select().from(sourceVault).where(eq(sourceVault.id, (run.report as any).sourceId)))[0];
    assert.ok(source);
    assert.equal(source.rawContent, null);
    assert.ok(!JSON.stringify(source).includes(leakedSecret));
    const facts = await db.select().from(factLedger).where(eq(factLedger.sourceRef, source.id));
    const interpretations = await db.select().from(interpretationLedger).where(eq(interpretationLedger.sourceRef, source.id));
    const provenance = await db.select().from(provenanceRecord).where(eq(provenanceRecord.runId, run.id));
    const project = (await db.select().from(universalObject).where(eq(universalObject.id, (run.report as any).projectObjectId)))[0];
    const nodes = await db.select().from(graphNode).where(eq(graphNode.objectType, "project"));
    const edges = await db.select().from(graphEdge).where(eq(graphEdge.sourceRef, source.id));
    const observations = await db.select().from(observation).where(eq(observation.observationType, "project_bootstrap"));
    assert.equal(facts.length, 6);
    assert.equal(interpretations.length, 1);
    assert.equal(provenance.length, 7);
    assert.ok(project);
    assert.ok(nodes.some((node) => node.objectId === project.id));
    assert.ok(edges.length >= 1);
    assert.ok(observations.some((item) => item.supportingEvidence.includes(source.id)));
    assert.ok(!JSON.stringify({ facts, interpretations, project, observations }).includes(leakedSecret));

    const reloaded = await bootstrapStatus(run.id);
    assert.equal(reloaded?.status, "completed");
    const timeline = await queryTimeline({ search: "BootstrapCompleted", min: 0.8 });
    assert.ok(timeline.some((event) => event.aggregateId === run.id && event.timelineType === "project_bootstrapped"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});