import { Router, type IRouter } from "express";
import { getNamedSnapshot, listTimeMachineSnapshots, reconstructTimeMachine } from "../lib/time-machine";
const router: IRouter = Router();
router.get("/time-machine/snapshots", async (_req, res) => res.json(await listTimeMachineSnapshots()));
router.get("/time-machine/snapshots/:id", async (req, res): Promise<void> => { const item = await getNamedSnapshot(req.params.id); if (!item) { res.status(404).json({ error: "Snapshot not found." }); return; } res.json(item); });
router.post("/time-machine/reconstruct", async (req, res) => { try { res.json(await reconstructTimeMachine(String(req.body?.reference ?? ""), typeof req.body?.name === "string" ? req.body.name : undefined)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Unable to reconstruct snapshot." }); } });
export default router;