import { Router, type IRouter } from "express";
import { getConsolidationRun, listConsolidationRuns, runConsolidation } from "../lib/memory-consolidation";

const router: IRouter = Router();

router.get("/memory/consolidation/runs", async (req, res) => {
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
  res.json(await listConsolidationRuns(Number.isFinite(limit) ? limit : 50));
});

router.get("/memory/consolidation/runs/:id", async (req, res): Promise<void> => {
  try {
    res.json(await getConsolidationRun(req.params.id));
  } catch (error) {
    res.status(error instanceof Error && error.message === "CONSOLIDATION_RUN_NOT_FOUND" ? 404 : 400)
      .json({ error: error instanceof Error ? error.message : "Unable to load consolidation run." });
  }
});

router.post("/memory/consolidation/runs", async (req, res): Promise<void> => {
  try {
    const body = req.body ?? {};
    const result = await runConsolidation({
      runId: typeof body.runId === "string" ? body.runId : undefined,
      runKey: typeof body.runKey === "string" ? body.runKey : undefined,
      failurePhase: typeof body.failurePhase === "string" ? body.failurePhase : undefined,
      budgetTokens: typeof body.budgetTokens === "number" ? body.budgetTokens : undefined,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to start consolidation." });
  }
});

router.post("/memory/consolidation/runs/:id/resume", async (req, res): Promise<void> => {
  try {
    res.json(await runConsolidation({
      runId: req.params.id,
      budgetTokens: typeof req.body?.budgetTokens === "number" ? req.body.budgetTokens : undefined,
    }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unable to resume consolidation." });
  }
});

export default router;