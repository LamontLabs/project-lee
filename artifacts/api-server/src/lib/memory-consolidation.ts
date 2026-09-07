import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import {
  assumptionLedger,
  db,
  eventLog,
  factLedger,
  interpretationLedger,
  lessonRecord,
  learningAsset,
  memoryConflict,
  memoryConsolidationPhase,
  memoryConsolidationRun,
  predictionRecord,
  semanticIndex,
  sourceVault,
  universalObject,
  type ConsolidationPhaseName,
} from "@workspace/db";
import { CONSOLIDATION_PHASES } from "@workspace/db";
import { expireStale } from "./assumptions";
import { processExperiences } from "./experience";
import { recomputeDecisionHeuristics } from "./decision-memory";
import { assertCanonicalMemoryWrite } from "./memory-write-boundary";
import { getResourceState } from "./resource";
import { consolidateHistorical } from "./memory-architecture";
import { indexObject } from "./semantic-index";
import { queryEngine } from "./query-engine";
import { runRequestPipeline } from "./request-pipeline";
import { routeModelRequest } from "./model-router";
import { getRecoveryMode } from "./recovery-modes";

const DAY = 86_400_000;
const PHASE_STALE_MS = 15 * 60_000;
const LOW_PRIORITY_DELAY_MS = 15 * 60_000;

type PhaseResult = {
  summary: Record<string, unknown>;
  outputEvidenceRefs: string[];
  skippedReason?: string;
};

type ConsolidationInput = {
  runId?: string;
  runKey?: string;
  failurePhase?: string;
  budgetTokens?: number;
};

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function appendRunEvent(
  eventType: string,
  runId: string,
  phase: string,
  payload: Record<string, unknown>,
) {
  const aggregateType = "memory_consolidation";
  const aggregateId = `${runId}:${phase}`;
  const [existing] = await db
    .select({ id: eventLog.id })
    .from(eventLog)
    .where(and(eq(eventLog.eventType, eventType), eq(eventLog.aggregateType, aggregateType), eq(eventLog.aggregateId, aggregateId)))
    .limit(1);
  if (existing) return existing.id;
  const [event] = await db.insert(eventLog).values({
    eventType,
    aggregateType,
    aggregateId,
    sourceRef: `memory-consolidation:${runId}`,
    occurredAt: new Date(),
    payload: { runId, phase, ...payload },
  }).returning({ id: eventLog.id });
  return event.id;
}

async function createRun(input: ConsolidationInput) {
  if (input.runId) {
    const [existing] = await db.select().from(memoryConsolidationRun).where(eq(memoryConsolidationRun.id, input.runId)).limit(1);
    if (!existing) throw new Error("CONSOLIDATION_RUN_NOT_FOUND");
    return existing;
  }
  if (input.runKey) {
    const [existing] = await db.select().from(memoryConsolidationRun).where(eq(memoryConsolidationRun.runKey, input.runKey)).limit(1);
    if (existing) return existing;
  }
  const runKey = input.runKey ?? `consolidation:${new Date().toISOString().slice(0, 10)}:${randomUUID()}`;
  const [run] = await db.insert(memoryConsolidationRun).values({
    runKey,
    status: "pending",
    priority: "LOW",
    currentPhase: CONSOLIDATION_PHASES[0],
    nextScheduledAt: new Date(Date.now() + DAY),
  }).returning();
  await db.insert(memoryConsolidationPhase).values(CONSOLIDATION_PHASES.map((phase, phaseOrder) => ({
    runId: run.id,
    phase,
    phaseOrder,
    idempotencyKey: `${run.id}:${phase}`,
  })));
  await appendRunEvent("ConsolidationRunStarted", run.id, "run", {
    runKey: run.runKey,
    priority: run.priority,
    phaseCount: CONSOLIDATION_PHASES.length,
  });
  return run;
}

