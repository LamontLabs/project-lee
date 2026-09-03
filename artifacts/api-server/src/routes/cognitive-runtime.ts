import { Router, type IRouter } from "express";
import { cognitiveRuntimeHistory, currentCognitiveRuntime, runCognitiveRuntimeCycle } from "../lib/cognitive-runtime";

const router: IRouter = Router();

async function current(_req: any, res: any) {
  res.json(await currentCognitiveRuntime());
}

async function history(req: any, res: any) {
  const requested = Number(req.query.limit ?? 50);
  res.json(await cognitiveRuntimeHistory(Number.isFinite(requested) ? requested : 50));
}

async function refresh(req: any, res: any) {
  const trigger = req.body?.trigger === "restart" ? "restart" : req.body?.trigger === "manual" ? "manual" : "manual";
  const result = await runCognitiveRuntimeCycle(trigger);
  res.status(result.blocked ? 423 : result.status === "failed" ? 503 : 200).json(result);
}

router.get("/cognitive-runtime/current", current);
router.get("/cognitive-runtime/history", history);
router.post("/cognitive-runtime/refresh", refresh);
router.get("/internal/cognitive-runtime/current", current);
router.get("/internal/cognitive-runtime/history", history);
router.post("/internal/cognitive-runtime/refresh", refresh);

export default router;