import { jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const resourceAllocation = pgTable("resource_allocation", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  percentage: real("percentage").notNull(),
  impliedDailyHours: real("implied_daily_hours").notNull().default(0),
  impliedWeeklyHours: real("implied_weekly_hours").notNull().default(0),
  why: jsonb("why").$type<Record<string, number | string>>().notNull().default({}),
  narrative: text("narrative").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
});
export const resourceAllocationOverride = pgTable("resource_allocation_override", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  percentage: real("percentage").notNull(),
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});