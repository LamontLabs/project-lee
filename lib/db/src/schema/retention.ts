import { createInsertSchema } from "drizzle-zod";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());
const stringArray = z.array(z.string());

export const RETENTION_SOURCES = ["gmail", "github", "drive", "local_capture"] as const;
export const RETENTION_CLASSES = ["hot", "warm", "cold", "canonical"] as const;
export const STORAGE_TIERS = ["active", "cold_archive", "backup"] as const;
export const ARCHIVE_INTEGRITY_STATES = ["pending", "verified", "missing", "corrupt"] as const;
export const ARCHIVE_RETENTION_STATES = ["retained", "eligible", "owner_hold", "purge_requested", "purged"] as const;
export const REPRESENTATION_LAYERS = ["original", "transcript", "structured_fact", "commitment", "semantic_index", "summary"] as const;
export const RETENTION_DECISION_ACTIONS = ["retain", "move_cold", "purge"] as const;
export const RETENTION_DECISION_STATUSES = ["pending", "approved", "rejected", "applied"] as const;
export const PRESSURE_STAGES = ["normal", "temporary_cleanup", "cache_cleanup", "deduplicate", "cold_compress", "archive_move", "owner_alert", "expansion_recommended"] as const;

export const retentionPolicy = pgTable(
  "retention_policy",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    policyKey: varchar("policy_key", { length: 64 }).notNull().unique(),
    sourceKind: varchar("source_kind", { length: 48 }).notNull(),
    sourceOwner: varchar("source_owner", { length: 96 }).notNull(),
    hotDays: integer("hot_days").notNull().default(7),
    warmDays: integer("warm_days").notNull().default(30),
    coldDays: integer("cold_days").notNull().default(365),
    preserveOriginal: boolean("preserve_original").notNull().default(true),
    preserveDerived: boolean("preserve_derived").notNull().default(true),
    protectedByDefault: boolean("protected_by_default").notNull().default(false),
    reason: text("reason").notNull(),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("retention_policy_source_idx").on(table.sourceKind, table.active)],
);

export const archiveManifest = pgTable(
  "archive_manifest",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentHash: varchar("content_hash", { length: 128 }).notNull().unique(),
    checksumAlgorithm: varchar("checksum_algorithm", { length: 32 }).notNull().default("sha256"),
    sourceId: uuid("source_id"),
    sourceKind: varchar("source_kind", { length: 48 }).notNull(),
    sourceOwner: varchar("source_owner", { length: 96 }).notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    byteSize: bigint("byte_size", { mode: "number" }),
    sourcePath: text("source_path"),
    archivePath: text("archive_path"),
    storageTier: varchar("storage_tier", { length: 32 }).notNull().default("active"),
    integrityState: varchar("integrity_state", { length: 24 }).notNull().default("pending"),
    retentionClass: varchar("retention_class", { length: 24 }).notNull().default("cold"),
    retentionState: varchar("retention_state", { length: 32 }).notNull().default("retained"),
    protectedRecord: boolean("protected_record").notNull().default(false),
    protectionReasons: jsonb("protection_reasons").$type<string[]>().notNull().default([]),
    retentionPolicyKey: varchar("retention_policy_key", { length: 64 }).notNull(),
    backupRefs: jsonb("backup_refs").$type<string[]>().notNull().default([]),
    restoreRefs: jsonb("restore_refs").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("archive_manifest_source_idx").on(table.sourceKind, table.sourceId),
    index("archive_manifest_state_idx").on(table.storageTier, table.integrityState, table.retentionState),
    index("archive_manifest_retention_idx").on(table.retentionClass, table.protectedRecord),
  ],
);

export const archiveRepresentation = pgTable(
  "archive_representation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    archiveManifestId: uuid("archive_manifest_id").notNull(),
    layerType: varchar("layer_type", { length: 32 }).notNull(),
    objectId: uuid("object_id"),
    storagePath: text("storage_path"),
    contentHash: varchar("content_hash", { length: 128 }),
    checksumAlgorithm: varchar("checksum_algorithm", { length: 32 }).notNull().default("sha256"),
    byteSize: bigint("byte_size", { mode: "number" }),
    retentionState: varchar("retention_state", { length: 32 }).notNull().default("retained"),
    provenanceRefs: jsonb("provenance_refs").$type<string[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("archive_representation_manifest_layer_unique").on(table.archiveManifestId, table.layerType),
    index("archive_representation_object_idx").on(table.objectId, table.layerType),
  ],
);

export const retentionDecision = pgTable(
  "retention_decision",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    archiveManifestId: uuid("archive_manifest_id").notNull(),
    action: varchar("action", { length: 24 }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    reason: text("reason").notNull(),
    requestedBy: text("requested_by").notNull().default("retention-engine"),
    decidedBy: text("decided_by"),
    decisionEvidence: jsonb("decision_evidence").$type<Record<string, unknown>>().notNull().default({}),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("retention_decision_manifest_idx").on(table.archiveManifestId, table.status),
    index("retention_decision_pending_idx").on(table.status, table.createdAt),
  ],
);

export const storagePressureSnapshot = pgTable(
  "storage_pressure_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stage: varchar("stage", { length: 40 }).notNull().default("normal"),
    stageOrder: integer("stage_order").notNull().default(0),
    pressureScore: real("pressure_score").notNull().default(0),
    usedBytes: bigint("used_bytes", { mode: "number" }),
    trackedBytes: bigint("tracked_bytes", { mode: "number" }),
    availableBytes: bigint("available_bytes", { mode: "number" }),
    actionSummary: text("action_summary").notNull(),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("storage_pressure_observed_idx").on(table.observedAt), index("storage_pressure_stage_idx").on(table.stageOrder, table.observedAt)],
);

export const insertRetentionPolicySchema = createInsertSchema(retentionPolicy, { reason: z.string().min(1) });
export const insertArchiveManifestSchema = createInsertSchema(archiveManifest, {
  protectionReasons: stringArray,
  backupRefs: stringArray,
  restoreRefs: stringArray,
  metadata: jsonRecord,
});
export const insertArchiveRepresentationSchema = createInsertSchema(archiveRepresentation, {
  provenanceRefs: stringArray,
  metadata: jsonRecord,
});
export const insertRetentionDecisionSchema = createInsertSchema(retentionDecision, { decisionEvidence: jsonRecord });
export const insertStoragePressureSnapshotSchema = createInsertSchema(storagePressureSnapshot, { evidence: jsonRecord });