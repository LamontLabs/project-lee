import { Router, type IRouter } from "express";
import { db, ageWindowConfig, agingTransition } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { agingSummary, runKnowledgeAgingScan } from "../lib/knowledge-aging";

const router: IRouter = Router();
router.get("/aging/summary", async (_req, res) => res.json(await agingSummary()));
router.get("/aging/windows", async (_req, res) => res.json(await db.select().from(ageWindowConfig).orderBy(ageWindowConfig.objectType)));
router.patch("/aging/windows/:objectType", async (req, res) => {
  const [window] = await db.update(ageWindowConfig).set({ ...req.body, updatedAt: new Date() }).where(eq(ageWindowConfig.objectType, req.params.objectType)).returning();
  res.json(window);
});
router.get("/aging/transitions", async (_req, res) => res.json(await db.select().from(agingTransition).orderBy(desc(agingTransition.createdAt)).limit(200)));
router.post("/aging/scan", async (_req, res) => { const result = await runKnowledgeAgingScan(); res.json({ ...result, summary: await agingSummary() }); });
export default router;