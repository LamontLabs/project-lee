import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
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

export const insertCostRecordSchema = createInsertSchema(costRecord, {
  metadata: z.record(z.string(), z.unknown()),
});