import { Router, type IRouter } from "express";
import { computeOperationalConfidence, currentOperationalConfidence, operationalConfidenceHistory } from "../lib/operational-confidence";
const router: IRouter = Router();
router.get("/operational-confidence", async (_req, res) => res.json(await currentOperationalConfidence()));
router.get("/operational-confidence/history", async (_req, res) => res.json(await operationalConfidenceHistory()));
router.post("/internal/operational-confidence/recompute", async (_req, res) => res.json(await computeOperationalConfidence()));
export default router;