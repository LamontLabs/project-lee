import { createHash } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  brief,
  cognitiveRuntimeCycle,
  cognitiveRuntimeModel,
  db,
  executiveLoop,
  executiveObjective,
  experienceRecord,
  governanceRequest,
  identityProfile,
  initiativeItem,
  memoryIndex,
  operationalContextSnapshot,
  operationalCapacity,
  person,
  projectMomentum,
  relationshipHealthScore,
  scheduledJob,
  simulation,
  strategicObjective,
  uncertaintyState,
  universalObject,
  workingMemory,
  worldStateSignal,
  leeState,
  engineRegistry,
  waitingLoop,
  type CognitiveRuntimeModelKey,
  type CognitiveRuntimeModelSnapshot,
  COGNITIVE_RUNTIME_MODEL_KEYS,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { getRecoveryMode } from "./recovery-modes";

export { COGNITIVE_RUNTIME_MODEL_KEYS };
export const COGNITIVE_RUNTIME_KEY = "primary";
export const COGNITIVE_RUNTIME_MODEL_REGISTRY = [
  { key: "world", label: "World", sourceEngine: "World State Engine", cadenceMs: 60 * 60_000, freshnessMs: 6 * 60 * 60_000 },
  { key: "owner", label: "Owner", sourceEngine: "Identity Engine", cadenceMs: 24 * 60 * 60_000, freshnessMs: 7 * 24 * 60 * 60_000 },
  { key: "lab", label: "Lab", sourceEngine: "Simulation Engine", cadenceMs: 6 * 60 * 60_000, freshnessMs: 24 * 60 * 60_000 },
  { key: "project", label: "Project", sourceEngine: "Project Momentum Engine", cadenceMs: 60 * 60_000, freshnessMs: 6 * 60 * 60_000 },
  { key: "relationship", label: "Relationship", sourceEngine: "Relationship Engine", cadenceMs: 6 * 60 * 60_000, freshnessMs: 48 * 60 * 60_000 },
  { key: "temporal", label: "Temporal", sourceEngine: "Time Engine", cadenceMs: 60 * 60_000, freshnessMs: 6 * 60 * 60_000 },
  { key: "self", label: "Self", sourceEngine: "State Engine", cadenceMs: 30 * 60_000, freshnessMs: 2 * 60 * 60_000 },
  { key: "uncertainty", label: "Uncertainty", sourceEngine: "Uncertainty Engine", cadenceMs: 60 * 60_000, freshnessMs: 12 * 60 * 60_000 },
  { key: "goal", label: "Goal", sourceEngine: "Goal Engine", cadenceMs: 6 * 60 * 60_000, freshnessMs: 24 * 60 * 60_000 },
  { key: "authority", label: "Authority", sourceEngine: "Governance Engine", cadenceMs: 30 * 60_000, freshnessMs: 2 * 60 * 60_000 },
  { key: "attention", label: "Attention", sourceEngine: "Attention Engine", cadenceMs: 30 * 60_000, freshnessMs: 2 * 60 * 60_000 },
  { key: "experience", label: "Experience", sourceEngine: "Experience Engine", cadenceMs: 6 * 60 * 60_000, freshnessMs: 24 * 60 * 60_000 },
  { key: "memory", label: "Memory", sourceEngine: "Memory Engine", cadenceMs: 30 * 60_000, freshnessMs: 2 * 60 * 60_000 },
] as const satisfies ReadonlyArray<{ key: CognitiveRuntimeModelKey; label: string; sourceEngine: string; cadenceMs: number; freshnessMs: number }>;

type RuntimeRegistryItem = typeof COGNITIVE_RUNTIME_MODEL_REGISTRY[number];
export type CognitiveRuntimeModelRead = {
  evidenceRefs: string[];
  observedAt: Date | null;
  windowStart: Date | null;
  state: Record<string, unknown>;
  summary: Record<string, unknown>;
  degradedReason?: string | null;
};

type RuntimeModelStatus = CognitiveRuntimeModelSnapshot["status"];

function registryFor(key: CognitiveRuntimeModelKey) {
  return COGNITIVE_RUNTIME_MODEL_REGISTRY.find((item) => item.key === key)!;
}

