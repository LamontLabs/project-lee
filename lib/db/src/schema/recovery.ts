import { index, jsonb, pgTable, timestamp, uuid, varchar, boolean, text } from "drizzle-orm/pg-core";

export const cleanShutdown = pgTable("clean_shutdown", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull(),
  stateChecksum: varchar("state_checksum", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});
export const recoveryAgenda = pgTable("recovery_agenda", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: varchar("status", { length: 24 }).notNull().default("OPEN"),
  issues: jsonb("issues").$type<Array<{ id: string; description: string; status: string }>>().notNull().default([]),
  source: text("source").notNull().default("boot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
export const bootHistory = pgTable("boot_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  bootMode: varchar("boot_mode", { length: 24 }).notNull(),
  reason: text("reason").notNull(),
  agendaSummary: text("agenda_summary"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  engineStates: jsonb("engine_states").$type<Record<string, string>>().notNull().default({}),
  success: boolean("success").notNull().default(false),
}, (table) => [index("boot_history_started_idx").on(table.startedAt)]);