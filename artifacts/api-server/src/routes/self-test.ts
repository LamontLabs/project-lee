import { Router, type IRouter } from "express";
import { runSelfTest, selfTestHistory } from "../lib/self-test";

const router: IRouter = Router();
router.get("/self-tests", async (_req, res) => res.json(await selfTestHistory()));
router.post("/self-tests/run", async (_req, res) => res.status(201).json(await runSelfTest()));
export default router;