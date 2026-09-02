import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { db, engineHealth, engineRegistry, eventLog, orchestrationWorkItem } from "@workspace/db";
import { getResourceState } from "./resource";
import { getState, transitionState } from "./state";
import { findCapability, getEngines, registerEngine, setLifecycleState } from "./capability-registry";
import type { RecoveryPolicy } from "./engine-lifecycle";
import { runRequestPipeline } from "./request-pipeline";

export type Priority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
const priorities: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
const defaults = [
  ["Understanding Pipeline", ["extract", "classify"], "NORMAL", "on import"],
  ["Identity Engine", ["profile_update", "behavioral_scan"], "LOW", "daily"],
  ["Memory Architecture Engine", ["reclassify", "consolidate"], "LOW", "daily"],
  ["Curiosity Engine", ["scan", "observe"], "NORMAL", "every 4 hours"],
  ["Opportunity Engine", ["scan", "opportunity"], "LOW", "after curiosity"],
  ["Strategy Engine", ["weekly_review", "evaluate"], "HIGH", "weekly"],
  ["Simulation Engine", ["run", "compare"], "NORMAL", "on request"],
  ["Reflection Engine", ["generate", "metrics"], "NORMAL", "weekly/monthly/annual"],
  ["Learning Engine", ["capture", "detect_patterns"], "LOW", "daily"],
  ["Workspace Context Engine", ["evaluate_mode"], "LOW", "every 15 minutes"],
  ["Brief Engine", ["morning_brief", "reflection"], "HIGH", "daily"],
  ["Connector Engine", ["sync"], "HIGH", "staggered"],
  ["Freshness Engine", ["scan"], "NORMAL", "hourly"],
  ["Notification Engine", ["notify"], "CRITICAL", "event-driven"],
  ["Backup Engine", ["backup", "verify"], "CRITICAL", "daily 02:00"],
  ["Health Engine", ["health_check"], "CRITICAL", "hourly"],
  ["State Engine", ["get_state", "transition"], "CRITICAL", "event-driven"],
  ["Intent Engine", ["classify", "correct"], "NORMAL", "on request"],
  ["Policy Engine", ["check", "get_policy", "update_policy"], "HIGH", "on request"],
  ["Explanation Engine", ["explain", "invalidate"], "NORMAL", "on request"],
  ["Query Engine", ["query", "explain_query", "flush_cache"], "HIGH", "on request"],
  ["Memory Engine", ["remember", "forget", "retrieve", "promote", "archive", "summarize_tier"], "HIGH", "event-driven"],
  ["Strategy API", ["evaluate", "prioritize", "recommend", "refresh"], "HIGH", "weekly"],
  ["Reflection API", ["compare", "summarize", "trend"], "NORMAL", "weekly/monthly/annual"],
  ["Simulation API", ["run", "compare_scenarios", "what_if"], "NORMAL", "on request"],
] as const;

