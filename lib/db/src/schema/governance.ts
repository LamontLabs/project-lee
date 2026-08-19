import { createInsertSchema } from "drizzle-zod";
import {
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("governance_request_status_created_idx").on(table.status, table.createdAt),
    index("governance_request_action_idx").on(table.actionClass, table.createdAt),
  ],
);

export const insertGovernanceRequestSchema = createInsertSchema(governanceRequest, {
  reasonCodes: z.array(z.string()),
  requestPayload: jsonRecord,
  responsePayload: jsonRecord.optional(),
});