import { createInsertSchema } from "drizzle-zod";
import { index, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const operationalReview = pgTable(
  "operational_review",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cadence: varchar("cadence", { length: 16 }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    title: text("title").notNull(),
    summaryNarrative: text("summary_narrative").notNull(),
    sections: jsonb("sections").$type<Record<string, unknown>>().notNull(),
    sourceRefs: jsonb("source_refs").$type<string[]>().notNull().default([]),
    keyThemes: jsonb("key_themes").$type<string[]>().notNull().default([]),
    reasoningCorrelationId: text("reasoning_correlation_id"),
    reasoningCostUsd: real("reasoning_cost_usd"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("operational_review_cadence_generated_idx").on(table.cadence, table.generatedAt),
    index("operational_review_period_idx").on(table.periodStart, table.periodEnd),
  ],
);

export const insertOperationalReviewSchema = createInsertSchema(operationalReview, {
  sections: jsonRecord,
  sourceRefs: z.array(z.string()),
  keyThemes: z.array(z.string()),
});