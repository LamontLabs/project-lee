import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const constitutionProvision = pgTable("constitution_provision", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: varchar("category", { length: 64 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  ruleText: text("rule_text").notNull(),
  machineReadableRule: jsonb("machine_readable_rule").$type<Record<string, unknown>>().notNull().default({}),
  tier: varchar("tier", { length: 20 }).notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  amendedAt: timestamp("amended_at", { withTimezone: true }),
  amendmentReason: text("amendment_reason"),
  appliesToEngines: jsonb("applies_to_engines").$type<string[]>().notNull().default([]),
  consultationCount: integer("consultation_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
});
export const constitutionVersion = pgTable("constitution_version", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: integer("version").notNull().unique(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const constitutionConsultation = pgTable("constitution_consultation", {
  id: uuid("id").defaultRandom().primaryKey(),
  actionType: varchar("action_type", { length: 120 }).notNull(),
  engineName: varchar("engine_name", { length: 120 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  permitted: boolean("permitted").notNull(),
  overrideRequired: boolean("override_required").notNull().default(false),
  applicableProvisionIds: jsonb("applicable_provision_ids").$type<string[]>().notNull().default([]),
  constraints: jsonb("constraints").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const constitutionViolation = pgTable("constitution_violation", {
  id: uuid("id").defaultRandom().primaryKey(),
  consultationId: uuid("consultation_id").notNull(),
  actionType: varchar("action_type", { length: 120 }).notNull(),
  reason: text("reason").notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("CRITICAL"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});