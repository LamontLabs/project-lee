import { Router, type IRouter } from "express";
import { IDENTITY_DIMENSIONS, IDENTITY_ENUMS, consultIdentity, getCurrentIdentity, listIdentityVersions, updateIdentity } from "../lib/identity";
import { getCurrentPersonality, listPersonalityEvolution, listPersonalityVersions, proposePersonalityUpdate, reviewPersonalityVersion, PERSONALITY_SECTION_KEYS } from "../lib/personality-memory";

const router: IRouter = Router();

router.get("/identity", async (_req, res): Promise<void> => {
  const profile = await getCurrentIdentity();
  res.json({ ...profile, dimensions: IDENTITY_DIMENSIONS, enums: IDENTITY_ENUMS, onboardingRequired: profile.sourceRef === "identity-onboarding-default" });
});

router.get("/identity/consult", async (_req, res): Promise<void> => {
  res.json(await consultIdentity());
});

router.get("/identity/versions", async (_req, res): Promise<void> => {
  res.json(await listIdentityVersions());
});

router.post("/identity/update", async (req, res): Promise<void> => {
  const { values, changeReason, confirm } = req.body ?? {};
  if (!values || typeof values !== "object" || typeof changeReason !== "string") {
    res.status(400).json({ error: "values and changeReason are required." });
    return;
  }
  try {
    res.status(201).json(await updateIdentity(values, changeReason, confirm === true));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Identity update failed." });
  }
});

router.post("/identity/onboard", async (req, res): Promise<void> => {
  const { values, changeReason } = req.body ?? {};
  try {
    res.status(201).json(await updateIdentity(values, changeReason ?? "Owner-confirmed identity onboarding.", true));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Identity onboarding failed." });
  }
});

router.get("/personality", async (_req, res): Promise<void> => {
  const current = await getCurrentPersonality();
  res.json({ ...current, sectionKeys: PERSONALITY_SECTION_KEYS, presentationOnly: true, safetyBoundary: "Personality cannot override facts, uncertainty, CIL routing, CerbaSeal, permissions, Constitution, owner authority, or Event Log integrity." });
});

router.get("/personality/versions", async (_req, res): Promise<void> => {
  res.json(await listPersonalityVersions());
});

router.get("/personality/evolution", async (_req, res): Promise<void> => {
  res.json(await listPersonalityEvolution());
});

router.post("/personality/propose", async (req, res): Promise<void> => {
  const { sections, changeReason, evidenceRefs, actor } = req.body ?? {};
  if (!sections || typeof sections !== "object" || typeof changeReason !== "string") {
    res.status(400).json({ error: "sections and changeReason are required." });
    return;
  }
  try {
    res.status(201).json(await proposePersonalityUpdate({ sections, changeReason, evidenceRefs: Array.isArray(evidenceRefs) ? evidenceRefs.map(String) : [], actor: typeof actor === "string" ? actor : "owner" }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Personality proposal failed." });
  }
});

router.post("/personality/review", async (req, res): Promise<void> => {
  const { versionId, decision, reason, reviewer } = req.body ?? {};
  if (typeof versionId !== "string" || !["accept", "reject", "reverse"].includes(decision) || typeof reason !== "string") {
    res.status(400).json({ error: "versionId, decision, and reason are required." });
    return;
  }
  try {
    res.status(200).json(await reviewPersonalityVersion({ versionId, decision, reason, reviewer: typeof reviewer === "string" ? reviewer : "owner" }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Personality review failed." });
  }
});

export default router;