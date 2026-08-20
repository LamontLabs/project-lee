import { jsonb, integer, pgTable, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
export const executiveLoop = pgTable("executive_loop", {
  id: uuid("id").defaultRandom().primaryKey(),
  loopKey: varchar("loop_key", { length: 48 }).notNull().unique(),
  phase: varchar("phase", { length: 24 }).notNull().default("OBSERVE"),
  cycleCount: integer("cycle_count").notNull().default(0),
  phaseEnteredAt: timestamp("phase_entered_at", { withTimezone: true }).defaultNow().notNull(),
  lastTransitionAt: timestamp("last_transition_at", { withTimezone: true }),
  lastCycleStartedAt: timestamp("last_cycle_started_at", { withTimezone: true }),
  averageCycleDurationMs: integer("average_cycle_duration_ms"),
  interrupted: integer("interrupted").notNull().default(0),
  phaseDurations: jsonb("phase_durations").$type<Record<string, number>>().notNull().default({}),
  lastReason: varchar("last_reason", { length: 240 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});