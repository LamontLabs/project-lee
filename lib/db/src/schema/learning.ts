import { index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const correction = pgTable("correction", {
  id: uuid("id").defaultRandom().primaryKey(),
  engineName: varchar("engine_name", { length: 120 }).notNull(),
  originalOutput: text("original_output").notNull(),
  correctedOutput: text("corrected_output").notNull(),
  contextSnapshot: jsonb("context_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  correctionType: varchar("correction_type", { length: 64 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("correction_category_captured_idx").on(table.category, table.capturedAt)]);
export const standingCorrectionRule = pgTable("standing_correction_rule", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: varchar("category", { length: 120 }).notNull(),
  condition: text("condition").notNull(),
  correction: text("correction").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("proposed"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  appliedCount: integer("applied_count").notNull().default(0),
  correctionIds: jsonb("correction_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("standing_rule_status_idx").on(table.status)]);
export const learningAsset = pgTable("learning_asset", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetType: varchar("asset_type", { length: 48 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  pattern: text("pattern").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  confidence: real("confidence").notNull().default(0.5),
  appliedCount: integer("applied_count").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("candidate"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("learning_asset_type_status_idx").on(table.assetType, table.status)]);