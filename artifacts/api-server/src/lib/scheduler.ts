import { and, eq, lte, inArray } from "drizzle-orm";
import { db, eventLog, scheduledJob } from "@workspace/db";
import { generateOperationalReview } from "./operational-review";
import { runSelfImprovementCycle } from "./self-improvement";
import { runSystemEconomicsCycle } from "./system-economics";
import { generateBrief, scanFreshness } from "./time-engine";
import { runKnowledgeAgingScan } from "./knowledge-aging";
import { refreshWorldState } from "./world-state";
import { detectOperationalPatterns } from "./operational-memory";
import { generateInitiatives } from "./initiative";
import { generateOperationalContext } from "./operational-intelligence";
import { runExecutiveLoopTick } from "./executive-loop";
import { runRequestPipeline } from "./request-pipeline";
import { renewGmailWatches } from "./gmail-sync";

export async function executeScheduledJob(id: string) {
  const [job] = await db.select().from(scheduledJob).where(eq(scheduledJob.id, id)).limit(1);
  if (!job) return { job: null, eventId: null, message: "Job not found." };
  if (job.status === "completed") return { job, eventId: null, message: "Job already completed." };

  if (job.dependencies.length > 0) {
    const dependencies = await db
      .select({ id: scheduledJob.id, status: scheduledJob.status })
      .from(scheduledJob)
      .where(inArray(scheduledJob.id, job.dependencies));
    if (dependencies.some((dependency) => dependency.status !== "completed")) {
      const [failedJob] = await db
        .update(scheduledJob)
        .set({
          status: "failed",
          attempts: job.attempts + 1,
          lastError: "Dependency is not completed.",
          updatedAt: new Date(),
        })
        .where(eq(scheduledJob.id, id))
        .returning();
      const [event] = await db.insert(eventLog).values({
        eventType: "JobFailed",
        aggregateType: "scheduled_job",
        aggregateId: id,
        sourceRef: "scheduler",
        occurredAt: new Date(),
        payload: { jobId: id, jobType: job.jobType, reason: failedJob.lastError },
      }).returning();
      return { job: failedJob, eventId: event.id, message: "Job failed dependency check." };
    }
  }

  const [running] = await db
    .update(scheduledJob)
    .set({ status: "running", attempts: job.attempts + 1, updatedAt: new Date() })
    .where(eq(scheduledJob.id, id))
    .returning();
  const pipeline = await runRequestPipeline({ text: `Scheduled job ${job.jobType}`, origin: "scheduled", actionType: job.jobType, engineName: "Scheduler", mode: "normal", budgetTokens: 1000, payload: { jobId: id, jobType: job.jobType } });
  if (!pipeline.ok) {
    const now = new Date();
    const [failed] = await db.update(scheduledJob).set({ status: "failed", lastError: `Request pipeline stopped at ${pipeline.failedStage}: ${pipeline.error}`, updatedAt: now }).where(eq(scheduledJob.id, id)).returning();
    const [event] = await db.insert(eventLog).values({ eventType: "JobFailed", aggregateType: "scheduled_job", aggregateId: id, sourceRef: "scheduler", occurredAt: now, payload: { jobId: id, jobType: job.jobType, reason: failed.lastError, pipeline: { correlationId: pipeline.correlationId, failedStage: pipeline.failedStage, completedStages: pipeline.stages } } }).returning();
    return { job: failed, eventId: event.id, message: "Scheduled job stopped by request pipeline." };
  }
  let handlerError: string | null = null;
  if (job.jobType === "operational_review") {
    try {
      const cadence = job.payload.cadence;
      const periodStart = job.payload.periodStart;
      const periodEnd = job.payload.periodEnd;
      if (
        cadence !== "weekly" &&
        cadence !== "monthly" &&
        cadence !== "quarterly" &&
        cadence !== "annual"
      ) {
        throw new Error("Operational review job requires a valid cadence.");
      }
      if (typeof periodStart !== "string" || typeof periodEnd !== "string") {
        throw new Error("Operational review job requires periodStart and periodEnd.");
      }
      await generateOperationalReview({
        cadence,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      });
    } catch (error) {
      handlerError = error instanceof Error ? error.message : "Operational review handler failed.";
    }
  }
  if (job.jobType === "self_improvement") {
    try {
      await runSelfImprovementCycle();
    } catch (error) {
      handlerError = error instanceof Error ? error.message : "Self-improvement handler failed.";
    }
  }
  if (job.jobType === "system_economics") {
    try {
      await runSystemEconomicsCycle();
    } catch (error) {
      handlerError = error instanceof Error ? error.message : "System economics handler failed.";
    }
  }
  if (job.jobType === "freshness_scan") {
    try { await scanFreshness(); } catch (error) { handlerError = error instanceof Error ? error.message : "Freshness scan failed."; }
  }
  if (job.jobType === "knowledge_aging_scan") {
    try { await runKnowledgeAgingScan(); } catch (error) { handlerError = error instanceof Error ? error.message : "Knowledge aging scan failed."; }
  }
  if (job.jobType === "world_state_refresh") {
    try { await refreshWorldState(); } catch (error) { handlerError = error instanceof Error ? error.message : "World state refresh failed."; }
  }
  if (job.jobType === "operational_memory_scan") {
    try { await detectOperationalPatterns(); } catch (error) { handlerError = error instanceof Error ? error.message : "Operational memory scan failed."; }
  }
  if (job.jobType === "initiative_scan") {
    try { await generateInitiatives(); } catch (error) { handlerError = error instanceof Error ? error.message : "Initiative scan failed."; }
  }
  if (job.jobType === "operational_intelligence_refresh") {
    try { await generateOperationalContext(); } catch (error) { handlerError = error instanceof Error ? error.message : "Operational intelligence refresh failed."; }
  }
  if (job.jobType === "gmail_watch_renewal") {
    try { await renewGmailWatches(); } catch (error) { handlerError = error instanceof Error ? error.message : "Gmail watch renewal failed."; }
  }
  if (job.jobType === "executive_loop_tick") {
    try { await runExecutiveLoopTick(); } catch (error) { handlerError = error instanceof Error ? error.message : "Executive Loop tick failed."; }
  }
  if (job.jobType === "morning_brief" || job.jobType === "evening_reflection" || job.jobType === "weekly_review") {
    try {
      const briefType = job.jobType === "morning_brief" ? "today" : job.jobType === "evening_reflection" ? "evening" : "weekly";
      await generateBrief(briefType);
    } catch (error) { handlerError = error instanceof Error ? error.message : "Brief generation failed."; }
  }
  const supported =
    job.jobType === "maintenance" ||
    job.jobType === "health_check" ||
    job.jobType === "operational_review" ||
    job.jobType === "self_improvement" ||
    job.jobType === "system_economics" ||
    job.jobType === "freshness_scan" ||
    job.jobType === "knowledge_aging_scan" ||
    job.jobType === "world_state_refresh" ||
    job.jobType === "operational_memory_scan" ||
    job.jobType === "initiative_scan" ||
    job.jobType === "operational_intelligence_refresh" ||
    job.jobType === "gmail_watch_renewal" ||
    job.jobType === "executive_loop_tick" ||
    job.jobType === "morning_brief" ||
    job.jobType === "evening_reflection" ||
    job.jobType === "weekly_review";
  const now = new Date();
  if (!supported || handlerError) {
    const [failed] = await db
      .update(scheduledJob)
      .set({
        status: "failed",
        lastError: handlerError ?? `No registered handler for job type "${job.jobType}".`,
        updatedAt: now,
      })
      .where(eq(scheduledJob.id, id))
      .returning();
    const [event] = await db.insert(eventLog).values({
      eventType: "JobFailed",
      aggregateType: "scheduled_job",
      aggregateId: id,
      sourceRef: "scheduler",
      occurredAt: now,
      payload: { jobId: id, jobType: job.jobType, reason: failed.lastError },
    }).returning();
    return { job: failed, eventId: event.id, message: handlerError ?? "Job failed: no registered handler." };
  }

  const recurringGmailWatch = job.jobType === "gmail_watch_renewal";
  const [completed] = await db
    .update(scheduledJob)
    .set({
      status: recurringGmailWatch ? "pending" : "completed",
      runAt: recurringGmailWatch ? new Date(now.getTime() + 30 * 60_000) : job.runAt,
      completedAt: recurringGmailWatch ? null : now,
      updatedAt: now,
      lastError: null,
    })
    .where(eq(scheduledJob.id, id))
    .returning();
  const [event] = await db.insert(eventLog).values({
    eventType: "JobCompleted",
    aggregateType: "scheduled_job",
    aggregateId: id,
    sourceRef: "scheduler",
    occurredAt: now,
    payload: { jobId: id, jobType: job.jobType, attempts: running.attempts },
  }).returning();
  return { job: completed, eventId: event.id, message: "Job completed." };
}

export async function runDueJobs() {
  const due = await db
    .select({ id: scheduledJob.id })
    .from(scheduledJob)
    .where(and(eq(scheduledJob.status, "pending"), lte(scheduledJob.runAt, new Date())))
    .limit(20);
  for (const job of due) await executeScheduledJob(job.id);
  return due.length;
}