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
    confidenceTier: varchar("confidence_tier", { length: 16 }).notNull().default("MEDIUM"),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    evidenceWindowStart: timestamp("evidence_window_start", { withTimezone: true }),
    evidenceWindowEnd: timestamp("evidence_window_end", { withTimezone: true }),
    exceptionCount: integer("exception_count").notNull().default(0),
    firstEstablished: timestamp("first_established", { withTimezone: true }),
    lastReinforced: timestamp("last_reinforced", { withTimezone: true }),
    ownerReviewed: boolean("owner_reviewed").notNull().default(false),
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

export const experienceRecord = pgTable(
  "experience_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceEventId: uuid("source_event_id").notNull().unique(),
    significanceClassification: varchar("significance_classification", { length: 32 }).notNull(),
    observation: text("observation").notNull(),
    domain: varchar("domain", { length: 120 }).notNull().default("operations"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("experience_domain_created_idx").on(table.domain, table.createdAt)],
);

export const lessonRecord = pgTable(
  "lesson_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    statement: text("statement").notNull(),
    patternKey: varchar("pattern_key", { length: 200 }).notNull(),
    experienceRefs: jsonb("experience_refs").$type<string[]>().notNull().default([]),
    confidence: real("confidence").notNull().default(0.5),
    status: varchar("status", { length: 32 }).notNull().default("draft"),
    extractedBy: varchar("extracted_by", { length: 32 }).notNull().default("reflection"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("lesson_pattern_status_idx").on(table.patternKey, table.status),
    index("lesson_created_idx").on(table.createdAt),
  ],
);

export const operationalMetric = pgTable(
  "operational_metric",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 48 }).notNull(),
    observationType: varchar("observation_type", { length: 80 }).notNull(),
    value: real("value").notNull(),
    sourceEventId: uuid("source_event_id"),
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
    observedAt: timestamp("observed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("operational_metric_category_observed_idx").on(table.category, table.observedAt),
    index("operational_metric_source_idx").on(table.sourceEventId),
  ],
);

export const operationalAdaptation = pgTable(
  "operational_adaptation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 48 }).notNull(),
    parameter: varchar("parameter", { length: 120 }).notNull(),
    previousValue: text("previous_value").notNull(),
    currentValue: text("current_value").notNull(),
    defaultValue: text("default_value").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    observationCount: integer("observation_count").notNull().default(0),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("operational_adaptation_status_idx").on(table.status),
    index("operational_adaptation_parameter_idx").on(table.parameter),
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

export const identityProfileVersion = pgTable(
  "identity_profile_version",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull(),
    version: integer("version").notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull(),
    changeReason: text("change_reason").notNull(),
    confirmedByOwner: boolean("confirmed_by_owner").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("identity_profile_version_profile_idx").on(table.profileId, table.version),
    index("identity_profile_version_created_idx").on(table.createdAt),
  ],
);

export const executiveObjective = pgTable(
  "executive_objective",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 240 }).notNull(),
    description: text("description"),
    purpose: text("purpose").notNull().default(""),
    sourceRef: text("source_ref").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    healthStatus: varchar("health_status", { length: 32 }).notNull().default("ON_TRACK"),
    progressNarrative: text("progress_narrative").notNull().default("No progress evidence has been recorded yet."),
    currentBlockers: jsonb("current_blockers").$type<string[]>().notNull().default([]),
    successMetrics: jsonb("success_metrics").$type<string[]>().notNull().default([]),
    relatedProjects: jsonb("related_projects").$type<string[]>().notNull().default([]),
    expectedCompletion: text("expected_completion"),
    currentOwner: text("current_owner").notNull().default("Founder"),
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

export const executiveObjectiveEvidence = pgTable(
  "executive_objective_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectiveId: uuid("objective_id").notNull(),
    eventId: uuid("event_id"),
    evidenceType: varchar("evidence_type", { length: 64 }).notNull(),
    direction: varchar("direction", { length: 16 }).notNull().default("neutral"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("executive_objective_evidence_objective_idx").on(table.objectiveId, table.createdAt),
    index("executive_objective_evidence_event_idx").on(table.eventId),
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
  { evidenceRefs: z.array(z.string()) },
);
export const insertExperienceSchema = createInsertSchema(experienceRecord, {
  metadata: jsonRecord,
});
export const insertLessonSchema = createInsertSchema(lessonRecord, {
  experienceRefs: z.array(z.string()),
});
export const insertOperationalMetricSchema = createInsertSchema(operationalMetric, {
  context: jsonRecord,
});
export const insertOperationalAdaptationSchema = createInsertSchema(operationalAdaptation, {
  evidenceRefs: z.array(z.string()),
});
export const insertAssumptionSchema = createInsertSchema(assumptionLedger);
export const insertIdentityProfileSchema = createInsertSchema(identityProfile, {
  values: jsonRecord,
});
export const insertIdentityProfileVersionSchema = createInsertSchema(identityProfileVersion, {
  values: jsonRecord,
});
export const insertExecutiveObjectiveSchema = createInsertSchema(
  executiveObjective,
  {
    metadata: jsonRecord,
    currentBlockers: z.array(z.string()),
    successMetrics: z.array(z.string()),
    relatedProjects: z.array(z.string()),
  },
);
export const insertExecutiveObjectiveEvidenceSchema = createInsertSchema(executiveObjectiveEvidence);

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