import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

export const governanceRequest = pgTable(
  "governance_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leeRequestId: uuid("lee_request_id").notNull().unique(),
    actionClass: varchar("action_class", { length: 96 }).notNull(),
    targetSystem: varchar("target_system", { length: 96 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("HOLD"),
    decisionId: text("decision_id"),
    reasonCodes: jsonb("reason_codes").$type<string[]>().notNull().default([]),
    requestPayload: jsonb("request_payload").$type<Record<string, unknown>>().notNull(),
    responsePayload: jsonb("response_payload").$type<Record<string, unknown>>(),
    riskLevel: varchar("risk_level", { length: 16 }).notNull().default("MEDIUM"),
    reason: text("reason"),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    affectedObject: text("affected_object"),
    actor: text("actor").notNull().default("lee"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    verdict: varchar("verdict", { length: 16 }),
    wasEdited: boolean("was_edited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("governance_request_status_created_idx").on(table.status, table.createdAt),
    index("governance_request_action_idx").on(table.actionClass, table.createdAt),
  ],
);

export const governanceRule = pgTable(
  "governance_rule",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ruleType: varchar("rule_type", { length: 24 }).notNull(),
    actionPattern: varchar("action_pattern", { length: 160 }).notNull(),
    reason: text("reason"),
    version: integer("version").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdBy: text("created_by").notNull().default("founder"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("governance_rule_active_pattern_idx").on(table.active, table.actionPattern)],
);

export const insertGovernanceRequestSchema = createInsertSchema(governanceRequest, {
  reasonCodes: z.array(z.string()),
  requestPayload: jsonRecord,
  responsePayload: jsonRecord.optional(),
});

export const insertGovernanceRuleSchema = createInsertSchema(governanceRule);