import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export type DesktopSetupStep = {
  key: string;
  label: string;
  status: "pending" | "running" | "complete" | "needs_owner" | "failed" | "skipped";
  detail?: string;
  connectionId?: string;
  provider?: string;
  updatedAt: string;
};

export const desktopSetupRun = pgTable("desktop_setup_run", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  steps: jsonb("steps").$type<DesktopSetupStep[]>().notNull().default([]),
  summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
  lastError: text("last_error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("desktop_setup_run_status_idx").on(table.status, table.updatedAt)]);