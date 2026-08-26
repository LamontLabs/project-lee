import { Router, type IRouter } from "express";
import { acceptDiscoveredService, getLatestDesktopSetup, runDesktopSetup } from "../lib/desktop-setup";
import { z } from "zod/v4";

const router: IRouter = Router();
router.get("/desktop-setup", async (_req, res) => res.json(await getLatestDesktopSetup()));
router.post("/desktop-setup/run", async (req, res) => res.status(202).json(await runDesktopSetup({ discovery: req.body?.discovery })));
router.post("/desktop-setup/discoveries/accept", async (req, res): Promise<void> => {
  const parsed = z.record(z.string(), z.unknown()).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A local service discovery candidate is required." }); return; }
  try {
    const result = await acceptDiscoveredService(parsed.data);
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Local service connection could not be created." });
  }
});
export default router;