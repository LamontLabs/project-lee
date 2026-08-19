import { Router, type IRouter } from "express";
import { resourceStatus, sampleResources, updateQuota } from "../lib/resource";
const router: IRouter = Router();
router.get("/resources/state", async (_req, res) => res.json(await resourceStatus()));
router.post("/resources/sample", async (req, res) => res.status(201).json(await sampleResources({ batteryLevel: req.body?.batteryLevel, charging: req.body?.charging })));
router.post("/resources/quotas", async (req, res) => res.status(201).json(await updateQuota(String(req.body?.provider), Number(req.body?.used ?? 0), Number(req.body?.limit ?? 0), req.body?.resetAt ? new Date(req.body.resetAt) : undefined)));
export default router;