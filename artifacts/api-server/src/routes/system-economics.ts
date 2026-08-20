import { Router, type IRouter } from "express";
import { getSystemEconomicsSummary, runSystemEconomicsCycle, systemEconomicsContract } from "../lib/system-economics";
import { runCILCostBenchmark } from "../lib/cil-cost-benchmark";

const router: IRouter = Router();

router.get("/economics/summary", async (_req, res): Promise<void> => {
  res.json(await getSystemEconomicsSummary());
});

router.post("/economics/cycle", async (_req, res): Promise<void> => {
  res.status(201).json(await runSystemEconomicsCycle());
});

router.get("/economics/cil-benchmark", (_req, res): void => {
  res.json(runCILCostBenchmark());
});
router.get("/economics/contract", (_req, res): void => {
  res.json(systemEconomicsContract());
});

export default router;