import { Router, type IRouter } from "express";
import { cognitiveRuntimeHistory, currentCognitiveRuntime, runCognitiveRuntimeCycle } from "../lib/cognitive-runtime";
import { getWelcomeBackBriefing } from "../lib/welcome-back-briefing";

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
router.get("/cognitive-runtime/welcome-back", async (_req, res) => {
  try {
    const briefing = await getWelcomeBackBriefing();
    res.status(briefing.status === "recovery_protected" ? 423 : 200).json(briefing);
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Welcome-back briefing is unavailable." });
  }
});
router.get("/internal/cognitive-runtime/current", current);
router.get("/internal/cognitive-runtime/history", history);
router.post("/internal/cognitive-runtime/refresh", refresh);

export default router;