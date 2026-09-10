import { Router, type IRouter } from "express";
import {
  getK6AuthorityRehearsalHistory,
  getLatestK6AuthorityRehearsal,
  runK6AuthorityRehearsal,
} from "../lib/k6-authority-rehearsal";

const router: IRouter = Router();

router.get("/k6-authority-rehearsal", async (_req, res) => {
  res.json(await getLatestK6AuthorityRehearsal());
});

router.get("/k6-authority-rehearsal/history", async (_req, res) => {
  res.json(await getK6AuthorityRehearsalHistory());
});

router.post("/k6-authority-rehearsal/run", async (req, res): Promise<void> => {
  try {
    const result = await runK6AuthorityRehearsal({
      scenario: req.body?.scenario,
      simulationOnly: req.body?.simulationOnly,
      ownerApproved: req.body?.ownerApproved,
      rollbackCriteria: req.body?.rollbackCriteria,
      interruption: req.body?.interruption,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "K6 authority rehearsal failed." });
  }
});

export default router;