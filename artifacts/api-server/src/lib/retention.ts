import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  archiveManifest,
  archiveRepresentation,
  db,
  retentionDecision,
  retentionPolicy,
  sourceVault,
  storagePressureSnapshot,
  semanticIndex,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";
import { getRecoveryMode } from "./recovery-modes";

export const DEFAULT_RETENTION_POLICIES = [
  { policyKey: "gmail", sourceKind: "gmail", sourceOwner: "Google Gmail", hotDays: 30, warmDays: 90, coldDays: 730, preserveOriginal: true, preserveDerived: true, protectedByDefault: false, reason: "Keep messages and attachments available for active commitments, then retain the original and explainable derived evidence in cold archive." },
  { policyKey: "github", sourceKind: "github", sourceOwner: "GitHub", hotDays: 14, warmDays: 90, coldDays: 3650, preserveOriginal: true, preserveDerived: true, protectedByDefault: false, reason: "Repository history, issues, pull requests, and release evidence retain engineering provenance beyond active project work." },
  { policyKey: "drive", sourceKind: "drive", sourceOwner: "Google Drive", hotDays: 30, warmDays: 180, coldDays: 3650, preserveOriginal: true, preserveDerived: true, protectedByDefault: false, reason: "Owner-managed documents remain recoverable with their original bytes and source-backed summaries." },
  { policyKey: "local_capture", sourceKind: "local_capture", sourceOwner: "Owner-created local capture", hotDays: 90, warmDays: 365, coldDays: 3650, preserveOriginal: true, preserveDerived: true, protectedByDefault: false, reason: "Owner-created captures preserve the original evidence and any explicitly derived facts or commitments without assuming the capture can be reconstructed." },
] as const;

const PROTECTED_MARKERS: Array<[string, string]> = [
  ["constitutional", "Constitutional rule or history"],
  ["ownerTruth", "Owner-declared truth"],
  ["strategicAnchor", "Strategic Anchor"],
  ["criticalDecision", "Critical decision"],
  ["auditEvidence", "Audit evidence"],
  ["institutionalKnowledge", "Institutional knowledge"],
];
const storage = new ObjectStorageService();

function assertRetentionWritesAllowed() {
  const mode = getRecoveryMode().mode;
  if (["RECOVERY_MODE", "SAFE_MODE", "READ_ONLY"].includes(mode)) {
    throw new Error(`RETENTION_WRITE_BLOCKED_RECOVERY_MODE:${mode}`);
  }
}

function metadataFor(source: typeof sourceVault.$inferSelect) {
  return source.metadata as Record<string, unknown>;
}

export function sourceKindFor(source: typeof sourceVault.$inferSelect) {
  const metadata = metadataFor(source);
  const candidate = [metadata.provider, metadata.sourceType, metadata.source, metadata.device, source.storagePath]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (candidate.includes("gmail") || candidate.includes("email")) return "gmail";
  if (candidate.includes("github") || candidate.includes("repository") || candidate.includes("repo")) return "github";
  if (candidate.includes("drive")) return "drive";
  return "local_capture";
}

function defaultPolicy(sourceKind: string) {
  return DEFAULT_RETENTION_POLICIES.find((policy) => policy.sourceKind === sourceKind) ?? DEFAULT_RETENTION_POLICIES[3];
}

async function policyFor(sourceKind: string) {
  const [stored] = await db.select().from(retentionPolicy).where(and(eq(retentionPolicy.sourceKind, sourceKind), eq(retentionPolicy.active, true))).orderBy(desc(retentionPolicy.version)).limit(1);
  return stored ?? defaultPolicy(sourceKind);
}

function protectionReasons(source: typeof sourceVault.$inferSelect) {
  const metadata = metadataFor(source);
  return PROTECTED_MARKERS.filter(([key]) => metadata[key] === true || metadata.protection === key).map(([, reason]) => reason);
}

function retentionClassFor(source: typeof sourceVault.$inferSelect, policy: typeof retentionPolicy.$inferSelect | typeof DEFAULT_RETENTION_POLICIES[number]) {
  const reasons = protectionReasons(source);
  if (reasons.length || policy.protectedByDefault) return "canonical";
  const ageDays = (Date.now() - source.createdAt.getTime()) / 86_400_000;
  if (ageDays <= policy.hotDays) return "hot";
  if (ageDays <= policy.warmDays) return "warm";
  return "cold";
}

