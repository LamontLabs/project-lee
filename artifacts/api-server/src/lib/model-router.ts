import { createHash } from "node:crypto";
import type { SelectedContext } from "./context-economy";
import { checkPolicy } from "./policy";
import { reasoningService, type CILQueryRequest, type CILQueryResponse } from "../services/internal-services";
import { callProvider } from "./ai-providers";

type RiskClassification = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type PreferredTier = "auto" | "T1" | "T2" | "T3";

type RouteInput = {
  correlationId: string;
  queryText: string;
  semanticDomain: string;
  intentType: string;
  riskClassification: RiskClassification;
  contextItems: SelectedContext[];
  preferredTier: PreferredTier;
  costCeilingUsd?: number;
};

type CILResponse = {
  correlation_id: string;
  resolution_tier: "T1_TRIGRAM" | "T2_SEMANTIC" | "T3_FRONTIER";
  answer: string;
  confidence: number;
  cost_usd: number;
  provenance: string[];
  latency_ms: number;
  cognitive_asset_id?: string;
  asset_version?: string;
  drift_detected: boolean;
  contradiction_detected: boolean;
  freshness_state: "fresh" | "current" | "stale" | "expired";
  reuse_eligible: boolean;
  recommend_escalation: boolean;
  escalation_reason?: string;
};

const modelForTier = {
  T1: "gpt-5-nano",
  T2: "gpt-5.6-luna",
  T3: "gpt-5.6-terra",
} as const;

function chooseTier(input: RouteInput): "T1" | "T2" | "T3" {
  if (input.preferredTier !== "auto") return input.preferredTier;
  if (input.riskClassification === "CRITICAL" || input.riskClassification === "HIGH") {
    return "T3";
  }
  if (input.contextItems.length > 8 || input.queryText.length > 700) return "T2";
  return "T1";
}

function buildCILRequest(input: RouteInput) {
  const context = input.contextItems.map((item) => item.id);
  const body = {
    correlation_id: input.correlationId,
    lee_brain_version: process.env.LEE_BRAIN_VERSION ?? "2026.7.1",
    source_context_checksum: `sha256:${createHash("sha256").update(JSON.stringify(input.contextItems)).digest("hex")}`,
    query_text: input.queryText,
    semantic_domain: input.semanticDomain,
    intent: {
      intent_type: input.intentType,
      risk_classification: input.riskClassification,
    },
    context_asset_refs: context,
    freshness_requirement: "current" as const,
    reuse_permitted: true,
    frontier_escalation_permitted: true,
    desired_format: "detailed" as const,
    cost_ceiling_usd: input.costCeilingUsd,
  };
  return body satisfies CILQueryRequest;
}

async function tryCIL(input: RouteInput): Promise<CILResponse | null> {
  const body = buildCILRequest(input);
  try {
    return await reasoningService.query(body);
  } catch {
    return null;
  }
}

export async function routeModelRequest(input: RouteInput): Promise<{
  tier: "T1" | "T2" | "T3";
  model: string;
  answer: string;
  estimatedCostUsd: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cilEvidence?: Pick<CILQueryResponse, "confidence" | "cost_usd" | "latency_ms" | "provenance" | "cognitive_asset_id" | "asset_version" | "drift_detected" | "contradiction_detected" | "freshness_state" | "reuse_eligible" | "recommend_escalation" | "escalation_reason">;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}> {
  const costPolicy = await checkPolicy("cost", "model_call", { estimatedCostUsd: input.costCeilingUsd ?? 0, tier: input.preferredTier }, "Model Router");
  if (!costPolicy.permitted) throw new Error(`Model call blocked by Cost Policy: ${costPolicy.constraints.join(" ")}`);
  const cil = await tryCIL(input);
  if (cil) {
    const tier = cil.resolution_tier === "T1_TRIGRAM"
      ? "T1"
      : cil.resolution_tier === "T2_SEMANTIC"
        ? "T2"
        : "T3";
    return {
      tier,
      model: "CIL",
      answer: cil.answer,
      estimatedCostUsd: cil.cost_usd,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cilEvidence: cil,
    };
  }

  const tier = "T3" as const;
  const model = modelForTier[tier];
  const contextText = input.contextItems
    .map((item) => `[${item.kind}:${item.id}] ${item.text}`)
    .join("\n");
  const response = await callProvider(model, [
    {
      role: "system",
      content:
        "You are Lee, a private founder operating intelligence. Separate observations from conclusions, name uncertainty plainly, and do not invent evidence. Answer the request directly.",
    },
    {
      role: "user",
      content: `Domain: ${input.semanticDomain}\nIntent: ${input.intentType}\nRisk: ${input.riskClassification}\n\nContext packet:\n${contextText || "(No context selected)"}\n\nRequest:\n${input.queryText}`,
    },
  ]);
  const answer = response.text;
  const completionTokens = response.tokensOut;
  const promptTokens = response.tokensIn;
  const estimatedCostUsd = (promptTokens * 0.0000002) + (completionTokens * 0.000001);
  return {
    tier,
    model,
    answer,
    estimatedCostUsd,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    fallbackUsed: true,
    fallbackReason: "CIL unavailable or response contract invalid",
  };
}