async function recoverInterruptedPhases(runId: string) {
  const staleBefore = new Date(Date.now() - PHASE_STALE_MS);
  await db.update(memoryConsolidationPhase).set({
    status: "failed",
    failureReason: "Interrupted before checkpoint; safe phase retry is required.",
    updatedAt: new Date(),
  }).where(and(
    eq(memoryConsolidationPhase.runId, runId),
    eq(memoryConsolidationPhase.status, "running"),
    or(isNull(memoryConsolidationPhase.lastHeartbeatAt), lt(memoryConsolidationPhase.lastHeartbeatAt, staleBefore)),
  ));
}

async function claimPhase(phaseId: string) {
  const now = new Date();
  const [claimed] = await db.update(memoryConsolidationPhase).set({
    status: "running",
    startedAt: now,
    lastHeartbeatAt: now,
    failureReason: null,
    skippedReason: null,
    attempt: 1,
    updatedAt: now,
  }).where(and(
    eq(memoryConsolidationPhase.id, phaseId),
    or(eq(memoryConsolidationPhase.status, "pending"), eq(memoryConsolidationPhase.status, "failed")),
  )).returning();
  if (!claimed) return null;
  const [attempted] = await db.update(memoryConsolidationPhase).set({
    attempt: claimed.attempt + 1,
    updatedAt: now,
  }).where(eq(memoryConsolidationPhase.id, claimed.id)).returning();
  return attempted;
}

async function changedEvents(since: Date) {
  return db.select({ id: eventLog.id, eventType: eventLog.eventType, occurredAt: eventLog.occurredAt })
    .from(eventLog).where(gte(eventLog.occurredAt, since)).orderBy(desc(eventLog.occurredAt)).limit(500);
}

async function observeChanges(since: Date): Promise<PhaseResult> {
  const events = await changedEvents(since);
  const byType = Object.fromEntries([...new Set(events.map((event) => event.eventType))].map((type) => [type, events.filter((event) => event.eventType === type).length]));
  return {
    summary: { observedEventCount: events.length, eventTypes: byType, since: since.toISOString() },
    outputEvidenceRefs: events.map((event) => event.id),
  };
}

async function reconcileConflicts(): Promise<PhaseResult> {
  const facts = await db.select().from(factLedger).limit(2000);
  const conflicts: string[] = [];
  const seen = new Map<string, typeof facts[number]>();
  for (const fact of facts) {
    const key = `${fact.subject.trim().toLowerCase()}:${fact.predicate.trim().toLowerCase()}`;
    const prior = seen.get(key);
    if (prior && prior.object !== fact.object) {
      const [left, right] = [prior.id, fact.id].sort();
      const conflictKey = hash({ left, right });
      const [created] = await db.insert(memoryConflict).values({
        conflictKey,
        leftObjectType: "fact",
        leftObjectId: left,
        rightObjectType: "fact",
        rightObjectId: right,
        summary: `Conflicting values for ${fact.subject}.${fact.predicate}; owner review is required.`,
        status: "open",
        metadata: { source: "memory-consolidation", evidenceRefs: [left, right] },
      }).onConflictDoNothing().returning({ id: memoryConflict.id });
      if (created) await appendRunEvent("ConflictDetected", created.id, "reconcile_conflicts", { conflictId: created.id, evidenceRefs: [left, right] });
      const [existing] = await db.select({ id: memoryConflict.id }).from(memoryConflict).where(eq(memoryConflict.conflictKey, conflictKey)).limit(1);
      if (existing) conflicts.push(existing.id);
    } else if (!prior) {
      seen.set(key, fact);
    }
  }
  const open = await db.select({ id: memoryConflict.id }).from(memoryConflict).where(eq(memoryConflict.status, "open"));
  return {
    summary: { conflictCount: [...new Set(conflicts)].length, unresolvedConflictCount: open.length, winnerSelected: false },
    outputEvidenceRefs: [...new Set(conflicts)],
  };
}

