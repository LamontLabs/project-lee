import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export type IntentEmailSearchFilters = {
  text?: string;
  sender?: string;
  subject?: string;
  after?: string;
  before?: string;
  unread?: boolean;
};

export const intentRecord = pgTable("intent_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  rawInput: text("raw_input").notNull(),
  intentType: varchar("intent_type", { length: 48 }).notNull(),
  intentSubtype: varchar("intent_subtype", { length: 80 }),
  detectedProjectIds: jsonb("detected_project_ids").$type<string[]>().notNull().default([]),
  detectedPersonIds: jsonb("detected_person_ids").$type<string[]>().notNull().default([]),
  detectedObjectIds: jsonb("detected_object_ids").$type<string[]>().notNull().default([]),
  audienceProfile: varchar("audience_profile", { length: 48 }).notNull().default("Founder"),
  urgency: varchar("urgency", { length: 24 }).notNull().default("routine"),
  requiresModel: boolean("requires_model").notNull().default(true),
  modelComplexityEstimate: varchar("model_complexity_estimate", { length: 16 }).notNull().default("cheap"),
  retrievalMode: varchar("retrieval_mode", { length: 16 }).notNull().default("structured"),
  explanationType: varchar("explanation_type", { length: 48 }),
  emailFilters: jsonb("email_filters").$type<IntentEmailSearchFilters | null>(),
  confidence: real("confidence").notNull().default(0.5),
  source: varchar("source", { length: 24 }).notNull().default("ask_lee"),
  sessionId: text("session_id"),
  correctionCount: integer("correction_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("intent_type_created_idx").on(table.intentType, table.createdAt), index("intent_session_idx").on(table.sessionId), index("intent_projects_idx").on(table.detectedProjectIds), index("intent_people_idx").on(table.detectedPersonIds)]);