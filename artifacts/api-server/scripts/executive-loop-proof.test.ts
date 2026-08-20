import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, desc, eq } from "drizzle-orm";
import { behavioralSignal, db, eventLog, executiveLoop, operationalConfidenceSnapshot, operationalContextSnapshot, scheduledJob } from "@workspace/db";
import { executeScheduledJob } from "../src/lib/scheduler";
import { computeOperationalConfidence } from "../src/lib/operational-confidence";
import { currentOperationalContext } from "../src/lib/operational-intelligence";
import { executiveLoopHistory, executiveLoopState, interruptExecutiveLoop, recordExecutiveLoopReview, runExecutiveLoopTick, transitionExecutiveLoop } from "../src/lib/executive-loop";

test("Executive Loop persists phases, resumes, interrupts, integrates engines, and learns review feedback", async () => {
  const [existing] = await db.select().from(executiveLoop).where(eq(executiveLoop.loopKey, "primary"));
  const [loop] = existing
    ? await db.update(executiveLoop).set({ phase: "OBSERVE", phaseEnteredAt: new Date(Date.now() - 120_000), lastCycleStartedAt: new Date(Date.now() - 120_000), lastReason: "controlled proof" }).where(eq(executiveLoop.id, existing.id)).returning()
    : await db.insert(executiveLoop).values({ loopKey: "primary", phase: "OBSERVE", phaseEnteredAt: new Date(Date.now() - 120_000), lastCycleStartedAt: new Date(Date.now() - 120_000) }).returning();
  const initialCycle = loop.cycleCount;
  const confidenceBefore = (await db.select({ id: operationalConfidenceSnapshot.id }).from(operationalConfidenceSnapshot).orderBy(desc(operationalConfidenceSnapshot.generatedAt)).limit(1))[0]?.id;

  for (const phase of ["UNDERSTAND", "PRIORITIZE", "DECIDE", "PREPARE", "WAIT", "REVIEW", "OBSERVE"] as const) {
    await transitionExecutiveLoop(`controlled transition to ${phase}`, phase);
  }
  const afterCycle = await executiveLoopState();
  assert.equal(afterCycle.phase, "OBSERVE");
  assert.equal(afterCycle.cycleCount, initialCycle + 1);
  assert.ok(afterCycle.phaseDurations.OBSERVE >= 0);
  assert.ok((await executiveLoopHistory()).some((event) => event.eventType === "ExecutiveLoopPhaseChanged"));

  const resumed = await executiveLoopState();
  assert.equal(resumed.id, afterCycle.id);
  assert.equal(resumed.phase, "OBSERVE");

  await transitionExecutiveLoop("enter decision phase for critical interrupt", "DECIDE");
  const interruptedBefore = (await executiveLoopState()).interrupted;
  const interrupted = await interruptExecutiveLoop("BuildFailed", randomUUID());
  assert.equal(interrupted.phase, "OBSERVE");
  assert.equal(interrupted.interrupted, interruptedBefore + 1);
  assert.equal(interrupted.lastReason, "critical interrupt: BuildFailed");
  assert.ok((await executiveLoopHistory()).some((event) => event.eventType === "ExecutiveLoopInterrupted"));

  await transitionExecutiveLoop("enter understanding for OIE heartbeat", "UNDERSTAND");
  const contextBefore = (await db.select({ id: operationalContextSnapshot.id }).from(operationalContextSnapshot).orderBy(desc(operationalContextSnapshot.generatedAt)).limit(1))[0]?.id;
  await runExecutiveLoopTick();
  const contextAfter = await currentOperationalContext();
  assert.notEqual(contextAfter.id, contextBefore);
  const confidenceAfter = (await db.select({ id: operationalConfidenceSnapshot.id }).from(operationalConfidenceSnapshot).orderBy(desc(operationalConfidenceSnapshot.generatedAt)).limit(1))[0]?.id;
  assert.ok(confidenceAfter);
  assert.notEqual(confidenceAfter, confidenceBefore);

  const jobId = randomUUID();
  await db.insert(scheduledJob).values({ id: jobId, jobType: "executive_loop_tick", runAt: new Date(Date.now() - 1_000), payload: { controlledProof: true } });
  const firstExecution = await executeScheduledJob(jobId);
  const secondExecution = await executeScheduledJob(jobId);
  assert.equal(firstExecution.job?.status, "completed");
  assert.equal(secondExecution.eventId, null);
  assert.equal(secondExecution.message, "Job already completed.");
  const jobEvents = await db.select().from(eventLog).where(and(eq(eventLog.aggregateType, "scheduled_job"), eq(eventLog.aggregateId, jobId)));
  assert.equal(jobEvents.filter((event) => event.eventType === "JobCompleted").length, 1);

  const feedback = `Owner review feedback ${randomUUID()}`;
  const review = await recordExecutiveLoopReview({ feedback, outcome: "needs_adjustment" });
  assert.equal(review.event.eventType, "ExecutiveLoopReviewRecorded");
  const [signal] = await db.select().from(behavioralSignal).where(eq(behavioralSignal.id, review.signal.id));
  assert.equal(signal.metadata.feedback, feedback);
  assert.equal(signal.evidenceEventId, review.event.id);

  const history = await executiveLoopHistory();
  assert.ok(history.length >= 9);
});
