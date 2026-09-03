import { Router, type IRouter, type Response } from "express";
import { checkConstitution } from "../lib/constitution";
import {
  getEpistemicHistory,
  getBeliefHistory,
  investigateKnowledgeGap,
  recordBeliefState,
  recordCausalClaim,
  recordKnowledgeGap,
  recordPrediction,
  resolvePrediction,
  reviseBeliefState,
} from "../lib/epistemic-history";

const router: IRouter = Router();

function dateOrUndefined(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("Date fields must be valid ISO timestamps.");
  return date;
}

async function permitted(res: Response, payload: Record<string, unknown>) {
  const result = await checkConstitution("epistemic_memory_write", payload, "Epistemic Memory");
  if (!result.permitted) {
    res.status(403).json({ error: "Constitution blocked this epistemic memory write.", constitutional: result });
    return false;
  }
  return true;
}

router.get("/epistemic/history", async (_req, res): Promise<void> => {
  res.json(await getEpistemicHistory());
});

router.get("/epistemic/beliefs/:id/history", async (req, res): Promise<void> => {
  const history = await getBeliefHistory(req.params.id);
  if (!history) { res.status(404).json({ error: "Belief state not found." }); return; }
  res.json({ beliefKey: history[0]?.beliefKey ?? null, states: history });
});

router.post("/epistemic/beliefs", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    res.status(201).json(await recordBeliefState(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Belief state could not be recorded." });
  }
});

router.post("/epistemic/beliefs/:id/revise", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    const item = await reviseBeliefState(req.params.id, req.body ?? {});
    if (!item) { res.status(404).json({ error: "Belief state not found." }); return; }
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Belief state could not be revised." });
  }
});

router.post("/epistemic/predictions", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    const body = req.body ?? {};
    res.status(201).json(await recordPrediction({
      ...body,
      horizonStart: dateOrUndefined(body.horizonStart),
      horizonEnd: dateOrUndefined(body.horizonEnd),
    }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Prediction could not be recorded." });
  }
});

router.post("/epistemic/predictions/:id/resolve", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    const body = req.body ?? {};
    const item = await resolvePrediction(req.params.id, {
      eventualOutcome: body.eventualOutcome,
      accuracyResult: body.accuracyResult,
      derivedLesson: body.derivedLesson,
      outcomeObservedAt: dateOrUndefined(body.outcomeObservedAt),
    });
    if (!item) { res.status(404).json({ error: "Prediction not found." }); return; }
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Prediction could not be resolved." });
  }
});

router.post("/epistemic/causal-claims", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    res.status(201).json(await recordCausalClaim(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Causal claim could not be recorded." });
  }
});

router.post("/epistemic/knowledge-gaps", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    res.status(201).json(await recordKnowledgeGap(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Knowledge gap could not be recorded." });
  }
});

router.post("/epistemic/knowledge-gaps/:id/investigate", async (req, res): Promise<void> => {
  try {
    if (!await permitted(res, req.body ?? {})) return;
    const item = await investigateKnowledgeGap(req.params.id, req.body ?? {});
    if (!item) { res.status(404).json({ error: "Knowledge gap not found." }); return; }
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Knowledge gap could not be investigated." });
  }
});

export default router;