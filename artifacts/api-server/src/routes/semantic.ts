import { Router, type IRouter } from "express";
import { indexObject, freshness, rebuildIndex, searchSemantic } from "../lib/semantic-index";
const router: IRouter = Router();
router.get("/semantic/search", async (req, res): Promise<void> => { try { res.json(await searchSemantic(String(req.query.q ?? ""), { objectType: typeof req.query.object_type === "string" ? req.query.object_type : undefined }, Number(req.query.top_k ?? 10), String(req.query.requester ?? "Semantic API"))); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Semantic search failed." }); } });
router.post("/semantic/index", async (req, res): Promise<void> => { try { res.status(201).json(await indexObject(String(req.body?.objectId), String(req.body?.objectType))); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Indexing failed." }); } });
router.post("/semantic/rebuild", async (_req, res) => res.status(202).json(await rebuildIndex()));
router.get("/semantic/freshness", async (_req, res) => res.json(await freshness()));
export default router;