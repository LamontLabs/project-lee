import { and, desc, eq } from "drizzle-orm";
import {
  beliefState,
  causalClaim,
  db,
  interpretationLedger,
  knowledgeGap,
  predictionRecord,
} from "@workspace/db";
import { assertFactProvenance } from "./provenance";
import { emitEvent } from "./foundation-events";

const BELIEF_STATES = ["current", "superseded", "retracted"] as const;
const CONTRADICTION_STATES = ["none", "open", "resolved"] as const;
const EXPLICITNESS = ["explicit", "inferred"] as const;
const PREDICTION_RESULTS = ["pending", "accurate", "inaccurate", "mixed", "unresolved"] as const;
const GAP_ACTIONS = ["investigate", "request_owner_input", "defer", "none"] as const;

export type BeliefInput = {
  beliefKey: string;
  conclusion: string;
  interpretationId?: string;
  evidenceRefs: string[];
  sourceRef: string;
  confidence: number;
  generatedByEngine: string;
  generatedBy: Record<string, unknown>;
  contradictionState?: (typeof CONTRADICTION_STATES)[number];
  contradictionRefs?: string[];
  revisionReason?: string;
};

export type PredictionInput = {
  statement: string;
  horizon: string;
  horizonStart?: Date;
  horizonEnd?: Date;
  supportingEvidenceRefs: string[];
  reasoning: string;
  confidenceLower: number;
  confidenceUpper: number;
  interpretationId?: string;
  beliefId?: string;
  sourceRef: string;
  generatedByEngine: string;
  generatedBy: Record<string, unknown>;
};

export type CausalClaimInput = {
  claim: string;
  cause: string;
  effect: string;
  evidenceRefs: string[];
  confidence: number;
  sourceRef: string;
  explicitness: (typeof EXPLICITNESS)[number];
  alternatives?: Record<string, unknown>[];
  interpretationId?: string;
  generatedByEngine: string;
  generatedBy: Record<string, unknown>;
};

export type KnowledgeGapInput = {
  question: string;
  importance: number;
  reason: string;
  objectiveId?: string;
  possibleEvidenceSources: string[];
  affectedObjectRefs?: string[];
  nextAllowedAction?: (typeof GAP_ACTIONS)[number];
  sourceRef: string;
  createdByEngine: string;
};

function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function boundedConfidence(value: number, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }
  return value;
}

function boundedImportance(value: number) {
  return boundedConfidence(value, "importance");
}

function nonEmptyRefs(refs: unknown, label: string) {
  if (!Array.isArray(refs) || refs.length === 0 || refs.some((ref) => typeof ref !== "string" || !ref.trim())) {
    throw new Error(`${label} must contain at least one reference.`);
  }
  return [...new Set(refs.map((ref) => String(ref).trim()))];
}

async function assertInterpretationIsActive(id: string) {
  const [item] = await db
    .select({ id: interpretationLedger.id })
    .from(interpretationLedger)
    .where(and(eq(interpretationLedger.id, id), eq(interpretationLedger.status, "active")))
    .limit(1);
  if (!item) throw new Error("The interpretation reference must resolve to an active Interpretation Ledger record.");
}

async function assertEvidenceRefs(refs: string[]) {
  try {
    await assertFactProvenance(refs);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Epistemic evidence references are invalid.");
  }
}

function assertGeneratedBy(engine: unknown, metadata: unknown) {
  requiredText(engine, "generatedByEngine");
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || Object.keys(metadata).length === 0) {
    throw new Error("Model-generated epistemic records require non-empty generatedBy metadata.");
  }
}

