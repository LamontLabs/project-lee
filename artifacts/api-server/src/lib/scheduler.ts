import { and, eq, lte, inArray } from "drizzle-orm";
import { db, eventLog, scheduledJob } from "@workspace/db";

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
  const supported = job.jobType === "maintenance" || job.jobType === "health_check";
  const now = new Date();
  if (!supported) {
    const [failed] = await db
      .update(scheduledJob)
      .set({
        status: "failed",
        lastError: `No registered handler for job type "${job.jobType}".`,
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
    return { job: failed, eventId: event.id, message: "Job failed: no registered handler." };
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