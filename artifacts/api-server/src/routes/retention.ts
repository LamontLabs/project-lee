import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type Response } from "express";
import { db, retentionDecision } from "@workspace/db";
import {
  addArchiveRepresentation,
  applyRetentionDecision,
  archiveSource,
  assessStoragePressure,
  dryRunGarbageCollection,
  getStorageStatus,
  listArchives,
  listRetentionPolicies,
  requestRetentionDecision,
  verifyArchive,
} from "../lib/retention";

const router: IRouter = Router();

function failure(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Retention operation failed.";
  res.status(message.startsWith("RETENTION_WRITE_BLOCKED_RECOVERY_MODE:") ? 423 : 400).json({ error: message });
}

router.get("/retention/status", async (_req, res) => res.json(await getStorageStatus()));
router.get("/retention/policies", async (_req, res) => res.json(await listRetentionPolicies()));
router.get("/retention/archives", async (req, res) => res.json(await listArchives(Number(req.query.limit ?? 100))));
router.get("/retention/decisions", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  const rows = await db.select().from(retentionDecision).where(eq(retentionDecision.status, status)).orderBy(desc(retentionDecision.createdAt)).limit(100);
  res.json(rows);
});
router.get("/retention/gc/dry-run", async (_req, res) => res.json(await dryRunGarbageCollection()));
router.get("/retention/pressure/assess", async (req, res) => {
  const requestedCapacity = Number(req.query.capacityBytes);
  const result = await assessStoragePressure({ capacityBytes: Number.isSafeInteger(requestedCapacity) && requestedCapacity > 0 ? requestedCapacity : undefined, persist: false });
  res.json(result);
});

router.post("/retention/archives/sources/:sourceId", async (req, res) => {
  try {
    const storageTier = req.body?.storageTier;
    if (storageTier !== undefined && !["active", "cold_archive", "backup"].includes(storageTier)) { res.status(400).json({ error: "storageTier must be active, cold_archive, or backup." }); return; }
    const manifest = await archiveSource(req.params.sourceId, { storageTier, actor: typeof req.body?.actor === "string" ? req.body.actor : "owner" });
    if (!manifest) { res.status(404).json({ error: "Source record not found." }); return; }
    res.status(201).json(manifest);
  } catch (error) { failure(res, error); }
});
router.post("/retention/archives/:id/representations", async (req, res) => {
  try {
    if (typeof req.body?.layerType !== "string" || !req.body.layerType.trim()) { res.status(400).json({ error: "layerType is required." }); return; }
    const representation = await addArchiveRepresentation(req.params.id, { layerType: req.body.layerType, objectId: req.body.objectId, storagePath: req.body.storagePath, contentHash: req.body.contentHash, byteSize: Number.isSafeInteger(req.body.byteSize) ? req.body.byteSize : undefined, provenanceRefs: Array.isArray(req.body.provenanceRefs) ? req.body.provenanceRefs.filter((item: unknown): item is string => typeof item === "string") : [], metadata: req.body.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {} });
    if (!representation) { res.status(404).json({ error: "Archive manifest not found." }); return; }
    res.status(201).json(representation);
  } catch (error) { failure(res, error); }
});
router.post("/retention/archives/:id/verify", async (req, res) => {
  try {
    const manifest = await verifyArchive(req.params.id);
    if (!manifest) { res.status(404).json({ error: "Archive manifest not found." }); return; }
    res.json(manifest);
  } catch (error) { failure(res, error); }
});

router.post("/retention/pressure/assess", async (req, res) => {
  try {
    const result = await assessStoragePressure({ capacityBytes: Number.isSafeInteger(req.body?.capacityBytes) ? req.body.capacityBytes : undefined, persist: req.body?.persist !== false, actor: typeof req.body?.actor === "string" ? req.body.actor : "owner" });
    res.status(req.body?.persist === false ? 200 : 201).json(result);
  } catch (error) { failure(res, error); }
});
router.post("/retention/decisions", async (req, res) => {
  try {
    if (typeof req.body?.archiveManifestId !== "string" || typeof req.body?.action !== "string" || typeof req.body?.reason !== "string") { res.status(400).json({ error: "archiveManifestId, action, and reason are required." }); return; }
    const decision = await requestRetentionDecision(req.body.archiveManifestId, req.body.action, req.body.reason, typeof req.body?.actor === "string" ? req.body.actor : "owner");
    if (!decision) { res.status(404).json({ error: "Archive manifest not found." }); return; }
    res.status(201).json(decision);
  } catch (error) { failure(res, error); }
});
router.post("/retention/decisions/:id/apply", async (req, res) => {
  try {
    const decision = await applyRetentionDecision(req.params.id, req.body?.ownerConfirmed === true, typeof req.body?.actor === "string" ? req.body.actor : "owner");
    if (!decision) { res.status(404).json({ error: "Retention decision not found." }); return; }
    res.json(decision);
  } catch (error) { failure(res, error); }
});

export default router;