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

/**
 * Provider-neutral resource usage. Quantity is always an observed amount;
 * price is intentionally kept in the separate evidence ledger.
 */
export const economicUsageRecord = pgTable(
  "economic_usage_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    operation: varchar("operation", { length: 64 }).notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    quantity: real("quantity").notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 96 }).notNull(),
    sourceRef: text("source_ref").notNull(),
    evidenceRef: text("evidence_ref").notNull().default("legacy:unverified"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("economic_usage_category_recorded_idx").on(table.category, table.recordedAt),
    index("economic_usage_operation_unit_idx").on(table.operation, table.unit),
  ],
);

/**
 * Provider-backed price evidence. A price is only usable for a usage record
 * when its effective date is at or before that usage's observation time.
 */
export const economicPriceEvidence = pgTable(
  "economic_price_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    operation: varchar("operation", { length: 64 }).notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
    priceUsd: real("price_usd").notNull(),
    provider: varchar("provider", { length: 96 }).notNull(),
    sourceRef: text("source_ref").notNull(),
    evidenceRef: text("evidence_ref").notNull().default("legacy:unverified"),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("economic_price_operation_effective_idx").on(table.operation, table.unit, table.effectiveAt),
    index("economic_price_category_effective_idx").on(table.category, table.effectiveAt),
  ],
);

export const insertCostRecordSchema = createInsertSchema(costRecord, {
  metadata: z.record(z.string(), z.unknown()),
});
export const insertSystemEconomicsCycleSchema = createInsertSchema(systemEconomicsCycle, {
  summary: z.record(z.string(), z.unknown()),
  alerts: z.array(z.string()),
});
export const insertEconomicUsageRecordSchema = createInsertSchema(economicUsageRecord, {
  metadata: z.record(z.string(), z.unknown()),
  recordedAt: z.coerce.date(),
}).refine((value) => value.quantity >= 0, { message: "quantity must be non-negative" });
export const insertEconomicPriceEvidenceSchema = createInsertSchema(economicPriceEvidence, {
  metadata: z.record(z.string(), z.unknown()),
  effectiveAt: z.coerce.date(),
  recordedAt: z.coerce.date(),
}).refine((value) => value.priceUsd >= 0, { message: "priceUsd must be non-negative" });