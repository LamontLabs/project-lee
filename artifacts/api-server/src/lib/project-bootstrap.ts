import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  eventLog,
  factLedger,
  graphEdge,
  graphNode,
  interpretationLedger,
  observation,
  provenanceRecord,
  sourceVault,
  universalObject,
  bootstrapRun,
} from "@workspace/db";
import type { DevelopmentProvider } from "./provider-abstraction";
import { emitEvent } from "./foundation-events";

export type RepositoryFile = {
  path: string;
  size: number;
  lines: number;
  content?: string;
  contentExcluded?: boolean;
};

export type RepositorySnapshot = {
  repositoryId: string;
  root: string;
  files: RepositoryFile[];
};

const ignoredDirectories = new Set(["node_modules", ".git", "dist", "build", ".next", ".expo", "coverage"]);
const secretSegment = /^(?:\.env(?:\..*)?|.*(?:secret|credential|token|private[_-]?key).*)$/i;

function isSafeTextFile(filePath: string, size: number) {
  if (size > 200_000 || filePath.split("/").some((segment) => secretSegment.test(segment))) return false;
  return true;
}

async function walk(root: string, current = root, output: RepositoryFile[] = []): Promise<RepositoryFile[]> {
  for (const item of await fs.readdir(current, { withFileTypes: true })) {
    const full = path.join(current, item.name);
    const relative = path.relative(root, full).split(path.sep).join("/");
    if (item.isDirectory()) {
      if (!ignoredDirectories.has(item.name)) await walk(root, full, output);
      continue;
    }

    const stat = await fs.stat(full);
    if (!isSafeTextFile(relative, stat.size)) {
      output.push({ path: relative, size: stat.size, lines: 0, contentExcluded: true });
      continue;
    }
    const buffer = await fs.readFile(full);
    const content = buffer.toString("utf8");
    output.push({ path: relative, size: buffer.length, lines: content.split("\n").length, content });
  }
  return output.sort((left, right) => left.path.localeCompare(right.path));
}

export function createFilesystemDevelopmentProvider(root: string): Pick<DevelopmentProvider, "inspectRepository"> {
  return {
    async inspectRepository(repositoryId: string) {
      return { repositoryId, root, files: await walk(root) };
    },
  };
}

function stack(files: RepositoryFile[]) {
  const pkg = files.find((file) => file.path === "package.json");
  let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; engines?: { node?: string } } = {};
  try {
    parsed = pkg?.content ? JSON.parse(pkg.content) : {};
  } catch {
    parsed = {};
  }
  const dependencies = Object.entries({ ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) }).map(([name, version]) => ({
    name,
    version,
    category: /react|vite|expo|next/.test(name) ? "framework" : /drizzle|pg|prisma|sql/.test(name) ? "database" : /test|vitest|jest|playwright/.test(name) ? "testing" : "library",
  }));
  return {
    languages: files.map((file) => path.extname(file.path)).filter(Boolean).reduce<Record<string, number>>((acc, ext) => {
      acc[ext] = (acc[ext] ?? 0) + 1;
      return acc;
    }, {}),
    frameworks: dependencies.filter((item) => item.category === "framework").map((item) => item.name),
    runtime: parsed.engines?.node ?? null,
    packageManager: files.some((file) => file.path === "pnpm-lock.yaml") ? "pnpm" : files.some((file) => file.path === "package-lock.json") ? "npm" : null,
    dependenciesCount: Object.keys(parsed.dependencies ?? {}).length,
    devDependenciesCount: Object.keys(parsed.devDependencies ?? {}).length,
    dependencies,
  };
}

