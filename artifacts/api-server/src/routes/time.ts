import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { brief, db, notification, waitingLoop } from "@workspace/db";
import { generateBrief, scanFreshness, timeOverview } from "../lib/time-engine";

const router: IRouter = Router();
router.get("/time/overview", async (_req, res) => res.json(await timeOverview()));
router.get("/briefs", async (req, res) => res.json(await db.select().from(brief).where(typeof req.query.type === "string" ? eq(brief.briefType, req.query.type) : undefined).orderBy(desc(brief.generatedAt)).limit(100)));
router.post("/briefs/generate", async (req, res) => res.status(201).json(await generateBrief(["today", "evening", "weekly"].includes(req.body?.type) ? req.body.type : "today")));
router.post("/time/freshness-scan", async (_req, res) => res.json(await scanFreshness()));
router.get("/notifications", async (_req, res) => res.json(await db.select().from(notification).orderBy(desc(notification.createdAt)).limit(100)));
router.patch("/notifications/:id", async (req, res) => {
  const status = req.body?.status === "dismissed" ? "dismissed" : "read";
  const [item] = await db.update(notification).set({ status, readAt: new Date() }).where(eq(notification.id, req.params.id)).returning();
  if (!item) { res.status(404).json({ error: "Notification not found." }); return; }
  res.json(item);
});
router.get("/waiting", async (_req, res) => res.json((await timeOverview()).waitingLoops));
export default router;