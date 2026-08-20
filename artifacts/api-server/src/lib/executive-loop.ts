import { desc, eq } from "drizzle-orm";
import { db, executiveLoop, eventLog } from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { generateOperationalContext } from "./operational-intelligence";
import { computeOperationalConfidence } from "./operational-confidence";
import { computeProjectMomentum } from "./project-momentum";
import { detectOpportunities } from "./opportunity";
import { computeOperationalCapacity } from "./operational-capacity";
import { computePortfolioState } from "./portfolio-intelligence";
import { computeResourceAllocation } from "./resource-allocation";
import { runRequestPipeline } from "./request-pipeline";
import { ingestBehavioralSignal } from "./operational-memory";

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
  await computeOperationalConfidence();
  await computeProjectMomentum();
  await detectOpportunities();
  await computeOperationalCapacity();
  await computePortfolioState();
  await computeResourceAllocation();
  return updated;
}
export async function interruptExecutiveLoop(eventType: string, eventId?: string) {
  if (!criticalEvents.has(eventType)) return current();
  const row = await current(); const [updated] = await db.update(executiveLoop).set({ interrupted: row.interrupted + 1, lastReason: `Interrupted by ${eventType}`, updatedAt: new Date() }).where(eq(executiveLoop.id, row.id)).returning();
  await emitEvent({ eventType: "ExecutiveLoopInterrupted", aggregateType: "executive_loop", aggregateId: row.id, payload: { eventType, eventId, phase: row.phase, reentryPhase: "OBSERVE" } });
  return transitionExecutiveLoop(`critical interrupt: ${eventType}`, "OBSERVE");
}

export async function recordExecutiveLoopReview(input: { feedback: string; outcome?: string; cycleCount?: number }) {
  const row = await current();
  const event = await emitEvent({
    eventType: "ExecutiveLoopReviewRecorded",
    aggregateType: "executive_loop",
    aggregateId: row.id,
    sourceRef: "executive-loop-review",
    payload: { feedback: input.feedback, outcome: input.outcome ?? "reviewed", phase: row.phase, cycleCount: input.cycleCount ?? row.cycleCount },
  });
  const signal = await ingestBehavioralSignal({
    signalType: "executive_loop_review",
    entityRef: row.id,
    evidenceEventId: event.id,
    metadata: { feedback: input.feedback, outcome: input.outcome ?? "reviewed", phase: row.phase, cycleCount: input.cycleCount ?? row.cycleCount },
  });
  return { event, signal };
}
export async function runExecutiveLoopTick() {
  const row = await current(); const phase = row.phase as LoopPhase; const elapsed = Date.now() - new Date(row.phaseEnteredAt).getTime();
  const pipeline = await runRequestPipeline({ text: `Executive Loop ${phase} cycle`, origin: "executive_loop", actionType: "executive_loop_tick", engineName: "Executive Loop", mode: "normal", budgetTokens: 1200, payload: { phase } });
  if (!pipeline.ok) {
    await emitEvent({ eventType: "RequestPipelineFailed", aggregateType: "executive_loop", aggregateId: row.id, sourceRef: "executive-loop", payload: { failedStage: pipeline.failedStage, error: pipeline.error, correlationId: pipeline.correlationId } });
    return row;
  }
  if (phase === "UNDERSTAND" || phase === "PRIORITIZE") await generateOperationalContext();
  if (elapsed >= (DEFAULT_PHASE_MAX_MS[phase] ?? 60_000)) return transitionExecutiveLoop();
  return row;
}
export async function executiveLoopHistory() { return db.select().from(eventLog).where(eq(eventLog.aggregateType, "executive_loop")).orderBy(desc(eventLog.occurredAt)).limit(100); }