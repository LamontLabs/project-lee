import { Router, type IRouter } from "express";
import { computePortfolioState, currentPortfolioState, portfolioHistory } from "../lib/portfolio-intelligence";
const router: IRouter = Router();
router.get("/portfolio", async (_req, res) => res.json(await currentPortfolioState()));
router.get("/portfolio/history", async (_req, res) => res.json(await portfolioHistory()));
router.post("/portfolio/recompute", async (_req, res) => res.json(await computePortfolioState()));
export default router;