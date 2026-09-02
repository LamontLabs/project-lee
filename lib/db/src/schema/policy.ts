import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const policyRecord = pgTable("policy_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyType: varchar("policy_type", { length: 48 }).notNull(),
  version: integer("version").notNull(),
  values: jsonb("values").$type<Record<string, unknown>>().notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: text("created_by").notNull().default("system"),
  changeReason: text("change_reason").notNull(),
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
}, (table) => [index("policy_record_type_version_idx").on(table.policyType, table.version), index("policy_record_active_idx").on(table.policyType, table.supersededAt)]);
export const policyConsultation = pgTable("policy_consultation", {
  id: uuid("id").defaultRandom().primaryKey(),
  policyType: varchar("policy_type", { length: 48 }).notNull(),
  policyVersion: integer("policy_version").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  permitted: boolean("permitted").notNull(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  constraints: jsonb("constraints").$type<string[]>().notNull().default([]),
  requester: text("requester").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("policy_consultation_type_created_idx").on(table.policyType, table.createdAt)]);