function redact(text: string) {
  return text.replace(/((?:api[_-]?key|password|secret|token|private[_-]?key)\s*[:=]\s*["']?)[^"'\s,}]+/gi, "$1[REDACTED]");
}

const contractFields = ["identity", "runtime", "health", "capabilities", "requestSchemas", "responseSchemas", "events", "permissions", "risk", "governance", "humanConfirmation", "economics", "dependencies"];

function systemContract(files: RepositoryFile[]) {
  const contract = files.find((file) => /(^|\/)(?:lee[-_.]?system[-_.]?contract|system[-_.]?contract|lee[-_.]?contract)\.json$/i.test(file.path));
  if (!contract?.content) return { present: false, file: null, missing: contractFields };
  try {
    const parsed = JSON.parse(contract.content) as Record<string, unknown>;
    return {
      present: true,
      file: contract.path,
      missing: contractFields.filter((field) => parsed[field] === undefined),
      contract: Object.fromEntries(contractFields.filter((field) => parsed[field] !== undefined).map((field) => [field, JSON.parse(redact(JSON.stringify(parsed[field])))])),
    };
  } catch {
    return { present: false, file: contract.path, missing: [...contractFields, "valid JSON"] };
  }
}

function analyze(snapshot: RepositorySnapshot) {
  const files = snapshot.files;
  const readme = files.find((file) => /^README(?:\.md)?$/i.test(path.basename(file.path)));
  const docs = files.filter((file) => /(^|\/)(docs?|documentation)\//i.test(file.path) || /^(README|CONTRIBUTING|CHANGELOG|LICENSE)/i.test(path.basename(file.path))).map((file) => file.path);
  const configs = files.filter((file) => /(^|\/)(\.env(?:\..*)?|Dockerfile|docker-compose|replit|drizzle|openapi|swagger|prisma|\.github\/workflows)/i.test(file.path)).map((file) => file.path);
  const apiFiles = files.filter((file) => /routes|openapi|swagger|api\//i.test(file.path)).map((file) => file.path);
  const topDirectories = [...new Set(files.map((file) => file.path.split("/")[0]))];
  const excludedSecrets = files.filter((file) => file.contentExcluded).map((file) => file.path);
  const securityIssues = excludedSecrets.map((file) => `Secret-bearing path excluded from content inspection: ${file}`);
  const issues = [
    ...(docs.some((file) => /CHANGELOG/i.test(file)) ? [] : ["No CHANGELOG found"]),
    ...(readme?.content?.match(/architecture/i) ? [] : ["README is missing an Architecture section"]),
  ];
  const questions = readme
    ? ["Is this repository primarily for external customers or internal use?"]
    : ["What is the intended purpose of this repository?"];
  return {
    evidenceManifest: files.map(({ path: filePath, size, lines, contentExcluded }) => ({ path: filePath, size, lines, contentExcluded: Boolean(contentExcluded) })),
    technologyStack: stack(files),
    systemContract: systemContract(files),
    repositoryMap: {
      totalFiles: files.length,
      totalLines: files.reduce((sum, file) => sum + file.lines, 0),
      topDirectories,
      filesByExtension: stack(files).languages,
    },
    projectSummary: {
      content: readme?.content ? redact(readme.content).slice(0, 2000) : "No README found.",
      sourceRefs: readme ? [readme.path] : [],
      confidence: readme ? 0.7 : 0.3,
    },
    architecture: {
      layers: topDirectories.filter((name) => /src|app|server|client|lib|db|worker|api|test/i.test(name)),
      configurationFiles: configs,
      apiFiles,
    },
    documentation: {
      files: docs,
      missing: issues.filter((issue) => /README|CHANGELOG/.test(issue)),
    },
    configuration: configs,
    securityObservations: securityIssues,
    issues: [...issues, ...securityIssues],
    questions,
  };
}

export async function runBootstrap(
  projectId: string,
  repositoryId: string,
  provider: Pick<DevelopmentProvider, "inspectRepository"> = createFilesystemDevelopmentProvider(process.env.LEE_BOOTSTRAP_ROOT ?? process.cwd()),
) {
  const [run] = await db.insert(bootstrapRun).values({ projectId, repositoryId }).returning();
  try {
    if (!provider.inspectRepository) throw new Error("DevelopmentProvider does not support repository inspection.");
    const snapshot = await provider.inspectRepository(repositoryId);
    const report = analyze(snapshot);
    const manifest = JSON.stringify({ repositoryId, files: report.evidenceManifest });
    const manifestValues = {
      originalFilename: `${repositoryId}-bootstrap-manifest.json`,
      mimeType: "application/vnd.lee.repository-manifest+json",
      byteSize: Buffer.byteLength(manifest),
      checksum: createHash("sha256").update(manifest).digest("hex"),
      storagePath: `bootstrap/${run.id}/manifest.json`,
      processingStatus: "completed",
      evidenceQuality: 0.95,
      metadata: { repositoryId, bootstrapRunId: run.id, provider: "DevelopmentProvider", manifest: report.evidenceManifest },
      rawContent: null,
      importedFrom: { provider: "DevelopmentProvider", repositoryId },
      createdBy: "Project Bootstrap",
    };
    const [insertedSource] = await db.insert(sourceVault).values(manifestValues).onConflictDoNothing({ target: sourceVault.checksum }).returning();
    const source = insertedSource ?? (await db.select().from(sourceVault).where(eq(sourceVault.checksum, manifestValues.checksum)).limit(1))[0];
    if (!source) throw new Error("Bootstrap evidence manifest could not be persisted.");

    const factInputs = [
      ["repository", "file_count", String(report.repositoryMap.totalFiles)],
      ["repository", "technology_stack", JSON.stringify(report.technologyStack.frameworks)],
      ["repository", "configuration_files", JSON.stringify(report.configuration)],
      ["repository", "api_files", JSON.stringify(report.architecture.apiFiles)],
      ["repository", "documentation_files", JSON.stringify(report.documentation.files)],
      ["repository", "system_contract", JSON.stringify(report.systemContract)],
    ] as const;
    const facts = await db.insert(factLedger).values(factInputs.map(([subject, predicate, object]) => ({
      subject,
      predicate,
      object,
      sourceRef: source.id,
      sourceEvidence: [source.id],
      factType: "observed",
      confidence: 0.9,
      canonLevel: "candidate",
      observedAt: new Date(),
      createdBy: "Project Bootstrap",
      importedFrom: { provider: "DevelopmentProvider", repositoryId, bootstrapRunId: run.id },
    }))).returning();
    const whyChain = [
      { step_type: "repository_manifest", statement: "The repository manifest was collected by DevelopmentProvider.", evidence_id: source.id, confidence: 0.95, engine_name: "Project Bootstrap" },
      { step_type: "static_inventory", statement: "The inventory was derived without executing repository code.", evidence_id: facts[0].id, confidence: 0.9, engine_name: "Project Bootstrap" },
    ];
    const [interpretation] = await db.insert(interpretationLedger).values({
      statement: `The repository has ${report.repositoryMap.totalFiles} inventoried files and requires owner review of ${report.questions.length} unresolved question(s).`,
      basis: "Static repository inventory",
      sourceRef: source.id,
      interpretationType: "inference",
      inputFacts: facts.map((fact) => fact.id),
      generatedByEngine: "Project Bootstrap",
      generatedBy: { engineId: "Project Bootstrap", runType: "static_inventory" },
      confidence: 0.75,
      whyChain,
      canonLevel: "working",
      validFrom: new Date(),
      createdBy: "Project Bootstrap",
    }).returning();
    await db.insert(provenanceRecord).values([
      ...facts.map((fact) => ({ runId: run.id, recordType: "fact", recordId: fact.id, sourceRef: source.id, excerpt: `Static metadata for ${fact.predicate}`, confidence: fact.confidence })),
      { runId: run.id, recordType: "interpretation", recordId: interpretation.id, sourceRef: source.id, excerpt: "Bootstrap interpretation from source-backed facts.", confidence: interpretation.confidence },
    ]);

    const [project] = await db.insert(universalObject).values({
      objectType: "project",
      name: repositoryId,
      description: "Project created from a DevelopmentProvider repository inventory.",
      confidence: 0.8,
      sourceRefs: [source.id],
      importedFrom: { provider: "DevelopmentProvider", repositoryId },
      createdBy: "Project Bootstrap",
    }).returning();
    const [insertedSourceNode] = await db.insert(graphNode).values({
      objectType: "source",
      objectId: source.id,
      label: `${repositoryId} evidence manifest`,
      metadata: { sourceRefs: [source.id], bootstrapRunId: run.id },
      importedFrom: { provider: "DevelopmentProvider", repositoryId },
      createdBy: "Project Bootstrap",
    }).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
    const sourceNode = insertedSourceNode ?? (await db.select().from(graphNode).where(and(eq(graphNode.objectType, "source"), eq(graphNode.objectId, source.id))).limit(1))[0];
    if (!sourceNode) throw new Error("Bootstrap source graph node could not be persisted.");
    const [projectNode] = await db.insert(graphNode).values({
      objectType: "project",
      objectId: project.id,
      label: repositoryId,
      metadata: { bootstrapRunId: run.id },
      importedFrom: { provider: "DevelopmentProvider", repositoryId },
      createdBy: "Project Bootstrap",
    }).returning();
    await db.insert(graphEdge).values({
      sourceNodeId: sourceNode.id,
      targetNodeId: projectNode.id,
      edgeType: "SOURCE_DESCRIBES_PROJECT",
      confidence: 0.95,
      weight: 1,
      freshnessScore: 1,
      sourceRef: source.id,
      metadata: { bootstrapRunId: run.id },
    }).onConflictDoNothing();
    const [notableObservation] = await db.insert(observation).values({
      observationType: "project_bootstrap",
      headline: `Bootstrap inventoried ${report.repositoryMap.totalFiles} files for ${repositoryId}.`,
      supportingEvidence: [source.id],
      affectedObjects: [project.id],
      confidence: "high",
      confidenceLineage: [{ source: source.id, confidence: 0.95 }],
      whyChain,
      relevanceScore: 0.8,
    }).returning();

    await Promise.all([
      emitEvent({ eventType: "SourceVaultRecordCreated", aggregateType: "source_vault", aggregateId: source.id, sourceRef: source.id, payload: { sourceId: source.id, repositoryId, bootstrapRunId: run.id } }),
      emitEvent({ eventType: "UniversalObjectCreated", aggregateType: "universal_object", aggregateId: project.id, sourceRef: source.id, payload: { objectId: project.id, objectType: "project", name: repositoryId, bootstrapRunId: run.id } }),
      emitEvent({ eventType: "FactCreated", aggregateType: "bootstrap_run", aggregateId: run.id, sourceRef: source.id, payload: { factIds: facts.map((fact) => fact.id), sourceId: source.id } }),
      emitEvent({ eventType: "InterpretationCreated", aggregateType: "bootstrap_run", aggregateId: run.id, sourceRef: source.id, payload: { interpretationId: interpretation.id, inputFacts: facts.map((fact) => fact.id) } }),
    ]);

    const [completed] = await db.update(bootstrapRun).set({
      status: "completed",
      completedAt: new Date(),
      factsCreatedCount: facts.length,
      interpretationsCreatedCount: 1,
      graphNodesCreatedCount: 2,
      relationshipsDetected: 1,
      questionsGenerated: report.questions.length,
      issuesFlagged: report.issues.length,
      report: { ...report, sourceId: source.id, projectObjectId: project.id, observationId: notableObservation.id, factIds: facts.map((fact) => fact.id), interpretationId: interpretation.id },
    }).where(eq(bootstrapRun.id, run.id)).returning();
    await emitEvent({ eventType: "BootstrapCompleted", aggregateType: "bootstrap_run", aggregateId: run.id, payload: { projectId, repositoryId, factsCreatedCount: completed.factsCreatedCount, issuesFlagged: completed.issuesFlagged } });
    return completed;
  } catch (error) {
    const [failed] = await db.update(bootstrapRun).set({ status: "failed", completedAt: new Date(), error: String(error) }).where(eq(bootstrapRun.id, run.id)).returning();
    return failed;
  }
}

export async function bootstrapStatus(id: string) {
  const [run] = await db.select().from(bootstrapRun).where(eq(bootstrapRun.id, id));
  return run ?? null;
}

export async function bootstrapHistory(projectId?: string) {
  return db.select().from(bootstrapRun).where(projectId ? eq(bootstrapRun.projectId, projectId) : undefined as any).orderBy(desc(bootstrapRun.startedAt)).limit(50);
}