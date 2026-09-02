import { Router, type IRouter } from "express";
import { db, bootHistory, recoveryAgenda } from "@workspace/db";
import { desc } from "drizzle-orm";
import { getRecoveryMode, recordCleanShutdown, resolveAgenda } from "../lib/recovery-modes";

const router: IRouter = Router();
router.get("/recovery/status", (_req, res) => res.json(getRecoveryMode()));
router.get("/recovery/boot-history", async (_req, res) => res.json(await db.select().from(bootHistory).orderBy(desc(bootHistory.startedAt)).limit(20)));
router.get("/recovery/agenda", async (_req, res) => res.json(await db.select().from(recoveryAgenda).orderBy(desc(recoveryAgenda.createdAt)).limit(20)));
router.post("/recovery/clean-shutdown", async (req, res) => res.status(201).json(await recordCleanShutdown(String(req.body?.sessionId ?? crypto.randomUUID()))));
router.post("/recovery/agenda/:id/resolve", async (req, res) => res.json(await resolveAgenda(req.params.id)));
export default router;