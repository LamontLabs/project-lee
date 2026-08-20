import app from "./app";
import { logger } from "./lib/logger";
import { runDueJobs } from "./lib/scheduler";
import { orchestrationTick } from "./lib/orchestration";
import { startBoot } from "./lib/recovery-modes";
import { ensureKnowledgeAgingJob } from "./lib/knowledge-aging";
import { ensureWorldStateJob } from "./lib/world-state";

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
