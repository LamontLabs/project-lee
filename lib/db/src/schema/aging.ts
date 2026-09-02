import { index, integer, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const ageWindowConfig = pgTable("age_window_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectType: varchar("object_type", { length: 64 }).notNull().unique(),
  freshDays: real("fresh_days"),
  currentDays: real("current_days"),
  oldDays: real("old_days").notNull(),
  historicalDays: real("historical_days").notNull(),
  staleDays: real("stale_days"),
  expiredDays: real("expired_days"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const agingTransition = pgTable("aging_transition", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectId: uuid("object_id").notNull(),
  objectType: varchar("object_type", { length: 64 }).notNull(),
  fromState: varchar("from_state", { length: 16 }),
  toState: varchar("to_state", { length: 16 }).notNull(),
  ageDays: integer("age_days").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("aging_transition_object_idx").on(table.objectId, table.createdAt)]);