export async function recordBeliefState(input: BeliefInput) {
  const beliefKey = requiredText(input.beliefKey, "beliefKey");
  const conclusion = requiredText(input.conclusion, "conclusion");
  const sourceRef = requiredText(input.sourceRef, "sourceRef");
  const evidenceRefs = nonEmptyRefs(input.evidenceRefs, "evidenceRefs");
  const contradictionRefs = input.contradictionRefs ? nonEmptyRefs(input.contradictionRefs, "contradictionRefs") : [];
  if (input.interpretationId) await assertInterpretationIsActive(input.interpretationId);
  await assertEvidenceRefs(evidenceRefs);
  assertGeneratedBy(input.generatedByEngine, input.generatedBy);
  const [existing] = input.interpretationId
    ? await db.select().from(beliefState).where(eq(beliefState.interpretationId, input.interpretationId)).limit(1)
    : [];
  if (existing) return existing;
  const [item] = await db.insert(beliefState).values({
    beliefKey,
    conclusion,
    interpretationId: input.interpretationId,
    state: "current",
    contradictionState: input.contradictionState ?? "none",
    evidenceRefs,
    contradictionRefs,
    revisionReason: input.revisionReason,
    confidence: boundedConfidence(input.confidence, "confidence"),
    sourceRef,
    generatedByEngine: input.generatedByEngine,
    generatedBy: input.generatedBy,
    validFrom: new Date(),
  }).returning();
  await emitEvent({
    eventType: input.contradictionState === "open" ? "BeliefContradicted" : "BeliefStateCreated",
    aggregateType: "belief_state",
    aggregateId: item.id,
    sourceRef,
    payload: {
      beliefId: item.id,
      beliefKey,
      interpretationId: input.interpretationId ?? null,
      evidenceRefs,
      contradictionRefs,
      contradictionState: item.contradictionState,
      confidence: item.confidence,
    },
  });
  return item;
}

export async function reviseBeliefState(
  priorBeliefId: string,
  input: Omit<BeliefInput, "beliefKey"> & { revisedConclusion: string },
) {
  const [prior] = await db.select().from(beliefState).where(eq(beliefState.id, priorBeliefId)).limit(1);
  if (!prior) return null;
  const conclusion = requiredText(input.revisedConclusion, "revisedConclusion");
  const sourceRef = requiredText(input.sourceRef, "sourceRef");
  const evidenceRefs = nonEmptyRefs(input.evidenceRefs, "evidenceRefs");
  const contradictionRefs = input.contradictionRefs ? nonEmptyRefs(input.contradictionRefs, "contradictionRefs") : [];
  if (input.interpretationId) await assertInterpretationIsActive(input.interpretationId);
  await assertEvidenceRefs(evidenceRefs);
  assertGeneratedBy(input.generatedByEngine, input.generatedBy);
  const confidence = boundedConfidence(input.confidence, "confidence");
  const now = new Date();
  const next = await db.transaction(async (tx) => {
    await tx.update(beliefState).set({
      state: "superseded",
      supersededAt: now,
      updatedAt: now,
    }).where(eq(beliefState.id, prior.id));
    const [created] = await tx.insert(beliefState).values({
      beliefKey: prior.beliefKey,
      conclusion,
      interpretationId: input.interpretationId,
      priorBeliefId: prior.id,
      priorInterpretationId: prior.interpretationId,
      state: "current",
      contradictionState: input.contradictionState ?? "none",
      evidenceRefs,
      contradictionRefs,
      revisionReason: input.revisionReason ?? "Evidence-based belief revision",
      confidence,
      sourceRef,
      generatedByEngine: input.generatedByEngine,
      generatedBy: input.generatedBy,
      validFrom: now,
    }).returning();
    return created;
  });
  await emitEvent({
    eventType: next.contradictionState === "open" ? "BeliefContradicted" : "BeliefStateRevised",
    aggregateType: "belief_state",
    aggregateId: next.id,
    sourceRef,
    payload: {
      beliefId: next.id,
      priorBeliefId: prior.id,
      priorInterpretationId: prior.interpretationId,
      interpretationId: next.interpretationId,
      newEvidenceRefs: evidenceRefs,
      contradictionRefs,
      contradictionState: next.contradictionState,
      revisedConclusion: next.conclusion,
      confidence: next.confidence,
      revisedAt: now.toISOString(),
    },
  });
  return next;
}

export async function listBeliefStates(options: { beliefKey?: string; includeHistory?: boolean } = {}) {
  const rows = await db.select().from(beliefState)
    .where(options.beliefKey ? eq(beliefState.beliefKey, options.beliefKey) : undefined)
    .orderBy(desc(beliefState.createdAt));
  return options.includeHistory === false ? rows.filter((row) => row.state === "current") : rows;
}

