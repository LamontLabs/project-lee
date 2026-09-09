import assert from "node:assert/strict";
import test from "node:test";
import { desc, eq } from "drizzle-orm";
import { brainVersion, db, eventLog } from "@workspace/db";
import { getBootstrapAwareness } from "../src/lib/bootstrap-awareness";

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

    assert.equal(registeredProjects.length, 1);
    for (const project of registeredProjects) {
      assert.equal(
        [...mutationOperations].some((operation) => project.allowedOperations.includes(operation)),
        false,
        `project-bridge projection exposed a mutation operation for ${project.id}`,
      );
    }
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
    assert.match(awareness.delivery[key].detail, /No .* signal is configured/);
    assert.equal(awareness.delivery[key].evidence[0].observedAt, null);
  }
  assert.equal(
    awareness.systems.targetK6Architecture.find((item) => item.id === "packaged-runtime")?.status,
    "unverified",
  );
});