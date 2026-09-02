import { Router, type IRouter } from "express";
import { checkConstitution, constitutionStatus, ensureConstitution, proposeAmendment } from "../lib/constitution";
const router: IRouter = Router();
router.get("/constitution", async (_req, res) => res.json(await constitutionStatus()));
router.post("/constitution/check", async (req, res) => res.json(await checkConstitution(String(req.body?.actionType ?? ""), req.body?.payload ?? {}, String(req.body?.engineName ?? "unknown"))));
router.post("/constitution/amendments", async (req, res) => { if (!req.body?.reason || !req.body?.provisions) { res.status(400).json({ error: "reason and provisions are required." }); return; } res.status(202).json(await proposeAmendment({ reason: String(req.body.reason), provisions: req.body.provisions })); });
router.post("/constitution/seed", async (_req, res) => { await ensureConstitution(); res.json(await constitutionStatus()); });
export default router;