async function deduplicateRepresentations(): Promise<PhaseResult> {
  const [facts, lessons] = await Promise.all([
    db.select({ id: factLedger.id, subject: factLedger.subject, predicate: factLedger.predicate, object: factLedger.object }).from(factLedger).limit(2000),
    db.select({ id: lessonRecord.id, statement: lessonRecord.statement, patternKey: lessonRecord.patternKey }).from(lessonRecord).limit(2000),
  ]);
  const factKeys = new Map<string, string[]>();
  for (const fact of facts) {
    const key = `${fact.subject.trim().toLowerCase()}:${fact.predicate.trim().toLowerCase()}:${fact.object.trim().toLowerCase()}`;
    factKeys.set(key, [...(factKeys.get(key) ?? []), fact.id]);
  }
  const lessonKeys = new Map<string, string[]>();
  for (const lesson of lessons) {
    const key = `${lesson.patternKey}:${lesson.statement.trim().toLowerCase()}`;
    lessonKeys.set(key, [...(lessonKeys.get(key) ?? []), lesson.id]);
  }
  const duplicateGroups = [...factKeys.values(), ...lessonKeys.values()].filter((ids) => ids.length > 1);
  return {
    summary: {
      duplicateGroups: duplicateGroups.length,
      duplicateRepresentations: duplicateGroups.reduce((sum, ids) => sum + ids.length - 1, 0),
      mutationCount: 0,
      preservedCanonicalRecords: true,
    },
    outputEvidenceRefs: duplicateGroups.flat(),
    skippedReason: duplicateGroups.length ? "Duplicate canonical records are reported, not deleted or merged without owner evidence." : undefined,
  };
}

async function reviewStaleAssumptions(): Promise<PhaseResult> {
  const stale = await db.select({ id: assumptionLedger.id }).from(assumptionLedger).where(and(
    inArray(assumptionLedger.status, ["active", "validated"]),
    lt(assumptionLedger.reviewAt, new Date()),
  ));
  const expired = await expireStale();
  const refs = [...new Set([...stale.map((item) => item.id), ...expired.map((item) => item.id)])];
  return {
    summary: { staleCount: stale.length, expiredCount: expired.length, affectedConclusionReviewRequired: expired.length > 0 },
    outputEvidenceRefs: refs,
  };
}

async function learnOutcomes(): Promise<PhaseResult> {
  const predictions = await db.select().from(predictionRecord).where(inArray(predictionRecord.status, ["open", "active"])).limit(500);
  const events = await db.select().from(eventLog).where(gte(eventLog.occurredAt, new Date(Date.now() - 180 * DAY))).orderBy(desc(eventLog.occurredAt)).limit(2000);
  const resolved: string[] = [];
  for (const prediction of predictions) {
    const outcomeEvent = events.find((event) => {
      const payload = event.payload ?? {};
      return payload.predictionId === prediction.id && typeof payload.outcome === "string";
    });
    if (!outcomeEvent) continue;
    const payload = outcomeEvent.payload ?? {};
    const outcome = typeof payload.outcome === "string" ? payload.outcome : "observed";
    assertCanonicalMemoryWrite({ recordType: "prediction", operation: "status_change", sourceRef: prediction.sourceRef, sourceRefs: [prediction.sourceRef, ...prediction.supportingEvidenceRefs, outcomeEvent.id], origin: "engine", generatedByEngine: prediction.generatedByEngine, generatedBy: prediction.generatedBy, currentOwner: "owner", actor: "Memory Consolidation Engine" });
    await db.update(predictionRecord).set({
      eventualOutcome: outcome,
      accuracyResult: typeof payload.accuracyResult === "string" ? payload.accuracyResult : "observed",
      derivedLesson: `Outcome observed for prediction ${prediction.id}: ${outcome}. Evidence: ${outcomeEvent.id}.`,
      outcomeObservedAt: outcomeEvent.occurredAt,
      status: "resolved",
    }).where(eq(predictionRecord.id, prediction.id));
    resolved.push(prediction.id);
  }
  const outcomeEvents = events.filter((event) => {
    const payload = event.payload ?? {};
    return typeof payload.expectedOutcome === "string" && typeof payload.observedOutcome === "string";
  });
  const assets: string[] = [];
  for (const event of outcomeEvents) {
    const payload = event.payload ?? {};
    const expected = String(payload.expectedOutcome);
    const observed = String(payload.observedOutcome);
    const assetKey = `outcome:${hash({ eventId: event.id, expected, observed })}`;
    const [existing] = await db.select({ id: learningAsset.id }).from(learningAsset).where(eq(learningAsset.name, assetKey)).limit(1);
    if (existing) {
      assets.push(existing.id);
      continue;
    }
    const [asset] = await db.insert(learningAsset).values({
      assetType: "outcome_learning",
      name: assetKey,
      pattern: expected === observed ? "expected_outcome_confirmed" : "expected_outcome_diverged",
      payload: { expectedOutcome: expected, observedOutcome: observed, evidenceRefs: [event.id], sourceEventId: event.id },
      confidence: expected === observed ? 0.8 : 0.65,
      status: "candidate",
    }).returning({ id: learningAsset.id });
    assets.push(asset.id);
  }
  const heuristicResult = await recomputeDecisionHeuristics();
  return {
    summary: { predictionsResolved: resolved.length, outcomeEvents: outcomeEvents.length, learningAssets: assets.length, decisionObservations: heuristicResult.observations },
    outputEvidenceRefs: [...resolved, ...assets, ...outcomeEvents.map((event) => event.id)],
  };
}

