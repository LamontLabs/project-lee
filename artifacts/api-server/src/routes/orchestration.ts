import { Router, type IRouter } from "express";
import { enqueueWork, orchestrationStatus, orchestrationTick, recoverEngine, validateEngineDependencies } from "../lib/orchestration";
const router: IRouter = Router();
router.get("/orchestration/status", async (_req, res) => res.json(await orchestrationStatus()));
router.get("/orchestration/calendar", async (_req, res) => {
  const status = await orchestrationStatus();
  res.json(status.engines.map((engine) => ({ engineName: engine.name, frequency: engine.frequency, priority: engine.priorityClass, nextRun: engine.frequency?.includes("02:00") ? "02:00" : engine.frequency?.includes("daily") ? "07:00" : engine.frequency?.includes("hourly") ? "every hour" : "event-driven", lastResult: status.health.find((h) => h.engineName === engine.name)?.lastFailureAt ? "WARN" : "PASS", estimatedDurationMs: status.health.find((h) => h.engineName === engine.name)?.averageDurationMs ?? 0 })));
});
router.post("/orchestration/work", async (req, res) => {
  if (!req.body?.engineName || !req.body?.action) { res.status(400).json({ error: "engineName and action are required." }); return; }
  res.status(201).json(await enqueueWork(req.body));
});
router.post("/orchestration/tick", async (_req, res) => res.json({ item: await orchestrationTick() }));
router.post("/orchestration/validate-dependencies", async (_req, res) => res.json({ engines: await validateEngineDependencies() }));
router.post("/orchestration/recover/:engineId", async (req, res) => res.json({ engines: await recoverEngine(req.params.engineId) }));
export default router;