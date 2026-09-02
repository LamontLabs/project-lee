import { Router, type IRouter } from "express";
import { getEngine, getEngines, heartbeat, markStaleEngines } from "../lib/capability-registry";
import { capabilityList, contractVersion, engineHealthResponse, internalContracts } from "../lib/internal-contracts";
import { getState, transitionState } from "../lib/state";
import { classifyIntent, correctIntent } from "../lib/intent";
import { registerDefaultEngines } from "../lib/orchestration";
import { runSelfTest } from "../lib/self-test";

const router: IRouter = Router();
router.post("/internal/self-test/run", async (_req, res) => res.status(201).json(await runSelfTest()));
const engineIdFromRequest = (req: any) => String(req.header("x-engine-id") ?? "");
async function authorized(req: any, res: any) {
  const engineId = engineIdFromRequest(req);
  const engine = engineId ? await getEngine(engineId) : null;
  const configuredToken = process.env.INTERNAL_API_TOKEN;
  const suppliedToken = req.header("x-internal-token");
  if (!engine || (configuredToken && suppliedToken !== configuredToken)) { res.status(403).json({ error: "Registered engine identity and internal authorization are required." }); return null; }
  return engine;
}
router.get("/registry", async (_req, res) => { await registerDefaultEngines(); res.json(await getEngines()); });
router.post("/registry/heartbeat", async (req, res): Promise<void> => { const engineId = String(req.body?.engineId ?? ""); if (!engineId) { res.status(400).json({ error: "engineId is required." }); return; } const engine = await heartbeat(engineId); if (!engine) { res.status(404).json({ error: "Engine is not registered." }); return; } res.json(engine); });
router.post("/registry/mark-stale", async (_req, res) => res.json({ markedUnavailable: await markStaleEngines() }));

router.use("/internal/:engine", async (req: any, res, next) => { const engine = await authorized(req, res); if (engine) { res.locals.engine = engine; next(); } });
router.get("/internal/:engine/health", (req: any, res) => {
  const engine = res.locals.engine; const parsed = engineHealthResponse.safeParse({ status: engine.status, version: engine.version, last_active: engine.lastHeartbeat, registered_capabilities: engine.capabilities });
  if (!parsed.success) return res.status(500).json({ error: "Engine health response violated its contract.", issues: parsed.error.issues });
  return res.json({ contract_version: contractVersion, ...parsed.data });
});
router.get("/internal/:engine/capabilities", (req: any, res) => {
  const engine = res.locals.engine; const parsed = capabilityList.safeParse({ engine_id: engine.engineId, engine_name: engine.name, version: engine.version, status: engine.status, owner: engine.owner, capabilities: engine.capabilities, dependencies: engine.dependencies, inputs: engine.inputs, outputs: engine.outputs });
  if (!parsed.success) return res.status(500).json({ error: "Capability response violated its contract.", issues: parsed.error.issues });
  return res.json({ contract_version: contractVersion, ...parsed.data });
});
router.post("/internal/:engine/:action", async (req: any, res): Promise<void> => {
  const engine = res.locals.engine; const action = String(req.params.action); const schema = internalContracts[req.params.engine]?.[action];
  if (!schema) { res.status(404).json({ error: `No ${contractVersion} contract is registered for ${req.params.engine}/${action}.` }); return; }
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) { res.status(400).json({ error: "Internal request failed contract validation.", contract_version: contractVersion, engine: engine.name, action, issues: parsed.error.issues }); return; }
  let output: unknown = { accepted: true, engine: engine.name, action, contract_version: contractVersion };
  if (req.params.engine === "state" && action === "get_state") output = await getState();
  if (req.params.engine === "state" && action === "transition") output = await transitionState((parsed.data as any).new_state, (parsed.data as any).reason);
  if (req.params.engine === "intent" && action === "classify") output = await classifyIntent((parsed.data as any).raw_input, (parsed.data as any).session_context ?? {}, "internal");
  if (req.params.engine === "intent" && action === "correct") output = await correctIntent((parsed.data as any).intent_id, (parsed.data as any).correction, "internal");
  res.json({ contract_version: contractVersion, data: output });
});
export default router;