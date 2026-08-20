import { Router, type IRouter } from "express";
import { currentOperationalCapacity, computeOperationalCapacity, setCapacityOverride } from "../lib/operational-capacity";
const router: IRouter = Router();
router.get("/operational-capacity", async (_req, res) => res.json(await currentOperationalCapacity()));
router.get("/operational-capacity/history", async (_req, res) => res.json(await computeOperationalCapacity()));
router.post("/operational-capacity/recompute", async (_req, res) => res.json(await computeOperationalCapacity("manual")));
router.post("/operational-capacity/override", async (req, res) => res.json(await setCapacityOverride(req.body?.state ?? null)));
export default router;