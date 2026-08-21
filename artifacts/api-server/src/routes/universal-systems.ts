import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { callUniversalSystem, listUniversalSystems, registerUniversalSystem } from "../lib/universal-systems";

const registration = z.object({
  systemId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/),
  displayName: z.string().min(1).max(120),
  category: z.string().min(1).max(32),
  baseUrl: z.string().url(),
  apiVersion: z.string().regex(/^v\d+$/).optional(),
  healthEndpoint: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).optional(),
  failurePolicy: z.enum(["graceful_degradation", "fail_closed"]).optional(),
  credentialEnvKey: z.string().regex(/^[A-Z][A-Z0-9_]{2,119}$/).optional(),
  capabilities: z.array(z.string().min(1).max(120)).max(100),
});

const router: IRouter = Router();
router.get("/systems", async (_req, res) => res.json(await listUniversalSystems()));
router.post("/systems/register", async (req, res): Promise<void> => {
  const parsed = registration.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid Universal Systems registration.", issues: parsed.error.issues }); return; }
  const row = await registerUniversalSystem(parsed.data);
  res.status(201).json({ contract_version: row.apiVersion, system: row });
});
router.post("/systems/:systemId/call", async (req, res): Promise<void> => {
  const path = String(req.body?.path ?? "");
  const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {};
  try { res.json(await callUniversalSystem(req.params.systemId, path, payload, req.body?.correlationId ?? randomUUID())); }
  catch (error) { res.status(502).json({ error: String(error instanceof Error ? error.message : error) }); }
});
export default router;