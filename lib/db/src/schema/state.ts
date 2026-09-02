import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const leeState = pgTable("lee_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  currentState: varchar("current_state", { length: 24 }).notNull().default("Idle"),
  enteredAt: timestamp("entered_at", { withTimezone: true }).defaultNow().notNull(),
  reason: text("reason").notNull().default("System initialized"),
  estimatedDurationSeconds: integer("estimated_duration_seconds"),
  activeJobsSummary: jsonb("active_jobs_summary").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("lee_state_current_idx").on(table.currentState)]);
export const stateHistory = pgTable("state_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: varchar("state", { length: 24 }).notNull(),
  enteredAt: timestamp("entered_at", { withTimezone: true }).notNull(),
  exitedAt: timestamp("exited_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  reason: text("reason").notNull(),
  triggeringJobId: uuid("triggering_job_id"),
}, (table) => [index("state_history_state_entered_idx").on(table.state, table.enteredAt), index("state_history_entered_idx").on(table.enteredAt)]);