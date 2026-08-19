import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { contextPacket, conversation, conversationMessage, costRecord, db, eventLog, modelRouteDecision } from "@workspace/db";
import { buildContextPacket, type ConversationMode } from "../lib/context-engine";
import { callProvider, estimateCost, MODEL_PRICING } from "../lib/ai-providers";
import { registerAction } from "../lib/governance-engine";

const router: IRouter = Router();
const modes = ["normal", "deep_think", "build", "write", "review", "pilot", "low_cost", "private", "no_model", "governed_action"] as const;
type Mode = typeof modes[number];

function parseMode(value: unknown): Mode {
  const normalized = String(value ?? "normal").toLowerCase().replaceAll(" ", "_");
  return (modes as readonly string[]).includes(normalized) ? normalized as Mode : "normal";
}

function modelFor(mode: Mode, risk: string, budgetLimited: boolean) {
  if (mode === "low_cost" || budgetLimited) return "gpt-5-nano";
  if (mode === "deep_think" || risk === "HIGH" || risk === "CRITICAL") return "claude-opus-5";
  if (mode === "build" || mode === "review") return "gpt-5.6-terra";
  if (mode === "write") return "claude-sonnet-4-6";
  if (mode === "pilot") return "gemini-2.5-pro";
  return "gpt-5.6-luna";
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

async function preview(query: string, mode: Mode, risk = "LOW", budgetTokens = 3000) {
  const state = await budgetState();
  const selectedModel = modelFor(mode, risk, state.limited);
  const packet = await buildContextPacket(query, mode as ConversationMode, budgetTokens);
  const estimatedCostUsd = estimateCost(selectedModel, packet.tokens + Math.ceil(query.length / 4), 900);
  const route = mode === "no_model" ? "packet_only" : packet.reused ? "cil_reuse" : state.limited ? "budget_low_cost" : "model";
  const reason = mode === "no_model" ? "The selected mode prohibits model execution." : state.limited ? "A configured budget limit has been reached; Lee will use the cheapest path." : packet.reused ? "A fresh reusable packet exists for this intent and source set." : "Selected by mode, risk, context size, and cost.";
  return { packet, selectedModel, selectedTier: selectedModel === "gpt-5-nano" ? "T1" : selectedModel === "gpt-5.6-luna" ? "T2" : "T3", estimatedCostUsd, route, reason, budget: state };
}

router.post("/ai/context-preview", async (req, res): Promise<void> => {
  const query = String(req.body?.message ?? "").trim();
  if (!query) { res.status(400).json({ error: "message is required." }); return; }
  const result = await preview(query, parseMode(req.body?.mode), String(req.body?.risk ?? "LOW"), Number(req.body?.budgetTokens ?? 3000));
  res.json({ ...result, packet: { ...result.packet, selectedModel: result.selectedModel, estimatedCostUsd: result.estimatedCostUsd, riskLevel: String(req.body?.risk ?? "LOW") } });
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
  const correlationId = randomUUID();
  const startedAt = Date.now();
  const route = await preview(message, mode, risk, Number(req.body?.budgetTokens ?? 3000));
  const [packet] = route.packet.id ? [null] : await db.insert(contextPacket).values({
    fingerprint: route.packet.fingerprint, intent: message, mode, packet: { items: route.packet.items }, sourceRefs: route.packet.items.map((entry) => entry.id), excludedRefs: route.packet.excludedRefs, tokenEstimate: route.packet.tokens, estimatedCostUsd: route.estimatedCostUsd, selectedTier: route.selectedTier, selectedModel: route.selectedModel, riskLevel: risk, expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  }).returning();
  const packetId = route.packet.id ?? packet?.id ?? null;
  if (mode !== "private") {
    await db.insert(modelRouteDecision).values({ correlationId, requestText: message, mode, route: route.route, tier: route.selectedTier, provider: MODEL_PRICING[route.selectedModel]?.provider ?? "none", model: route.selectedModel, reason: route.reason, estimatedCostUsd: route.estimatedCostUsd, status: "selected" });
    await db.insert(eventLog).values({ eventType: "ModelRouteSelected", aggregateType: "conversation", aggregateId: item.id, sourceRef: "model-router", correlationId, occurredAt: new Date(), payload: { correlationId, route: route.route, model: route.selectedModel, estimatedCostUsd: route.estimatedCostUsd, reason: route.reason } });
  }
  if (mode === "governed_action" || (route.estimatedCostUsd > Number(process.env.LEE_STRONG_MODEL_GATE_USD ?? 0.05) && mode !== "deep_think")) {
    const gate = await registerAction({ actionType: "model_call", payload: { conversationId: item.id, message, mode, model: route.selectedModel, estimatedCostUsd: route.estimatedCostUsd, targetSystem: "lee-model-router" }, reason: "Model call exceeds the configured reasoning threshold or was explicitly governed.", evidenceRefs: route.packet.items.map((entry) => entry.id), affectedObject: item.id });
    if (gate.verdict === "ALLOW") {
      // A standing rule may release the call; otherwise the default is HOLD.
    } else {
      const hold = gate.record;
    await db.insert(eventLog).values({ eventType: "ModelCallHeld", aggregateType: "governance_request", aggregateId: hold.id, sourceRef: "model-router", correlationId, occurredAt: new Date(), payload: { estimatedCostUsd: route.estimatedCostUsd, model: route.selectedModel } });
    res.status(202).json({ held: true, governanceRequestId: hold.id, correlationId, contextPacket: route.packet, estimatedCostUsd: route.estimatedCostUsd, reason: "Human approval is required before this model call." });
    return;
    }
  }
  const [userMessage] = mode === "private"
    ? [undefined]
    : await db.insert(conversationMessage).values({ conversationId: item.id, role: "user", content: message, contextPacketId: packetId }).returning();
  if (mode === "no_model") {
    res.json({ held: false, packetOnly: true, correlationId, contextPacket: route.packet, userMessage });
    return;
  }
  const context = route.packet.items.map((entry) => `[${entry.kind}] ${entry.text}`).join("\n");
  const result = await callProvider(route.selectedModel, [
    { role: "system", content: "You are Lee, a private founder operating intelligence. Separate observations from conclusions, cite available evidence IDs when relevant, and state uncertainty plainly. Never invent facts." },
    { role: "user", content: `Mode: ${mode}\nContext packet:\n${context || "(none)"}\n\nRequest:\n${message}` },
  ]);
  const cost = estimateCost(result.model, result.tokensIn, result.tokensOut);
  const [assistantMessage] = mode === "private"
    ? [undefined]
    : await db.insert(conversationMessage).values({ conversationId: item.id, role: "assistant", content: result.text, contextPacketId: packetId, evidenceRefs: route.packet.items.map((entry) => entry.id) }).returning();
  if (mode !== "private") {
    await db.insert(costRecord).values({ correlationId, engine: "ask-lee", provider: result.provider, tier: route.selectedTier, model: result.model, promptTokens: result.tokensIn, completionTokens: result.tokensOut, totalTokens: result.tokensIn + result.tokensOut, estimatedCostUsd: cost, latencyMs: Date.now() - startedAt, cacheHit: route.packet.reused, metadata: { conversationId: item.id, mode, route: route.route, budgetLimited: route.budget.limited } });
    await db.insert(eventLog).values({ eventType: "CostRecordCreated", aggregateType: "cost_record", aggregateId: correlationId, sourceRef: "ask-lee", correlationId, occurredAt: new Date(), payload: { provider: result.provider, model: result.model, totalTokens: result.tokensIn + result.tokensOut, estimatedCostUsd: cost, cacheHit: route.packet.reused } });
  }
  res.json({ held: false, correlationId, answer: result.text, userMessage, assistantMessage, contextPacket: route.packet, estimatedCostUsd: cost, provider: result.provider, model: result.model, evidenceRefs: route.packet.items.map((entry) => entry.id) });
});

export default router;