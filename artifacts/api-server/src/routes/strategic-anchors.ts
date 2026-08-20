import { Router, type IRouter } from "express";
import { createAnchor, listAnchors, retireAnchor } from "../lib/strategic-anchors";
const router: IRouter = Router();
router.get("/strategic-anchors", async (req, res) => res.json(await listAnchors(req.query.includeRetired === "true")));
router.post("/strategic-anchors", async (req, res) => { try { res.status(201).json(await createAnchor(req.body)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Unable to create anchor" }); } });
router.post("/strategic-anchors/:id/retire", async (req, res) => res.json(await retireAnchor(req.params.id)));
export default router;