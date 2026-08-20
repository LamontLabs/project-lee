import { Router, type IRouter } from "express";
import { activeOpportunities, detectOpportunities, resolveOpportunity } from "../lib/opportunity";
const router: IRouter = Router();
router.get("/opportunities", async (_req, res) => res.json(await activeOpportunities()));
router.post("/opportunities/detect", async (_req, res) => res.json(await detectOpportunities()));
router.post("/opportunities/:id/resolve", async (req, res) => res.json(await resolveOpportunity(req.params.id)));
export default router;