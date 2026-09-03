import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { contextPacket, conversation, conversationMessage, costRecord, db, eventLog, modelRouteDecision } from "@workspace/db";
import { type ConversationMode } from "../lib/context-engine";
import { registerAction } from "../lib/governance-engine";
import { pipelineFailureResponse, runRequestPipeline, type RequestPipelineSuccess } from "../lib/request-pipeline";
import { consultCILRoute, routeModelRequest } from "../lib/model-router";
import { buildAskAnswerContract, sanitizeCILResponse, sanitizeContextPacket } from "../lib/ask-lee-evidence";

const router: IRouter = Router();
const modes = ["normal", "deep_think", "build", "write", "review", "pilot", "low_cost", "private", "no_model", "governed_action"] as const;
type Mode = typeof modes[number];

function parseMode(value: unknown): Mode {
  const normalized = String(value ?? "normal").toLowerCase().replaceAll(" ", "_");
  return (modes as readonly string[]).includes(normalized) ? normalized as Mode : "normal";
}

async function budgetState() {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [day] = await db.select({ total: sql<number>`coalesce(sum(${costRecord.estimatedCostUsd}), 0)` }).from(costRecord).where(gte(costRecord.recordedAt, dayStart));
  const [week] = await db.select({ total: sql<number>`coalesce(sum(${costRecord.estimatedCostUsd}), 0)` }).from(costRecord).where(gte(costRecord.recordedAt, weekStart));
  const [month] = await db.select({ total: sql<number>`coalesce(sum(${costRecord.estimatedCostUsd}), 0)` }).from(costRecord).where(gte(costRecord.recordedAt, monthStart));
  const limits = { daily: Number(process.env.LEE_DAILY_BUDGET_USD ?? 1), weekly: Number(process.env.LEE_WEEKLY_BUDGET_USD ?? 5), monthly: Number(process.env.LEE_MONTHLY_BUDGET_USD ?? 20) };
  const spent = { daily: Number(day?.total ?? 0), weekly: Number(week?.total ?? 0), monthly: Number(month?.total ?? 0) };
  return { limits, spent, limited: spent.daily >= limits.daily || spent.weekly >= limits.weekly || spent.monthly >= limits.monthly };
}

async function preview(query: string, mode: Mode, risk: string, budgetTokens: number, pipeline: RequestPipelineSuccess) {
  const state = await budgetState();
  const packet = pipeline.context;
  const cil = await consultCILRoute({
    correlationId: pipeline.correlationId,
    queryText: query,
    semanticDomain: "conversation",
    intentType: pipeline.intent.intentType,
    riskClassification: risk as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    contextItems: packet.items,
    preferredTier: "auto",
    costCeilingUsd: state.limited ? 0 : undefined,
  });
  const selectedTier = cil.resolution_tier === "T1_TRIGRAM" ? "T1" : cil.resolution_tier === "T2_SEMANTIC" ? "T2" : "T3";
  const selectedModel = cil.model_route?.model ?? cil.selected_model ?? "CIL";
  const selectedProvider = selectedTier === "T3" ? cil.model_route?.provider ?? "unavailable" : "cil";
  const routeId = selectedTier === "T3" ? cil.model_route?.route_id ?? null : null;
  const estimatedCostUsd = cil.cost_usd;
  const route = mode === "no_model" ? "packet_only" : selectedTier === "T1" || selectedTier === "T2" ? "cil_reuse" : "cil_selected_model";
  const reason = mode === "no_model" ? "The selected mode prohibits model execution." : `${selectedTier} route selected by CIL.`;
  return { packet, publicPacket: sanitizeContextPacket(packet), selectedModel, selectedProvider, routeId, selectedTier, estimatedCostUsd, route, reason: `${reason} Intent: ${pipeline.intent.intentType}.`, budget: state, intent: pipeline.intent, cil };
}

