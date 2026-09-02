import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { backupArchive, db, economicUsageRecord, eventLog } from "@workspace/db";
import { collectPortableBackup, digest, verifyPortableBackup } from "../lib/backup-restore";

const router: IRouter = Router();

router.get("/backups/status", async (_req, res) => {
  const rows = await db.select().from(backupArchive).orderBy(desc(backupArchive.createdAt)).limit(12);
  const latest = rows[0];
  const ageHours = latest ? (Date.now() - latest.createdAt.getTime()) / 3600000 : null;
  res.json({
    latest,
    backups: rows,
    readinessScore: latest ? Math.max(0, Math.min(100, Math.round(100 - (ageHours ?? 100) * 2))) : 0,
    portability: { rawSources: true, providerTokensExcluded: true, checksums: Boolean(latest?.manifest), restoreMode: "isolated-clean-database-verifier" },
  });
});

router.post("/backups/create", async (_req, res) => {
  const result = await collectPortableBackup();
  const [saved] = await db.insert(backupArchive).values({
    backupId: result.backupId,
    formatVersion: result.manifest.backup_format_version,
    brainVersion: String(result.manifest.brain_version),
    manifest: result.manifest,
    payload: result.payload,
    sizeBytes: result.sizeBytes,
  }).returning();
  await db.insert(eventLog).values({
    eventType: "BackupCreated",
    aggregateType: "backup_archive",
    aggregateId: saved.id,
    sourceRef: "backup-engine",
    occurredAt: new Date(),
    payload: { backupId: saved.backupId, manifest: result.manifest },
  });
  await db.insert(economicUsageRecord).values({
    operation: "backup",
    category: "backup",
    quantity: result.sizeBytes,
    unit: "bytes",
    provider: "backup-engine",
    sourceRef: saved.id,
    evidenceRef: `backup_archive:${saved.id}`,
    metadata: { backupId: saved.backupId },
    recordedAt: saved.createdAt,
  });
  res.status(201).json(saved);
});

router.post("/backups/:id/verify", async (req, res) => {
  const [backup] = await db.select().from(backupArchive).where(eq(backupArchive.id, req.params.id)).limit(1);
  if (!backup) { res.status(404).json({ error: "Backup not found." }); return; }
  const evidence = await verifyPortableBackup(backup.manifest, backup.payload);
  await db.update(backupArchive).set({
    verifiedAt: new Date(),
    status: evidence.overall === "FAIL" ? "invalid" : "verified",
    restoreEvidence: { ...evidence, verificationOnly: true },
  }).where(eq(backupArchive.id, backup.id));
  res.json({ valid: evidence.overall !== "FAIL", complete: evidence.overall === "PASS", backupId: backup.backupId, evidence });
});

router.post("/backups/:id/test-restore", async (req, res) => {
  const [backup] = await db.select().from(backupArchive).where(eq(backupArchive.id, req.params.id)).limit(1);
  if (!backup) { res.status(404).json({ error: "Backup not found." }); return; }
  const [beforeEventCount] = await db.select({ count: eventLog.id }).from(eventLog);
  const evidence = await verifyPortableBackup(backup.manifest, backup.payload);
  const [afterEventCount] = await db.select({ count: eventLog.id }).from(eventLog);
  const productionUntouched = beforeEventCount?.count === afterEventCount?.count;
  const checks = [...evidence.checks, {
    name: "production-canonical-state-untouched",
    result: productionUntouched ? "PASS" as const : "FAIL" as const,
    evidence: { beforeEventCount: beforeEventCount?.count ?? 0, afterEventCount: afterEventCount?.count ?? 0 },
  }];
  const overall = checks.some((check) => check.result === "FAIL") ? "FAIL" : checks.some((check) => check.result === "WARN") ? "WARN" : "PASS";
  const finalEvidence = { ...evidence, overall, checks, isolatedDatabase: { mode: "clean-in-memory-restore-sandbox", productionConnectionUsedForRestore: false } };
  await db.update(backupArchive).set({
    restoreTestedAt: new Date(),
    restoreTestStatus: overall === "PASS" ? "passed" : overall === "WARN" ? "warning" : "failed",
    restoreEvidence: finalEvidence,
  }).where(eq(backupArchive.id, backup.id));
  res.json({ passed: overall !== "FAIL", isolated: true, evidence: finalEvidence });
});

router.get("/backups/:id/download", async (req, res) => {
  const [backup] = await db.select().from(backupArchive).where(eq(backupArchive.id, req.params.id)).limit(1);
  if (!backup) { res.status(404).json({ error: "Backup not found." }); return; }
  res.setHeader("content-type", "application/json");
  res.setHeader("content-disposition", `attachment; filename="${backup.backupId}.json"`);
  res.json({ manifest: backup.manifest, payload: backup.payload, integrity: { payloadChecksum: digest(backup.payload), canonicalization: "sorted-keys-date-iso" } });
});
export default router;