import { Router, type IRouter } from "express";
import { confirmRule, detectLearningPatterns, learningStatus, queueLearning, recordCorrection } from "../lib/learning";
const router: IRouter = Router();
router.get("/learning", async (_req, res) => res.json(await learningStatus()));
router.post("/learning/corrections", async (req, res) => res.status(201).json(await recordCorrection(req.body ?? {})));
router.post("/learning/detect", async (_req, res) => res.json({ proposedRules: await detectLearningPatterns() }));
router.post("/learning/queue", async (_req, res) => res.status(202).json(await queueLearning()));
router.post("/learning/rules/:id/:status", async (req, res) => { if (!["confirmed", "dismissed"].includes(req.params.status)) { res.status(400).json({ error: "Invalid rule status." }); return; } const item = await confirmRule(req.params.id, req.params.status as "confirmed" | "dismissed"); if (!item) { res.status(404).json({ error: "Rule not found." }); return; } res.json(item); });
export default router;