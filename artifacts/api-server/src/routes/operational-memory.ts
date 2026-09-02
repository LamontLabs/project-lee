import { Router, type IRouter } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { behavioralSignal, db, eventLog, operationalPattern } from "@workspace/db";
import { confirmPattern, createManualPattern, detectOperationalPatterns, dismissPattern, ingestBehavioralSignal, operationalContext } from "../lib/operational-memory";

const router: IRouter = Router();
router.get("/internal/operational-memory/patterns", async (_req, res) => res.json(await db.select().from(operationalPattern).where(inArray(operationalPattern.status, ["candidate", "established", "strong"])).orderBy(desc(operationalPattern.confidence))));
router.get("/internal/operational-memory/context", async (_req, res) => res.json(await operationalContext()));
router.get("/internal/operational-memory/patterns/:id/evidence", async (req, res) => { const [pattern] = await db.select().from(operationalPattern).where(eq(operationalPattern.id, req.params.id)); if (!pattern) return res.status(404).json({ error: "Pattern not found." }); return res.json(await db.select().from(behavioralSignal).where(inArray(behavioralSignal.id, pattern.evidenceRefs as string[]))); });
router.post("/internal/operational-memory/observe", async (req, res) => res.status(201).json(await ingestBehavioralSignal(req.body)));
router.post("/internal/operational-memory/detect", async (_req, res) => res.json(await detectOperationalPatterns()));
router.post("/operational-memory/patterns", async (req, res) => res.status(201).json(await createManualPattern(req.body)));
router.post("/operational-memory/patterns/:id/confirm", async (req, res) => res.json(await confirmPattern(req.params.id)));
router.post("/operational-memory/patterns/:id/dismiss", async (req, res) => res.json(await dismissPattern(req.params.id)));
export default router;