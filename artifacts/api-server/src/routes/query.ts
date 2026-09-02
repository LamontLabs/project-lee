import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, queryCache, queryLog } from "@workspace/db";
import { queryEngine } from "../lib/query-engine";
const router: IRouter = Router();
router.post("/internal/query", async (req, res): Promise<void> => { try { res.json({ results: await queryEngine.query(req.body) }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Query failed." }); } });
router.get("/internal/query/telemetry", async (_req, res) => res.json(await db.select().from(queryLog).orderBy(desc(queryLog.createdAt)).limit(200)));
router.post("/internal/query/invalidate", async (req, res) => { await db.update(queryCache).set({ invalidatedAt: new Date() }).where(isNull(queryCache.invalidatedAt)); res.json({ invalidated: true, source: req.body?.source ?? "manual" }); });
export default router;