function dateOf(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestDate(rows: Array<Record<string, unknown>>, fields: string[]) {
  return rows.reduce<Date | null>((latest, row) => {
    const dates = fields.map((field) => dateOf(row[field])).filter((value): value is Date => Boolean(value));
    const candidate = dates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return candidate && (!latest || candidate > latest) ? candidate : latest;
  }, null);
}

function earliestDate(rows: Array<Record<string, unknown>>, fields: string[]) {
  return rows.reduce<Date | null>((earliest, row) => {
    const dates = fields.map((field) => dateOf(row[field])).filter((value): value is Date => Boolean(value));
    const candidate = dates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    return candidate && (!earliest || candidate < earliest) ? candidate : earliest;
  }, null);
}

function uniqueRefs(refs: Array<string | null | undefined>) {
  return [...new Set(refs.filter((ref): ref is string => Boolean(ref)))].slice(0, 40);
}

function ageStatus(observedAt: Date | null, policy: RuntimeRegistryItem, degradedReason?: string | null): { status: RuntimeModelStatus; freshness: number } {
  if (degradedReason) return { status: "degraded", freshness: 0.35 };
  if (!observedAt) return { status: "unavailable", freshness: 0 };
  const age = Math.max(0, Date.now() - observedAt.getTime());
  const freshness = Math.max(0, Math.min(1, 1 - age / (policy.freshnessMs * 2)));
  return age > policy.freshnessMs * 2
    ? { status: "stale", freshness }
    : age > policy.freshnessMs
      ? { status: "aging", freshness }
      : { status: "fresh", freshness };
}

function snapshotFor(key: CognitiveRuntimeModelKey, read: CognitiveRuntimeModelRead): CognitiveRuntimeModelSnapshot {
  const policy = registryFor(key);
  const age = ageStatus(read.observedAt, policy, read.degradedReason);
  return {
    modelKey: key,
    status: age.status,
    freshness: Number(age.freshness.toFixed(3)),
    evidenceWindow: { start: read.windowStart?.toISOString() ?? null, end: read.observedAt?.toISOString() ?? null },
    evidenceRefs: uniqueRefs(read.evidenceRefs),
    summary: read.summary,
    degradedReason: read.degradedReason ?? null,
  };
}

function rowDates(rows: Array<Record<string, unknown>>, fields: string[]) {
  return { observedAt: latestDate(rows, fields), windowStart: earliestDate(rows, fields) };
}

async function readWorld(): Promise<CognitiveRuntimeModelRead> {
  const rows = await db.select().from(worldStateSignal).where(eq(worldStateSignal.enabled, true));
  const dates = rowDates(rows as any, ["lastUpdatedAt", "createdAt"]);
  const staleCount = rows.filter((row) => Date.now() - row.lastUpdatedAt.getTime() > row.stalenessThresholdHours * 60 * 60_000).length;
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { signalCount: rows.length, staleCount }, summary: { signalCount: rows.length, staleCount, sources: [...new Set(rows.map((row) => row.source))].slice(0, 8) } };
}

async function readOwner(): Promise<CognitiveRuntimeModelRead> {
  const [profile] = await db.select().from(identityProfile).orderBy(desc(identityProfile.updatedAt)).limit(1);
  if (!profile) return { observedAt: null, windowStart: null, evidenceRefs: [], state: {}, summary: {}, degradedReason: "No owner identity profile is persisted." };
  return { observedAt: profile.updatedAt, windowStart: profile.createdAt, evidenceRefs: uniqueRefs([profile.id, profile.sourceRef]), state: { profileKey: profile.profileKey, confidence: profile.confidence }, summary: { displayName: profile.displayName, mission: profile.mission, confidence: profile.confidence } };
}

async function readLab(): Promise<CognitiveRuntimeModelRead> {
  const rows = await db.select().from(simulation).orderBy(desc(simulation.createdAt)).limit(40);
  const dates = rowDates(rows as any, ["updatedAt", "createdAt"]);
  const active = rows.filter((row) => row.scenarioStatus === "active").length;
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { simulationCount: rows.length, activeCount: active }, summary: { simulationCount: rows.length, activeCount: active, latestScenario: rows[0]?.question ?? null } };
}

