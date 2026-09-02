import { Router, type IRouter } from "express";
import { evaluatePatternAlignment, listDecisionHeuristics, recordDecisionObservation, recomputeDecisionHeuristics } from "../lib/decision-memory";

const router: IRouter = Router();

router.get("/decision-memory/heuristics", async (_req, res): Promise<void> => {
  res.json(await listDecisionHeuristics());
});

router.post("/decision-memory/observe", async (req, res): Promise<void> => {
  try {
    res.status(201).json(await recordDecisionObservation(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Decision observation failed." });
  }
});

router.post("/decision-memory/recompute", async (_req, res): Promise<void> => {
  res.json(await recomputeDecisionHeuristics());
});

router.post("/decision-memory/alignment", async (req, res): Promise<void> => {
  if (typeof req.body?.recommendationText !== "string") { res.status(400).json({ error: "recommendationText is required." }); return; }
  res.json(await evaluatePatternAlignment(req.body.recommendationText, req.body.category));
});

export default router;