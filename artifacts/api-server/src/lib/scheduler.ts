import { and, eq, lte, inArray } from "drizzle-orm";
import { db, eventLog, scheduledJob } from "@workspace/db";
import { generateOperationalReview } from "./operational-review";
import { runSelfImprovementCycle } from "./self-improvement";

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
  const supported =
    job.jobType === "maintenance" ||
    job.jobType === "health_check" ||
    job.jobType === "operational_review" ||
    job.jobType === "self_improvement";
    job.jobType === "self_improvement";
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

  const [completed] = await db
    .update(scheduledJob)
    .set({ status: "completed", completedAt: now, updatedAt: now, lastError: null })
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