router.post("/ai/context-preview", async (req, res): Promise<void> => {
  const query = String(req.body?.message ?? "").trim();
  if (!query) { res.status(400).json({ error: "message is required." }); return; }
  const pipeline = await runRequestPipeline({ text: query, origin: "console", actionType: "context_preview", engineName: "Context Engine", mode: parseMode(req.body?.mode), budgetTokens: Number(req.body?.budgetTokens ?? 3000), sessionId: String(req.body?.sessionId ?? "preview") });
  if (!pipeline.ok) { res.status(422).json(pipelineFailureResponse(pipeline)); return; }
  const result = await preview(query, parseMode(req.body?.mode), String(req.body?.risk ?? "LOW"), Number(req.body?.budgetTokens ?? 3000), pipeline);
  const { packet: _privatePacket, publicPacket, cil, ...publicResult } = result;
  res.json({ ...publicResult, cil: sanitizeCILResponse(cil), packet: { ...publicPacket, selectedModel: result.selectedModel, estimatedCostUsd: result.estimatedCostUsd, riskLevel: String(req.body?.risk ?? "LOW") } });
});

router.post("/ai/conversations", async (req, res): Promise<void> => {
  const [created] = await db.insert(conversation).values({ title: String(req.body?.title ?? "Ask Lee"), mode: parseMode(req.body?.mode) }).returning();
  res.status(201).json(created);
});

router.get("/ai/conversations/:id", async (req, res): Promise<void> => {
  const [item] = await db.select().from(conversation).where(eq(conversation.id, req.params.id)).limit(1);
  if (!item) { res.status(404).json({ error: "Conversation not found." }); return; }
  const messages = await db.select().from(conversationMessage).where(eq(conversationMessage.conversationId, item.id)).orderBy(conversationMessage.createdAt);
  res.json({ ...item, messages });
});