async function consolidateExperiences(since: Date): Promise<PhaseResult> {
  const result = await processExperiences({ since });
  const experiences = await db.select({ id: eventLog.id }).from(eventLog).where(and(eq(eventLog.eventType, "ExperienceRecorded"), gte(eventLog.occurredAt, since))).limit(500);
  return {
    summary: { experiencesRecorded: result.experiences.length, lessonsExtracted: result.lessons.length, institutionalKnowledge: result.institutionalKnowledge.length },
    outputEvidenceRefs: [...experiences.map((item) => item.id)],
  };
}

async function compressColdMemory(): Promise<PhaseResult> {
  const compressed = await consolidateHistorical();
  return {
    summary: { compressedCount: compressed.length, stage: 2, sourceEvidencePreserved: true },
    outputEvidenceRefs: compressed.map((object) => object.id),
  };
}

async function coolHotMemory(): Promise<PhaseResult> {
  const cutoff = new Date(Date.now() - 3 * DAY);
  const candidates = await db.select().from(universalObject).where(and(
    inArray(universalObject.memoryTier, ["recent", "working"]),
    lt(universalObject.updatedAt, cutoff),
    eq(universalObject.manualTierOverride, false),
  )).limit(200);
  const cooled: string[] = [];
  for (const object of candidates) {
    const nextScore = Math.max(0, Number((object.relevanceScore * 0.9).toFixed(4)));
    assertCanonicalMemoryWrite({ recordType: "universal_object", operation: "update", sourceRef: object.sourceRefs[0], sourceRefs: object.sourceRefs, origin: "engine", generatedByEngine: "Memory Consolidation Engine", generatedBy: { engineId: "Memory Consolidation Engine", operation: "cool_hot_memory" }, currentOwner: object.currentOwner, actor: "Memory Consolidation Engine" });
    await db.update(universalObject).set({ relevanceScore: nextScore, updatedAt: new Date() }).where(eq(universalObject.id, object.id));
    await appendRunEvent("MemoryCooled", object.id, "cool_hot_memory", { objectId: object.id, from: object.relevanceScore, to: nextScore, evidenceRefs: object.sourceRefs });
    cooled.push(object.id);
  }
  return { summary: { cooledCount: cooled.length, protectedOverridesSkipped: true }, outputEvidenceRefs: cooled };
}

async function archiveSources(): Promise<PhaseResult> {
  const cutoff = new Date(Date.now() - 365 * DAY);
  const candidates = await db.select().from(sourceVault).where(and(
    lt(sourceVault.createdAt, cutoff),
    or(eq(sourceVault.ageState, "FRESH"), eq(sourceVault.ageState, "AGING"), eq(sourceVault.ageState, "STALE")),
  )).limit(200);
  const archived: string[] = [];
  for (const source of candidates) {
    const [updated] = await db.update(sourceVault).set({ ageState: "ARCHIVED", updatedAt: new Date() }).where(and(eq(sourceVault.id, source.id), inArray(sourceVault.ageState, ["FRESH", "AGING", "STALE"]))).returning({ id: sourceVault.id });
    if (!updated) continue;
    await appendRunEvent("SourceArchived", source.id, "archive_sources", { sourceId: source.id, evidenceRefs: [source.id], rawEvidenceRetained: true });
    archived.push(source.id);
  }
  return { summary: { archivedCount: archived.length, rawEvidenceRetained: true, deletionCount: 0 }, outputEvidenceRefs: archived };
}

