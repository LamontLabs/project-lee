import { jsonb, pgTable, real, timestamp, uuid, varchar, boolean } from "drizzle-orm/pg-core";
export const operationalCapacity = pgTable("operational_capacity", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: varchar("state", { length: 16 }).notNull(),
  score: real("score").notNull(),
  signals: jsonb("signals").$type<Record<string, number>>().notNull().default({}),
  inferred: boolean("inferred").notNull().default(true),
  overrideState: varchar("override_state", { length: 16 }),
  observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
});
export const operationalCapacityHistory = pgTable("operational_capacity_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: varchar("state", { length: 16 }).notNull(),
  score: real("score").notNull(),
  signals: jsonb("signals").$type<Record<string, number>>().notNull().default({}),
  source: varchar("source", { length: 24 }).notNull().default("inference"),
  observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
});