async function readProject(): Promise<CognitiveRuntimeModelRead> {
  const [projects, momentum] = await Promise.all([
    db.select({ id: universalObject.id, updatedAt: universalObject.updatedAt, createdAt: universalObject.createdAt }).from(universalObject).where(eq(universalObject.objectType, "project")).limit(100),
    db.select().from(projectMomentum).orderBy(desc(projectMomentum.computedAt)).limit(100),
  ]);
  const rows = [...projects, ...momentum] as any[];
  const dates = rowDates(rows, ["computedAt", "updatedAt", "createdAt"]);
  const activeMomentum = momentum.filter((item) => ["Explosive", "Rising", "Stable"].includes(item.classification)).length;
  return { ...dates, evidenceRefs: rows.map((row) => row.id ?? row.projectId), state: { projectCount: projects.length, momentumCount: momentum.length }, summary: { projectCount: projects.length, momentumCount: momentum.length, activeMomentum } };
}

async function readRelationship(): Promise<CognitiveRuntimeModelRead> {
  const [people, health] = await Promise.all([
    db.select({ id: person.id, updatedAt: person.updatedAt, createdAt: person.createdAt }).from(person).limit(200),
    db.select().from(relationshipHealthScore).orderBy(desc(relationshipHealthScore.calculatedAt)).limit(200),
  ]);
  const rows = [...people, ...health] as any[];
  const dates = rowDates(rows, ["calculatedAt", "updatedAt", "createdAt"]);
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { peopleCount: people.length, healthScores: health.length }, summary: { peopleCount: people.length, healthScores: health.length, needsAttention: health.filter((item) => item.score < 50).length } };
}

async function readTemporal(): Promise<CognitiveRuntimeModelRead> {
  const [loops, briefs] = await Promise.all([
    db.select({ id: waitingLoop.id, waitingSince: waitingLoop.waitingSince, updatedAt: waitingLoop.updatedAt, status: waitingLoop.status }).from(waitingLoop).where(eq(waitingLoop.status, "open")).limit(100),
    db.select({ id: brief.id, generatedAt: brief.generatedAt }).from(brief).orderBy(desc(brief.generatedAt)).limit(20),
  ]);
  const rows = [...loops, ...briefs] as any[];
  const dates = rowDates(rows, ["generatedAt", "updatedAt", "waitingSince"]);
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { openWaitingLoops: loops.length, recentBriefs: briefs.length }, summary: { openWaitingLoops: loops.length, latestBriefAt: briefs[0]?.generatedAt?.toISOString() ?? null } };
}

async function readSelf(): Promise<CognitiveRuntimeModelRead> {
  const [state, engines] = await Promise.all([
    db.select().from(leeState).limit(1),
    db.select({ id: engineRegistry.id, name: engineRegistry.name, status: engineRegistry.status, lifecycleState: engineRegistry.lifecycleState, updatedAt: engineRegistry.updatedAt }).from(engineRegistry).limit(200),
  ]);
  const rows = [...state, ...engines] as any[];
  const dates = rowDates(rows, ["updatedAt", "createdAt"]);
  const degraded = engines.filter((engine) => ["DEGRADED", "UNAVAILABLE", "FAILED"].includes(engine.lifecycleState) || ["DEGRADED", "UNAVAILABLE", "FAILED"].includes(engine.status));
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { operationalState: state[0]?.currentState ?? null, engineCount: engines.length, degradedEngineCount: degraded.length }, summary: { operationalState: state[0]?.currentState ?? "unknown", stateReason: state[0]?.reason ?? null, engineCount: engines.length, degradedEngineCount: degraded.length }, degradedReason: degraded.length ? `${degraded.length} registered engine(s) report degraded or unavailable state.` : null };
}

