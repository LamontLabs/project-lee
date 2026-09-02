import { Router, type IRouter } from "express";
import { memoryStatus, reclassifyMemory, setMemoryTier, touchMemory, consolidateHistorical, enqueueMemoryMaintenance } from "../lib/memory-architecture";
import { db, universalObject } from "@workspace/db";
import { desc } from "drizzle-orm";
const router: IRouter = Router();
router.get("/memory-architecture/status", async (_req, res) => res.json(await memoryStatus()));
router.get("/memory-architecture/objects", async (req, res) => {
  const tier = typeof req.query.tier === "string" ? req.query.tier : undefined;
  const rows = await db.select().from(universalObject).orderBy(desc(universalObject.updatedAt)).limit(100);
  res.json(tier ? rows.filter((row) => row.memoryTier === tier) : rows);
});
router.post("/memory-architecture/reclassify", async (_req, res) => res.json({ changed: await reclassifyMemory() }));
router.post("/memory-architecture/consolidate", async (_req, res) => res.json({ consolidated: await consolidateHistorical() }));
router.post("/memory-architecture/maintenance", async (_req, res) => res.status(202).json(await enqueueMemoryMaintenance()));
router.post("/memory-architecture/:id/access", async (req, res) => { const object = await touchMemory(req.params.id); if (!object) { res.status(404).json({ error: "Memory object not found." }); return; } res.json(object); });
router.post("/memory-architecture/:id/tier", async (req, res) => { try { const object = await setMemoryTier(req.params.id, String(req.body?.tier), String(req.body?.reason ?? "Owner memory tier control")); if (!object) { res.status(404).json({ error: "Memory object not found." }); return; } res.json(object); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Tier update failed." }); } });
export default router;