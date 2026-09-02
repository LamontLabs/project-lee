import { Router, type IRouter } from "express";
import { confidenceChain, confidenceStatus } from "../lib/confidence";
const router: IRouter = Router();
router.get("/confidence", async (_req, res) => res.json(await confidenceStatus()));
router.get("/confidence/:kind/:id", async (req, res) => { const item = await confidenceChain(req.params.kind, req.params.id); if (!item) { res.status(404).json({ error: "Confidence lineage not found." }); return; } res.json(item); });
export default router;