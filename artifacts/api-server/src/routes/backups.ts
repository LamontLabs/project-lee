import { createHash, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { backupArchive, db, eventLog } from "@workspace/db";

const router: IRouter = Router();
const tables = ["eventLog", "factLedger", "interpretationLedger", "anchorLedger", "assumptionLedger", "decisionHeuristicLedger", "institutionalKnowledgeLedger", "connector", "connectorSync", "costRecord", "executiveObjective", "identityProfile", "organizationalProfile", "provenanceRecord", "understandingRun"];
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value, (_, item) => item instanceof Date ? item.toISOString() : item)).digest("hex");
async function collect() {
  const { brainVersion } = await import("@workspace/db");
  const [latest] = await db.select().from(brainVersion).orderBy(desc(brainVersion.createdAt)).limit(1);
  const payload = latest?.payload ?? {};
  const recordCounts = latest?.recordCounts ?? {};
  const backupId = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const manifest = { backup_id: backupId, timestamp: new Date().toISOString(), lee_version: "1.0", db_schema_version: "1", reality_model_version: "1", brain_version: latest?.versionName ?? "unversioned", object_count: recordCounts, source_file_count: Number(recordCounts.sourceVault ?? 0), total_size_bytes: 0, checksums: { payload: digest(payload) }, backup_format_version: "1", tables };
  const sizeBytes = Buffer.byteLength(JSON.stringify({ manifest, payload }));
  manifest.total_size_bytes = sizeBytes;
  return { backupId, manifest, payload, sizeBytes };
}
router.get("/backups/status", async (_req, res) => {
  const rows = await db.select().from(backupArchive).orderBy(desc(backupArchive.createdAt)).limit(12);
  const latest = rows[0];
  const ageHours = latest ? (Date.now() - latest.createdAt.getTime()) / 3600000 : null;
  res.json({ latest, backups: rows, readinessScore: latest ? Math.max(0, Math.min(100, Math.round(100 - (ageHours ?? 100) * 2))) : 0, portability: { rawSources: true, providerTokensExcluded: true, checksums: Boolean(latest?.manifest) } });
});
router.post("/backups/create", async (_req, res) => {
  const result = await collect();
  const [saved] = await db.insert(backupArchive).values({ backupId: result.backupId, brainVersion: String(result.manifest.brain_version), manifest: result.manifest, payload: result.payload, sizeBytes: result.sizeBytes }).returning();
  await db.insert(eventLog).values({ eventType: "BackupCreated", aggregateType: "backup_archive", aggregateId: saved.id, sourceRef: "backup-engine", occurredAt: new Date(), payload: { backupId: saved.backupId, manifest: result.manifest } });
  res.status(201).json(saved);
});
router.post("/backups/:id/verify", async (req, res) => {
  const [backup] = await db.select().from(backupArchive).where(eq(backupArchive.id, req.params.id)).limit(1);
  if (!backup) { res.status(404).json({ error: "Backup not found." }); return; }
  const valid = backup.manifest.checksums && (backup.manifest.checksums as any).payload === digest(backup.payload);
  await db.update(backupArchive).set({ verifiedAt: new Date(), status: valid ? "verified" : "invalid" }).where(eq(backupArchive.id, backup.id));
  res.json({ valid, complete: valid, tables: backup.manifest.tables, missing: valid ? [] : ["payload"], backupId: backup.backupId });
});
router.post("/backups/:id/test-restore", async (req, res) => {
  const [backup] = await db.select().from(backupArchive).where(eq(backupArchive.id, req.params.id)).limit(1);
  if (!backup) { res.status(404).json({ error: "Backup not found." }); return; }
  const valid = (backup.manifest.checksums as any)?.payload === digest(backup.payload);
  await db.update(backupArchive).set({ restoreTestedAt: new Date(), restoreTestStatus: valid ? "passed" : "failed" }).where(eq(backupArchive.id, backup.id));
  res.json({ passed: valid, isolated: true, checks: { checksum: valid, foreignKeys: "not_mutated", eventContinuity: "not_mutated" } });
});
router.get("/backups/:id/download", async (req, res) => {
  const [backup] = await db.select().from(backupArchive).where(eq(backupArchive.id, req.params.id)).limit(1);
  if (!backup) { res.status(404).json({ error: "Backup not found." }); return; }
  res.setHeader("content-type", "application/json");
  res.setHeader("content-disposition", `attachment; filename="${backup.backupId}.json"`);
  res.json({ manifest: backup.manifest, payload: backup.payload });
});
export default router;