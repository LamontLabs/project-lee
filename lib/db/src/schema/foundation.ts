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
  uniqueIndex,
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
    eventVersion: varchar("event_version", { length: 24 }).notNull().default("1.0.0"),
    aggregateType: varchar("aggregate_type", { length: 160 }).notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    actor: text("actor").notNull().default("lee"),
    sourceRef: text("source_ref"),
    sequenceNumber: integer("sequence_number").notNull().default(1),
    causationId: uuid("causation_id"),
    correlationId: uuid("correlation_id"),
    sessionId: uuid("session_id"),
    brainVersion: varchar("brain_version", { length: 128 }),
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
export const projectionCheckpoint = pgTable("projection_checkpoint", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectionName: varchar("projection_name", { length: 120 }).notNull().unique(),
  lastCreatedAt: timestamp("last_created_at", { withTimezone: true }),
  lastEventId: uuid("last_event_id"),
  processedCount: integer("processed_count").notNull().default(0),
  conflictCount: integer("conflict_count").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("ready"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const projectionEventReceipt = pgTable("projection_event_receipt", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectionName: varchar("projection_name", { length: 120 }).notNull(),
  eventId: uuid("event_id").notNull(),
  eventHash: varchar("event_hash", { length: 64 }).notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("projection_event_receipt_unique").on(table.projectionName, table.eventId)]);

export const eventSubscription = pgTable("event_subscription", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriberId: varchar("subscriber_id", { length: 160 }).notNull().unique(),
  eventTypes: jsonb("event_types").$type<string[]>().notNull().default([]),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  cursorCreatedAt: timestamp("cursor_created_at", { withTimezone: true }),
  cursorEventId: uuid("cursor_event_id"),
  retryCount: integer("retry_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  deadLetterCount: integer("dead_letter_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("event_subscription_status_idx").on(table.status, table.nextAttemptAt),
]);

export const eventDelivery = pgTable("event_delivery", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").notNull(),
  eventId: uuid("event_id").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
  lastError: text("last_error"),
  correlationId: uuid("correlation_id"),
  causationId: uuid("causation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("event_delivery_subscription_event_unique").on(table.subscriptionId, table.eventId),
  index("event_delivery_due_idx").on(table.status, table.nextAttemptAt),
]);

export const eventDeliveryAttempt = pgTable("event_delivery_attempt", {
  id: uuid("id").defaultRandom().primaryKey(),
  deliveryId: uuid("delivery_id").notNull(),
  subscriptionId: uuid("subscription_id").notNull(),
  eventId: uuid("event_id").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text("error"),
  correlationId: uuid("correlation_id"),
  causationId: uuid("causation_id"),
}, (table) => [
  uniqueIndex("event_delivery_attempt_unique").on(table.deliveryId, table.attemptNumber),
  index("event_delivery_attempt_event_idx").on(table.eventId, table.status),
]);
export const timelineEventConfig = pgTable("timeline_event_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: varchar("event_type", { length: 160 }).notNull().unique(),
  timelineType: varchar("timeline_type", { length: 48 }).notNull(),
  visible: boolean("visible").notNull().default(true),
  significance: real("significance").notNull().default(0.5),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const milestoneMarker = pgTable("milestone_marker", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().unique(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const queryLog = pgTable("query_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  queryId: uuid("query_id").notNull(),
  requesterEngine: varchar("requester_engine", { length: 120 }).notNull(),
  purpose: varchar("purpose", { length: 80 }).notNull(),
  sources: jsonb("sources").$type<string[]>().notNull().default([]),
  filterSpec: jsonb("filter_spec").$type<Record<string, unknown>>().notNull().default({}),
  rankingPolicy: varchar("ranking_policy", { length: 80 }).notNull(),
  resultCount: integer("result_count").notNull().default(0),
  cacheHit: boolean("cache_hit").notNull().default(false),
  executionMs: integer("execution_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("query_log_purpose_idx").on(table.purpose, table.createdAt)]);
export const queryCache = pgTable("query_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  cacheKey: text("cache_key").notNull().unique(),
  result: jsonb("result").$type<unknown[]>().notNull().default([]),
  cachedAt: timestamp("cached_at", { withTimezone: true }).defaultNow().notNull(),
  ttlSeconds: integer("ttl_seconds").notNull(),
  invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
});
export const explanationAudienceProfile = pgTable("explanation_audience_profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 32 }).notNull().unique(),
  vocabularyLevel: varchar("vocabulary_level", { length: 32 }).notNull(),
  depth: varchar("depth", { length: 32 }).notNull(),
  tone: varchar("tone", { length: 48 }).notNull(),
  emphasis: jsonb("emphasis").$type<string[]>().notNull().default([]),
  sentenceLengthPreference: varchar("sentence_length_preference", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const semanticIndex = pgTable("semantic_index", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectId: text("object_id").notNull(),
  objectType: varchar("object_type", { length: 64 }).notNull(),
  embedding: jsonb("embedding").$type<number[]>().notNull().default([]),
  indexedAt: timestamp("indexed_at", { withTimezone: true }).defaultNow().notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }).notNull(),
  modelVersion: varchar("model_version", { length: 64 }).notNull().default("local-hash-v1"),
  excerpt: text("excerpt").notNull(),
}, (table) => [uniqueIndex("semantic_index_object_unique").on(table.objectId, table.objectType), index("semantic_index_object_idx").on(table.objectId), index("semantic_index_indexed_idx").on(table.indexedAt)]);

export const factLedger = pgTable(
  "fact_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: text("subject").notNull(),
    predicate: text("predicate").notNull(),
    object: text("object").notNull(),
    sourceRef: text("source_ref").notNull(),
    factType: varchar("fact_type", { length: 16 }).notNull().default("observed"),
    sourceEvidence: jsonb("source_evidence").$type<string[]>().notNull().default([]),
    confidence: real("confidence").notNull().default(0.5),
    propagatedConfidence: real("propagated_confidence"),
    confidenceLineage: jsonb("confidence_lineage").$type<Record<string, unknown>>().notNull().default({}),
    canonLevel: varchar("canon_level", { length: 16 }).notNull().default("working"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow().notNull(),
    lastConfirmed: timestamp("last_confirmed", { withTimezone: true }),
    freshnessScore: real("freshness_score").notNull().default(1),
    supersededBy: uuid("superseded_by"),
    relatedProjects: jsonb("related_projects").$type<string[]>().notNull().default([]),
    relatedPeople: jsonb("related_people").$type<string[]>().notNull().default([]),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ageState: varchar("age_state", { length: 16 }).notNull().default("FRESH"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    verifiable: boolean("verifiable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text("created_by").notNull().default("migration"),
    modifiedBy: text("modified_by"),
    modifiedAt: timestamp("modified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    importedFrom: jsonb("imported_from").$type<Record<string, unknown>>(),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>(),
    currentOwner: text("current_owner").notNull().default("owner"),
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
    interpretationType: varchar("interpretation_type", { length: 24 }).notNull().default("inference"),
    inputFacts: jsonb("input_facts").$type<string[]>().notNull().default([]),
    inputInterpretations: jsonb("input_interpretations").$type<string[]>().notNull().default([]),
    generatedByEngine: varchar("generated_by_engine", { length: 120 }).notNull().default("unknown"),
    confidence: real("confidence").notNull().default(0.5),
    propagatedConfidence: real("propagated_confidence"),
    confidenceLineage: jsonb("confidence_lineage").$type<Record<string, unknown>>().notNull().default({}),
    whyChain: jsonb("why_chain").$type<Record<string, unknown>[]>().notNull().default([]),
    canonLevel: varchar("canon_level", { length: 16 }).notNull().default("working"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    actedOnAt: timestamp("acted_on_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    promotedTo: uuid("promoted_to"),
    needsReview: boolean("needs_review").notNull().default(false),
    audienceProfile: varchar("audience_profile", { length: 32 }),
    explanationType: varchar("explanation_type", { length: 32 }),
    sourceObjectIds: jsonb("source_object_ids").$type<string[]>().notNull().default([]),
    explanationBrief: jsonb("explanation_brief").$type<Record<string, unknown>>().notNull().default({}),
    qualityFeedback: varchar("quality_feedback", { length: 24 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text("created_by").notNull().default("migration"),
    modifiedBy: text("modified_by"),
    modifiedAt: timestamp("modified_at", { withTimezone: true }),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ageState: varchar("age_state", { length: 16 }).notNull().default("FRESH"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    importedFrom: jsonb("imported_from").$type<Record<string, unknown>>(),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>(),
    currentOwner: text("current_owner").notNull().default("owner"),
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
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    exceptionCount: integer("exception_count").notNull().default(0),
    firstObserved: timestamp("first_observed", { withTimezone: true }),
    lastReinforced: timestamp("last_reinforced", { withTimezone: true }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
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
    rollbackData: jsonb("rollback_data").$type<Record<string, unknown>>().notNull().default({}),
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
    assumptionType: varchar("assumption_type", { length: 24 }).notNull().default("structural"),
    evidenceBasis: jsonb("evidence_basis").$type<string[]>().notNull().default([]),
    confidence: real("confidence").notNull().default(0.5),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdByEngine: varchar("created_by_engine", { length: 120 }).notNull().default("unknown"),
    usedIn: jsonb("used_in").$type<string[]>().notNull().default([]),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    invalidationSource: text("invalidation_source"),
    supersededBy: uuid("superseded_by"),
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
export const assumptionUse = pgTable("assumption_use", {
  id: uuid("id").defaultRandom().primaryKey(),
  assumptionId: uuid("assumption_id").notNull(),
  conclusionType: varchar("conclusion_type", { length: 32 }).notNull(),
  conclusionId: uuid("conclusion_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("assumption_use_unique").on(table.assumptionId, table.conclusionType, table.conclusionId), index("assumption_use_conclusion_idx").on(table.conclusionType, table.conclusionId)]);

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

export const organizationalProfile = pgTable(
  "organizational_profile",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileKey: varchar("profile_key", { length: 64 }).notNull().unique(),
    legalName: varchar("legal_name", { length: 240 }).notNull(),
    structure: jsonb("structure").$type<Record<string, unknown>>().notNull().default({}),
    peopleCategories: jsonb("people_categories").$type<Record<string, unknown>>().notNull().default({}),
    infrastructureOwnership: jsonb("infrastructure_ownership").$type<Record<string, unknown>>().notNull().default({}),
    technologyOwnership: jsonb("technology_ownership").$type<Record<string, unknown>>().notNull().default({}),
    revenueModel: jsonb("revenue_model").$type<Record<string, unknown>>().notNull().default({}),
    legalCompliance: jsonb("legal_compliance").$type<Record<string, unknown>>().notNull().default({}),
    sharedServices: jsonb("shared_services").$type<Record<string, unknown>>().notNull().default({}),
    sourceRef: text("source_ref").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("organizational_profile_source_idx").on(table.sourceRef)],
);

export const organizationalResource = pgTable(
  "organizational_resource",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull(),
    resourceType: varchar("resource_type", { length: 48 }).notNull(),
    name: varchar("name", { length: 240 }).notNull(),
    ownerRef: text("owner_ref").notNull(),
    projectRefs: jsonb("project_refs").$type<string[]>().notNull().default([]),
    dependencyRefs: jsonb("dependency_refs").$type<string[]>().notNull().default([]),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    sourceRef: text("source_ref").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("organizational_resource_profile_idx").on(table.profileId, table.resourceType),
    index("organizational_resource_owner_idx").on(table.ownerRef),
  ],
);

export const insertEventLogSchema = createInsertSchema(eventLog, {
  payload: jsonRecord,
});
export const insertFactSchema = createInsertSchema(factLedger);
export const insertInterpretationSchema = createInsertSchema(interpretationLedger, {
  whyChain: z.array(jsonRecord),
});
export const insertAnchorSchema = createInsertSchema(anchorLedger);
export const insertDecisionHeuristicSchema = createInsertSchema(
  decisionHeuristicLedger,
  { evidence: jsonRecord, evidenceRefs: z.array(z.string()) },
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
export const insertOrganizationalProfileSchema = createInsertSchema(organizationalProfile, {
  structure: jsonRecord,
  peopleCategories: jsonRecord,
  infrastructureOwnership: jsonRecord,
  technologyOwnership: jsonRecord,
  revenueModel: jsonRecord,
  legalCompliance: jsonRecord,
  sharedServices: jsonRecord,
});
export const insertOrganizationalResourceSchema = createInsertSchema(organizationalResource, {
  projectRefs: z.array(z.string()),
  dependencyRefs: z.array(z.string()),
  metadata: jsonRecord,
});

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