async function readUncertainty(): Promise<CognitiveRuntimeModelRead> {
  const rows = await db.select().from(uncertaintyState).orderBy(desc(uncertaintyState.computedAt)).limit(200);
  const dates = rowDates(rows as any, ["computedAt"]);
  const high = rows.filter((row) => ["HIGH", "VERY HIGH"].includes(row.level));
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { objectCount: rows.length, highCount: high.length }, summary: { objectCount: rows.length, highCount: high.length, highest: high[0] ? { objectId: high[0].objectId, level: high[0].level, signals: high[0].signals.slice(0, 3) } : null } };
}

async function readGoal(): Promise<CognitiveRuntimeModelRead> {
  const [executive, strategic] = await Promise.all([
    db.select().from(executiveObjective).where(eq(executiveObjective.status, "active")).orderBy(desc(executiveObjective.priority)).limit(30),
    db.select({ id: strategicObjective.id, objective: strategicObjective.objective, updatedAt: strategicObjective.updatedAt, createdAt: strategicObjective.createdAt }).from(strategicObjective).where(eq(strategicObjective.status, "active")).limit(30),
  ]);
  const rows = [...executive, ...strategic] as any[];
  const dates = rowDates(rows, ["updatedAt", "createdAt"]);
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { executiveGoals: executive.length, strategicGoals: strategic.length }, summary: { executiveGoals: executive.length, strategicGoals: strategic.length, topGoal: executive[0]?.title ?? strategic[0]?.objective ?? null } };
}

async function readAuthority(): Promise<CognitiveRuntimeModelRead> {
  const rows = await db.select().from(governanceRequest).orderBy(desc(governanceRequest.createdAt)).limit(50);
  const dates = rowDates(rows as any, ["resolvedAt", "createdAt"]);
  const held = rows.filter((row) => row.status === "HOLD").length;
  return { ...dates, evidenceRefs: rows.flatMap((row) => [row.id, ...row.evidenceRefs]), state: { requestCount: rows.length, heldCount: held }, summary: { requestCount: rows.length, heldCount: held, consequentialActionsRemainGoverned: true, ownerConfirmationRequired: true } };
}

async function readAttention(): Promise<CognitiveRuntimeModelRead> {
  const [context, capacity, initiatives] = await Promise.all([
    db.select().from(operationalContextSnapshot).orderBy(desc(operationalContextSnapshot.generatedAt)).limit(1),
    db.select().from(operationalCapacity).orderBy(desc(operationalCapacity.observedAt)).limit(1),
    db.select().from(initiativeItem).orderBy(desc(initiativeItem.generatedAt)).limit(20),
  ]);
  const snapshot = context[0];
  const rows = [...context, ...capacity, ...initiatives] as any[];
  const dates = rowDates(rows, ["generatedAt", "observedAt", "updatedAt"]);
  const activePriority = snapshot?.activePriority as Record<string, unknown> | null | undefined;
  return { ...dates, evidenceRefs: uniqueRefs([snapshot?.id, ...((activePriority?.evidenceRefs as string[] | undefined) ?? [])]), state: { hasPriority: Boolean(activePriority), capacity: capacity[0]?.state ?? "unknown" }, summary: { activePriority: activePriority ? { id: activePriority.id, text: activePriority.text, significance: activePriority.significance } : null, mostImportantAction: activePriority?.metadata && typeof activePriority.metadata === "object" && "actionHint" in activePriority.metadata ? activePriority.metadata.actionHint : activePriority ? "Review the active priority against current evidence." : "No immediate owner action is supported by current evidence.", capacity: capacity[0]?.state ?? "unknown", surfacedInitiatives: initiatives.length } };
}

async function readExperience(): Promise<CognitiveRuntimeModelRead> {
  const rows = await db.select().from(experienceRecord).orderBy(desc(experienceRecord.createdAt)).limit(40);
  const dates = rowDates(rows as any, ["createdAt"]);
  return { ...dates, evidenceRefs: rows.map((row) => row.sourceEventId), state: { experienceCount: rows.length }, summary: { experienceCount: rows.length, domains: [...new Set(rows.map((row) => row.domain))].slice(0, 8), latestObservation: rows[0]?.observation ?? null } };
}

