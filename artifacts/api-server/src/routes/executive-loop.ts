import { Router, type IRouter } from "express";
import { executiveLoopHistory, executiveLoopState, interruptExecutiveLoop, runExecutiveLoopTick } from "../lib/executive-loop";
const router: IRouter = Router();
router.get("/internal/executive-loop/state", async (_req, res) => res.json(await executiveLoopState()));
router.get("/internal/executive-loop/history", async (_req, res) => res.json(await executiveLoopHistory()));
router.post("/internal/executive-loop/tick", async (_req, res) => res.json(await runExecutiveLoopTick()));
router.post("/internal/executive-loop/interrupt", async (req, res) => res.json(await interruptExecutiveLoop(String(req.body?.eventType ?? "OwnerInteraction"), req.body?.eventId)));
export default router;