import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { RouteReasoningRequestBody, RouteReasoningRequestResponse } from "@workspace/api-zod";
import { costRecord, db, eventLog } from "@workspace/db";
import { constructContextPacket } from "../lib/context-economy";
import { routeModelRequest } from "../lib/model-router";

const router: IRouter = Router();

router.post("/reasoning/route", async (req, res): Promise<void> => {
  const parsed = RouteReasoningRequestBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid reasoning request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  const correlationId = randomUUID();
  const packet = constructContextPacket(
    input.queryText,
    input.contextItems,
    input.contextBudgetTokens,
  );
  const routed = await routeModelRequest({
    correlationId,
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
          },
        },
      ])
      .returning();
    const [cost] = await tx
      .insert(costRecord)
      .values({
        correlationId,
        engine: "model-router",
        provider: routed.model === "CIL" ? "cil" : "openai-managed",
        tier: routed.tier,
        model: routed.model,
        promptTokens: routed.promptTokens,
        completionTokens: routed.completionTokens,
        totalTokens: routed.totalTokens,
        estimatedCostUsd: routed.estimatedCostUsd,
        metadata: {
          semanticDomain: input.semanticDomain,
          contextTokens: packet.tokens,
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