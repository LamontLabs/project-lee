import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import {
  assumptionLedger,
  costRecord,
  db,
  eventLog,
  executiveObjective,
  graphEdge,
  graphNode,
  operationalReview,
} from "@workspace/db";
import { routeModelRequest } from "./model-router";
import { runRequestPipeline } from "./request-pipeline";
import { processExperiences } from "./experience";
import { getSystemEconomicsSummary } from "./system-economics";

type ReviewCadence = "weekly" | "monthly" | "quarterly" | "annual";

type ReviewInput = {
  cadence: ReviewCadence;
  periodStart: Date;
  periodEnd: Date;
};

function dayAge(date: Date, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 86_400_000));
}

export async function generateOperationalReview(input: ReviewInput) {
  await processExperiences({ since: input.periodStart });
  const [events, objectives, assumptions] = await Promise.all([
    db.select().from(eventLog)
      .where(and(gte(eventLog.occurredAt, input.periodStart), lte(eventLog.occurredAt, input.periodEnd)))
      .orderBy(desc(eventLog.occurredAt))
      .limit(500),
    db.select().from(executiveObjective),
    db.select().from(assumptionLedger),
  ]);
  const economics = await getSystemEconomicsSummary();

  const now = new Date();
  const sourceRefs = events.map((event) => event.id);
  const eventCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
    return counts;
  }, {});
  const failedEvents = events.filter((event) => /fail|reject|degrad|error/i.test(event.eventType));
  const completedEvents = events.filter((event) => /complete|resolved|allowed|success/i.test(event.eventType));
  const keyThemes = Object.entries(eventCounts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5)
    .map(([eventType]) => eventType);

  const contextItems = events.slice(0, 80).map((event) => ({
    id: event.id,
    kind: "event",
    text: `${event.eventType} · ${event.aggregateType}:${event.aggregateId} · ${JSON.stringify(event.payload)}`,
    confidence: 0.8,
    recencyDays: dayAge(event.occurredAt, now),
    strategicAnchor: false,
    score: 1,
    contextValueScore: 1,
    factorBreakdown: { goal: 1, recency: 1, importance: 0.5, relationship: 0, project: 0.1, confidence: 0.8, trust: 0.5, mode: 0.5 },
    estimatedTokens: Math.ceil(JSON.stringify(event.payload).length / 4),
  }));
  const objectiveContext = objectives.map((objective) => ({
    id: objective.id,
    kind: "objective",
    text: `Objective ${objective.status}: ${objective.title} — ${objective.description ?? ""}`,
    confidence: objective.confidence,
    recencyDays: dayAge(objective.updatedAt, now),
    strategicAnchor: false,
    score: objective.confidence,
    contextValueScore: objective.confidence,
    factorBreakdown: { goal: 0.5, recency: 0.5, importance: 0.5, relationship: 0, project: 0.5, confidence: objective.confidence, trust: 0.5, mode: 0.5 },
    estimatedTokens: Math.ceil((objective.title.length + (objective.description?.length ?? 0)) / 4),
  }));
  const queryText = [
      `Write a ${input.cadence} operational review for ${input.periodStart.toISOString()} through ${input.periodEnd.toISOString()}.`,
      "Ground every claim in the supplied event and objective context. Separate evidence from interpretation and state uncertainty plainly.",
      "Cover what improved, what regressed, assumption performance, opportunities, effort versus value, decision retrospective, strategic observations, and portfolio health.",
      "Write a coherent executive narrative in plain language; do not invent events or metrics.",
    ].join("\n");
  const pipeline = await runRequestPipeline({ text: queryText, origin: "scheduled", actionType: "operational_review", engineName: "Operational Review", mode: "review", budgetTokens: 3000 });
  if (!pipeline.ok) throw new Error(`Operational review request pipeline failed: ${pipeline.error}`);
  const routed = await routeModelRequest({
    correlationId: pipeline.correlationId,
    pipeline,
    queryText,
    semanticDomain: "operational-review",
    intentType: "RETROSPECTIVE",
    riskClassification: "LOW",
    contextItems: [...contextItems, ...objectiveContext],
    preferredTier: "T2",
  });
  const correlationId = randomUUID();
  const sections = {
    improvements: {
      narrative: `Observed ${completedEvents.length} completion or resolution events in the period.`,
      sourceRefs: completedEvents.map((event) => event.id),
    },
    regressions: {
      narrative: `Observed ${failedEvents.length} failure, rejection, degradation, or error events in the period.`,
      sourceRefs: failedEvents.map((event) => event.id),
    },
    assumptionPerformance: {
      activeAssumptions: assumptions.filter((assumption) => assumption.status === "active").map((assumption) => ({
        id: assumption.id,
        statement: assumption.statement,
        confidence: assumption.confidence,
      })),
      sourceRefs: assumptions.map((assumption) => assumption.id),
    },
    opportunities: {
      eventTypes: events.filter((event) => /opportun|initiative|insight/i.test(event.eventType)).map((event) => event.eventType),
      sourceRefs: events.filter((event) => /opportun|initiative|insight/i.test(event.eventType)).map((event) => event.id),
    },
    effortVsValue: {
      eventCount: events.length,
      eventTypes: eventCounts,
      sourceRefs,
    },
    decisionRetrospective: {
      decisionEvents: events.filter((event) => /decision|govern|execution/i.test(event.eventType)).map((event) => event.eventType),
      sourceRefs: events.filter((event) => /decision|govern|execution/i.test(event.eventType)).map((event) => event.id),
    },
    strategicObservations: { keyThemes, sourceRefs },
    portfolioHealth: {
      objectives: objectives.map((objective) => ({ id: objective.id, title: objective.title, status: objective.status, confidence: objective.confidence })),
      sourceRefs: objectives.map((objective) => objective.id),
    },
    systemEconomics: {
      totalCostUsd: economics.totalCostUsd,
      projectedMonthlyCostUsd: economics.projectedMonthlyCostUsd,
      summary: economics.summary,
      alerts: economics.alerts,
      sourceRefs: [economics.id],
    },
  };
  const title = `${input.cadence[0].toUpperCase()}${input.cadence.slice(1)} operational review · ${input.periodStart.toISOString().slice(0, 10)}`;
  const generatedAt = new Date();

  return db.transaction(async (tx) => {
    const [review] = await tx.insert(operationalReview).values({
      cadence: input.cadence,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      title,
      summaryNarrative: routed.answer,
      sections,
      sourceRefs,
      keyThemes,
      reasoningCorrelationId: correlationId,
      reasoningCostUsd: routed.estimatedCostUsd,
      generatedAt,
    }).returning();
    const [cost] = await tx.insert(costRecord).values({
      correlationId,
      engine: "operational-review",
      provider: routed.model === "CIL" ? "cil" : "openai-managed",
      tier: routed.tier,
      model: routed.model,
      promptTokens: routed.promptTokens,
      completionTokens: routed.completionTokens,
      totalTokens: routed.totalTokens,
      estimatedCostUsd: routed.estimatedCostUsd,
      metadata: {
        cadence: input.cadence,
        eventCount: events.length,
        ...(routed.cilEvidence ? {
          cilConfidence: routed.cilEvidence.confidence,
          cilLatencyMs: routed.cilEvidence.latency_ms,
          cilProvenance: routed.cilEvidence.provenance,
          cognitiveAssetId: routed.cilEvidence.cognitive_asset_id,
          assetVersion: routed.cilEvidence.asset_version,
          driftDetected: routed.cilEvidence.drift_detected,
          contradictionDetected: routed.cilEvidence.contradiction_detected,
        } : {
          cilRerouted: routed.cilRerouted ?? false,
          cilRerouteReason: routed.cilRerouteReason,
        }),
      },
    }).returning();
    await tx.insert(eventLog).values({
      eventType: "CostRecordCreated",
      aggregateType: "cost_record",
      aggregateId: cost.id,
      sourceRef: correlationId,
      occurredAt: generatedAt,
      payload: { engine: "operational-review", totalTokens: routed.totalTokens, estimatedCostUsd: routed.estimatedCostUsd },
    });
    const [reviewNode] = await tx.insert(graphNode).values({
      objectType: "operational_review",
      objectId: review.id,
      label: title,
      metadata: { cadence: input.cadence, keyThemes },
    }).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
    const [event] = await tx.insert(eventLog).values({
      eventType: "OperationalReviewGenerated",
      aggregateType: "operational_review",
      aggregateId: review.id,
      sourceRef: "operational-review-engine",
      occurredAt: generatedAt,
      payload: {
        reviewId: review.id,
        cadence: input.cadence,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
        keyThemes,
        sourceRefCount: sourceRefs.length,
      },
    }).returning();
    if (reviewNode && sourceRefs.length > 0) {
      const sourceNodes = await tx.insert(graphNode).values(sourceRefs.map((sourceId) => ({
        objectType: "event",
        objectId: sourceId,
        metadata: { indexedBy: review.id },
      }))).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
      if (sourceNodes.length > 0) {
        await tx.insert(graphEdge).values(sourceNodes.map((sourceNode) => ({
          sourceNodeId: reviewNode.id,
          targetNodeId: sourceNode.id,
          edgeType: "RELATES_TO",
          confidence: 1,
          sourceRef: review.id,
          metadata: { cadence: input.cadence },
        }))).onConflictDoNothing({ target: [graphEdge.sourceNodeId, graphEdge.targetNodeId, graphEdge.edgeType] });
      }
    }
    return { review, eventId: event.id };
  });
}