import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const projectRepairRun = pgTable("project_repair_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: varchar("project_id", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("OBSERVED"),
  requestedBy: text("requested_by").notNull().default("owner"),
  request: jsonb("request").$type<Record<string, unknown>>().notNull().default({}),
  diagnosis: jsonb("diagnosis").$type<Record<string, unknown>>().notNull().default({}),
  plan: jsonb("plan").$type<Array<Record<string, unknown>>>().notNull().default([]),
  planHash: varchar("plan_hash", { length: 128 }).notNull(),
  evidenceBundleHash: varchar("evidence_bundle_hash", { length: 128 }),
  governanceRequestId: uuid("governance_request_id"),
  ownerConfirmed: boolean("owner_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("project_repair_run_project_idx").on(table.projectId, table.createdAt),
  index("project_repair_run_status_idx").on(table.status, table.updatedAt),
]);

export const projectRepairStep = pgTable("project_repair_step", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull(),
  ordinal: integer("ordinal").notNull(),
  stepKey: varchar("step_key", { length: 96 }).notNull(),
  operation: varchar("operation", { length: 48 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
  dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull().unique(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  lastError: text("last_error"),
  retryAt: timestamp("retry_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_repair_step_run_idx").on(table.runId, table.ordinal),
  index("project_repair_step_status_idx").on(table.status, table.retryAt),
]);

export const projectRepairEvidence = pgTable("project_repair_evidence", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull(),
  stepId: uuid("step_id"),
  kind: varchar("kind", { length: 48 }).notNull(),
  sourceRef: text("source_ref").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  contentHash: varchar("content_hash", { length: 128 }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_repair_evidence_run_idx").on(table.runId, table.capturedAt),
  index("project_repair_evidence_hash_idx").on(table.contentHash),
]);

export const projectRepairAttempt = pgTable("project_repair_attempt", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull(),
  stepId: uuid("step_id").notNull(),
  attemptNo: integer("attempt_no").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  retryable: boolean("retryable").notNull().default(false),
  errorClass: varchar("error_class", { length: 64 }),
  errorMessage: text("error_message"),
  inputHash: varchar("input_hash", { length: 128 }),
  outputHash: varchar("output_hash", { length: 128 }),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("project_repair_attempt_step_idx").on(table.stepId, table.attemptNo),
  index("project_repair_attempt_run_idx").on(table.runId, table.startedAt),
]);

export const projectRepairVerification = pgTable("project_repair_verification", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull(),
  stepId: uuid("step_id"),
  verifier: varchar("verifier", { length: 96 }).notNull(),
  expected: jsonb("expected").$type<Record<string, unknown>>().notNull().default({}),
  observed: jsonb("observed").$type<Record<string, unknown>>().notNull().default({}),
  result: varchar("result", { length: 16 }).notNull(),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  outputHash: varchar("output_hash", { length: 128 }),
  attemptNo: integer("attempt_no").notNull().default(0),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_repair_verification_run_idx").on(table.runId, table.verifiedAt),
  index("project_repair_verification_result_idx").on(table.result, table.verifiedAt),
]);