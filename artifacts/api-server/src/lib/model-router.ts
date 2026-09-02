import { createHash, randomUUID } from "node:crypto";
import type { SelectedContext } from "./context-economy";
import { checkPolicy } from "./policy";
import { reasoningService, type CILModelRoute, type CILQueryRequest, type CILQueryResponse } from "../services/internal-services";
import { callProvider, type CILSelectedModelRoute } from "./ai-providers";
import type { RequestPipelineSuccess } from "./request-pipeline";

type RiskClassification = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type PreferredTier = "auto" | "T1" | "T2" | "T3";

type RouteInput = {
  correlationId: string;
  pipeline: Pick<RequestPipelineSuccess, "correlationId" | "stages">;
  queryText: string;
  semanticDomain: string;
  intentType: string;
  riskClassification: RiskClassification;
  contextItems: SelectedContext[];
  preferredTier: PreferredTier;
  costCeilingUsd?: number;
};
type CILConsultInput = Omit<RouteInput, "pipeline">;

type ExecutionFailure = { model: string; reason: string };

function buildCILRequest(input: CILConsultInput, executionFailure?: ExecutionFailure, correlationId = input.correlationId) {
  const context = input.contextItems.map((item) => item.id);
  const body = {
    correlation_id: correlationId,
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
    ...(executionFailure ? { execution_failure: executionFailure } : {}),
  };
  return body satisfies CILQueryRequest;
}

function tierFor(response: CILQueryResponse): "T1" | "T2" | "T3" {
  return response.resolution_tier === "T1_TRIGRAM" ? "T1" : response.resolution_tier === "T2_SEMANTIC" ? "T2" : "T3";
}

function selectedRoute(response: CILQueryResponse): CILSelectedModelRoute | null {
  const route: CILModelRoute | undefined = response.model_route;
  if (!route?.model || !route.provider || !route.route_id) return null;
  return { model: route.model, provider: route.provider, routeId: route.route_id };
}

function requireCompletedPipeline(input: RouteInput) {
  const requiredStages = ["identity", "constitution", "intent", "context"];
  if (input.pipeline.correlationId !== input.correlationId || !requiredStages.every((stage) => input.pipeline.stages.includes(stage as RequestPipelineSuccess["stages"][number]))) {
    throw new Error("REQUEST_PIPELINE_REQUIRED");
  }
}

export async function consultCILRoute(input: CILConsultInput, executionFailure?: ExecutionFailure) {
  const correlationId = executionFailure ? `${input.correlationId}:reroute:${randomUUID()}` : input.correlationId;
  return reasoningService.query(buildCILRequest(input, executionFailure, correlationId));
}

async function executeCILRoute(input: RouteInput, cil: CILQueryResponse) {
  const tier = tierFor(cil);
  if (tier !== "T3") {
    return { tier, model: "CIL", provider: "cil", routeId: null, answer: cil.answer, estimatedCostUsd: cil.cost_usd, costEstimateSource: "cil_resolution" as const, promptTokens: 0, completionTokens: 0, totalTokens: 0, cilEvidence: cil };
  }
  const route = selectedRoute(cil);
  if (!route) throw new Error("CIL returned T3 without an executable provider/model/route.");
  const contextText = input.contextItems.map((item) => `[${item.kind}:${item.id}] ${item.text}`).join("\n");
  const response = await callProvider(route, [
    { role: "system", content: "You are Lee, a private founder operating intelligence. Separate observations from conclusions, name uncertainty plainly, and do not invent evidence. Answer the request directly." },
    { role: "user", content: `Domain: ${input.semanticDomain}\nIntent: ${input.intentType}\nRisk: ${input.riskClassification}\n\nContext packet:\n${contextText || "(No context selected)"}\n\nRequest:\n${input.queryText}` },
  ], input.correlationId);
  return {
    tier,
    model: response.model,
    provider: response.provider,
    routeId: response.routeId,
    answer: response.text,
    estimatedCostUsd: response.estimatedCostUsd ?? cil.cost_usd,
    costEstimateSource: response.estimatedCostUsd === null ? "cil_route_estimate" as const : "provider_catalog_estimate" as const,
    promptTokens: response.tokensIn,
    completionTokens: response.tokensOut,
    totalTokens: response.tokensIn + response.tokensOut,
    cilEvidence: cil,
  };
}

export async function routeModelRequest(input: RouteInput, preconsultedCIL?: CILQueryResponse): Promise<{
  tier: "T1" | "T2" | "T3";
  model: string;
  provider: string;
  routeId: string | null;
  answer: string;
  estimatedCostUsd: number;
  costEstimateSource: "cil_resolution" | "cil_route_estimate" | "provider_catalog_estimate";
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cilEvidence?: Pick<CILQueryResponse, "confidence" | "cost_usd" | "latency_ms" | "provenance" | "cognitive_asset_id" | "asset_version" | "drift_detected" | "contradiction_detected" | "freshness_state" | "reuse_eligible" | "recommend_escalation" | "escalation_reason">;
  cilRerouted?: boolean;
  cilRerouteReason?: string;
}> {
  requireCompletedPipeline(input);
  const costPolicy = await checkPolicy("cost", "model_call", { estimatedCostUsd: input.costCeilingUsd ?? 0, tier: input.preferredTier }, "Model Router");
  if (!costPolicy.permitted) throw new Error(`Model call blocked by Cost Policy: ${costPolicy.constraints.join(" ")}`);
  let cil: CILQueryResponse;
  try {
    cil = preconsultedCIL ?? await consultCILRoute(input);
  } catch (error) {
    throw new Error(`CIL_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (cil.correlation_id !== input.correlationId) throw new Error("CIL_CORRELATION_MISMATCH");
  try {
    return await executeCILRoute(input, cil);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (tierFor(cil) !== "T3") throw error;
    try {
      const rerouted = await consultCILRoute(input, { model: selectedRoute(cil)?.model ?? "unknown", reason });
      if (rerouted.correlation_id === input.correlationId) throw new Error("CIL_REROUTE_CORRELATION_REUSED");
      const result = await executeCILRoute(input, rerouted);
      return { ...result, cilRerouted: true, cilRerouteReason: "CIL selected a new route after model execution failure." };
    } catch (rerouteError) {
      throw new Error(`CIL_REROUTE_FAILED: ${rerouteError instanceof Error ? rerouteError.message : String(rerouteError)}`);
    }
  }
}