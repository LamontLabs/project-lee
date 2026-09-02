import { index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

const links = () => jsonb("supporting_evidence").$type<string[]>().notNull().default([]);
export const observation = pgTable("observation", {
  id: uuid("id").defaultRandom().primaryKey(),
  observationType: varchar("observation_type", { length: 64 }).notNull(),
  headline: text("headline").notNull(),
  supportingEvidence: links(),
  affectedObjects: jsonb("affected_objects").$type<string[]>().notNull().default([]),
  confidence: varchar("confidence", { length: 16 }).notNull().default("low"),
  propagatedConfidence: real("propagated_confidence"),
  confidenceLineage: jsonb("confidence_lineage").$type<Record<string, unknown>[]>().notNull().default([]),
  whyChain: jsonb("why_chain").$type<Record<string, unknown>[]>().notNull().default([]),
  relevanceScore: real("relevance_score").notNull().default(0.5),
  lifecycle: varchar("lifecycle", { length: 24 }).notNull().default("new"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  actedOnAt: timestamp("acted_on_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
}, (table) => [index("observation_type_relevance_idx").on(table.observationType, table.relevanceScore), index("observation_generated_idx").on(table.generatedAt)]);

export const opportunity = pgTable("opportunity", {
  id: uuid("id").defaultRandom().primaryKey(),
  opportunityType: varchar("opportunity_type", { length: 64 }).notNull(),
  headline: text("headline").notNull(),
  supportingEvidence: jsonb("supporting_evidence").$type<string[]>().notNull().default([]),
  affectedObjects: jsonb("affected_objects").$type<string[]>().notNull().default([]),
  confidence: varchar("confidence", { length: 16 }).notNull().default("low"),
  propagatedConfidence: real("propagated_confidence"),
  confidenceLineage: jsonb("confidence_lineage").$type<Record<string, unknown>[]>().notNull().default([]),
  whyChain: jsonb("why_chain").$type<Record<string, unknown>[]>().notNull().default([]),
  relevanceScore: real("relevance_score").notNull().default(0.5),
  potentialValue: varchar("potential_value", { length: 16 }).notNull().default("low"),
  actionSuggestion: text("action_suggestion").notNull(),
  lifecycle: varchar("lifecycle", { length: 24 }).notNull().default("new"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  actedOnAt: timestamp("acted_on_at", { withTimezone: true }),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
}, (table) => [index("opportunity_type_relevance_idx").on(table.opportunityType, table.relevanceScore), index("opportunity_generated_idx").on(table.generatedAt)]);

export const curiositySetting = pgTable("curiosity_setting", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileKey: varchar("profile_key", { length: 64 }).notNull().unique().default("primary"),
  observationsPerDay: integer("observations_per_day").notNull().default(8),
  minimumConfidence: varchar("minimum_confidence", { length: 16 }).notNull().default("medium"),
  enabledTypes: jsonb("enabled_types").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});