import { Router, type IRouter } from "express";
import { acceptDiscoveredService, DiscoveryApprovalError, getLatestDesktopSetup, runDesktopSetup } from "../lib/desktop-setup";
import { createLocalServiceContract, listLocalServiceContracts, setLocalServiceContractEnabled } from "../lib/local-service-contracts";
import { z } from "zod/v4";

const router: IRouter = Router();
router.get("/desktop-setup", async (_req, res) => res.json(await getLatestDesktopSetup()));
router.get("/desktop-setup/local-contracts", async (_req, res) => res.json(await listLocalServiceContracts()));
router.post("/desktop-setup/local-contracts", async (req, res): Promise<void> => {
  try {
    res.status(201).json(await createLocalServiceContract(req.body));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Local service contract could not be approved." });
  }
});
router.patch("/desktop-setup/local-contracts/:id", async (req, res): Promise<void> => {
  if (typeof req.body?.enabled !== "boolean") { res.status(400).json({ error: "enabled must be true or false." }); return; }
  try {
    const result = await setLocalServiceContractEnabled(req.params.id, req.body.enabled);
    if (!result) { res.status(404).json({ error: "Local service contract not found." }); return; }
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Local service contract could not be updated." });
  }
});
router.delete("/desktop-setup/local-contracts/:id", async (req, res): Promise<void> => {
  try {
    const result = await setLocalServiceContractEnabled(req.params.id, false);
    if (!result) { res.status(404).json({ error: "Local service contract not found." }); return; }
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Local service contract could not be removed." });
  }
});
router.post("/desktop-setup/run", async (req, res) => res.status(202).json(await runDesktopSetup({ discovery: req.body?.discovery })));
router.post("/desktop-setup/discoveries/accept", async (req, res): Promise<void> => {
  const parsed = z.record(z.string(), z.unknown()).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A local service discovery candidate is required." }); return; }
  try {
    const result = await acceptDiscoveredService(parsed.data);
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    const status = error instanceof DiscoveryApprovalError ? error.statusCode : 400;
    res.status(status).json({ error: error instanceof Error ? error.message : "Local service connection could not be created." });
  }
});
export default router;