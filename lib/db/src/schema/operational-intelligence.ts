import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
export const operationalContextSnapshot = pgTable("operational_context_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  activePriority: jsonb("active_priority").$type<Record<string, unknown> | null>(),
  changedItems: jsonb("changed_items").$type<Record<string, unknown>[]>().notNull().default([]),
  driftingItems: jsonb("drifting_items").$type<Record<string, unknown>[]>().notNull().default([]),
  waitingItems: jsonb("waiting_items").$type<Record<string, unknown>[]>().notNull().default([]),
  blockedItems: jsonb("blocked_items").$type<Record<string, unknown>[]>().notNull().default([]),
  atRiskItems: jsonb("at_risk_items").$type<Record<string, unknown>[]>().notNull().default([]),
  canWaitItems: jsonb("can_wait_items").$type<Record<string, unknown>[]>().notNull().default([]),
  ignoreTodayItems: jsonb("ignore_today_items").$type<Record<string, unknown>[]>().notNull().default([]),
  scoringContext: jsonb("scoring_context").$type<Record<string, unknown>>().notNull().default({}),
});