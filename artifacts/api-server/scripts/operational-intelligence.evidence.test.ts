import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { db, initiativeItem, operationalCapacity, operationalContextSnapshot, portfolioState, projectMomentum, universalObject, worldStateSignal } from "@workspace/db";
import { emitEvent } from "../src/lib/foundation-events";
import { currentOperationalContext, generateOperationalContext, registerOperationalIntelligenceRefresh } from "../src/lib/operational-intelligence";
import { queryEngine } from "../src/lib/query-engine";

function evidenceRefs(item: Record<string, unknown>) {
  assert.ok(Array.isArray(item.evidenceRefs) && item.evidenceRefs.length > 0, `Missing evidence for ${String(item.id)}`);
  assert.ok(Array.isArray(item.whyChain) && item.whyChain.length >= 2, `Missing Why Chain for ${String(item.id)}`);
}

test("Operational Intelligence prioritizes a controlled multi-project evidence scenario", async () => {
  try {
  const scenario = randomUUID();
  const ref = () => randomUUID();
  const projectRising = randomUUID();
  const projectDormant = randomUUID();
  const staleFact = randomUUID();
  const historical = randomUUID();
  const critical = randomUUID();
  const waiting = randomUUID();
  const blocked = randomUUID();
  const ignored = randomUUID();
  const dependencyEvidence = ref();

  await db.insert(universalObject).values([
    { id: projectRising, objectType: "project", name: `Rising project ${scenario}`, sourceRefs: [ref()], importance: 0.8 },
    { id: projectDormant, objectType: "project", name: `Dormant project ${scenario}`, sourceRefs: [ref()], importance: 0.4 },
    { id: staleFact, objectType: "fact", name: `Stale important fact ${scenario}`, sourceRefs: [ref()], importance: 0.95, ageState: "STALE" },
    { id: historical, objectType: "note", name: `Historical item ${scenario}`, sourceRefs: [ref()], memoryTier: "historical" },
  ]);
  await db.insert(projectMomentum).values([
    { projectId: projectRising, score: 72, classification: "Rising", direction: "up", contributions: [] },
    { projectId: projectDormant, score: 8, classification: "Dormant", direction: "flat", contributions: [] },
  ]);
  await db.insert(worldStateSignal).values({
    signalType: "technical",
    signalName: `Dependency alert ${scenario}`,
    currentValue: { alert: true },
    source: "controlled-test",
    confidence: 0.9,
    configured: true,
  });
  await db.insert(portfolioState).values({
    healthScore: 55,
    projectCount: 2,
    sharedDependencies: [{ dependency: `shared-${scenario}`, projectIds: [projectRising, projectDormant] }],
    alerts: [{ type: "shared_dependency", title: `Shared dependency ${scenario}`, detail: "Two projects depend on one constrained dependency.", projectIds: [projectRising, projectDormant], evidenceRefs: [dependencyEvidence] }],
    attentionDistribution: [],
    crossProjectPeople: [],
    portfolioAnchors: [],
  });
  await db.insert(operationalCapacity).values({ state: "HIGH", score: 85, signals: { activity: 10 }, inferred: false, overrideState: "HIGH" });
  await db.insert(initiativeItem).values([
    { id: critical, category: "deadline", observation: `Critical deadline ${scenario}`, significance: "CRITICAL", evidenceRefs: [ref()], expiresAt: new Date(Date.now() + 86400000), dedupeKey: `controlled:${scenario}:critical`, metadata: { deadlineAt: new Date(Date.now() + 86400000).toISOString() } },
    { id: waiting, category: "waiting", observation: `Waiting loop ${scenario}`, significance: "HIGH", evidenceRefs: [ref()], expiresAt: new Date(Date.now() + 86400000), dedupeKey: `controlled:${scenario}:waiting` },
    { id: blocked, category: "objective", observation: `Blocked objective ${scenario}`, significance: "HIGH", evidenceRefs: [ref()], expiresAt: new Date(Date.now() + 86400000), dedupeKey: `controlled:${scenario}:blocked`, metadata: { blocked: true } },
    { id: ignored, category: "low_signal", observation: `Can wait low signal ${scenario}`, significance: "LOW", evidenceRefs: [ref()], expiresAt: new Date(Date.now() + 86400000), dedupeKey: `controlled:${scenario}:ignored` },
  ]);

  const high = await generateOperationalContext();
  assert.ok(high.activePriority);
  assert.ok(high.changedItems.some((item) => item.id === critical));
  assert.ok(high.waitingItems.some((item) => item.id === waiting));
  assert.ok(high.blockedItems.some((item) => item.id === blocked));
  assert.ok(high.driftingItems.some((item) => item.id === staleFact));
  assert.ok(high.atRiskItems.some((item) => item.id === projectDormant));
  assert.ok(high.atRiskItems.some((item) => String(item.id).includes(scenario)));
  assert.ok(high.canWaitItems.some((item) => item.id === historical));
  assert.ok(high.ignoreTodayItems.some((item) => item.id === ignored));
  for (const item of [high.activePriority, ...high.changedItems, ...high.driftingItems, ...high.waitingItems, ...high.blockedItems, ...high.atRiskItems, ...high.canWaitItems, ...high.ignoreTodayItems]) if (item) evidenceRefs(item);

  await db.insert(operationalCapacity).values({ state: "LOW", score: 10, signals: { activity: 0 }, inferred: false, overrideState: "LOW" });
  const constrained = await generateOperationalContext();
  assert.equal(constrained.changedItems.length, 1);
  evidenceRefs(constrained.changedItems[0]);

  const persisted = await currentOperationalContext();
  assert.equal(persisted.id, constrained.id);

  const reactive = randomUUID();
  await db.insert(initiativeItem).values({ id: reactive, category: "deadline", observation: `Reactive critical change ${scenario}`, significance: "CRITICAL", evidenceRefs: [ref()], expiresAt: new Date(Date.now() + 86400000), dedupeKey: `controlled:${scenario}:reactive` });
  registerOperationalIntelligenceRefresh();
  await emitEvent({ eventType: "InitiativeItemCreated", aggregateType: "initiative_item", aggregateId: reactive, payload: { category: "deadline", significance: "CRITICAL", observation: `Reactive critical change ${scenario}` } });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const refreshed = await currentOperationalContext();
  assert.ok(refreshed.changedItems.some((item) => item.id === reactive));

  const snapshots = await db.select().from(operationalContextSnapshot);
  assert.ok(snapshots.length >= 3);
  } catch (error) {
    console.error(`OIE controlled scenario failure: ${error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ""}` : String(error)}`);
    throw error;
  }
});

test("Operational Intelligence does not hide an upstream retrieval failure", async () => {
  const originalQuery = queryEngine.query;
  queryEngine.query = (async () => {
    throw new Error("controlled query failure");
  }) as typeof queryEngine.query;
  try {
    await assert.rejects(() => generateOperationalContext(), /controlled query failure/);
  } finally {
    queryEngine.query = originalQuery;
  }
});