async function reindexRetrieval(): Promise<PhaseResult> {
  const [objects, facts, interpretations, existing] = await Promise.all([
    db.select({ id: universalObject.id, updatedAt: universalObject.updatedAt }).from(universalObject).limit(1000),
    db.select({ id: factLedger.id, updatedAt: factLedger.updatedAt }).from(factLedger).limit(1000),
    db.select({ id: interpretationLedger.id, updatedAt: interpretationLedger.updatedAt }).from(interpretationLedger).limit(1000),
    db.select().from(semanticIndex).limit(4000),
  ]);
  const indexed = new Map(existing.map((row) => [`${row.objectType}:${row.objectId}`, row]));
  const candidates = [
    ...objects.map((row) => ({ id: row.id, type: "universal_object", updatedAt: row.updatedAt })),
    ...facts.map((row) => ({ id: row.id, type: "fact", updatedAt: row.updatedAt })),
    ...interpretations.map((row) => ({ id: row.id, type: "interpretation", updatedAt: row.updatedAt })),
  ];
  const stale = candidates.filter((candidate) => {
    const row = indexed.get(`${candidate.type}:${candidate.id}`);
    return !row || row.sourceUpdatedAt < candidate.updatedAt;
  }).slice(0, 200);
  const indexedRefs: string[] = [];
  for (const candidate of stale) {
    const row = await indexObject(candidate.id, candidate.type);
    if (row) indexedRefs.push(row.id);
  }
  return { summary: { considered: candidates.length, reindexed: stale.length, boundedBatch: 200 }, outputEvidenceRefs: indexedRefs };
}

async function prepareBriefing(run: typeof memoryConsolidationRun.$inferSelect, budgetTokens: number): Promise<PhaseResult> {
  const query = await queryEngine.query({
    sources: ["events", "memory_conflicts", "assumptions"],
    filters: {},
    rankingPolicy: "brief_generation",
    confidenceThreshold: 0,
    limit: 15,
    requester: "Memory Consolidation Engine",
    purpose: "brief_generation",
  });
  const refs = query.flatMap((item) => [item.object_id, ...item.source_refs]).filter(Boolean);
  const pipeline = await runRequestPipeline({
    text: "Prepare a concise next-briefing evidence handoff from the current consolidation results. Do not create facts or actions.",
    origin: "scheduled",
    actionType: "memory_consolidation_briefing",
    engineName: "Memory Consolidation Engine",
    budgetTokens,
    correlationId: randomUUID(),
    payload: { runId: run.id, evidenceRefs: refs },
  });
  if (!pipeline.ok) {
    return {
      summary: { prepared: false, pipelineFailure: pipeline.error, evidenceRefs: refs },
      outputEvidenceRefs: refs,
      skippedReason: `Request pipeline unavailable at ${pipeline.failedStage}.`,
    };
  }
  try {
    const routed = await routeModelRequest({
      correlationId: pipeline.correlationId,
      pipeline,
      queryText: "Prepare a concise next-briefing evidence handoff from the current consolidation results. Do not create facts or actions.",
      semanticDomain: "memory_consolidation",
      intentType: pipeline.intent.intentType,
      riskClassification: "LOW",
      contextItems: pipeline.context.items,
      preferredTier: "auto",
      costCeilingUsd: 0.05,
    });
    return {
      summary: { prepared: true, evidenceRefs: refs, routeTier: routed.tier, model: routed.model, answerExcerpt: routed.answer.slice(0, 500) },
      outputEvidenceRefs: refs,
    };
  } catch (error) {
    return {
      summary: { prepared: false, evidenceRefs: refs, modelRequired: true, error: error instanceof Error ? error.message : String(error) },
      outputEvidenceRefs: refs,
      skippedReason: "CIL or the selected execution route was unavailable; no generated briefing was persisted.",
    };
  }
}

