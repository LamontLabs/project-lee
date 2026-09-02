import { Router, type IRouter } from "express";
import { dependencyImpact, getPortfolioDependencyGraph, recomputePortfolioDependencyGraph } from "../lib/portfolio-dependency";
const router: IRouter = Router();
router.get("/portfolio/dependency-graph", async (_req,res) => res.json(await getPortfolioDependencyGraph()));
router.get("/portfolio/dependency-graph/impact", async (req,res) => res.json(await dependencyImpact(String(req.query.label ?? ""))));
router.post("/portfolio/dependency-graph/recompute", async (_req,res) => res.json(await recomputePortfolioDependencyGraph()));
export default router;