import { Router, type IRouter } from "express";
import {
  findInstitutionalResemblance,
  getInstitutionalPriors,
  listInstitutionalKnowledge,
  processExperiences,
  reviewInstitutionalKnowledge,
  transitionInstitutionalKnowledge,
} from "../lib/experience";

const router: IRouter = Router();

router.post("/institutional/experiences/process", async (req, res): Promise<void> => {
  const since = typeof req.body?.since === "string" ? new Date(req.body.since) : undefined;
  if (since && Number.isNaN(since.getTime())) {
    res.status(400).json({ error: "since must be a valid ISO timestamp." });
    return;
  }
  const result = await processExperiences({ since });
  res.status(201).json(result);
});

router.post("/institutional/knowledge/:id/state", async (req, res): Promise<void> => {
  const action = req.body?.action;
  if (!["defer", "reject", "invalidate", "supersede"].includes(action)) {
    res.status(400).json({ error: "action must be defer, reject, invalidate, or supersede." });
    return;
  }
  const item = await transitionInstitutionalKnowledge(req.params.id, action, typeof req.body?.replacementId === "string" ? req.body.replacementId : undefined);
  if (!item) {
    res.status(404).json({ error: "Institutional Knowledge item not found." });
    return;
  }
  res.json(item);
});

router.get("/institutional/knowledge", async (_req, res): Promise<void> => {
  res.json(await listInstitutionalKnowledge());
});

router.get("/institutional/relevance", async (req, res): Promise<void> => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!query) {
    res.status(400).json({ error: "q is required." });
    return;
  }
  res.json({ query, matches: await findInstitutionalResemblance(query) });
});

router.get("/institutional/priors", async (req, res): Promise<void> => {
  const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
  res.json(await getInstitutionalPriors(domain));
});

router.post("/institutional/knowledge/:id/review", async (req, res): Promise<void> => {
  if (typeof req.body?.approved !== "boolean") {
    res.status(400).json({ error: "approved must be a boolean." });
    return;
  }
  const item = await reviewInstitutionalKnowledge(req.params.id, req.body.approved);
  if (!item) {
    res.status(404).json({ error: "Institutional Knowledge item not found." });
    return;
  }
  res.json(item);
});

export default router;