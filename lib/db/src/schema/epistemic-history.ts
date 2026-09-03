import { createInsertSchema } from "drizzle-zod";
import {
  index,
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
const jsonRecords = z.array(jsonRecord);
const jsonArray = z.array(z.string());

/**
 * One immutable epistemic conclusion at a point in time. Revisions create a
 * new row and only mark the prior row's lifecycle state as superseded.
 */
export const beliefState = pgTable(
  "belief_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    beliefKey: varchar("belief_key", { length: 200 }).notNull(),
    conclusion: text("conclusion").notNull(),
    interpretationId: uuid("interpretation_id"),
    priorBeliefId: uuid("prior_belief_id"),
    priorInterpretationId: uuid("prior_interpretation_id"),
    state: varchar("state", { length: 24 }).notNull().default("current"),
    contradictionState: varchar("contradiction_state", { length: 24 }).notNull().default("none"),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    contradictionRefs: jsonb("contradiction_refs").$type<string[]>().notNull().default([]),
    revisionReason: text("revision_reason"),
    confidence: real("confidence").notNull().default(0.5),
    sourceRef: text("source_ref").notNull(),
    generatedByEngine: varchar("generated_by_engine", { length: 120 }).notNull().default("unknown"),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>().notNull().default({}),
    validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("belief_state_key_created_idx").on(table.beliefKey, table.createdAt),
    index("belief_state_state_idx").on(table.state, table.updatedAt),
    index("belief_state_prior_idx").on(table.priorBeliefId),
    index("belief_state_prior_interpretation_idx").on(table.priorInterpretationId),
    index("belief_state_interpretation_idx").on(table.interpretationId),
  ],
);

export const predictionRecord = pgTable(
  "prediction_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    statement: text("statement").notNull(),
    horizon: text("horizon").notNull(),
    horizonStart: timestamp("horizon_start", { withTimezone: true }),
    horizonEnd: timestamp("horizon_end", { withTimezone: true }),
    supportingEvidenceRefs: jsonb("supporting_evidence_refs").$type<string[]>().notNull().default([]),
    reasoning: text("reasoning").notNull(),
    confidenceLower: real("confidence_lower").notNull().default(0),
    confidenceUpper: real("confidence_upper").notNull().default(1),
    eventualOutcome: text("eventual_outcome"),
    outcomeObservedAt: timestamp("outcome_observed_at", { withTimezone: true }),
    accuracyResult: varchar("accuracy_result", { length: 24 }).notNull().default("pending"),
    derivedLesson: text("derived_lesson"),
    status: varchar("status", { length: 24 }).notNull().default("open"),
    interpretationId: uuid("interpretation_id"),
    beliefId: uuid("belief_id"),
    sourceRef: text("source_ref").notNull(),
    generatedByEngine: varchar("generated_by_engine", { length: 120 }).notNull().default("unknown"),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("prediction_status_horizon_idx").on(table.status, table.horizonEnd),
    index("prediction_interpretation_idx").on(table.interpretationId),
    index("prediction_belief_idx").on(table.beliefId),
  ],
);

export const causalClaim = pgTable(
  "causal_claim",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claim: text("claim").notNull(),
    cause: text("cause").notNull(),
    effect: text("effect").notNull(),
    relationshipType: varchar("relationship_type", { length: 24 }).notNull().default("causal"),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    confidence: real("confidence").notNull().default(0.5),
    sourceRef: text("source_ref").notNull(),
    explicitness: varchar("explicitness", { length: 16 }).notNull().default("inferred"),
    alternatives: jsonb("alternatives").$type<Record<string, unknown>[]>().notNull().default([]),
    interpretationId: uuid("interpretation_id"),
    generatedByEngine: varchar("generated_by_engine", { length: 120 }).notNull().default("unknown"),
    generatedBy: jsonb("generated_by").$type<Record<string, unknown>>().notNull().default({}),
    status: varchar("status", { length: 24 }).notNull().default("unreviewed"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("causal_claim_status_idx").on(table.status, table.updatedAt),
    index("causal_claim_interpretation_idx").on(table.interpretationId),
  ],
);

export const knowledgeGap = pgTable(
  "knowledge_gap",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    question: text("question").notNull(),
    importance: real("importance").notNull().default(0.5),
    reason: text("reason").notNull(),
    objectiveId: text("objective_id"),
    possibleEvidenceSources: jsonb("possible_evidence_sources").$type<string[]>().notNull().default([]),
    affectedObjectRefs: jsonb("affected_object_refs").$type<string[]>().notNull().default([]),
    lastInvestigatedAt: timestamp("last_investigated_at", { withTimezone: true }),
    nextAllowedAction: varchar("next_allowed_action", { length: 32 }).notNull().default("investigate"),
    status: varchar("status", { length: 24 }).notNull().default("open"),
    sourceRef: text("source_ref").notNull(),
    createdByEngine: varchar("created_by_engine", { length: 120 }).notNull().default("unknown"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("knowledge_gap_status_importance_idx").on(table.status, table.importance),
    index("knowledge_gap_objective_idx").on(table.objectiveId),
    index("knowledge_gap_updated_idx").on(table.updatedAt),
  ],
);

export const insertBeliefStateSchema = createInsertSchema(beliefState, {
  evidenceRefs: jsonArray,
  contradictionRefs: jsonArray,
  generatedBy: jsonRecord,
});
export const insertPredictionRecordSchema = createInsertSchema(predictionRecord, {
  supportingEvidenceRefs: jsonArray,
  generatedBy: jsonRecord,
});
export const insertCausalClaimSchema = createInsertSchema(causalClaim, {
  evidenceRefs: jsonArray,
  alternatives: jsonRecords,
  generatedBy: jsonRecord,
});
export const insertKnowledgeGapSchema = createInsertSchema(knowledgeGap, {
  possibleEvidenceSources: jsonArray,
  affectedObjectRefs: jsonArray,
});