async function readMemory(): Promise<CognitiveRuntimeModelRead> {
  const [working, indexRows] = await Promise.all([
    db.select().from(workingMemory).orderBy(desc(workingMemory.updatedAt)).limit(10),
    db.select({ id: memoryIndex.id, recordedAt: memoryIndex.recordedAt }).from(memoryIndex).orderBy(desc(memoryIndex.recordedAt)).limit(100),
  ]);
  const rows = [...working, ...indexRows] as any[];
  const dates = rowDates(rows, ["updatedAt", "lastAssembledAt", "recordedAt", "createdAt"]);
  const latest = working[0];
  return { ...dates, evidenceRefs: rows.map((row) => row.id), state: { workingMemoryScopes: working.length, indexedRecords: indexRows.length }, summary: { workingMemoryScopes: working.length, indexedRecords: indexRows.length, latestScope: latest?.scopeKey ?? null, latestTokenEstimate: latest?.tokenEstimate ?? 0 } };
}

export const COGNITIVE_RUNTIME_READERS: Record<CognitiveRuntimeModelKey, () => Promise<CognitiveRuntimeModelRead>> = {
  world: readWorld,
  owner: readOwner,
  lab: readLab,
  project: readProject,
  relationship: readRelationship,
  temporal: readTemporal,
  self: readSelf,
  uncertainty: readUncertainty,
  goal: readGoal,
  authority: readAuthority,
  attention: readAttention,
  experience: readExperience,
  memory: readMemory,
};

export function cognitiveRuntimeConfigFingerprint() {
  return createHash("sha256").update(JSON.stringify({
    runtime: COGNITIVE_RUNTIME_KEY,
    version: process.env.LEE_VERSION ?? "unknown",
    model: process.env.CIL_MODEL ?? "cil-managed",
    registry: COGNITIVE_RUNTIME_MODEL_REGISTRY,
  })).digest("hex");
}

export function cognitiveRuntimeContinuity(previousCycle: { id: string; cycleNumber: number; modelConfigFingerprint: string } | null, fingerprint = cognitiveRuntimeConfigFingerprint()) {
  return {
    previousCycleId: previousCycle?.id ?? null,
    previousCycleNumber: previousCycle?.cycleNumber ?? null,
    configChangedSincePrevious: Boolean(previousCycle && previousCycle.modelConfigFingerprint !== fingerprint),
    identityPreserved: true,
    governanceBoundariesPreserved: true,
  };
}

export async function collectCognitiveRuntimeModels(readers: Partial<typeof COGNITIVE_RUNTIME_READERS> = COGNITIVE_RUNTIME_READERS) {
  const results = await Promise.all(COGNITIVE_RUNTIME_MODEL_KEYS.map(async (key) => {
    try {
      return { key, read: await (readers[key] ?? COGNITIVE_RUNTIME_READERS[key])() };
    } catch (error) {
      return {
        key,
        read: {
          evidenceRefs: [],
          observedAt: null,
          windowStart: null,
          state: {},
          summary: {},
          degradedReason: error instanceof Error ? error.message : "Model refresh failed.",
        } satisfies CognitiveRuntimeModelRead,
      };
    }
  }));
  return results.map(({ key, read }) => snapshotFor(key, read));
}

function blockedResult(reason: string) {
  return { blocked: true as const, status: "blocked" as const, reason, models: [], cycle: null, summary: { headline: "Runtime refresh is protected.", mostImportantAction: "Restore the canonical Brain before refreshing runtime state." } };
}