function archiveObjectPath(contentHash: string) {
  return `/objects/archive/sha256/${contentHash.slice(0, 2)}/${contentHash}`;
}

function hashBytes(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function ensureRepresentation(manifestId: string, values: {
  layerType: string;
  objectId?: string | null;
  storagePath?: string | null;
  contentHash?: string | null;
  byteSize?: number | null;
  provenanceRefs?: string[];
  metadata?: Record<string, unknown>;
}) {
  const [existing] = await db.select().from(archiveRepresentation).where(and(eq(archiveRepresentation.archiveManifestId, manifestId), eq(archiveRepresentation.layerType, values.layerType))).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(archiveRepresentation).values({
    archiveManifestId: manifestId,
    layerType: values.layerType,
    objectId: values.objectId ?? null,
    storagePath: values.storagePath ?? null,
    contentHash: values.contentHash ?? null,
    byteSize: values.byteSize ?? null,
    provenanceRefs: values.provenanceRefs ?? [],
    metadata: values.metadata ?? {},
  }).returning();
  return created;
}

export async function listRetentionPolicies() {
  const stored = await db.select().from(retentionPolicy).where(eq(retentionPolicy.active, true)).orderBy(retentionPolicy.sourceKind);
  const byKind = new Map(stored.map((policy) => [policy.sourceKind, policy]));
  return DEFAULT_RETENTION_POLICIES.map((policy) => byKind.get(policy.sourceKind) ?? policy);
}

export function retentionPolicyForSourceKind(sourceKind: string) {
  return defaultPolicy(sourceKind);
}

export async function listArchives(limit = 100) {
  return db.select().from(archiveManifest).orderBy(desc(archiveManifest.updatedAt)).limit(Math.min(Math.max(limit, 1), 250));
}

export async function archiveSource(sourceId: string, options: { storageTier?: string; actor?: string } = {}) {
  assertRetentionWritesAllowed();
  const [source] = await db.select().from(sourceVault).where(eq(sourceVault.id, sourceId)).limit(1);
  if (!source) return null;
  const sourceKind = sourceKindFor(source);
  const policy = await policyFor(sourceKind);
  const reasons = protectionReasons(source);
  const protectedRecord = reasons.length > 0 || policy.protectedByDefault;
  let buffer: Buffer | null = null;
  let contentHash = source.checksum;
  let archivePath: string | null = null;
  let integrityState: typeof archiveManifest.$inferInsert["integrityState"] = "missing";
  let lastError: string | null = null;

  try {
    if (source.storagePath.startsWith("/objects/")) {
      buffer = (await storage.read(source.storagePath)).buffer;
    } else if (source.rawContent !== null) {
      buffer = Buffer.from(source.rawContent, "utf8");
    }
    if (buffer) {
      contentHash = hashBytes(buffer);
      archivePath = archiveObjectPath(contentHash);
      if (source.storagePath.startsWith("/objects/") && source.storagePath !== archivePath) await storage.copy(source.storagePath, archivePath);
      else await storage.write(archivePath, buffer, source.mimeType);
      integrityState = "verified";
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }

  const [created] = await db.insert(archiveManifest).values({
    contentHash,
    sourceId: source.id,
    sourceKind,
    sourceOwner: policy.sourceOwner,
    originalFilename: source.originalFilename,
    mimeType: source.mimeType,
    byteSize: buffer?.length ?? source.byteSize ?? null,
    sourcePath: source.storagePath,
    archivePath,
    storageTier: options.storageTier ?? (retentionClassFor(source, policy) === "cold" ? "cold_archive" : "active"),
    integrityState,
    retentionClass: retentionClassFor(source, policy),
    retentionState: protectedRecord ? "owner_hold" : "retained",
    protectedRecord,
    protectionReasons: reasons,
    retentionPolicyKey: policy.policyKey,
    metadata: { sourceMetadata: metadataFor(source), originalChecksum: source.checksum, placementContract: { active: "private App Storage active path", coldArchive: "private App Storage cold-archive path", backup: "portable backup destination", encryption: "provider-managed encryption required; verified separately" } },
    lastVerifiedAt: integrityState === "verified" ? new Date() : null,
    lastError,
  }).onConflictDoNothing({ target: archiveManifest.contentHash }).returning();
  const manifest = created ?? (await db.select().from(archiveManifest).where(eq(archiveManifest.contentHash, contentHash)).limit(1))[0];
  if (!manifest) throw new Error("Archive manifest could not be persisted.");
  await ensureRepresentation(manifest.id, {
    layerType: "original",
    objectId: source.id,
    storagePath: archivePath,
    contentHash,
    byteSize: buffer?.length ?? source.byteSize,
    provenanceRefs: [source.id],
    metadata: { reason: policy.reason, sourceKind },
  });
  if (created) {
    await emitEvent({ eventType: "ArchiveManifestCreated", aggregateType: "archive_manifest", aggregateId: manifest.id, actor: options.actor ?? "retention-engine", sourceRef: source.id, payload: { archiveManifestId: manifest.id, sourceId: source.id, contentHash, integrityState, retentionClass: manifest.retentionClass, protectedRecord, reason: policy.reason } });
  }
  return manifest;
}

export async function addArchiveRepresentation(manifestId: string, values: {
  layerType: string;
  objectId?: string;
  storagePath?: string;
  contentHash?: string;
  byteSize?: number;
  provenanceRefs?: string[];
  metadata?: Record<string, unknown>;
}) {
  assertRetentionWritesAllowed();
  const [manifest] = await db.select().from(archiveManifest).where(eq(archiveManifest.id, manifestId)).limit(1);
  if (!manifest) return null;
  const representation = await ensureRepresentation(manifestId, values);
  await emitEvent({ eventType: "ArchiveManifestCreated", aggregateType: "archive_representation", aggregateId: representation.id, actor: "retention-engine", sourceRef: manifestId, payload: { archiveManifestId: manifestId, representationId: representation.id, layerType: representation.layerType, provenanceRefs: representation.provenanceRefs } });
  return representation;
}

export async function verifyArchive(manifestId: string) {
  assertRetentionWritesAllowed();
  const [manifest] = await db.select().from(archiveManifest).where(eq(archiveManifest.id, manifestId)).limit(1);
  if (!manifest) return null;
  let integrityState: "verified" | "missing" | "corrupt" = "missing";
  let lastError: string | null = null;
  try {
    if (!manifest.archivePath) throw new ObjectNotFoundError("Archive object has no placement.");
    const actual = hashBytes((await storage.read(manifest.archivePath)).buffer);
    integrityState = archiveIntegrityState(manifest.contentHash, actual);
    if (integrityState === "corrupt") lastError = `Checksum mismatch: expected ${manifest.contentHash}, received ${actual}.`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }
  const [updated] = await db.update(archiveManifest).set({ integrityState, lastVerifiedAt: integrityState === "verified" ? new Date() : manifest.lastVerifiedAt, lastError, updatedAt: new Date() }).where(eq(archiveManifest.id, manifestId)).returning();
  await emitEvent({ eventType: integrityState === "verified" ? "ArchiveIntegrityVerified" : "ArchiveIntegrityFailed", aggregateType: "archive_manifest", aggregateId: manifestId, actor: "retention-engine", sourceRef: manifestId, payload: { archiveManifestId: manifestId, integrityState, contentHash: manifest.contentHash, error: lastError } });
  return updated;
}

export async function getStorageStatus() {
  const [manifests, decisions, latestPressure] = await Promise.all([
    db.select().from(archiveManifest),
    db.select().from(retentionDecision).where(eq(retentionDecision.status, "pending")),
    db.select().from(storagePressureSnapshot).orderBy(desc(storagePressureSnapshot.observedAt)).limit(1),
  ]);
  const byTier = Object.fromEntries(["active", "cold_archive", "backup"].map((tier) => [tier, manifests.filter((item) => item.storageTier === tier).length]));
  const byIntegrity = Object.fromEntries(["pending", "verified", "missing", "corrupt"].map((state) => [state, manifests.filter((item) => item.integrityState === state).length]));
  const trackedBytes = manifests.reduce((sum, item) => sum + Number(item.byteSize ?? 0), 0);
  return {
    archiveCount: manifests.length,
    trackedBytes,
    byTier,
    byIntegrity,
    protectedCount: manifests.filter((item) => item.protectedRecord).length,
    pendingOwnerDecisions: decisions.length,
    pendingDecisions: decisions.slice(0, 20),
    latestPressure: latestPressure[0] ?? null,
    health: byIntegrity.missing || byIntegrity.corrupt ? "degraded" : manifests.length ? "available" : "empty",
    model: "archive-by-content-addressed-checksum",
  };
}

export function pressureStage(score: number) {
  if (score >= 1) return { stage: "expansion_recommended", order: 7, action: "Recommend storage expansion; owner alert remains open." };
  if (score >= .94) return { stage: "owner_alert", order: 6, action: "Alert the owner; no destructive action is automatic." };
  if (score >= .88) return { stage: "archive_move", order: 5, action: "Move eligible retained representations to encrypted cold archive." };
  if (score >= .82) return { stage: "cold_compress", order: 4, action: "Compress eligible cold representations before movement." };
  if (score >= .75) return { stage: "deduplicate", order: 3, action: "Report content-addressed duplicates and reclaim only rebuildable copies." };
  if (score >= .65) return { stage: "cache_cleanup", order: 2, action: "Clean rebuildable semantic indexes and caches in a dry run." };
  if (score >= .5) return { stage: "temporary_cleanup", order: 1, action: "Report temporary artifacts for owner-reviewed cleanup." };
  return { stage: "normal", order: 0, action: "No pressure response is required." };
}

export async function assessStoragePressure(options: { capacityBytes?: number; persist?: boolean; actor?: string } = {}) {
  const status = await getStorageStatus();
  const capacityBytes = options.capacityBytes && options.capacityBytes > 0
    ? options.capacityBytes
    : Number(process.env.LEE_STORAGE_CAPACITY_BYTES ?? 10 * 1024 * 1024 * 1024);
  const pressureScore = Math.min(2, status.trackedBytes / capacityBytes);
  const selected = pressureStage(pressureScore);
  const evidence = { capacityBytes, trackedBytes: status.trackedBytes, pressureScore, byTier: status.byTier, integrity: status.byIntegrity, pendingOwnerDecisions: status.pendingOwnerDecisions };
  if (options.persist !== false) {
    assertRetentionWritesAllowed();
    const [snapshot] = await db.insert(storagePressureSnapshot).values({ stage: selected.stage, stageOrder: selected.order, pressureScore, trackedBytes: status.trackedBytes, availableBytes: Math.max(capacityBytes - status.trackedBytes, 0), actionSummary: selected.action, evidence }).returning();
    await emitEvent({ eventType: "StoragePressureAssessed", aggregateType: "storage_pressure", aggregateId: snapshot.id, actor: options.actor ?? "retention-engine", sourceRef: "storage-pressure", payload: { snapshotId: snapshot.id, ...evidence, stage: selected.stage, action: selected.action } });
    return snapshot;
  }
  return { stage: selected.stage, stageOrder: selected.order, pressureScore, trackedBytes: status.trackedBytes, availableBytes: Math.max(capacityBytes - status.trackedBytes, 0), actionSummary: selected.action, evidence };
}

export async function dryRunGarbageCollection() {
  const [manifests, decisions, semanticRows] = await Promise.all([
    db.select().from(archiveManifest),
    db.select().from(retentionDecision).where(inArray(retentionDecision.status, ["pending", "approved"])),
    db.select().from(semanticIndex),
  ]);
  const decisionManifestIds = new Set(decisions.map((decision) => decision.archiveManifestId));
  const candidates = manifests.filter((manifest) => manifest.retentionState === "eligible" && !manifest.protectedRecord && !decisionManifestIds.has(manifest.id));
  const coldMoveCandidates = manifests.filter((manifest) => manifest.storageTier === "active" && manifest.retentionClass === "cold" && !manifest.protectedRecord);
  const staleIndexCount = semanticRows.filter((row) => row.indexedAt < row.sourceUpdatedAt).length;
  return {
    dryRun: true,
    changesApplied: false,
    temporaryArtifacts: 0,
    rebuildableCacheEntries: staleIndexCount,
    duplicateContentGroups: 0,
    coldCompressionCandidates: manifests.filter((manifest) => manifest.retentionClass === "cold" && !manifest.protectedRecord).length,
    archiveMoveCandidates: coldMoveCandidates.length,
    purgeCandidates: candidates.map((manifest) => ({ id: manifest.id, filename: manifest.originalFilename, bytes: manifest.byteSize, protected: manifest.protectedRecord, reason: "Eligible only after an explicit owner retention decision." })),
    protectedExcluded: manifests.filter((manifest) => manifest.protectedRecord).length,
    pendingDecisionCount: decisions.filter((decision) => decision.status === "pending").length,
  };
}

export async function requestRetentionDecision(manifestId: string, action: string, reason: string, actor = "owner") {
  assertRetentionWritesAllowed();
  if (!["retain", "move_cold", "purge"].includes(action)) throw new Error("Unsupported retention decision.");
  if (!reason.trim()) throw new Error("A retention decision reason is required.");
  const [manifest] = await db.select().from(archiveManifest).where(eq(archiveManifest.id, manifestId)).limit(1);
  if (!manifest) return null;
  if (action === "purge" && manifest.protectedRecord) throw new Error("Protected archive records cannot be purged.");
  const [decision] = await db.insert(retentionDecision).values({ archiveManifestId: manifestId, action, reason: reason.trim(), requestedBy: actor, decisionEvidence: { protectedRecord: manifest.protectedRecord, protectionReasons: manifest.protectionReasons, contentHash: manifest.contentHash } }).returning();
  await emitEvent({ eventType: "RetentionDecisionRequested", aggregateType: "retention_decision", aggregateId: decision.id, actor, sourceRef: manifestId, payload: { decisionId: decision.id, archiveManifestId: manifestId, action, reason: reason.trim(), protectedRecord: manifest.protectedRecord } });
  return decision;
}

export function protectedRetentionReasons(metadata: Record<string, unknown>) {
  return PROTECTED_MARKERS.filter(([key]) => metadata[key] === true || metadata.protection === key).map(([, reason]) => reason);
}

export function archiveIntegrityState(expectedHash: string, actualHash: string | null | undefined) {
  if (!actualHash) return "missing" as const;
  return actualHash === expectedHash ? "verified" as const : "corrupt" as const;
}

export async function applyRetentionDecision(decisionId: string, ownerConfirmed: boolean, actor = "owner") {
  assertRetentionWritesAllowed();
  if (!ownerConfirmed) throw new Error("Explicit owner confirmation is required.");
  const [decision] = await db.select().from(retentionDecision).where(eq(retentionDecision.id, decisionId)).limit(1);
  if (!decision) return null;
  if (!["pending", "approved"].includes(decision.status)) throw new Error(`Retention decision is ${decision.status}.`);
  const [manifest] = await db.select().from(archiveManifest).where(eq(archiveManifest.id, decision.archiveManifestId)).limit(1);
  if (!manifest) throw new Error("Archive manifest not found.");
  if (decision.action === "purge" && manifest.protectedRecord) throw new Error("Protected archive records cannot be purged.");
  if (decision.action === "move_cold" && manifest.archivePath && manifest.storageTier !== "cold_archive") {
    const coldPath = `${manifest.archivePath}.cold`;
    await storage.copy(manifest.archivePath, coldPath);
    await db.update(archiveManifest).set({ archivePath: coldPath, storageTier: "cold_archive", retentionState: "retained", updatedAt: new Date() }).where(eq(archiveManifest.id, manifest.id));
  }
  if (decision.action === "purge" && manifest.archivePath) {
    try { await storage.remove(manifest.archivePath); } catch (error) {
      if (!(error instanceof ObjectNotFoundError)) throw error;
    }
    await db.update(archiveManifest).set({ archivePath: null, retentionState: "purged", lastError: null, updatedAt: new Date() }).where(eq(archiveManifest.id, manifest.id));
  }
  if (decision.action === "retain") {
    await db.update(archiveManifest).set({ retentionState: manifest.protectedRecord ? "owner_hold" : "retained", updatedAt: new Date() }).where(eq(archiveManifest.id, manifest.id));
  }
  const [applied] = await db.update(retentionDecision).set({ status: "applied", decidedBy: actor, decidedAt: new Date(), appliedAt: new Date(), updatedAt: new Date() }).where(eq(retentionDecision.id, decision.id)).returning();
  await emitEvent({ eventType: decision.action === "move_cold" ? "ArchiveMovedCold" : "RetentionApplied", aggregateType: "retention_decision", aggregateId: decision.id, actor, sourceRef: manifest.id, payload: { decisionId: decision.id, archiveManifestId: manifest.id, action: decision.action, contentHash: manifest.contentHash, ownerConfirmed: true } });
  return applied;
}