import { index, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const resourceSnapshot = pgTable("resource_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  sampledAt: timestamp("sampled_at", { withTimezone: true }).defaultNow().notNull(),
  dimensionStates: jsonb("dimension_states").$type<Record<string, unknown>>().notNull(),
  overallState: varchar("overall_state", { length: 16 }).notNull(),
}, (table) => [index("resource_snapshot_sampled_idx").on(table.sampledAt), index("resource_snapshot_state_idx").on(table.overallState)]);
export const resourceAlert = pgTable("resource_alert", {
  id: uuid("id").defaultRandom().primaryKey(),
  dimension: varchar("dimension", { length: 32 }).notNull(),
  level: varchar("level", { length: 16 }).notNull(),
  title: text("title").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("resource_alert_active_idx").on(table.level, table.resolvedAt), index("resource_alert_created_idx").on(table.createdAt)]);
export const resourceQuota = pgTable("resource_quota", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 96 }).notNull().unique(),
  used: real("used").notNull().default(0),
  limit: real("limit").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});