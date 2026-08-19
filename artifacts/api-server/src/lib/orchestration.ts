import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { db, engineHealth, engineRegistry, eventLog, orchestrationWorkItem } from "@workspace/db";

export type Priority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
const priorities: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
const defaults = [
  ["Understanding Pipeline", ["extract", "classify"], "NORMAL", "on import"],
  ["Identity Engine", ["profile_update", "behavioral_scan"], "LOW", "daily"],
  ["Brief Engine", ["morning_brief", "reflection"], "HIGH", "daily"],
  ["Connector Engine", ["sync"], "HIGH", "staggered"],
  ["Freshness Engine", ["scan"], "NORMAL", "hourly"],
  ["Notification Engine", ["notify"], "CRITICAL", "event-driven"],
  ["Backup Engine", ["backup", "verify"], "CRITICAL", "daily 02:00"],
  ["Health Engine", ["health_check"], "CRITICAL", "hourly"],
] as const;

export async function registerDefaultEngines() {
  for (const [name, capabilities, priorityClass, frequency] of defaults) {
    await db.insert(engineRegistry).values({ name, capabilities: [...capabilities], priorityClass, frequency }).onConflictDoUpdate({ target: engineRegistry.name, set: { capabilities: [...capabilities], priorityClass, frequency, updatedAt: new Date() } });
    await db.insert(engineHealth).values({ engineName: name }).onConflictDoNothing({ target: engineHealth.engineName });
  }
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
  if (next.estimatedCostUsd > 0.05 && next.priority !== "CRITICAL") {
    const [delayed] = await db.update(orchestrationWorkItem).set({ status: "delayed", delayReason: "Cost-aware gate: estimated model spend exceeds the daily threshold.", }).where(eq(orchestrationWorkItem.id, next.id)).returning();
    await db.insert(eventLog).values({ eventType: "OrchestrationWorkDelayed", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { reason: delayed.delayReason, priority: next.priority } });
    return delayed;
  }
  const [running] = await db.update(orchestrationWorkItem).set({ status: "running", startedAt: new Date() }).where(eq(orchestrationWorkItem.id, next.id)).returning();
  await db.insert(eventLog).values({ eventType: "OrchestrationWorkDispatched", aggregateType: "orchestration_work_item", aggregateId: next.id, sourceRef: "orchestration-engine", occurredAt: new Date(), payload: { engineName: next.engineName, action: next.action, priority: next.priority } });
  return running;
}