export async function runCognitiveRuntimeCycle(trigger: "scheduled" | "manual" | "restart" = "scheduled") {
  const recovery = getRecoveryMode();
  if (["READ_ONLY", "RECOVERY_MODE", "MIGRATION_MODE", "SAFE_MODE"].includes(recovery.mode)) return blockedResult(`Runtime refresh is blocked in ${recovery.mode}.`);
  const startedAt = new Date();
  const [previous] = await db.select().from(cognitiveRuntimeCycle).where(eq(cognitiveRuntimeCycle.runtimeKey, COGNITIVE_RUNTIME_KEY)).orderBy(desc(cognitiveRuntimeCycle.cycleNumber)).limit(1);
  const cycleNumber = (previous?.cycleNumber ?? 0) + 1;
  const fingerprint = cognitiveRuntimeConfigFingerprint();
  const [cycle] = await db.insert(cognitiveRuntimeCycle).values({
    runtimeKey: COGNITIVE_RUNTIME_KEY,
    cycleNumber,
    trigger,
    status: "running",
    modelKeys: [...COGNITIVE_RUNTIME_MODEL_KEYS],
    modelConfigFingerprint: fingerprint,
    continuity: cognitiveRuntimeContinuity(previous ? { id: previous.id, cycleNumber: previous.cycleNumber, modelConfigFingerprint: previous.modelConfigFingerprint } : null, fingerprint),
    startedAt,
  }).returning();

  const snapshots = await collectCognitiveRuntimeModels();
  const staleModels = snapshots.filter((item) => item.status === "stale" || item.status === "aging").map((item) => item.modelKey);
  const degradedModels = snapshots.filter((item) => item.status === "degraded" || item.status === "unavailable").map((item) => item.modelKey);
  const failures = snapshots.filter((item) => item.status === "degraded" || item.status === "unavailable");
  const status = failures.length === snapshots.length ? "failed" : failures.length ? "partial" : "completed";
  const evidenceDates = snapshots.flatMap((item) => [dateOf(item.evidenceWindow.start), dateOf(item.evidenceWindow.end)]).filter((value): value is Date => Boolean(value));
  const summary = await buildRuntimeSummary(snapshots);
  const engineVersions = Object.fromEntries((await db.select({ name: engineRegistry.name, version: engineRegistry.version }).from(engineRegistry)).map((engine) => [engine.name, engine.version]));
  for (const snapshot of snapshots) {
    const policy = registryFor(snapshot.modelKey);
    const sourceEngineVersion = engineVersions[policy.sourceEngine] ?? null;
    const [existing] = await db.select({ id: cognitiveRuntimeModel.id }).from(cognitiveRuntimeModel).where(and(eq(cognitiveRuntimeModel.runtimeKey, COGNITIVE_RUNTIME_KEY), eq(cognitiveRuntimeModel.modelKey, snapshot.modelKey))).limit(1);
    const values = { runtimeKey: COGNITIVE_RUNTIME_KEY, modelKey: snapshot.modelKey, modelType: policy.label, sourceEngine: policy.sourceEngine, engineVersion: sourceEngineVersion, status: snapshot.status, freshness: snapshot.freshness, evidenceWindowStart: dateOf(snapshot.evidenceWindow.start), evidenceWindowEnd: dateOf(snapshot.evidenceWindow.end), evidenceRefs: snapshot.evidenceRefs, state: { ...snapshot.summary, modelState: snapshot.summary }, degradedReason: snapshot.degradedReason ?? null, lastRefreshedAt: startedAt, nextRefreshAt: new Date(startedAt.getTime() + policy.cadenceMs), updatedAt: startedAt };
    if (existing) await db.update(cognitiveRuntimeModel).set(values).where(eq(cognitiveRuntimeModel.id, existing.id));
    else await db.insert(cognitiveRuntimeModel).values(values);
  }
  const [completed] = await db.update(cognitiveRuntimeCycle).set({
    status,
    modelStates: snapshots,
    staleModels,
    degradedModels,
    evidenceWindowStart: evidenceDates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
    evidenceWindowEnd: evidenceDates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    summary,
    error: failures.length ? `${failures.length} model(s) did not provide a fresh state.` : null,
    completedAt: new Date(),
    nextRefreshAt: new Date(startedAt.getTime() + 30 * 60_000),
  }).where(eq(cognitiveRuntimeCycle.id, cycle.id)).returning();
  await emitEvent({ eventType: "CognitiveRuntimeCycleCompleted", aggregateType: "cognitive_runtime", aggregateId: cycle.id, sourceRef: "cognitive-runtime", payload: { cycleNumber, status, trigger, modelCount: snapshots.length, staleModels, degradedModels, previousCycleId: previous?.id ?? null, modelConfigChanged: Boolean(previous && previous.modelConfigFingerprint !== fingerprint) } });
  return { blocked: false as const, status, cycle: completed, models: snapshots, summary };
}

