import { jsonb, pgTable, real, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const uncertaintyState = pgTable("uncertainty_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectId: varchar("object_id", { length: 180 }).notNull(),
  objectType: varchar("object_type", { length: 64 }).notNull(),
  outcomeLevel: varchar("outcome_level", { length: 16 }).notNull(),
  timingLevel: varchar("timing_level", { length: 16 }).notNull(),
  scopeLevel: varchar("scope_level", { length: 16 }).notNull(),
  level: varchar("level", { length: 16 }).notNull(),
  score: real("score").notNull(),
  signals: jsonb("signals").$type<string[]>().notNull().default([]),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});