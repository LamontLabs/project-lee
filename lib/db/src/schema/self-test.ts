import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const selfTestRun = pgTable("self_test_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  testRunId: uuid("test_run_id").defaultRandom().notNull().unique(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  overallResult: varchar("overall_result", { length: 8 }).notNull().default("WARN"),
  report: jsonb("report").$type<Record<string, unknown>>().notNull().default({}),
  passCount: integer("pass_count").notNull().default(0),
  warnCount: integer("warn_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
}, (table) => [index("self_test_run_started_idx").on(table.startedAt), index("self_test_run_result_idx").on(table.overallResult)]);