export async function registerDefaultEngines() {
  for (const [name, capabilities, priorityClass, frequency] of defaults) {
    const owner = /connector|notification|backup|health|workspace/i.test(name) ? "Coordination" : /strategy|simulation|reflection|opportunity|curiosity/i.test(name) ? "Intelligence" : /memory|learning|understanding|identity/i.test(name) ? "Knowledge" : "Foundations";
    await registerEngine({ engineId: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), engineName: name, capabilities: [...capabilities], owner, recoveryPolicy: /backup|memory|policy|state/i.test(name) ? "MANUAL_RECOVERY" : "AUTO_RESTART", recoveryConfig: { maxRetries: 3, backoffSeconds: 10 } });
    await db.update(engineRegistry).set({ priorityClass, frequency, updatedAt: new Date() }).where(eq(engineRegistry.name, name));
    await db.insert(engineHealth).values({ engineName: name }).onConflictDoNothing({ target: engineHealth.engineName });
  }
  await validateEngineDependencies();
}
const layerOrder = ["Foundations", "Knowledge", "Retrieval", "Intelligence", "Coordination", "Interfaces"];
export async function validateEngineDependencies() {
  const engines = await getEngines();
  const available = new Set(engines.filter((engine) => engine.status === "HEALTHY").map((engine) => engine.engineId));
  const ordered = [...engines].sort((a, b) => layerOrder.indexOf(a.owner) - layerOrder.indexOf(b.owner));
  for (const engine of ordered) {
    const required = engine.requiredDependencies ?? engine.dependencies ?? [];
    const optional = engine.optionalDependencies ?? [];
    const missingRequired = required.filter((dependency) => !available.has(dependency));
    const missingOptional = optional.filter((dependency) => !available.has(dependency));
    if (missingRequired.length) {
      await setLifecycleState(engine.engineId, "DEGRADED", [`Required dependencies unavailable: ${missingRequired.join(", ")}`]);
      await db.insert(eventLog).values({ eventType: "EngineUnavailable", aggregateType: "engine_registry", aggregateId: engine.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { engineId: engine.engineId, missingRequired, dependencyChain: required } });
    } else if (missingOptional.length) {
      await setLifecycleState(engine.engineId, "DEGRADED", [`Optional dependencies unavailable: ${missingOptional.join(", ")}`]);
    } else {
      await setLifecycleState(engine.engineId, "HEALTHY", []);
      available.add(engine.engineId);
    }
  }
  return getEngines();
}
export async function recoverEngine(engineId: string) {
  const engine = await (await getEngines()).find((candidate) => candidate.engineId === engineId);
  if (!engine) return null;
  const policy = engine.recoveryPolicy as RecoveryPolicy;
  await setLifecycleState(engineId, "RECOVERING");
  await db.insert(eventLog).values({ eventType: "RecoveryAttempted", aggregateType: "engine_registry", aggregateId: engine.id, sourceRef: "recovery-executor", occurredAt: new Date(), payload: { engineId, policy } });
  try {
    if (policy === "GRACEFUL_DISABLE" || policy === "MANUAL_RECOVERY") await setLifecycleState(engineId, "UNAVAILABLE");
    else await setLifecycleState(engineId, "HEALTHY", []);
    await db.insert(eventLog).values({ eventType: "RecoverySucceeded", aggregateType: "engine_registry", aggregateId: engine.id, sourceRef: "recovery-executor", occurredAt: new Date(), payload: { engineId, policy } });
  } catch (error) {
    await setLifecycleState(engineId, "UNAVAILABLE");
    await db.insert(eventLog).values({ eventType: "RecoveryFailed", aggregateType: "engine_registry", aggregateId: engine.id, sourceRef: "recovery-executor", occurredAt: new Date(), payload: { engineId, policy, error: String(error) } });
  }
  return getEngines();
}
export async function enqueueWork(input: { engineName: string; action: string; priority?: Priority; urgencyScore?: number; estimatedCostUsd?: number; dependencies?: string[]; payload?: Record<string, unknown> }) {
  const priority = input.priority ?? "NORMAL";
  const [item] = await db.insert(orchestrationWorkItem).values({ engineName: input.engineName, action: input.action, priority, urgencyScore: input.urgencyScore ?? 0, estimatedCostUsd: input.estimatedCostUsd ?? 0, dependencies: input.dependencies ?? [], payload: input.payload ?? {} }).returning();
  await db.insert(eventLog).values({ eventType: "OrchestrationWorkQueued", aggregateType: "orchestration_work_item", aggregateId: item.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { engineName: input.engineName, action: input.action, priority } });
  return item;
}
export async function orchestrationStatus() {
  await registerDefaultEngines();
  const [queue, engines, health, decisions] = await Promise.all([
    db.select().from(orchestrationWorkItem).where(inArray(orchestrationWorkItem.status, ["queued", "delayed", "running"])).orderBy(desc(orchestrationWorkItem.createdAt)),
    db.select().from(engineRegistry).orderBy(asc(engineRegistry.name)),
    db.select().from(engineHealth).orderBy(asc(engineHealth.engineName)),
    db.select().from(eventLog).where(eq(eventLog.sourceRef, "orchestration-engine")).orderBy(desc(eventLog.occurredAt)).limit(30),
  ]);
  return { queue, queueDepth: { CRITICAL: queue.filter((i) => i.priority === "CRITICAL").length, HIGH: queue.filter((i) => i.priority === "HIGH").length, NORMAL: queue.filter((i) => i.priority === "NORMAL").length, LOW: queue.filter((i) => i.priority === "LOW").length }, engines, health, decisions };
}
export async function orchestrationTick() {
  await registerDefaultEngines();
  const [next] = await db.select().from(orchestrationWorkItem).where(eq(orchestrationWorkItem.status, "queued")).orderBy(desc(orchestrationWorkItem.priority), desc(orchestrationWorkItem.urgencyScore), asc(orchestrationWorkItem.createdAt)).limit(1);
  if (!next) return null;
  const pipeline = await runRequestPipeline({ text: `Proactive orchestration ${next.engineName} ${next.action}`, origin: "proactive", actionType: next.action, engineName: next.engineName, mode: "normal", budgetTokens: 1000, payload: { workItemId: next.id, priority: next.priority } });
  if (!pipeline.ok) {
    const reason = `Request pipeline stopped at ${pipeline.failedStage}: ${pipeline.error}`;
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: reason }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "RequestPipelineFailed", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { reason, failedStage: pipeline.failedStage, correlationId: pipeline.correlationId } });
    return delayed;
  }
  const resources = await getResourceState();
  const operational = await getState();
  const requiredEngine = (await findCapability(next.action))[0] ?? (await db.select().from(engineRegistry).where(eq(engineRegistry.name, next.engineName)).limit(1))[0];
  if (!requiredEngine || requiredEngine.status === "UNAVAILABLE") {
    const reason = `No healthy registered capability is available for ${next.engineName}/${next.action}.`;
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: reason }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "CapabilityWorkDeferred", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "capability-registry", occurredAt: new Date(), payload: { reason, engineName: next.engineName, action: next.action } });
    return delayed;
  }
  if (operational.currentState === "Offline" && /sync|connector/i.test(`${next.engineName} ${next.action}`)) {
    const reason = "Lee is Offline; connector synchronization is deferred.";
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: reason }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "StateWorkDeferred", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "state-engine", occurredAt: new Date(), payload: { reason, state: operational.currentState } });
    return delayed;
  }
  if (operational.currentState === "Thinking" && /import/i.test(`${next.engineName} ${next.action}`)) {
    const reason = "Lee is Thinking; heavy import work is deferred.";
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: reason }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "StateWorkDeferred", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "state-engine", occurredAt: new Date(), payload: { reason, state: operational.currentState } });
    return delayed;
  }
  if ((resources.overallState === "CRITICAL" && next.priority !== "CRITICAL") || (resources.overallState === "CONSTRAINED" && ["LOW", "NORMAL"].includes(next.priority))) {
    const reason = `Resource Engine reports ${resources.overallState}; ${next.priority} work is deferred.`;
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: reason }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "ResourceWorkDeferred", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "resource-engine", occurredAt: new Date(), payload: { reason, overallState: resources.overallState, priority: next.priority, dimensions: resources.dimensions } });
    return delayed;
  }
  if (next.estimatedCostUsd > 0.05 && next.priority !== "CRITICAL") {
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: "Cost-aware gate: estimated model spend exceeds the daily threshold.", }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "OrchestrationWorkDelayed", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { reason: delayed.delayReason, priority: next.priority } });
    return delayed;
  }
  const [running] = await db.update(orchestrationWorkItem).set({ status: "running", startedAt: new Date() }).where(eq(orchestrationWorkItem.id, next.id)).returning();
  const jobText = `${next.engineName} ${next.action}`;
  if (/brief/i.test(jobText)) await transitionState("Briefing", "Brief job dispatched.", next.id);
  else if (/import|understanding/i.test(jobText)) await transitionState("Importing", "Import job dispatched.", next.id, Number(next.payload.fileSizeMb ?? 0) * 30 || undefined);
  else if (/sync|connector/i.test(jobText)) await transitionState("Synchronizing", "Connector sync dispatched.", next.id);
  await db.insert(eventLog).values({ eventType: "OrchestrationWorkDispatched", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { engineName: next.engineName, action: next.action, priority: next.priority } });
  return running;
}