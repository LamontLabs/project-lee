import { desc, eq } from "drizzle-orm";
import {
  ListScheduledJobsResponse,
  ScheduleJobBody,
  ScheduleJobResponse,
  RunScheduledJobResponse,
} from "@workspace/api-zod";
import { db, eventLog, scheduledJob } from "@workspace/db";
import { Router, type IRouter } from "express";
import { executeScheduledJob } from "../lib/scheduler";

const router: IRouter = Router();

function serializeJob(job: typeof scheduledJob.$inferSelect) {
  return {
    ...job,
    recurrence: job.recurrence ?? undefined,
    lastError: job.lastError ?? undefined,
    completedAt: job.completedAt ?? undefined,
  };
}

router.post("/scheduler/jobs", async (req, res): Promise<void> => {
  const parsed = ScheduleJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const now = new Date();
  const [job] = await db.insert(scheduledJob).values({
    jobType: input.jobType,
    runAt: new Date(input.runAt),
    recurrence: input.recurrence,
    dependencies: input.dependencies ?? [],
    payload: input.payload ?? {},
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }).returning();
  await db.insert(eventLog).values({
    eventType: "JobScheduled",
    aggregateType: "scheduled_job",
    aggregateId: job.id,
    sourceRef: "scheduler",
    occurredAt: now,
    payload: { jobId: job.id, jobType: job.jobType, runAt: job.runAt.toISOString(), recurrence: job.recurrence },
  });
  res.status(201).json(ScheduleJobResponse.parse(serializeJob(job)));
});

router.get("/scheduler/jobs", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(scheduledJob).orderBy(desc(scheduledJob.runAt)).limit(100);
  res.json(ListScheduledJobsResponse.parse(jobs.map(serializeJob)));
});

router.post("/scheduler/jobs/:id/run", async (req, res): Promise<void> => {
  const result = await executeScheduledJob(req.params.id);
  if (!result.job) {
    res.status(404).json({ error: result.message });
    return;
  }
  res.json(RunScheduledJobResponse.parse({
    job: serializeJob(result.job),
    eventId: result.eventId,
    message: result.message,
  }));
});

export default router;