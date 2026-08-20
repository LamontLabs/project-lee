import { jsonb, integer, pgTable, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const operationalConfidenceSnapshot = pgTable("operational_confidence_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  score: integer("score").notNull(),
  explanation: varchar("explanation", { length: 500 }).notNull(),
  factors: jsonb("factors").$type<Array<{ key: string; label: string; score: number; weight: number; contribution: number; detail: string }>>().notNull().default([]),
  threshold: integer("threshold").notNull().default(70),
  triggeredInitiative: varchar("triggered_initiative", { length: 120 }),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
});