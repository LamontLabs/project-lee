import { Router, type IRouter } from "express";
import { executiveLoopHistory, executiveLoopState, interruptExecutiveLoop, recordExecutiveLoopReview, runExecutiveLoopTick } from "../lib/executive-loop";
const router: IRouter = Router();
router.get("/internal/executive-loop/state", async (_req, res) => res.json(await executiveLoopState()));
router.get("/internal/executive-loop/history", async (_req, res) => res.json(await executiveLoopHistory()));
router.post("/internal/executive-loop/tick", async (_req, res) => res.json(await runExecutiveLoopTick()));
router.post("/internal/executive-loop/interrupt", async (req, res) => res.json(await interruptExecutiveLoop(String(req.body?.eventType ?? "OwnerInteraction"), req.body?.eventId)));
router.post("/internal/executive-loop/review", async (req, res) => {
  const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";
  if (!feedback) { res.status(400).json({ error: "Review feedback is required." }); return; }
  res.status(201).json(await recordExecutiveLoopReview({ feedback, outcome: typeof req.body?.outcome === "string" ? req.body.outcome : undefined, cycleCount: Number.isInteger(req.body?.cycleCount) ? req.body.cycleCount : undefined }));
});
export default router;