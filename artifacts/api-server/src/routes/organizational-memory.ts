import { Router, type IRouter } from "express";
import { addOrganizationalResource, getOrganization, updateOrganization } from "../lib/organizational-memory";

const router: IRouter = Router();

router.get("/organization", async (_req, res): Promise<void> => {
  res.json(await getOrganization());
});

router.post("/organization/update", async (req, res): Promise<void> => {
  try {
    res.json(await updateOrganization(req.body ?? {}, "owner-console"));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Organization update failed." });
  }
});

router.post("/organization/resources", async (req, res): Promise<void> => {
  const { resourceType, name, ownerRef } = req.body ?? {};
  if (!resourceType || !name || !ownerRef) { res.status(400).json({ error: "resourceType, name, and ownerRef are required." }); return; }
  res.status(201).json(await addOrganizationalResource(req.body));
});

export default router;