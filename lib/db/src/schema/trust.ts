import { index, jsonb, real, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const trustScore = pgTable("trust_score", {
  id: uuid("id").defaultRandom().primaryKey(),
  subsystemName: varchar("subsystem_name", { length: 120 }).notNull().unique(),
  score: real("score").notNull().default(50),
  scoreHistory: jsonb("score_history").$type<Array<{ score: number; at: string; reason: string }>>().notNull().default([]),
  contributingSignals: jsonb("contributing_signals").$type<Record<string, number>>().notNull().default({}),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
});
export const trustEvent = pgTable("trust_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  subsystemName: varchar("subsystem_name", { length: 120 }).notNull(),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  delta: real("delta").notNull(),
  reason: text("reason").notNull(),
  evidenceId: uuid("evidence_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("trust_event_subsystem_idx").on(table.subsystemName, table.timestamp)]);