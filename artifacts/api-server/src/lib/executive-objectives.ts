import { and, desc, eq, gte, or } from "drizzle-orm";
import { db, eventLog, executiveObjective, executiveObjectiveEvidence } from "@workspace/db";

export const OBJECTIVE_PRIORITIES = ["CRITICAL", "HIGH", "NORMAL", "LOW"] as const;
export const OBJECTIVE_HEALTH = ["ON_TRACK", "AT_RISK", "STALLED", "ACHIEVED", "ABANDONED"] as const;

type ObjectiveInput = {
  title: string;
  purpose: string;
  priority: string;
  successMetrics: string[];
  relatedProjects?: string[];
  expectedCompletion?: string | null;
  currentOwner?: string;
  description?: string;
};

function dayAge(date: Date, now = new Date()) {
  return Math.max(0, (now.getTime() - date.getTime()) / 86_400_000);
}

async function computeObjective(objective: typeof executiveObjective.$inferSelect) {
  const events = await db.select().from(eventLog).where(
    or(eq(eventLog.aggregateId, objective.id), eq(eventLog.sourceRef, objective.id)),
  ).orderBy(desc(eventLog.occurredAt)).limit(100);
  const positive = events.filter((event) => /(progress|advanced|resolved|completed|accepted|created|updated|achieved)/i.test(event.eventType));
  const negative = events.filter((event) => /(hold|blocked|failed|stalled|rejected|dismissed|overdue)/i.test(event.eventType));
  const blockers = negative.slice(0, 5).map((event) => `${event.eventType}: ${String(event.payload?.reason ?? event.payload?.message ?? "signal requires attention")}`);
  const latest = events[0]?.occurredAt ?? objective.updatedAt;
  let health = objective.healthStatus;
  if (objective.status === "achieved") health = "ACHIEVED";
  else if (objective.status === "abandoned") health = "ABANDONED";
  else if (negative.length > positive.length || blockers.length > 0) health = "AT_RISK";
  else if (dayAge(latest) > 30) health = "STALLED";
  else health = "ON_TRACK";
  const narrative = positive.length || negative.length
    ? `${positive.length} forward signal${positive.length === 1 ? "" : "s"} and ${negative.length} adverse signal${negative.length === 1 ? "" : "s"} recorded; latest evidence ${Math.round(dayAge(latest))} day${Math.round(dayAge(latest)) === 1 ? "" : "s"} ago.`
    : "No direct progress evidence has been recorded yet; the objective is awaiting its first operational signal.";
  return { ...objective, healthStatus: health, progressNarrative: narrative, currentBlockers: blockers, evidenceCount: events.length, forwardSignals: positive.length, adverseSignals: negative.length };
}

export async function listObjectives(includeArchived = false) {
  const rows = await db.select().from(executiveObjective).where(includeArchived ? undefined : eq(executiveObjective.status, "active")).orderBy(desc(executiveObjective.priority), desc(executiveObjective.updatedAt));
  return Promise.all(rows.map(computeObjective));
}

export async function getObjective(id: string) {
  const [objective] = await db.select().from(executiveObjective).where(eq(executiveObjective.id, id)).limit(1);
  if (!objective) return null;
  const computed = await computeObjective(objective);
  const evidence = await db.select().from(executiveObjectiveEvidence).where(eq(executiveObjectiveEvidence.objectiveId, id)).orderBy(desc(executiveObjectiveEvidence.createdAt));
  return { ...computed, evidence };
}

export async function createObjective(input: ObjectiveInput) {
  if (!input.title?.trim() || !input.purpose?.trim() || !input.successMetrics?.length) throw new Error("Title, purpose, and at least one success metric are required.");
  if (!OBJECTIVE_PRIORITIES.includes(input.priority as typeof OBJECTIVE_PRIORITIES[number])) throw new Error("Invalid objective priority.");
  const now = new Date();
  const [objective] = await db.insert(executiveObjective).values({
    title: input.title.trim(),
    description: input.description?.trim() || input.purpose.trim(),
    purpose: input.purpose.trim(),
    sourceRef: "owner-console",
    confidence: 0.5,
    status: "active",
    healthStatus: "ON_TRACK",
    progressNarrative: "Objective created; awaiting progress evidence.",
    currentBlockers: [],
    successMetrics: input.successMetrics.filter(Boolean),
    relatedProjects: input.relatedProjects ?? [],
    expectedCompletion: input.expectedCompletion ?? null,
    currentOwner: input.currentOwner?.trim() || "Founder",
    priority: OBJECTIVE_PRIORITIES.indexOf(input.priority as typeof OBJECTIVE_PRIORITIES[number]),
    targetDate: input.expectedCompletion ? new Date(input.expectedCompletion) : null,
    metadata: { priorityLabel: input.priority },
    createdAt: now,
    updatedAt: now,
  }).returning();
  const [event] = await db.insert(eventLog).values({ eventType: "ExecutiveObjectiveCreated", aggregateType: "executive_objective", aggregateId: objective.id, sourceRef: objective.id, occurredAt: now, payload: { title: objective.title, priority: input.priority, successMetrics: objective.successMetrics } }).returning();
  await db.insert(executiveObjectiveEvidence).values({ objectiveId: objective.id, eventId: event.id, evidenceType: "domain_event", direction: "forward", summary: "Executive objective created by owner." });
  return getObjective(objective.id);
}

export async function closeObjective(id: string, state: "achieved" | "abandoned", reason: string) {
  if (!reason?.trim()) throw new Error("A reason is required to archive an objective.");
  const [objective] = await db.update(executiveObjective).set({ status: state, healthStatus: state === "achieved" ? "ACHIEVED" : "ABANDONED", progressNarrative: reason.trim(), updatedAt: new Date() }).where(eq(executiveObjective.id, id)).returning();
  if (!objective) return null;
  const now = new Date();
  const [event] = await db.insert(eventLog).values({ eventType: state === "achieved" ? "ExecutiveObjectiveAchieved" : "ExecutiveObjectiveHealthChanged", aggregateType: "executive_objective", aggregateId: id, sourceRef: id, occurredAt: now, payload: { state, reason: reason.trim() } }).returning();
  await db.insert(executiveObjectiveEvidence).values({ objectiveId: id, eventId: event.id, evidenceType: "owner_decision", direction: state === "achieved" ? "forward" : "backward", summary: reason.trim() });
  return getObjective(id);
}