async function buildRuntimeSummary(snapshots: CognitiveRuntimeModelSnapshot[]) {
  const attention = snapshots.find((item) => item.modelKey === "attention")?.summary ?? {};
  const self = snapshots.find((item) => item.modelKey === "self")?.summary ?? {};
  const uncertainty = snapshots.find((item) => item.modelKey === "uncertainty")?.summary ?? {};
  const memory = snapshots.find((item) => item.modelKey === "memory")?.summary ?? {};
  const staleModels = snapshots.filter((item) => item.status === "stale" || item.status === "aging").map((item) => item.modelKey);
  const degradedModels = snapshots.filter((item) => item.status === "degraded" || item.status === "unavailable").map((item) => item.modelKey);
  const priority = attention.activePriority as Record<string, unknown> | null | undefined;
  return {
    headline: typeof priority?.text === "string" ? priority.text : "No immediate owner priority is supported by the current evidence.",
    mostImportantAction: typeof attention.mostImportantAction === "string" ? attention.mostImportantAction : "Review the current runtime state before proposing action.",
    operationalState: self.operationalState ?? "unknown",
    uncertainty: uncertainty.highCount ? `${uncertainty.highCount} high-uncertainty item(s) need careful interpretation.` : "No high-uncertainty items are currently recorded.",
    workingMemory: { scope: memory.latestScope ?? null, tokenEstimate: memory.latestTokenEstimate ?? 0, bounded: true },
    evidenceRefs: uniqueRefs([...(priority?.evidenceRefs as string[] | undefined) ?? []]),
    bounded: true,
    maxItems: 3,
    staleModels,
    degradedModels,
    governance: { CILRoutingRequired: true, ownerConfirmationRequired: true, consequentialActionsGoverned: true },
  };
}

export async function currentCognitiveRuntime() {
  const [cycle] = await db.select().from(cognitiveRuntimeCycle).where(eq(cognitiveRuntimeCycle.runtimeKey, COGNITIVE_RUNTIME_KEY)).orderBy(desc(cognitiveRuntimeCycle.cycleNumber)).limit(1);
  const models = await db.select().from(cognitiveRuntimeModel).where(eq(cognitiveRuntimeModel.runtimeKey, COGNITIVE_RUNTIME_KEY)).orderBy(cognitiveRuntimeModel.modelKey);
  if (cycle) return { runtimeKey: COGNITIVE_RUNTIME_KEY, registry: COGNITIVE_RUNTIME_MODEL_REGISTRY, cycle, models, summary: cycle.summary, status: cycle.status, lastRefreshAt: cycle.completedAt ?? cycle.startedAt, staleModels: cycle.staleModels, degradedModels: cycle.degradedModels, nextRefreshAt: cycle.nextRefreshAt, recoveryMode: getRecoveryMode().mode };
  return { runtimeKey: COGNITIVE_RUNTIME_KEY, registry: COGNITIVE_RUNTIME_MODEL_REGISTRY, cycle: null, models: [], summary: { headline: "Cognitive Runtime has not completed a cycle.", mostImportantAction: "Run a refresh after the canonical Brain is ready.", bounded: true, governance: { CILRoutingRequired: true, ownerConfirmationRequired: true, consequentialActionsGoverned: true } }, status: "uninitialized", lastRefreshAt: null, staleModels: [], degradedModels: COGNITIVE_RUNTIME_MODEL_KEYS, nextRefreshAt: null, recoveryMode: getRecoveryMode().mode };
}

export async function cognitiveRuntimeHistory(limit = 50) {
  return db.select().from(cognitiveRuntimeCycle).where(eq(cognitiveRuntimeCycle.runtimeKey, COGNITIVE_RUNTIME_KEY)).orderBy(desc(cognitiveRuntimeCycle.cycleNumber)).limit(Math.min(200, Math.max(1, limit)));
}

export async function ensureCognitiveRuntimeJob() {
  const [existing] = await db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "cognitive_runtime_cycle")).limit(1);
  if (!existing) await db.insert(scheduledJob).values({ jobType: "cognitive_runtime_cycle", runAt: new Date(Date.now() + 60_000), recurrence: "30m", payload: { engine: "Cognitive Runtime" } });
}