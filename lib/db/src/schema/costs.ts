import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  boolean,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const costRecord = pgTable(
  "cost_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    correlationId: text("correlation_id").notNull(),
    engine: varchar("engine", { length: 96 }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    tier: varchar("tier", { length: 16 }).notNull(),
    model: varchar("model", { length: 96 }).notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCostUsd: real("estimated_cost_usd").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    cacheHit: boolean("cache_hit").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("cost_record_correlation_idx").on(table.correlationId),
    index("cost_record_tier_recorded_idx").on(table.tier, table.recordedAt),
  ],
);

export const systemEconomicsCycle = pgTable(
  "system_economics_cycle",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    totalCostUsd: real("total_cost_usd").notNull().default(0),
    projectedMonthlyCostUsd: real("projected_monthly_cost_usd").notNull().default(0),
    summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
    alerts: jsonb("alerts").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("system_economics_cycle_period_idx").on(table.periodStart, table.periodEnd),
    index("system_economics_cycle_created_idx").on(table.createdAt),
  ],
);

export const insertCostRecordSchema = createInsertSchema(costRecord, {
  metadata: z.record(z.string(), z.unknown()),
});
export const insertSystemEconomicsCycleSchema = createInsertSchema(systemEconomicsCycle, {
  summary: z.record(z.string(), z.unknown()),
  alerts: z.array(z.string()),
});