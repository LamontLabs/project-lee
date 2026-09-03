import { createInsertSchema } from "drizzle-zod";
import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());
const jsonRecords = z.array(jsonRecord);
const stringArray = z.array(z.string());

export const CONSOLIDATION_PHASES = [
  "observe_changes",
  "reconcile_conflicts",
  "deduplicate_representations",
  "review_stale_assumptions",
  "learn_outcomes",
  "consolidate_experiences",
  "compress_cold_memory",
  "cool_hot_memory",
  "archive_sources",
  "reindex_retrieval",
  "prepare_briefing",
] as const;

export type ConsolidationPhaseName = typeof CONSOLIDATION_PHASES[number];

export const memoryConsolidationRun = pgTable(
  "memory_consolidation_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runKey: varchar("run_key", { length: 180 }).notNull().unique(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    currentPhase: varchar("current_phase", { length: 64 }).notNull().default(CONSOLIDATION_PHASES[0]),
    priority: varchar("priority", { length: 16 }).notNull().default("LOW"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    resumedFromRunId: uuid("resumed_from_run_id"),
    attempt: integer("attempt").notNull().default(0),
    inputEvidenceRefs: jsonb("input_evidence_refs").$type<string[]>().notNull().default([]),
    outputEvidenceRefs: jsonb("output_evidence_refs").$type<string[]>().notNull().default([]),
    skippedWork: jsonb("skipped_work").$type<Record<string, unknown>[]>().notNull().default([]),
    unresolvedConflictCount: integer("unresolved_conflict_count").notNull().default(0),
    failurePhase: varchar("failure_phase", { length: 64 }),
    failureReason: text("failure_reason"),
    nextScheduledAt: timestamp("next_scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("memory_consolidation_run_status_idx").on(table.status, table.updatedAt),
    index("memory_consolidation_run_next_idx").on(table.nextScheduledAt),
  ],
);

export const memoryConsolidationPhase = pgTable(
  "memory_consolidation_phase",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id").notNull(),
    phase: varchar("phase", { length: 64 }).notNull(),
    phaseOrder: integer("phase_order").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 240 }).notNull(),
    inputEvidenceRefs: jsonb("input_evidence_refs").$type<string[]>().notNull().default([]),
    outputEvidenceRefs: jsonb("output_evidence_refs").$type<string[]>().notNull().default([]),
    resultSummary: jsonb("result_summary").$type<Record<string, unknown>>().notNull().default({}),
    skippedReason: text("skipped_reason"),
    failureReason: text("failure_reason"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    attempt: integer("attempt").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("memory_consolidation_phase_run_phase_unique").on(table.runId, table.phase),
    uniqueIndex("memory_consolidation_phase_idempotency_unique").on(table.idempotencyKey),
    index("memory_consolidation_phase_status_idx").on(table.status, table.updatedAt),
  ],
);

export const insertMemoryConsolidationRunSchema = createInsertSchema(memoryConsolidationRun, {
  inputEvidenceRefs: stringArray,
  outputEvidenceRefs: stringArray,
  skippedWork: jsonRecords,
});

export const insertMemoryConsolidationPhaseSchema = createInsertSchema(memoryConsolidationPhase, {
  inputEvidenceRefs: stringArray,
  outputEvidenceRefs: stringArray,
  resultSummary: jsonRecord,
});