export async function getBeliefHistory(id: string) {
  const [item] = await db.select({ beliefKey: beliefState.beliefKey }).from(beliefState).where(eq(beliefState.id, id)).limit(1);
  if (!item) return null;
  return listBeliefStates({ beliefKey: item.beliefKey });
}

export async function recordPrediction(input: PredictionInput) {
  const statement = requiredText(input.statement, "statement");
  const horizon = requiredText(input.horizon, "horizon");
  const reasoning = requiredText(input.reasoning, "reasoning");
  const sourceRef = requiredText(input.sourceRef, "sourceRef");
  const refs = nonEmptyRefs(input.supportingEvidenceRefs, "supportingEvidenceRefs");
  const lower = boundedConfidence(input.confidenceLower, "confidenceLower");
  const upper = boundedConfidence(input.confidenceUpper, "confidenceUpper");
  if (lower > upper) throw new Error("confidenceLower cannot exceed confidenceUpper.");
  if (input.interpretationId) await assertInterpretationIsActive(input.interpretationId);
  if (input.beliefId) {
    const [belief] = await db.select({ id: beliefState.id }).from(beliefState).where(eq(beliefState.id, input.beliefId)).limit(1);
    if (!belief) throw new Error("The belief reference does not resolve.");
  }
  await assertEvidenceRefs(refs);
  assertGeneratedBy(input.generatedByEngine, input.generatedBy);
  const [item] = await db.insert(predictionRecord).values({
    statement,
    horizon,
    horizonStart: input.horizonStart,
    horizonEnd: input.horizonEnd,
    supportingEvidenceRefs: refs,
    reasoning,
    confidenceLower: lower,
    confidenceUpper: upper,
    interpretationId: input.interpretationId,
    beliefId: input.beliefId,
    sourceRef,
    generatedByEngine: input.generatedByEngine,
    generatedBy: input.generatedBy,
  }).returning();
  await emitEvent({
    eventType: "PredictionRecorded",
    aggregateType: "prediction_record",
    aggregateId: item.id,
    sourceRef,
    payload: { predictionId: item.id, supportingEvidenceRefs: refs, horizon, confidenceLower: lower, confidenceUpper: upper },
  });
  return item;
}

export async function resolvePrediction(id: string, input: { eventualOutcome: string; accuracyResult: (typeof PREDICTION_RESULTS)[number]; derivedLesson?: string; outcomeObservedAt?: Date }) {
  const eventualOutcome = requiredText(input.eventualOutcome, "eventualOutcome");
  if (!PREDICTION_RESULTS.includes(input.accuracyResult)) throw new Error("accuracyResult is invalid.");
  const [item] = await db.update(predictionRecord).set({
    eventualOutcome,
    accuracyResult: input.accuracyResult,
    derivedLesson: input.derivedLesson?.trim() || null,
    outcomeObservedAt: input.outcomeObservedAt ?? new Date(),
    status: "resolved",
    updatedAt: new Date(),
  }).where(eq(predictionRecord.id, id)).returning();
  if (!item) return null;
  await emitEvent({
    eventType: "PredictionResolved",
    aggregateType: "prediction_record",
    aggregateId: item.id,
    sourceRef: item.sourceRef,
    payload: { predictionId: item.id, accuracyResult: item.accuracyResult, eventualOutcome: item.eventualOutcome, derivedLesson: item.derivedLesson },
  });
  return item;
}

