import { createInsertSchema } from "drizzle-zod";
import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());
const jsonArray = z.array(z.string());

export const universalObject = pgTable("universal_object", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectType: varchar("object_type", { length: 64 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status", { length: 48 }).notNull().default("active"),
  confidence: real("confidence").notNull().default(0.5),
  propagatedConfidence: real("propagated_confidence"),
  freshness: real("freshness").notNull().default(1),
  importance: real("importance").notNull().default(0.5),
  sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
  relatedObjects: jsonb("related_objects").$type<string[]>().notNull().default([]),
  history: jsonb("history").$type<Record<string, unknown>[]>().notNull().default([]),
  permissions: jsonb("permissions").$type<Record<string, unknown>>().notNull().default({}),
  version: integer("version").notNull().default(1),
  canonLevel: varchar("canon_level", { length: 16 }).notNull().default("working"),
  confidenceLineage: jsonb("confidence_lineage").$type<Record<string, unknown>>().notNull().default({}),
  whyChain: jsonb("why_chain").$type<Record<string, unknown>[]>().notNull().default([]),
  memoryTier: varchar("memory_tier", { length: 24 }).notNull().default("recent"),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  accessCount: integer("access_count").notNull().default(0),
  relevanceScore: real("relevance_score").notNull().default(0.5),
  consolidatedAt: timestamp("consolidated_at", { withTimezone: true }),
  compressionStage: integer("compression_stage").notNull().default(1),
  memorySummary: jsonb("memory_summary").$type<Record<string, unknown>>(),
  keyEntities: jsonb("key_entities").$type<string[]>().notNull().default([]),
  manualTierOverride: boolean("manual_tier_override").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
  ageState: varchar("age_state", { length: 16 }).notNull().default("FRESH"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdBy: text("created_by").notNull().default("migration"),
    modifiedBy: text("modified_by"),
    modifiedAt: timestamp("modified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    importedFrom: jsonb("imported_from").$type<Record<string, unknown>>(),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>(),
    currentOwner: text("current_owner").notNull().default("owner"),
}, (table) => [index("universal_object_type_status_idx").on(table.objectType, table.status), index("universal_object_memory_idx").on(table.memoryTier, table.relevanceScore), index("universal_object_access_idx").on(table.lastAccessedAt)]);

export const sourceVault = pgTable("source_vault", {
  id: uuid("id").defaultRandom().primaryKey(),
  originalFilename: text("original_filename").notNull(),
  mimeType: varchar("mime_type", { length: 160 }).notNull(),
  byteSize: integer("byte_size"),
  checksum: varchar("checksum", { length: 128 }).notNull().unique(),
  storagePath: text("storage_path").notNull(),
  processingStatus: varchar("processing_status", { length: 32 }).notNull().default("pending"),
  evidenceQuality: real("evidence_quality").notNull().default(0.5),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  rawContent: text("raw_content"),
  ageState: varchar("age_state", { length: 16 }).notNull().default("FRESH"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdBy: text("created_by").notNull().default("migration"),
    modifiedBy: text("modified_by"),
    modifiedAt: timestamp("modified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    importedFrom: jsonb("imported_from").$type<Record<string, unknown>>(),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>(),
    currentOwner: text("current_owner").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("source_vault_status_idx").on(table.processingStatus)]);

export const constitutionProvision = pgTable("constitution_provision", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  title: text("title").notNull(),
  tier: varchar("tier", { length: 16 }).notNull(),
  machineReadableRule: jsonb("machine_readable_rule").$type<Record<string, unknown>>().notNull().default({}),
  appliesToEngines: jsonb("applies_to_engines").$type<string[]>().notNull().default([]),
  consultationCount: integer("consultation_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sourceChunk = pgTable("source_chunk", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull(),
  runId: uuid("run_id"),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  startChar: integer("start_char").notNull(),
  endChar: integer("end_char").notNull(),
  tokenEstimate: integer("token_estimate").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  checksum: varchar("checksum", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("source_chunk_source_index_unique").on(table.sourceId, table.chunkIndex), uniqueIndex("source_chunk_checksum_unique").on(table.sourceId, table.checksum), index("source_chunk_run_idx").on(table.runId)]);

export const understandingReviewItem = pgTable("understanding_review_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull(),
  runId: uuid("run_id"),
  chunkId: uuid("chunk_id"),
  itemType: varchar("item_type", { length: 48 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("needs_review"),
  confidence: real("confidence").notNull().default(0.5),
  proposedValue: jsonb("proposed_value").$type<Record<string, unknown>>().notNull().default({}),
  evidenceExcerpt: text("evidence_excerpt"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [index("understanding_review_status_created_idx").on(table.status, table.createdAt), index("understanding_review_source_idx").on(table.sourceId)]);

export const constitutionVersion = pgTable("constitution_version", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: varchar("version", { length: 32 }).notNull().unique(),
  provisions: jsonb("provisions").$type<Record<string, unknown>[]>().notNull().default([]),
  amendmentReason: text("amendment_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const impactNode = pgTable("impact_node", {
  id: uuid("id").defaultRandom().primaryKey(),
  nodeType: varchar("node_type", { length: 64 }).notNull(),
  objectId: uuid("object_id"),
  label: text("label").notNull(),
  outcome: varchar("outcome", { length: 32 }),
  confidence: real("confidence").notNull().default(0.5),
  impactScore: real("impact_score").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("impact_node_type_idx").on(table.nodeType), index("impact_node_object_idx").on(table.objectId), index("impact_node_score_idx").on(table.impactScore)]);

export const impactEdge = pgTable("impact_edge", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceNodeId: uuid("source_node_id").notNull(),
  targetNodeId: uuid("target_node_id").notNull(),
  edgeType: varchar("edge_type", { length: 64 }).notNull(),
  strength: real("strength").notNull().default(0.5),
  confidence: real("confidence").notNull().default(0.5),
  lagDays: integer("lag_days"),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  evidenceSource: text("evidence_source"),
  createdBy: varchar("created_by", { length: 24 }).notNull().default("engine"),
  status: varchar("status", { length: 24 }).notNull().default("needs-review"),
  observedAt: timestamp("observed_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("impact_edge_unique").on(table.sourceNodeId, table.targetNodeId, table.edgeType), index("impact_edge_source_idx").on(table.sourceNodeId), index("impact_edge_target_idx").on(table.targetNodeId)]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action", { length: 120 }).notNull(),
  actor: text("actor").notNull(),
  targetType: varchar("target_type", { length: 64 }),
  targetId: text("target_id"),
  outcome: varchar("outcome", { length: 32 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("audit_log_created_idx").on(table.createdAt), index("audit_log_target_idx").on(table.targetType, table.targetId)]);

export const waitingLoop = pgTable("waiting_loop", {
  id: uuid("id").defaultRandom().primaryKey(),
  commitmentId: uuid("commitment_id"),
  subject: text("subject").notNull(),
  owner: text("owner"),
  direction: varchar("direction", { length: 24 }).notNull().default("uncertain"),
  actorType: varchar("actor_type", { length: 32 }).notNull().default("unknown"),
  actorId: uuid("actor_id"),
  recipientType: varchar("recipient_type", { length: 32 }).notNull().default("unknown"),
  recipientId: uuid("recipient_id"),
  personId: uuid("person_id"),
  organizationId: text("organization_id"),
  projectId: text("project_id"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  waitingSince: timestamp("waiting_since", { withTimezone: true }).defaultNow().notNull(),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }),
  expectedResponseAt: timestamp("expected_response_at", { withTimezone: true }),
  lastMeaningfulActivityAt: timestamp("last_meaningful_activity_at", { withTimezone: true }),
  importanceScore: real("importance_score").notNull().default(0.5),
  projectImpactScore: real("project_impact_score").notNull().default(0.5),
  confidence: real("confidence").notNull().default(0.5),
  cadenceDays: integer("cadence_days"),
  sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
  completionEvidenceRefs: jsonb("completion_evidence_refs").$type<string[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("waiting_loop_status_check_idx").on(table.status, table.nextCheckAt),
  index("waiting_loop_commitment_idx").on(table.commitmentId),
  index("waiting_loop_person_idx").on(table.personId, table.status),
  index("waiting_loop_direction_idx").on(table.direction, table.status),
]);

export const notification = pgTable("notification", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  severity: varchar("severity", { length: 16 }).notNull().default("info"),
  status: varchar("status", { length: 16 }).notNull().default("unread"),
  targetRef: text("target_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  pushSentAt: timestamp("push_sent_at", { withTimezone: true }),
}, (table) => [index("notification_status_created_idx").on(table.status, table.createdAt)]);

export const brief = pgTable("brief", {
  id: uuid("id").defaultRandom().primaryKey(),
  briefType: varchar("brief_type", { length: 48 }).notNull(),
  title: text("title").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  sourcesUsed: jsonb("sources_used").$type<string[]>().notNull().default([]),
  whyChain: jsonb("why_chain").$type<Record<string, unknown>[]>().notNull().default([]),
  confidence: real("confidence").notNull().default(0.5),
  version: integer("version").notNull().default(1),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("brief_type_generated_idx").on(table.briefType, table.generatedAt)]);

export const insertUniversalObjectSchema = createInsertSchema(universalObject, { sourceRefs: jsonArray, relatedObjects: jsonArray, history: z.array(jsonRecord), permissions: jsonRecord, confidenceLineage: jsonRecord, whyChain: z.array(jsonRecord) });
export const insertSourceVaultSchema = createInsertSchema(sourceVault, { metadata: jsonRecord });
export const insertImpactNodeSchema = createInsertSchema(impactNode, { sourceRefs: jsonArray, metadata: jsonRecord });
export const insertImpactEdgeSchema = createInsertSchema(impactEdge, { evidenceRefs: jsonArray, metadata: jsonRecord });
export const insertAuditLogSchema = createInsertSchema(auditLog, { metadata: jsonRecord });
export const insertWaitingLoopSchema = createInsertSchema(waitingLoop, { sourceRefs: jsonArray, completionEvidenceRefs: jsonArray, metadata: jsonRecord });
export const insertNotificationSchema = createInsertSchema(notification);
export const insertBriefSchema = createInsertSchema(brief, { content: jsonRecord, sourcesUsed: jsonArray, whyChain: z.array(jsonRecord) });