import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const initiativeItem = pgTable("initiative_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: varchar("category", { length: 48 }).notNull(),
  observation: text("observation").notNull(),
  significance: varchar("significance", { length: 16 }).notNull().default("LOW"),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  actionHint: text("action_hint"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  dedupeKey: varchar("dedupe_key", { length: 240 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
}, (table) => [index("initiative_active_idx").on(table.dismissedAt, table.expiresAt), index("initiative_dedupe_idx").on(table.dedupeKey, table.generatedAt)]);
export const initiativeLimitConfig = pgTable("initiative_limit_config", {
  id: uuid("id").defaultRandom().primaryKey(), dailyHighCritical: integer("daily_high_critical").notNull().default(5), dailyOther: integer("daily_other").notNull().default(10), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});