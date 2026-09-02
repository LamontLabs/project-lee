import { Router, type IRouter } from "express";
import { classifyIntent, correctIntent, intentHistory } from "../lib/intent";
const router: IRouter = Router();
router.post("/intents/classify", async (req, res): Promise<void> => { try { res.status(201).json(await classifyIntent(String(req.body?.rawInput ?? ""), req.body?.sessionContext ?? {}, String(req.body?.source ?? "ask_lee"), req.body?.sessionId)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Intent classification failed." }); } });
router.get("/intents", async (req, res) => res.json(await intentHistory(Number(req.query.limit ?? 100))));
router.post("/intents/:id/correct", async (req, res): Promise<void> => { try { const result = await correctIntent(req.params.id, String(req.body?.intentType ?? ""), String(req.body?.requester ?? "founder")); if (!result) { res.status(404).json({ error: "Intent not found." }); return; } res.json(result); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Intent correction failed." }); } });
export default router;