export async function recordCausalClaim(input: CausalClaimInput) {
  const claim = requiredText(input.claim, "claim");
  const cause = requiredText(input.cause, "cause");
  const effect = requiredText(input.effect, "effect");
  const sourceRef = requiredText(input.sourceRef, "sourceRef");
  const refs = nonEmptyRefs(input.evidenceRefs, "evidenceRefs");
  if (input.explicitness && !EXPLICITNESS.includes(input.explicitness)) throw new Error("explicitness is invalid.");
  if (input.interpretationId) await assertInterpretationIsActive(input.interpretationId);
  await assertEvidenceRefs(refs);
  assertGeneratedBy(input.generatedByEngine, input.generatedBy);
  const [item] = await db.insert(causalClaim).values({
    claim,
    cause,
    effect,
    relationshipType: "causal",
    evidenceRefs: refs,
    confidence: boundedConfidence(input.confidence, "confidence"),
    sourceRef,
    explicitness: input.explicitness,
    alternatives: input.alternatives ?? [],
    interpretationId: input.interpretationId,
    generatedByEngine: input.generatedByEngine,
    generatedBy: input.generatedBy,
  }).returning();
  await emitEvent({
    eventType: "CausalClaimRecorded",
    aggregateType: "causal_claim",
    aggregateId: item.id,
    sourceRef,
    payload: { causalClaimId: item.id, relationshipType: "causal", evidenceRefs: refs, explicitness: item.explicitness, alternatives: item.alternatives },
  });
  return item;
}

export async function recordKnowledgeGap(input: KnowledgeGapInput) {
  const question = requiredText(input.question, "question");
  const reason = requiredText(input.reason, "reason");
  const sourceRef = requiredText(input.sourceRef, "sourceRef");
  const possibleEvidenceSources = nonEmptyRefs(input.possibleEvidenceSources, "possibleEvidenceSources");
  const affectedObjectRefs = input.affectedObjectRefs ? nonEmptyRefs(input.affectedObjectRefs, "affectedObjectRefs") : [];
  if (input.nextAllowedAction && !GAP_ACTIONS.includes(input.nextAllowedAction)) throw new Error("nextAllowedAction is invalid.");
  const [item] = await db.insert(knowledgeGap).values({
    question,
    importance: boundedImportance(input.importance),
    reason,
    objectiveId: input.objectiveId,
    possibleEvidenceSources,
    affectedObjectRefs,
    nextAllowedAction: input.nextAllowedAction ?? "investigate",
    sourceRef,
    createdByEngine: requiredText(input.createdByEngine, "createdByEngine"),
  }).returning();
  await emitEvent({
    eventType: "KnowledgeGapRecorded",
    aggregateType: "knowledge_gap",
    aggregateId: item.id,
    sourceRef,
    payload: { knowledgeGapId: item.id, objectiveId: item.objectiveId, importance: item.importance, possibleEvidenceSources },
  });
  return item;
}

export async function investigateKnowledgeGap(id: string, input: { nextAllowedAction?: (typeof GAP_ACTIONS)[number]; status?: "open" | "investigating" | "resolved" | "deferred" }) {
  if (input.nextAllowedAction && !GAP_ACTIONS.includes(input.nextAllowedAction)) throw new Error("nextAllowedAction is invalid.");
  if (input.status && !["open", "investigating", "resolved", "deferred"].includes(input.status)) throw new Error("status is invalid.");
  const [item] = await db.update(knowledgeGap).set({
    lastInvestigatedAt: new Date(),
    nextAllowedAction: input.nextAllowedAction,
    status: input.status,
    updatedAt: new Date(),
  }).where(eq(knowledgeGap.id, id)).returning();
  if (!item) return null;
  await emitEvent({
    eventType: "KnowledgeGapInvestigated",
    aggregateType: "knowledge_gap",
    aggregateId: item.id,
    sourceRef: item.sourceRef,
    payload: { knowledgeGapId: item.id, status: item.status, nextAllowedAction: item.nextAllowedAction, investigatedAt: item.lastInvestigatedAt },
  });
  return item;
}

export async function getEpistemicHistory() {
  const [beliefs, predictions, causalClaims, knowledgeGaps] = await Promise.all([
    listBeliefStates(),
    db.select().from(predictionRecord).orderBy(desc(predictionRecord.updatedAt)).limit(200),
    db.select().from(causalClaim).orderBy(desc(causalClaim.updatedAt)).limit(200),
    db.select().from(knowledgeGap).orderBy(desc(knowledgeGap.importance), desc(knowledgeGap.updatedAt)).limit(200),
  ]);
  return { beliefs, predictions, causalClaims, knowledgeGaps };
}