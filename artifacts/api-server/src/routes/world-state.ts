import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, worldStateSignal, worldStateSnapshot } from "@workspace/db";
import { configureWorldSignal, currentWorldState, refreshWorldState, removeWorldSignal } from "../lib/world-state";

const router: IRouter = Router();
router.get("/internal/world-state/current", async (_req, res) => res.json(await currentWorldState()));
router.get("/internal/world-state/signals", async (_req, res) => res.json(await db.select().from(worldStateSignal).where(eq(worldStateSignal.enabled, true))));
router.get("/internal/world-state/signals/:id/history", async (req, res) => res.json(await db.select().from(worldStateSnapshot).where(eq(worldStateSnapshot.signalId, req.params.id)).orderBy(desc(worldStateSnapshot.capturedAt)).limit(100)));
router.post("/internal/world-state/refresh", async (_req, res) => res.json({ signals: await refreshWorldState() }));
router.post("/world-state/signals", async (req, res) => res.status(201).json(await configureWorldSignal(req.body)));
router.delete("/world-state/signals/:id", async (req, res) => res.json(await removeWorldSignal(req.params.id)));
export default router;