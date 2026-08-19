import { createHash, createHmac } from "node:crypto";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { SelectedContext } from "./context-economy";

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
    lee_brain_version: "foundation-1",
    source_context_checksum: `sha256:${createHash("sha256")
      .update(JSON.stringify(input.contextItems))
      .digest("hex")}`,
    query_text: input.queryText,
    semantic_domain: input.semanticDomain,
    intent: {
      intent_type: input.intentType,
      risk_classification: input.riskClassification,
    },
    context_asset_refs: context,
    freshness_requirement: "current",
    reuse_permitted: true,
    frontier_escalation_permitted: true,
    desired_format: "detailed",
    cost_ceiling_usd: input.costCeilingUsd,
  };
  return body;
}

async function tryCIL(input: RouteInput): Promise<CILResponse | null> {
  const baseUrl = process.env.LEE_CIL_BASE_URL;
  const secret = process.env.LEE_CIL_HMAC_SECRET;
  if (!baseUrl || !secret) return null;

  const body = buildCILRequest(input);
  const bodyText = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(bodyText).digest("hex");
  const signature = createHmac("sha256", secret)
    .update(`${input.correlationId}.${timestamp}.${bodyHash}`)
    .digest("hex");
  const response = await fetch(new URL("/query/lee", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lee-timestamp": timestamp,
      "x-lee-signature": signature,
    },
    body: bodyText,
  });
  if (!response.ok) return null;
  return (await response.json()) as CILResponse;
}

export async function routeModelRequest(input: RouteInput): Promise<{
  tier: "T1" | "T2" | "T3";
  model: string;
  answer: string;
  estimatedCostUsd: number;
}> {
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
    };
  }

  const tier = chooseTier(input);
  const model = modelForTier[tier];
  const contextText = input.contextItems
    .map((item) => `[${item.kind}:${item.id}] ${item.text}`)
    .join("\n");
  const response = await openai.chat.completions.create({
    model,
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content:
          "You are Lee, a private founder operating intelligence. Separate observations from conclusions, name uncertainty plainly, and do not invent evidence. Answer the request directly.",
      },
      {
        role: "user",
        content: `Domain: ${input.semanticDomain}\nIntent: ${input.intentType}\nRisk: ${input.riskClassification}\n\nContext packet:\n${contextText || "(No context selected)"}\n\nRequest:\n${input.queryText}`,
      },
    ],
  });
  const answer = response.choices[0]?.message?.content?.trim();
  if (!answer) throw new Error("Model returned an empty answer");
  const completionTokens = response.usage?.completion_tokens ?? 0;
  const promptTokens = response.usage?.prompt_tokens ?? 0;
  const estimatedCostUsd = (promptTokens * 0.0000002) + (completionTokens * 0.000001);
  return { tier, model, answer, estimatedCostUsd };
}