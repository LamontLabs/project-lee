import { Router, type IRouter } from "express";
import { IDENTITY_DIMENSIONS, IDENTITY_ENUMS, consultIdentity, getCurrentIdentity, listIdentityVersions, updateIdentity } from "../lib/identity";

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

export default router;