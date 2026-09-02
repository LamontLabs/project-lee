import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, interpretationLedger } from "@workspace/db";
import { audienceProfiles, explain } from "../lib/explanation";
import { recordCorrection } from "../lib/learning";
const router: IRouter = Router();
router.get("/explanations/audiences", (_req, res) => res.json(audienceProfiles));
router.post("/explanations", async (req, res): Promise<void> => {
  try { res.status(201).json(await explain({ objectId: String(req.body?.objectId ?? ""), explanationType: String(req.body?.explanationType ?? "object"), audienceProfile: req.body?.audienceProfile, requester: req.body?.requester })); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Explanation failed." }); }
});
router.get("/explanations", async (_req, res) => res.json(await db.select().from(interpretationLedger).where(eq(interpretationLedger.interpretationType, "explanation")).orderBy(desc(interpretationLedger.createdAt)).limit(200)));
router.post("/explanations/:id/feedback", async (req, res): Promise<void> => { const [item] = await db.select().from(interpretationLedger).where(eq(interpretationLedger.id, req.params.id)).limit(1); if (!item) { res.status(404).json({ error: "Explanation not found." }); return; } const feedback = req.body?.feedback === "needs_improvement" ? "needs_improvement" : "good"; await db.update(interpretationLedger).set({ qualityFeedback: feedback }).where(eq(interpretationLedger.id, item.id)); if (feedback === "needs_improvement") await recordCorrection({ engineName: "Explanation Engine", originalOutput: item.statement, correctedOutput: String(req.body?.correction ?? "Review this explanation for accuracy and audience fit."), correctionType: "explanation_quality", category: "explanation" }); res.json({ id: item.id, feedback }); });
export default router;