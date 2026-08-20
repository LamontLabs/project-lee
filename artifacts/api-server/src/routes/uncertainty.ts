import { Router, type IRouter } from "express";
import { computeUncertainty, currentUncertainty } from "../lib/uncertainty";
const router: IRouter = Router();
router.get("/uncertainty", async (req, res) => res.json(await currentUncertainty(typeof req.query.objectId === "string" ? req.query.objectId : undefined, typeof req.query.objectType === "string" ? req.query.objectType : undefined)));
router.post("/uncertainty/recompute", async (_req, res) => res.json(await computeUncertainty()));
export default router;