router.post("/ai/conversations/:id/messages", async (req, res): Promise<void> => {
  const [item] = await db.select().from(conversation).where(eq(conversation.id, req.params.id)).limit(1);
  if (!item) { res.status(404).json({ error: "Conversation not found." }); return; }
  const message = String(req.body?.message ?? "").trim();
  if (!message) { res.status(400).json({ error: "message is required." }); return; }
  const mode = parseMode(req.body?.mode ?? item.mode);
  const risk = String(req.body?.risk ?? "LOW").toUpperCase();
  const startedAt = Date.now();
  const pipeline = await runRequestPipeline({ text: message, origin: "console", actionType: "conversation_message", engineName: "Ask Lee", mode, budgetTokens: Number(req.body?.budgetTokens ?? 3000), sessionId: item.id, payload: { conversationId: item.id } });
  if (!pipeline.ok) { res.status(422).json(pipelineFailureResponse(pipeline)); return; }
  const correlationId = pipeline.correlationId;
  const intent = pipeline.intent;
  const route = await preview(message, mode, risk, Number(req.body?.budgetTokens ?? 3000), pipeline);
  const [packet] = route.packet.id ? [null] : await db.insert(contextPacket).values({
    fingerprint: route.packet.fingerprint, intent: message, mode, packet: { items: route.packet.items, excluded: route.packet.excluded }, sourceRefs: route.packet.items.map((entry) => entry.id), excludedRefs: route.packet.excludedRefs, tokenEstimate: route.packet.tokens, estimatedCostUsd: route.estimatedCostUsd, selectedTier: route.selectedTier, selectedModel: route.selectedModel, riskLevel: risk, expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  }).returning();
  const packetId = route.packet.id ?? packet?.id ?? null;
  if (mode !== "private") {
    await db.insert(modelRouteDecision).values({ correlationId, requestText: message, mode, route: route.route, tier: route.selectedTier, provider: route.selectedProvider, model: route.selectedModel, reason: route.reason, estimatedCostUsd: route.estimatedCostUsd, status: "selected" });
    await db.insert(eventLog).values({ eventType: "ModelRouteSelected", aggregateType: "conversation", aggregateId: item.id, sourceRef: "model-router", correlationId, occurredAt: new Date(), payload: { correlationId, route: route.route, model: route.selectedModel, estimatedCostUsd: route.estimatedCostUsd, reason: route.reason } });
  }
  if (mode === "governed_action" || (route.estimatedCostUsd > Number(process.env.LEE_STRONG_MODEL_GATE_USD ?? 0.05) && mode !== "deep_think")) {
    const gate = await registerAction({ actionType: "model_call", payload: { conversationId: item.id, message, mode, model: route.selectedModel, estimatedCostUsd: route.estimatedCostUsd, targetSystem: "lee-model-router" }, reason: "Model call exceeds the configured reasoning threshold or was explicitly governed.", evidenceRefs: route.packet.items.map((entry) => entry.id), affectedObject: item.id });
    if (gate.verdict === "ALLOW") {
      // A standing rule may release the call; otherwise the default is HOLD.
    } else {
      const hold = gate.record;
    await db.insert(eventLog).values({ eventType: "ModelCallHeld", aggregateType: "governance_request", aggregateId: hold.id, sourceRef: "model-router", correlationId, occurredAt: new Date(), payload: { estimatedCostUsd: route.estimatedCostUsd, model: route.selectedModel } });
     res.status(202).json({ held: true, governanceRequestId: hold.id, correlationId, contextPacket: { ...route.publicPacket, selectedModel: route.selectedModel, estimatedCostUsd: route.estimatedCostUsd }, answerContract: buildAskAnswerContract({ answer: "This model call is held for owner approval before execution.", items: route.packet.items, cil: route.cil, route: { tier: route.selectedTier, model: route.selectedModel, provider: route.selectedProvider, routeId: route.routeId }, intentType: intent.intentType }), estimatedCostUsd: route.estimatedCostUsd, reason: "Human approval is required before this model call." });
    return;
    }
  }
  const [userMessage] = mode === "private"
    ? [undefined]
     : await db.insert(conversationMessage).values({ conversationId: item.id, role: "user", content: message, contextPacketId: packetId, intentId: intent.id }).returning();
  if (mode === "no_model") {
    res.json({ held: false, packetOnly: true, correlationId, contextPacket: route.publicPacket, answerContract: buildAskAnswerContract({ answer: "Context-only mode selected. No model was called.", items: route.packet.items, cil: route.cil, route: { tier: route.selectedTier, model: route.selectedModel, provider: route.selectedProvider, routeId: route.routeId }, intentType: intent.intentType }), userMessage });
    return;
  }
   const result = await routeModelRequest({
     correlationId,
     pipeline,
     queryText: message,
     semanticDomain: "conversation",
     intentType: intent.intentType,
     riskClassification: risk as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
     contextItems: route.packet.items,
     preferredTier: "auto",
     costCeilingUsd: route.budget.limited ? 0 : undefined,
   }, route.cil);
   const cost = result.estimatedCostUsd;
  const [assistantMessage] = mode === "private"
    ? [undefined]
     : await db.insert(conversationMessage).values({ conversationId: item.id, role: "assistant", content: result.answer, contextPacketId: packetId, intentId: intent.id, evidenceRefs: route.packet.items.map((entry) => entry.id) }).returning();
  if (mode !== "private") {
     await db.insert(costRecord).values({ correlationId, engine: "ask-lee", provider: result.provider, tier: result.tier, model: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens, totalTokens: result.totalTokens, estimatedCostUsd: cost, latencyMs: Date.now() - startedAt, cacheHit: route.packet.reused || result.tier === "T1" || result.tier === "T2", metadata: { conversationId: item.id, mode, route: route.route, routeId: result.routeId, costEstimateSource: result.costEstimateSource, budgetLimited: route.budget.limited, cilReroute: result.cilRerouted ?? false } });
     await db.insert(eventLog).values({ eventType: "CostRecordCreated", aggregateType: "cost_record", aggregateId: correlationId, sourceRef: "ask-lee", correlationId, occurredAt: new Date(), payload: { provider: result.provider, model: result.model, routeId: result.routeId, totalTokens: result.totalTokens, estimatedCostUsd: cost, cacheHit: route.packet.reused } });
  }
    res.json({ held: false, correlationId, answer: result.answer, answerContract: buildAskAnswerContract({ answer: result.answer, items: route.packet.items, cil: result.cilEvidence ? { ...route.cil, ...result.cilEvidence } : route.cil, route: { tier: result.tier, model: result.model, provider: result.provider, routeId: result.routeId, cilRerouted: result.cilRerouted, cilRerouteReason: result.cilRerouteReason }, intentType: intent.intentType }), userMessage, assistantMessage, intent, contextPacket: route.publicPacket, estimatedCostUsd: cost, provider: result.provider, model: result.model, routeId: result.routeId, evidenceRefs: route.packet.items.map((entry) => entry.id) });
});

export default router;