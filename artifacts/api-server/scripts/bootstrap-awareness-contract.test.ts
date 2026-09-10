import assert from "node:assert/strict";
import test from "node:test";
import { desc, eq } from "drizzle-orm";
import { brainVersion, db, eventLog } from "@workspace/db";
import { getBootstrapAwareness } from "../src/lib/bootstrap-awareness";
import { ensureBootstrapObjective, getBootstrapObjective } from "../src/lib/executive-objectives";

const deliverySignals = [
  "LEE_BUILD_STATUS",
  "LEE_TEST_STATUS",
  "LEE_DEPLOYMENT_STATUS",
  "LEE_DESKTOP_RELEASE_STATUS",
] as const;

async function eventCount(eventType?: string) {
  const rows = eventType
    ? await db.select({ id: eventLog.id }).from(eventLog).where(eq(eventLog.eventType, eventType))
    : await db.select({ id: eventLog.id }).from(eventLog);
  return rows.length;
}

async function latestBrainMarker() {
  const [brain] = await db.select({
    id: brainVersion.id,
    versionName: brainVersion.versionName,
    checksum: brainVersion.checksum,
    status: brainVersion.status,
  }).from(brainVersion).orderBy(desc(brainVersion.createdAt)).limit(1);
  return brain ?? null;
}

function withMissingDeliverySignals<T>(work: () => Promise<T>) {
  const previous = Object.fromEntries(deliverySignals.map((name) => [name, process.env[name]]));
  for (const name of deliverySignals) delete process.env[name];
  return work().finally(() => {
    for (const name of deliverySignals) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
}

test("Bootstrap Awareness preserves canonical Brain and Event Log state during a read", async () => {
  const beforeBrain = await latestBrainMarker();
  const beforeEventCount = await eventCount();
  const beforeManifestEvents = await eventCount("ManifestGenerated");

  const awareness = await withMissingDeliverySignals(() => getBootstrapAwareness());

  const afterBrain = await latestBrainMarker();
  assert.deepEqual(afterBrain, beforeBrain, "awareness must not replace the canonical Brain version");
  assert.equal(await eventCount(), beforeEventCount, "awareness must not append to the canonical Event Log");
  assert.equal(await eventCount("ManifestGenerated"), beforeManifestEvents, "awareness must not create a ManifestGenerated history record");

  assert.equal(awareness.inspectionBoundary.readOnly, true);
  assert.equal(awareness.inspectionBoundary.canonicalBrainPreserved, true);
  assert.equal(awareness.inspectionBoundary.duplicateHistoryCreated, false);

  const systemItems = awareness.systems.items;
  const canonicalBrain = systemItems.find((item) => item.id === "canonical-brain");
  const eventLogItem = systemItems.find((item) => item.id === "event-log");
  assert.ok(canonicalBrain);
  assert.ok(eventLogItem);
  assert.ok(canonicalBrain.evidence.some((item) => item.source === "system_manifest.brainState"));
  assert.ok(eventLogItem.evidence.some((item) => item.source === "system_manifest.eventLog"));
  assert.equal(awareness.permissions.explicitlyDenied.includes("brain_migration"), true);
});

test("Bootstrap Awareness excludes project-bridge mutation operations", async () => {
  const previousProjects = process.env.MCP_PROJECTS_JSON;
  process.env.MCP_PROJECTS_JSON = JSON.stringify([{
    id: "bootstrap-awareness-fixture",
    name: "Bootstrap Awareness Fixture",
    endpoint: "https://project.example",
    capabilityLevel: "GOVERNED_MANAGE",
  }]);

  try {
    const awareness = await withMissingDeliverySignals(() => getBootstrapAwareness());
    const mutationOperations = new Set(["check", "preview", "apply", "restart"]);
    const registeredProjects = awareness.projectBridge.registeredProjects;

    const fixture = registeredProjects.find((project) => project.id === "bootstrap-awareness-fixture");
    assert.ok(fixture, "the configured project must remain registered alongside the canonical local self project");
    for (const project of registeredProjects) {
      assert.equal(
        [...mutationOperations].some((operation) => project.allowedOperations.includes(operation)),
        false,
        `project-bridge projection exposed a mutation operation for ${project.id}`,
      );
    }
    assert.equal(awareness.projectBridge.selfInspection.result?.project?.name, "Project LEE");
    assert.equal(awareness.projectBridge.selfInspection.result?.provenance?.readOnly, true);
    assert.deepEqual(awareness.projectBridge.localProject.readOnlyOperations, [
      "inspect", "search", "read", "dependencies", "logs", "contract", "deployment",
    ]);
    assert.deepEqual(awareness.projectBridge.localProject.mutationOperationsExcluded, [
      "preview", "apply", "restart", "check",
    ]);
    assert.equal(awareness.projectBridge.authority, "OBSERVE");
  } finally {
    if (previousProjects === undefined) delete process.env.MCP_PROJECTS_JSON;
    else process.env.MCP_PROJECTS_JSON = previousProjects;
  }
});

test("Bootstrap Awareness reports absent delivery signals as unverified", async () => {
  const awareness = await withMissingDeliverySignals(() => getBootstrapAwareness());

  for (const key of ["build", "tests", "deployment", "packaging"] as const) {
    assert.equal(awareness.delivery[key].status, "unverified", `${key} must remain unverified without a pipeline signal`);
    assert.match(awareness.delivery[key].detail, /No authoritative .* evidence is connected/);
    assert.equal(awareness.delivery[key].evidence[0].observedAt, null);
  }
  assert.equal(
    awareness.systems.targetK6Architecture.find((item) => item.id === "packaged-runtime")?.status,
    "unverified",
  );
});

test("Bootstrap Awareness exposes a persisted objective and six explicit answers without writing during reads", async () => {
  await ensureBootstrapObjective();
  const persisted = await getBootstrapObjective();
  assert.ok(persisted?.id, "bootstrap objective must be persisted in the executive objective system");

  const beforeEventCount = await eventCount();
  const first = await withMissingDeliverySignals(() => getBootstrapAwareness());
  const second = await withMissingDeliverySignals(() => getBootstrapAwareness());

  assert.equal(await eventCount(), beforeEventCount, "repeated awareness reads must not append objective or manifest history");
  assert.equal(first.objective.persisted, true);
  assert.equal(first.objective.recordId, persisted?.id);
  assert.equal(first.inspectionBoundary.readOnly, true);
  assert.equal(first.readiness.status === "healthy", false, "missing K6 proof must not produce false-green readiness");
  assert.deepEqual(
    first.bootstrapQuestions.map((item) => item.id),
    ["blockers", "broken-systems", "next-work", "replit-changes", "readiness-improvement", "subsystem-health"],
  );
  assert.equal(first.bootstrapQuestions.length, 6);
  assert.ok(first.bootstrapQuestions.every((item) => item.evidence.length > 0), "every bootstrap answer needs evidence");
  assert.equal(second.objective.recordId, first.objective.recordId, "reads must remain restart-safe and point to the same objective");
});