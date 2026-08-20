import { index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const behavioralSignal = pgTable("behavioral_signal", {
  id: uuid("id").defaultRandom().primaryKey(),
  signalType: varchar("signal_type", { length: 48 }).notNull(),
  entityRef: text("entity_ref"),
  actor: text("actor").notNull().default("owner"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  evidenceEventId: uuid("evidence_event_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
}, (table) => [index("behavioral_signal_type_time_idx").on(table.signalType, table.occurredAt)]);

export const operationalPattern = pgTable("operational_pattern", {
  id: uuid("id").defaultRandom().primaryKey(),
  patternType: varchar("pattern_type", { length: 32 }).notNull(),
  patternDescription: text("pattern_description").notNull(),
  confidence: real("confidence").notNull().default(0.3),
  observationCount: integer("observation_count").notNull().default(0),
  contradictionCount: integer("contradiction_count").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("candidate"),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("operational_pattern_type_status_idx").on(table.patternType, table.status)]);