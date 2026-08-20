import { desc, eq } from "drizzle-orm";
import { db, executiveLoop, eventLog } from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { generateOperationalContext } from "./operational-intelligence";

export const LOOP_PHASES = ["OBSERVE", "UNDERSTAND", "PRIORITIZE", "DECIDE", "PREPARE", "WAIT", "REVIEW"] as const;
export type LoopPhase = typeof LOOP_PHASES[number];
const nextPhase: Record<LoopPhase, LoopPhase> = { OBSERVE: "UNDERSTAND", UNDERSTAND: "PRIORITIZE", PRIORITIZE: "DECIDE", DECIDE: "PREPARE", PREPARE: "WAIT", WAIT: "REVIEW", REVIEW: "OBSERVE" };
export const DEFAULT_PHASE_MAX_MS: Record<LoopPhase, number> = { OBSERVE: 60_000, UNDERSTAND: 120_000, PRIORITIZE: 60_000, DECIDE: 60_000, PREPARE: 60_000, WAIT: 900_000, REVIEW: 120_000 };
const criticalEvents = new Set(["GovernedActionHeld", "BuildFailed", "OperationalPatternBroken", "GovernanceServiceUnavailable"]);

async function current() {
  const [row] = await db.select().from(executiveLoop).where(eq(executiveLoop.loopKey, "primary"));
  if (row) return row;
  const [created] = await db.insert(executiveLoop).values({ loopKey: "primary", phase: "OBSERVE", lastCycleStartedAt: new Date() }).returning();
  return created;
}
export async function executiveLoopState() { return current(); }
export async function transitionExecutiveLoop(reason = "phase duration elapsed", forcePhase?: LoopPhase) {
  const row = await current(); const phase = row.phase as LoopPhase; const target = forcePhase ?? nextPhase[phase]; const now = new Date();
  const elapsed = now.getTime() - new Date(row.phaseEnteredAt).getTime();
  const durations = { ...(row.phaseDurations ?? {}), [phase]: elapsed };
  const cycleCount = target === "OBSERVE" ? row.cycleCount + 1 : row.cycleCount;
  const cycleDuration = target === "OBSERVE" && row.lastCycleStartedAt ? now.getTime() - new Date(row.lastCycleStartedAt).getTime() : row.averageCycleDurationMs;
  const average = cycleDuration == null ? null : Math.round(((row.averageCycleDurationMs ?? cycleDuration) + cycleDuration) / 2);
  const [updated] = await db.update(executiveLoop).set({ phase: target, cycleCount, phaseEnteredAt: now, lastTransitionAt: now, lastCycleStartedAt: target === "OBSERVE" ? now : row.lastCycleStartedAt, averageCycleDurationMs: average, phaseDurations: durations, lastReason: reason, updatedAt: now }).where(eq(executiveLoop.id, row.id)).returning();
  await emitEvent({ eventType: "ExecutiveLoopPhaseChanged", aggregateType: "executive_loop", aggregateId: row.id, payload: { fromPhase: phase, toPhase: target, cycleCount, reason, durationMs: elapsed } });
  return updated;
}
export async function interruptExecutiveLoop(eventType: string, eventId?: string) {
  if (!criticalEvents.has(eventType)) return current();
  const row = await current(); const [updated] = await db.update(executiveLoop).set({ interrupted: row.interrupted + 1, lastReason: `Interrupted by ${eventType}`, updatedAt: new Date() }).where(eq(executiveLoop.id, row.id)).returning();
  await emitEvent({ eventType: "ExecutiveLoopInterrupted", aggregateType: "executive_loop", aggregateId: row.id, payload: { eventType, eventId, phase: row.phase, reentryPhase: "OBSERVE" } });
  return transitionExecutiveLoop(`critical interrupt: ${eventType}`, "OBSERVE");
}
export async function runExecutiveLoopTick() {
  const row = await current(); const phase = row.phase as LoopPhase; const elapsed = Date.now() - new Date(row.phaseEnteredAt).getTime();
  if (phase === "UNDERSTAND" || phase === "PRIORITIZE") await generateOperationalContext();
  if (elapsed >= (DEFAULT_PHASE_MAX_MS[phase] ?? 60_000)) return transitionExecutiveLoop();
  return row;
}
export async function executiveLoopHistory() { return db.select().from(eventLog).where(eq(eventLog.aggregateType, "executive_loop")).orderBy(desc(eventLog.occurredAt)).limit(100); }