import { Router, type IRouter } from "express";
import { getState, stateHistoryList, transitionState } from "../lib/state";
const router: IRouter = Router();
router.get("/state", async (_req, res) => res.json(await getState()));
router.get("/state/history", async (req, res) => res.json(await stateHistoryList(Number(req.query.limit ?? 100))));
router.post("/state/transition", async (req, res): Promise<void> => { try { res.json(await transitionState(String(req.body?.state), String(req.body?.reason ?? "System transition"), req.body?.triggeringJobId, req.body?.estimatedDurationSeconds)); } catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : "State transition rejected." }); } });
export default router;