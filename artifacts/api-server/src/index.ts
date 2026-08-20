import app from "./app";
import { logger } from "./lib/logger";
import { deliverCriticalAndroidPushes } from "./lib/android-push";
import { runDueJobs } from "./lib/scheduler";
import { orchestrationTick } from "./lib/orchestration";
import { startBoot } from "./lib/recovery-modes";
import { ensureKnowledgeAgingJob } from "./lib/knowledge-aging";
import { ensureWorldStateJob } from "./lib/world-state";
import { ensureOperationalMemoryJob } from "./lib/operational-memory";
import { db, scheduledJob } from "@workspace/db";
import { eq } from "drizzle-orm";
import { registerProviders } from "./lib/provider-abstraction";
import { registerInternalServices } from "./services/internal-services";
import { subscribe } from "./lib/domain-events";
import { interruptExecutiveLoop } from "./lib/executive-loop";
import { computeOperationalConfidence } from "./lib/operational-confidence";
import { computeProjectMomentum } from "./lib/project-momentum";
import { detectOpportunities } from "./lib/opportunity";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

startBoot().catch((err) => logger.error({ err }, "Boot mode selection failed"));
ensureKnowledgeAgingJob().catch((err) => logger.error({ err }, "Knowledge aging job registration failed"));
ensureWorldStateJob().catch((err) => logger.error({ err }, "World state job registration failed"));
ensureOperationalMemoryJob().catch((err) => logger.error({ err }, "Operational memory job registration failed"));
db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "initiative_scan")).limit(1).then(([job]) => job ?? db.insert(scheduledJob).values({ jobType: "initiative_scan", runAt: new Date(Date.now() + 60_000), recurrence: "daily", payload: { engine: "Initiative Engine" } })).catch((err) => logger.error({ err }, "Initiative job registration failed"));
db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "operational_intelligence_refresh")).limit(1).then(([job]) => job ?? db.insert(scheduledJob).values({ jobType: "operational_intelligence_refresh", runAt: new Date(Date.now() + 60_000), recurrence: "15m", payload: { engine: "Operational Intelligence Engine" } })).catch((err) => logger.error({ err }, "Operational intelligence job registration failed"));
setInterval(() => void deliverCriticalAndroidPushes().catch((err) => logger.error({ err }, "Android push delivery cycle failed")), 30_000);
db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "executive_loop_tick")).limit(1).then(([job]) => job ?? db.insert(scheduledJob).values({ jobType: "executive_loop_tick", runAt: new Date(Date.now() + 5_000), recurrence: "1m", payload: { engine: "Executive Loop" } })).catch((err) => logger.error({ err }, "Executive Loop job registration failed"));
registerProviders().catch((err) => logger.error({ err }, "Provider registry registration failed"));
registerInternalServices().catch((err) => logger.error({ err }, "Internal service registry registration failed"));
for (const eventType of ["GovernedActionHeld", "BuildFailed", "OperationalPatternBroken", "GovernanceServiceUnavailable"] as const) subscribe(eventType, (event) => { void interruptExecutiveLoop(eventType, event.id).catch((err) => logger.error({ err }, "Executive Loop interrupt failed")); });
for (const eventType of ["ConnectorSynced", "ConnectorFailed", "CILUnavailable", "GovernanceServiceUnavailable", "KnowledgeStale", "KnowledgeAged"] as const) subscribe(eventType, () => { void computeOperationalConfidence().catch((err) => logger.error({ err }, "Operational Confidence recompute failed")); });
for (const eventType of ["CommitPushed", "PRMerged", "DocumentCreated", "DocumentUpdated", "SourceVaultRecordCreated", "WaitingLoopResolved", "EmailReceived", "ThreadUpdated"] as const) subscribe(eventType, (event) => { void computeProjectMomentum(typeof event.payload.projectId === "string" ? event.payload.projectId : undefined).catch((err) => logger.error({ err }, "Project Momentum recompute failed")); });
for (const eventType of ["BootstrapCompleted", "CommitPushed", "FactCreated", "ProjectMomentumChanged"] as const) subscribe(eventType, () => { void detectOpportunities().catch((err) => logger.error({ err }, "Opportunity detection failed")); });
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  const scheduler = setInterval(() => {
    orchestrationTick().catch((err) => logger.error({ err }, "Orchestration tick failed"));
    runDueJobs().catch((err) => logger.error({ err }, "Scheduler tick failed"));
  }, 30_000);
  scheduler.unref();
});
