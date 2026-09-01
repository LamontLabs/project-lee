import { Router, type IRouter } from "express";
import { RouteReasoningRequestBody, RouteReasoningRequestResponse } from "@workspace/api-zod";
import { costRecord, db, eventLog } from "@workspace/db";
import { constructContextPacket } from "../lib/context-economy";
import { routeModelRequest } from "../lib/model-router";
import { pipelineFailureResponse, runRequestPipeline } from "../lib/request-pipeline";

const router: IRouter = Router();

router.post("/reasoning/route", async (req, res): Promise<void> => {
  const parsed = RouteReasoningRequestBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid reasoning request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const pipeline = await runRequestPipeline({ text: input.queryText, origin: "api", actionType: "reasoning_route", engineName: "Reasoning API", mode: "normal", budgetTokens: input.contextBudgetTokens });
  if (!pipeline.ok) { res.status(422).json(pipelineFailureResponse(pipeline)); return; }
  const correlationId = pipeline.correlationId;
  const startedAt = Date.now();
  const identity = pipeline.identity;
  await db.insert(eventLog).values({
    eventType: "IdentityConsulted",
    aggregateType: "reasoning_request",
    aggregateId: correlationId,
    sourceRef: "identity-engine",
    occurredAt: new Date(),
    payload: { correlationId, identityProfileId: identity.profileId, pipelineStep: 1 },
  });
  const packet = constructContextPacket(
    input.queryText,
    input.contextItems,
    input.contextBudgetTokens,
  );
  const routed = await routeModelRequest({
    correlationId,
    pipeline,
    queryText: input.queryText,
    semanticDomain: input.semanticDomain,
    intentType: input.intentType,
    riskClassification: input.riskClassification,
    contextItems: packet.items,
    preferredTier: input.preferredTier,
    costCeilingUsd: input.costCeilingUsd,
  });

  if (
    input.costCeilingUsd !== undefined &&
    routed.estimatedCostUsd > input.costCeilingUsd
  ) {
    res.status(422).json({ error: "The routed response exceeded the cost ceiling." });
    return;
  }

  const [resolvedEvent] = await db.transaction(async (tx) => {
    const [contextEvent, resolutionEvent] = await tx
      .insert(eventLog)
      .values([
        {
          eventType: "ContextPacketConstructed",
          aggregateType: "reasoning_request",
          aggregateId: correlationId,
          sourceRef: "context-economy",
          occurredAt: new Date(),
          payload: {
            correlationId,
            identityProfileId: identity.profileId,
            contextTokens: packet.tokens,
            contextBudgetTokens: input.contextBudgetTokens,
            contextAssetRefs: packet.items.map((item) => item.id),
          },
        },
        {
          eventType: "CILQueryResolved",
          aggregateType: "reasoning_request",
          aggregateId: correlationId,
          sourceRef: "model-router",
          occurredAt: new Date(),
          payload: {
            correlationId,
            resolutionTier: routed.tier,
            model: routed.model,
            contextTokens: packet.tokens,
            estimatedCostUsd: routed.estimatedCostUsd,
            semanticDomain: input.semanticDomain,
            identityConsulted: true,
          },
        },
      ])
      .returning();
    const [cost] = await tx
      .insert(costRecord)
      .values({
        correlationId,
        engine: "model-router",
        provider: routed.provider,
        tier: routed.tier,
        model: routed.model,
        promptTokens: routed.promptTokens,
        completionTokens: routed.completionTokens,
        totalTokens: routed.totalTokens,
        estimatedCostUsd: routed.estimatedCostUsd,
         latencyMs: Date.now() - startedAt,
         cacheHit: routed.model === "CIL" && (routed.tier === "T1" || routed.tier === "T2"),
        metadata: {
          semanticDomain: input.semanticDomain,
          contextTokens: packet.tokens,
            category: routed.provider,
            routeId: routed.routeId,
            costEstimateSource: routed.costEstimateSource,
            ...(routed.cilEvidence ? {
              cilConfidence: routed.cilEvidence.confidence,
              cilLatencyMs: routed.cilEvidence.latency_ms,
              cilProvenance: routed.cilEvidence.provenance,
              cognitiveAssetId: routed.cilEvidence.cognitive_asset_id,
              assetVersion: routed.cilEvidence.asset_version,
              driftDetected: routed.cilEvidence.drift_detected,
              contradictionDetected: routed.cilEvidence.contradiction_detected,
              freshnessState: routed.cilEvidence.freshness_state,
              reuseEligible: routed.cilEvidence.reuse_eligible,
            } : {
              cilRerouted: routed.cilRerouted ?? false,
              cilRerouteReason: routed.cilRerouteReason,
            }),
        },
      })
      .returning();
    await tx.insert(eventLog).values({
      eventType: "CostRecordCreated",
      aggregateType: "cost_record",
      aggregateId: cost.id,
      sourceRef: correlationId,
      occurredAt: new Date(),
      payload: {
        correlationId,
        tier: routed.tier,
        totalTokens: routed.totalTokens,
        estimatedCostUsd: routed.estimatedCostUsd,
      },
    });
    return [resolutionEvent];
  });

  const response = RouteReasoningRequestResponse.parse({
    correlationId,
    resolutionTier: routed.tier,
    model: routed.model,
    answer: routed.answer,
    contextPacket: packet.items,
    contextTokens: packet.tokens,
    contextBudgetTokens: input.contextBudgetTokens,
    estimatedCostUsd: routed.estimatedCostUsd,
    eventId: resolvedEvent.id,
  });
  req.log.info(
    { correlationId, tier: routed.tier, model: routed.model, contextTokens: packet.tokens },
    "Reasoning request routed",
  );
  res.json(response);
});

export default router;