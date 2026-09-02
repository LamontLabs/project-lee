import { Router, type IRouter } from "express";
import { internalServiceHealth, reasoningService, governanceService } from "../services/internal-services";
const router: IRouter = Router();
router.get("/internal-services/health", async (_req, res) => res.json(await internalServiceHealth()));
router.post("/internal-services/health/check", async (_req, res) => res.json(await internalServiceHealth()));
router.post("/internal-services/cil/query", async (req, res) => {
  try { return res.json(await reasoningService.query(req.body)); } catch { return res.status(503).json({ error: "CIL unavailable; no external model route was selected." }); }
});
router.post("/internal-services/cerbaseal/evaluate", async (req, res) => res.json(await governanceService.evaluate(req.body)));
export default router;