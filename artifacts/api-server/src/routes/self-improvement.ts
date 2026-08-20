import { Router, type IRouter } from "express";
import { APPROVED_ADAPTATION_PARAMETERS, listSelfImprovement, requestAdaptation, resetSelfImprovement, runSelfImprovementCycle } from "../lib/self-improvement";
import { getCurrentIdentity } from "../lib/identity";
import { listObjectives } from "../lib/executive-objectives";
import { getOrganization } from "../lib/organizational-memory";
import { listDecisionHeuristics } from "../lib/decision-memory";

const router: IRouter = Router();

router.post("/self-improvement/cycle", async (_req, res): Promise<void> => {
  res.status(201).json(await runSelfImprovementCycle());
});

router.get("/self-improvement", async (_req, res): Promise<void> => {
  res.json(await listSelfImprovement());
});

router.get("/self-improvement/contract", async (_req, res): Promise<void> => {
  res.json({
    minimumEvidence: 5,
    approvedParameters: APPROVED_ADAPTATION_PARAMETERS,
    protectedTargets: ["identity", "constitution", "facts", "knowledge", "strategic_anchors", "cerbaseal_governance", "owner_permissions", "credentials"],
    reversible: true,
    autonomousConsequentialActions: false,
  });
});

router.post("/self-improvement/request", async (req, res): Promise<void> => {
  try {
    const body = req.body ?? {};
    if (typeof body.category !== "string" || typeof body.parameter !== "string" || typeof body.newValue !== "string" || !Array.isArray(body.evidenceRefs) || !body.evidenceRefs.every((ref: unknown) => typeof ref === "string") || typeof body.reason !== "string") {
      res.status(400).json({ error: "category, parameter, newValue, evidenceRefs, and reason are required." });
      return;
    }
    res.status(201).json(await requestAdaptation({ category: body.category, parameter: body.parameter, newValue: body.newValue, evidenceRefs: body.evidenceRefs, observationCount: typeof body.observationCount === "number" ? body.observationCount : undefined, reason: body.reason }));
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === "number" ? (error as { statusCode: number }).statusCode : 500;
    res.status(statusCode).json({ error: error instanceof Error ? error.message : "Adaptation request failed." });
  }
});

router.get("/system-manifest", async (_req, res): Promise<void> => {
  const adaptations = await listSelfImprovement();
  const identity = await getCurrentIdentity();
  const objectives = await listObjectives();
  const organization = await getOrganization();
  const heuristics = await listDecisionHeuristics();
  res.json({
    identity: {
      profileId: identity.id,
      displayName: identity.displayName,
      role: identity.values.role,
      versioned: true,
      dimensions: Object.keys(identity.values).length,
    },
    executiveObjectives: {
      activeCount: objectives.length,
      objectives: objectives.map((item) => ({ id: item.id, title: item.title, priority: item.metadata?.priorityLabel ?? "NORMAL", healthStatus: item.healthStatus, confidence: item.confidence })),
    },
    organization: {
      profileId: organization.id,
      legalName: organization.legalName,
      departments: organization.structure.departments,
      peopleCount: organization.people.length,
      sharedServices: Object.keys(organization.sharedServices),
      resourceCount: organization.resources.length,
    },
    decisionMemory: {
      heuristicCount: heuristics.length,
      heuristics: heuristics.map((item) => ({ id: item.id, statement: item.rule, confidence: item.confidence, exceptionCount: item.exceptionCount, evidenceRefs: item.evidenceRefs })),
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