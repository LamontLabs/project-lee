import { Router, type IRouter } from "express";
import { setMode, queueWorkspaceEvaluation, workspaceStatus } from "../lib/workspace";
const router: IRouter = Router();
router.get("/workspace", async (_req, res) => res.json(await workspaceStatus()));
router.post("/workspace/mode", async (req, res) => { try { res.json(await setMode(String(req.body?.modeName), String(req.body?.reason ?? "Owner selected this mode."), req.body?.manualOverride !== false)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Unable to set mode." }); } });
router.post("/workspace/evaluate", async (_req, res) => res.status(202).json(await queueWorkspaceEvaluation()));
export default router;