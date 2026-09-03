import { index, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
export const operationalContextSnapshot = pgTable("operational_context_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  activePriority: jsonb("active_priority").$type<Record<string, unknown> | null>(),
  changedItems: jsonb("changed_items").$type<Record<string, unknown>[]>().notNull().default([]),
  driftingItems: jsonb("drifting_items").$type<Record<string, unknown>[]>().notNull().default([]),
  waitingItems: jsonb("waiting_items").$type<Record<string, unknown>[]>().notNull().default([]),
  blockedItems: jsonb("blocked_items").$type<Record<string, unknown>[]>().notNull().default([]),
  atRiskItems: jsonb("at_risk_items").$type<Record<string, unknown>[]>().notNull().default([]),
  canWaitItems: jsonb("can_wait_items").$type<Record<string, unknown>[]>().notNull().default([]),
  ignoreTodayItems: jsonb("ignore_today_items").$type<Record<string, unknown>[]>().notNull().default([]),
  scoringContext: jsonb("scoring_context").$type<Record<string, unknown>>().notNull().default({}),
});

export const changeIntelligence = pgTable("change_intelligence", {
  id: uuid("id").defaultRandom().primaryKey(),
  fingerprint: varchar("fingerprint", { length: 240 }).notNull().unique(),
  eventId: uuid("event_id").notNull(),
  eventType: varchar("event_type", { length: 160 }).notNull(),
  aggregateType: varchar("aggregate_type", { length: 160 }).notNull(),
  aggregateId: text("aggregate_id").notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: text("entity_id").notNull(),
  source: varchar("source", { length: 80 }).notNull(),
  sourceRef: text("source_ref"),
  previousState: jsonb("previous_state").$type<unknown>(),
  currentState: jsonb("current_state").$type<unknown>(),
  changeKind: varchar("change_kind", { length: 80 }).notNull(),
  classification: varchar("classification", { length: 16 }).notNull(),
  significanceScore: real("significance_score").notNull(),
  confidence: real("confidence").notNull(),
  freshness: real("freshness").notNull(),
  causalEventId: uuid("causal_event_id"),
  correlationId: uuid("correlation_id"),
  evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
  explanation: text("explanation").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("change_intelligence_occurred_idx").on(table.occurredAt, table.significanceScore),
  index("change_intelligence_entity_idx").on(table.entityType, table.entityId, table.occurredAt),
  index("change_intelligence_source_idx").on(table.source, table.occurredAt),
]);

export const changeIntelligenceCursor = pgTable("change_intelligence_cursor", {
  id: uuid("id").defaultRandom().primaryKey(),
  scopeKey: varchar("scope_key", { length: 160 }).notNull().unique(),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }).notNull(),
  lastChangeId: uuid("last_change_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const changeIntelligenceProjection = pgTable("change_intelligence_projection", {
  id: varchar("id", { length: 32 }).primaryKey().default("main"),
  lastCreatedAt: timestamp("last_created_at", { withTimezone: true }),
  lastEventId: uuid("last_event_id"),
  processedCount: integer("processed_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});