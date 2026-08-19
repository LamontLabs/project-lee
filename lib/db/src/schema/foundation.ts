import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const jsonRecord = z.record(z.string(), z.unknown());

/**
 * The event log is the immutable system history. The database trigger installed
 * by ensureAppendOnlyEventLog() is the enforcement boundary; application code
 * must never update or delete rows here.
 */
export const eventLog = pgTable(
  "event_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: varchar("event_type", { length: 160 }).notNull(),
    aggregateType: varchar("aggregate_type", { length: 160 }).notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    sourceRef: text("source_ref"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("event_log_type_occurred_idx").on(
      table.eventType,
      table.occurredAt,
    ),
    index("event_log_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
    ),
  ],
);

export const factLedger = pgTable(
  "fact_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: text("subject").notNull(),
    predicate: text("predicate").notNull(),
    object: text("object").notNull(),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("fact_ledger_subject_idx").on(table.subject),
    index("fact_ledger_source_idx").on(table.sourceRef),
  ],
);

export const interpretationLedger = pgTable(
  "interpretation_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    statement: text("statement").notNull(),
    basis: text("basis").notNull(),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("interpretation_source_idx").on(table.sourceRef),
    index("interpretation_validity_idx").on(table.validFrom, table.validUntil),
  ],
);

export const anchorLedger = pgTable(
  "anchor_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    statement: text("statement").notNull(),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(1),
    priority: integer("priority").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("anchor_active_priority_idx").on(table.active, table.priority)],
);

export const decisionHeuristicLedger = pgTable(
  "decision_heuristic_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    rule: text("rule").notNull(),
    rationale: text("rationale"),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("decision_heuristic_source_idx").on(table.sourceRef)],
);

export const institutionalKnowledgeLedger = pgTable(
  "institutional_knowledge_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    statement: text("statement").notNull(),
    evidenceCount: integer("evidence_count").notNull().default(0),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    evidenceWindowStart: timestamp("evidence_window_start", { withTimezone: true }),
    evidenceWindowEnd: timestamp("evidence_window_end", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull().default("candidate"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("institutional_knowledge_status_idx").on(table.status),
    index("institutional_knowledge_source_idx").on(table.sourceRef),
  ],
);

export const assumptionLedger = pgTable(
  "assumption_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    statement: text("statement").notNull(),
    rationale: text("rationale"),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    reviewAt: timestamp("review_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("assumption_status_review_idx").on(table.status, table.reviewAt),
    index("assumption_source_idx").on(table.sourceRef),
  ],
);

export const identityProfile = pgTable("identity_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileKey: varchar("profile_key", { length: 64 })
    .notNull()
    .default("primary")
    .unique(),
  displayName: varchar("display_name", { length: 200 }),
  values: jsonb("values").$type<Record<string, unknown>>().notNull().default({}),
  mission: text("mission"),
  sourceRef: text("source_ref"),
  confidence: real("confidence").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const executiveObjective = pgTable(
  "executive_objective",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    priority: integer("priority").notNull().default(0),
    targetDate: timestamp("target_date", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("executive_objective_status_priority_idx").on(
      table.status,
      table.priority,
    ),
    index("executive_objective_source_idx").on(table.sourceRef),
  ],
);

export const insertEventLogSchema = createInsertSchema(eventLog, {
  payload: jsonRecord,
});
export const insertFactSchema = createInsertSchema(factLedger);
export const insertInterpretationSchema = createInsertSchema(interpretationLedger);
export const insertAnchorSchema = createInsertSchema(anchorLedger);
export const insertDecisionHeuristicSchema = createInsertSchema(
  decisionHeuristicLedger,
);
export const insertInstitutionalKnowledgeSchema = createInsertSchema(
  institutionalKnowledgeLedger,
);
export const insertAssumptionSchema = createInsertSchema(assumptionLedger);
export const insertIdentityProfileSchema = createInsertSchema(identityProfile, {
  values: jsonRecord,
});
export const insertExecutiveObjectiveSchema = createInsertSchema(
  executiveObjective,
  {
    metadata: jsonRecord,
  },
);

export type EventLog = typeof eventLog.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;
export type Fact = typeof factLedger.$inferSelect;
export type Interpretation = typeof interpretationLedger.$inferSelect;
export type Anchor = typeof anchorLedger.$inferSelect;
export type DecisionHeuristic = typeof decisionHeuristicLedger.$inferSelect;
export type InstitutionalKnowledge = typeof institutionalKnowledgeLedger.$inferSelect;
export type Assumption = typeof assumptionLedger.$inferSelect;
export type IdentityProfile = typeof identityProfile.$inferSelect;
export type ExecutiveObjective = typeof executiveObjective.$inferSelect;