async function executePhase(
  phase: ConsolidationPhaseName,
  run: typeof memoryConsolidationRun.$inferSelect,
  since: Date,
  budgetTokens: number,
): Promise<PhaseResult> {
  switch (phase) {
    case "observe_changes": return observeChanges(since);
    case "reconcile_conflicts": return reconcileConflicts();
    case "deduplicate_representations": return deduplicateRepresentations();
    case "review_stale_assumptions": return reviewStaleAssumptions();
    case "learn_outcomes": return learnOutcomes();
    case "consolidate_experiences": return consolidateExperiences(since);
    case "compress_cold_memory": return compressColdMemory();
    case "cool_hot_memory": return coolHotMemory();
    case "archive_sources": return archiveSources();
    case "reindex_retrieval": return reindexRetrieval();
    case "prepare_briefing": return prepareBriefing(run, budgetTokens);
  }
  throw new Error(`Unknown consolidation phase: ${phase}`);
}

export async function runConsolidation(input: ConsolidationInput = {}) {
  const recovery = getRecoveryMode();
  if (["RECOVERY_MODE", "SAFE_MODE", "READ_ONLY"].includes(recovery.mode)) {
    if (input.runId) return getConsolidationRun(input.runId);
    throw new Error(`CONSOLIDATION_DEFERRED_RECOVERY_MODE:${recovery.mode}`);
  }
  const run = await createRun(input);
  if (run.status === "completed") return getConsolidationRun(run.id);
  const resource = await getResourceState();
  if (resource.overallState !== "HEALTHY") {
    const nextScheduledAt = new Date(Date.now() + LOW_PRIORITY_DELAY_MS);
    const [paused] = await db.update(memoryConsolidationRun).set({
      status: "paused",
      nextScheduledAt,
      failureReason: `Low-priority work deferred while resources are ${resource.overallState}.`,
      lastHeartbeatAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(memoryConsolidationRun.id, run.id)).returning();
    await appendRunEvent("ConsolidationDeferred", run.id, "run", { resourceState: resource.overallState, nextScheduledAt: nextScheduledAt.toISOString() });
    return getConsolidationRun(paused.id);
  }
  await recoverInterruptedPhases(run.id);
  await db.update(memoryConsolidationRun).set({
    status: "running",
    startedAt: run.startedAt ?? new Date(),
    lastHeartbeatAt: new Date(),
    attempt: run.attempt + 1,
    failureReason: null,
    updatedAt: new Date(),
  }).where(eq(memoryConsolidationRun.id, run.id));
  const since = run.completedAt ?? new Date(Date.now() - DAY);
  let phases = await db.select().from(memoryConsolidationPhase).where(eq(memoryConsolidationPhase.runId, run.id)).orderBy(asc(memoryConsolidationPhase.phaseOrder));
  try {
    for (const phase of phases) {
      if (phase.status === "completed" || phase.status === "skipped") continue;
      await db.update(memoryConsolidationRun).set({ currentPhase: phase.phase, lastHeartbeatAt: new Date(), updatedAt: new Date() }).where(eq(memoryConsolidationRun.id, run.id));
      const claimed = await claimPhase(phase.id);
      if (!claimed) continue;
      if (input.failurePhase === phase.phase) throw new Error(`Injected consolidation failure at ${phase.phase}.`);
      const result = await executePhase(phase.phase as ConsolidationPhaseName, run, since, input.budgetTokens ?? 1200);
      const phaseStatus = result.skippedReason ? "skipped" : "completed";
      const now = new Date();
      await db.update(memoryConsolidationPhase).set({
        status: phaseStatus,
        inputEvidenceRefs: phase.phase === "observe_changes"
          ? result.outputEvidenceRefs
          : (await getConsolidationRun(run.id)).run.outputEvidenceRefs.slice(-500),
        outputEvidenceRefs: result.outputEvidenceRefs,
        resultSummary: result.summary,
        skippedReason: result.skippedReason ?? null,
        completedAt: now,
        lastHeartbeatAt: now,
        updatedAt: now,
      }).where(eq(memoryConsolidationPhase.id, phase.id));
      const currentRun = await getConsolidationRun(run.id);
      await db.update(memoryConsolidationRun).set({
        inputEvidenceRefs: phase.phase === "observe_changes"
          ? result.outputEvidenceRefs
          : currentRun.run.inputEvidenceRefs,
        outputEvidenceRefs: [...new Set([...currentRun.run.outputEvidenceRefs, ...result.outputEvidenceRefs])],
        skippedWork: result.skippedReason ? [...currentRun.run.skippedWork, { phase: phase.phase, reason: result.skippedReason }] : currentRun.run.skippedWork,
        unresolvedConflictCount: phase.phase === "reconcile_conflicts" ? Number(result.summary.unresolvedConflictCount ?? 0) : currentRun.run.unresolvedConflictCount,
        lastHeartbeatAt: now,
        updatedAt: now,
      }).where(eq(memoryConsolidationRun.id, run.id));
      await appendRunEvent("ConsolidationPhaseCompleted", run.id, phase.phase, {
        status: phaseStatus,
        summary: result.summary,
        outputEvidenceRefs: result.outputEvidenceRefs,
      });
    }
    phases = await db.select().from(memoryConsolidationPhase).where(eq(memoryConsolidationPhase.runId, run.id));
    const incomplete = phases.some((phase) => !["completed", "skipped"].includes(phase.status));
    if (incomplete) return getConsolidationRun(run.id);
    await db.update(memoryConsolidationRun).set({
      status: "completed",
      currentPhase: CONSOLIDATION_PHASES[CONSOLIDATION_PHASES.length - 1],
      completedAt: new Date(),
      lastHeartbeatAt: new Date(),
      nextScheduledAt: new Date(Date.now() + DAY),
      updatedAt: new Date(),
    }).where(eq(memoryConsolidationRun.id, run.id));
    await appendRunEvent("ConsolidationCompleted", run.id, "run", { phaseCount: phases.length });
  } catch (error) {
    const currentPhase = phases.find((phase) => phase.status === "running")?.phase ?? run.currentPhase;
    const reason = error instanceof Error ? error.message : String(error);
    await db.update(memoryConsolidationPhase).set({ status: "failed", failureReason: reason, lastHeartbeatAt: new Date(), updatedAt: new Date() }).where(and(eq(memoryConsolidationPhase.runId, run.id), eq(memoryConsolidationPhase.phase, currentPhase)));
    await db.update(memoryConsolidationRun).set({ status: "failed", failurePhase: currentPhase, failureReason: reason, lastHeartbeatAt: new Date(), updatedAt: new Date() }).where(eq(memoryConsolidationRun.id, run.id));
    await appendRunEvent("ConsolidationPhaseFailed", run.id, currentPhase, { error: reason });
  }
  return getConsolidationRun(run.id);
}

export async function getConsolidationRun(runId: string) {
  const [run] = await db.select().from(memoryConsolidationRun).where(eq(memoryConsolidationRun.id, runId)).limit(1);
  if (!run) throw new Error("CONSOLIDATION_RUN_NOT_FOUND");
  const phases = await db.select().from(memoryConsolidationPhase).where(eq(memoryConsolidationPhase.runId, runId)).orderBy(asc(memoryConsolidationPhase.phaseOrder));
  return { run, phases };
}

export async function listConsolidationRuns(limit = 50) {
  const runs = await db.select().from(memoryConsolidationRun).orderBy(desc(memoryConsolidationRun.requestedAt)).limit(Math.min(limit, 200));
  const phaseRows = runs.length ? await db.select().from(memoryConsolidationPhase).where(inArray(memoryConsolidationPhase.runId, runs.map((run) => run.id))).orderBy(asc(memoryConsolidationPhase.phaseOrder)) : [];
  return runs.map((run) => ({ run, phases: phaseRows.filter((phase) => phase.runId === run.id) }));
}