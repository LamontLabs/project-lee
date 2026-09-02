import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { universalSystemCallSchema, universalSystemRegistrationSchema } from "@workspace/api-zod";
import { callUniversalSystem, listUniversalSystems, registerUniversalSystem } from "../lib/universal-systems";
import { getCILModelInventory } from "../services/internal-services";

const router: IRouter = Router();
router.get("/systems", async (_req, res) => res.json(await listUniversalSystems()));
router.get("/systems/cil/model-inventory", async (_req, res): Promise<void> => {
  try {
    const inventory = await getCILModelInventory();
    res.json({ readOnly: true, inventory });
  } catch (error) {
    res.status(502).json({ error: "CIL model inventory is unavailable.", detail: error instanceof Error ? error.message : String(error) });
  }
});
router.post("/systems/register", async (req, res): Promise<void> => {
  const parsed = universalSystemRegistrationSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid Universal Systems registration.", issues: parsed.error.issues }); return; }
  const row = await registerUniversalSystem(parsed.data);
  res.status(201).json({ contract_version: row.apiVersion, system: row });
});
router.post("/systems/:systemId/call", async (req, res): Promise<void> => {
  const parsed = universalSystemCallSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid Universal System call.", issues: parsed.error.issues }); return; }
  try { res.json(await callUniversalSystem(req.params.systemId, parsed.data.path, parsed.data.payload, parsed.data.correlationId ?? randomUUID(), { method: parsed.data.method, timeoutMs: parsed.data.timeoutMs })); }
  catch (error) { res.status(502).json({ error: String(error instanceof Error ? error.message : error) }); }
});
export default router;