import { boolean, index, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const worldStateSignal = pgTable("world_state_signal", {
  id: uuid("id").defaultRandom().primaryKey(),
  signalType: varchar("signal_type", { length: 32 }).notNull(),
  signalName: varchar("signal_name", { length: 160 }).notNull(),
  currentValue: jsonb("current_value").$type<Record<string, unknown>>().notNull().default({}),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
  source: text("source").notNull(),
  confidence: real("confidence").notNull().default(1),
  stalenessThresholdHours: real("staleness_threshold_hours").notNull().default(24),
  refreshFrequency: varchar("refresh_frequency", { length: 32 }).notNull().default("hourly"),
  configured: boolean("configured").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("world_state_signal_type_idx").on(table.signalType, table.enabled), index("world_state_signal_updated_idx").on(table.lastUpdatedAt)]);

export const worldStateSnapshot = pgTable("world_state_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  signalId: uuid("signal_id").notNull(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  source: text("source").notNull(),
});