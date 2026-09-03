import { index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const COGNITIVE_RUNTIME_MODEL_KEYS = [
  "world", "owner", "lab", "project", "relationship", "temporal", "self",
  "uncertainty", "goal", "authority", "attention", "experience", "memory",
] as const;
export type CognitiveRuntimeModelKey = typeof COGNITIVE_RUNTIME_MODEL_KEYS[number];

export const COGNITIVE_RUNTIME_STATUSES = ["fresh", "aging", "stale", "degraded", "unavailable"] as const;
export type CognitiveRuntimeStatus = typeof COGNITIVE_RUNTIME_STATUSES[number];

export type CognitiveRuntimeModelSnapshot = {
  modelKey: CognitiveRuntimeModelKey;
  status: CognitiveRuntimeStatus;
  freshness: number;
  evidenceWindow: { start: string | null; end: string | null };
  evidenceRefs: string[];
  summary: Record<string, unknown>;
  degradedReason?: string | null;
};

export const cognitiveRuntimeModel = pgTable("cognitive_runtime_model", {
  id: uuid("id").defaultRandom().primaryKey(),
  runtimeKey: varchar("runtime_key", { length: 48 }).notNull().default("primary"),
  modelKey: varchar("model_key", { length: 48 }).notNull(),
  modelType: varchar("model_type", { length: 80 }).notNull(),
  sourceEngine: varchar("source_engine", { length: 120 }).notNull(),
  engineVersion: varchar("engine_version", { length: 48 }),
  status: varchar("status", { length: 24 }).notNull().default("unavailable"),
  freshness: real("freshness").notNull().default(0),
  evidenceWindowStart: timestamp("evidence_window_start", { withTimezone: true }),
  evidenceWindowEnd: timestamp("evidence_window_end", { withTimezone: true }),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
  degradedReason: text("degraded_reason"),
  lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
  nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cognitive_runtime_model_key_unique").on(table.runtimeKey, table.modelKey),
  index("cognitive_runtime_model_status_idx").on(table.status, table.nextRefreshAt),
]);

export const cognitiveRuntimeCycle = pgTable("cognitive_runtime_cycle", {
  id: uuid("id").defaultRandom().primaryKey(),
  runtimeKey: varchar("runtime_key", { length: 48 }).notNull().default("primary"),
  cycleNumber: integer("cycle_number").notNull().default(1),
  trigger: varchar("trigger", { length: 48 }).notNull().default("scheduled"),
  status: varchar("status", { length: 24 }).notNull().default("running"),
  modelKeys: jsonb("model_keys").$type<CognitiveRuntimeModelKey[]>().notNull().default([]),
  modelStates: jsonb("model_states").$type<CognitiveRuntimeModelSnapshot[]>().notNull().default([]),
  evidenceWindowStart: timestamp("evidence_window_start", { withTimezone: true }),
  evidenceWindowEnd: timestamp("evidence_window_end", { withTimezone: true }),
  staleModels: jsonb("stale_models").$type<CognitiveRuntimeModelKey[]>().notNull().default([]),
  degradedModels: jsonb("degraded_models").$type<CognitiveRuntimeModelKey[]>().notNull().default([]),
  summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
  continuity: jsonb("continuity").$type<Record<string, unknown>>().notNull().default({}),
  modelConfigFingerprint: varchar("model_config_fingerprint", { length: 128 }).notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  nextRefreshAt: timestamp("next_refresh_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("cognitive_runtime_cycle_number_unique").on(table.runtimeKey, table.cycleNumber),
  index("cognitive_runtime_cycle_created_idx").on(table.runtimeKey, table.createdAt),
  index("cognitive_runtime_cycle_status_idx").on(table.status, table.nextRefreshAt),
]);