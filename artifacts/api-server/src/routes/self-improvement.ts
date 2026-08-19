import { Router, type IRouter } from "express";
import { listSelfImprovement, resetSelfImprovement, runSelfImprovementCycle } from "../lib/self-improvement";
import { getCurrentIdentity } from "../lib/identity";

const router: IRouter = Router();

router.post("/self-improvement/cycle", async (_req, res): Promise<void> => {
  res.status(201).json(await runSelfImprovementCycle());
});

router.get("/self-improvement", async (_req, res): Promise<void> => {
  res.json(await listSelfImprovement());
});

router.get("/system-manifest", async (_req, res): Promise<void> => {
  const adaptations = await listSelfImprovement();
  const identity = await getCurrentIdentity();
  res.json({
    identity: {
      profileId: identity.id,
      displayName: identity.displayName,
      role: identity.values.role,
      versioned: true,
      dimensions: Object.keys(identity.values).length,
    },
    operationalSelfImprovement: {
      minimumEvidence: 5,
      adaptations: adaptations.map((item) => ({
        category: item.category,
        parameter: item.parameter,
        currentValue: item.currentValue,
        defaultValue: item.defaultValue,
        status: item.status,
        observationCount: item.observationCount,
        evidenceRefs: item.evidenceRefs,
        updatedAt: item.updatedAt,
      })),
      safetyBoundary: "Output parameters only; identity, constitution, facts, anchors, and governance are immutable to self-improvement.",
    },
  });
});

router.post("/self-improvement/reset", async (req, res): Promise<void> => {
  const id = typeof req.body?.id === "string" ? req.body.id : undefined;
  res.json({ reset: await resetSelfImprovement(id) });
});

export default router;