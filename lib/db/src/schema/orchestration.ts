import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const engineRegistry = pgTable("engine_registry", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  priorityClass: varchar("priority_class", { length: 16 }).notNull().default("NORMAL"),
  frequency: varchar("frequency", { length: 80 }),
  resourceProfile: jsonb("resource_profile").$type<Record<string, unknown>>().notNull().default({}),
  dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orchestrationWorkItem = pgTable("orchestration_work_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  engineName: varchar("engine_name", { length: 120 }).notNull(),
  action: varchar("action", { length: 160 }).notNull(),
  priority: varchar("priority", { length: 16 }).notNull().default("NORMAL"),
  urgencyScore: real("urgency_score").notNull().default(0),
  estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
  dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: varchar("status", { length: 24 }).notNull().default("queued"),
  delayReason: text("delay_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [index("orchestration_queue_idx").on(table.status, table.priority, table.createdAt)]);

export const engineHealth = pgTable("engine_health", {
  id: uuid("id").defaultRandom().primaryKey(),
  engineName: varchar("engine_name", { length: 120 }).notNull().unique(),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
  errorCount: integer("error_count").notNull().default(0),
  runCount: integer("run_count").notNull().default(0),
  averageDurationMs: integer("average_duration_ms").notNull().default(0),
  backoffUntil: timestamp("backoff_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});