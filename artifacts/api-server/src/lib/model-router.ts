import { createHash, randomUUID } from "node:crypto";
import type { SelectedContext } from "./context-economy";
import { checkPolicy } from "./policy";
import { reasoningService, type CILModelRoute, type CILQueryRequest, type CILQueryResponse } from "../services/internal-services";
import { callProvider, type CILSelectedModelRoute } from "./ai-providers";
import type { RequestPipelineSuccess } from "./request-pipeline";
import { isApprovedLocalWorkload, localFailureEvidence, recordLocalCognitionBlocked, recordLocalCognitionRun, type LocalExecutionEvidence } from "./local-cognition";
import type { getOfflineAwareness } from "./offline-awareness";
import { DEFAULT_PERSONALITY_SECTIONS, personalityPresentationInstruction, type PersonalityContext } from "./personality-memory";

type RiskClassification = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type PreferredTier = "auto" | "T1" | "T2" | "T3";

export type RouteInput = {
  correlationId: string;
  pipeline: Pick<RequestPipelineSuccess, "correlationId" | "stages">;
  queryText: string;
  semanticDomain: string;
  intentType: string;
  riskClassification: RiskClassification;
  contextItems: SelectedContext[];
  preferredTier: PreferredTier;
  costCeilingUsd?: number;
  workloadClass?: string;
  signal?: AbortSignal;
  externalReality?: Awaited<ReturnType<typeof getOfflineAwareness>>;
  personalityContext?: PersonalityContext;
};
type CILConsultInput = Omit<RouteInput, "pipeline">;

type ExecutionFailure = { model: string; reason: string };

function buildCILRequest(input: CILConsultInput, executionFailure?: ExecutionFailure, correlationId = input.correlationId) {
  const context = input.contextItems.map((item) => item.id);
  const body = {
    correlation_id: correlationId,
    lee_brain_version: process.env.LEE_BRAIN_VERSION ?? "2026.7.1",
    source_context_checksum: `sha256:${createHash("sha256").update(JSON.stringify(context)).digest("hex")}`,
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
    return { tier, model: "CIL", provider: "cil", routeId: null, answer: cil.answer, estimatedCostUsd: cil.cost_usd, costEstimateSource: "cil_resolution" as const, promptTokens: 0, completionTokens: 0, totalTokens: 0, cilEvidence: cil, localExecution: undefined };
  }
  const route = selectedRoute(cil);
  if (!route) throw new Error("CIL returned T3 without an executable provider/model/route.");
  if (route.provider === "ollama" && !isApprovedLocalWorkload(input.workloadClass)) {
    await recordLocalCognitionBlocked({ correlationId: input.correlationId, route, workloadClass: input.workloadClass, reason: "Only explicitly approved background workloads may execute on local K6 cognition." });
    throw new Error("LOCAL_WORKLOAD_NOT_APPROVED");
  }
  const contextText = input.contextItems.map((item) => `[${item.kind}:${item.id}] ${item.text}`).join("\n");
  const response = await callProvider(route, [
      { role: "system", content: `You are Lee, a private founder operating intelligence. Separate observations from conclusions, name uncertainty plainly, and do not invent evidence. Answer the request directly. Do not quote raw provider bodies, credentials, or connector payloads; refer to their evidence IDs and summarize only what is needed. External reality status: ${input.externalReality?.state ?? "unverified"}. Provider facts must be labeled current, stale, unavailable, or unverified from the supplied freshness evidence; never present local records as current external state without a successful refresh. ${personalityPresentationInstruction(input.personalityContext ?? { version: 0, status: "blocked", sections: DEFAULT_PERSONALITY_SECTIONS, sourceRefs: [], safetyBoundary: "No personality context supplied.", violations: ["unverified"] })}` },
    { role: "user", content: `Domain: ${input.semanticDomain}\nIntent: ${input.intentType}\nRisk: ${input.riskClassification}\n\nContext packet:\n${contextText || "(No context selected)"}\n\nRequest:\n${input.queryText}` },
  ], input.correlationId, { workloadClass: input.workloadClass, signal: input.signal });
  return {
    tier,
    model: response.model,
    provider: response.provider,
    routeId: response.routeId,
    answer: response.text,
    estimatedCostUsd: response.estimatedCostUsd ?? cil.cost_usd,
    costEstimateSource: response.provider === "ollama" ? "local_runtime_estimate" as const : response.estimatedCostUsd === null ? "cil_route_estimate" as const : "provider_catalog_estimate" as const,
    promptTokens: response.tokensIn,
    completionTokens: response.tokensOut,
    totalTokens: response.tokensIn + response.tokensOut,
    cilEvidence: cil,
    ...(response.localExecution ? { localExecution: response.localExecution } : {}),
  };
}

export async function routeModelRequest(input: RouteInput, preconsultedCIL?: CILQueryResponse): Promise<{
  tier: "T1" | "T2" | "T3";
  model: string;
  provider: string;
  routeId: string | null;
  answer: string;
  estimatedCostUsd: number;
  costEstimateSource: "cil_resolution" | "cil_route_estimate" | "provider_catalog_estimate" | "local_runtime_estimate";
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cilEvidence?: Pick<CILQueryResponse, "confidence" | "cost_usd" | "latency_ms" | "provenance" | "cognitive_asset_id" | "asset_version" | "drift_detected" | "contradiction_detected" | "freshness_state" | "reuse_eligible" | "recommend_escalation" | "escalation_reason">;
  cilRerouted?: boolean;
  cilRerouteReason?: string;
  localExecution?: LocalExecutionEvidence;
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
    const startedAt = Date.now();
    const result = await executeCILRoute(input, cil);
    if (result.provider === "ollama" && result.localExecution) {
      const route = selectedRoute(cil);
      if (route) {
        const ledger = await recordLocalCognitionRun({
          correlationId: input.correlationId,
          route,
          workloadClass: input.workloadClass ?? "unclassified",
          outcome: "completed",
          latencyMs: Date.now() - startedAt,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          estimatedCostUsd: result.estimatedCostUsd,
          evidence: result.localExecution,
        });
        result.localExecution = { ...result.localExecution, ledger };
      }
    }
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (reason === "LOCAL_WORKLOAD_NOT_APPROVED") throw error;
    const selected = selectedRoute(cil);
    if (selected?.provider === "ollama") {
      const localError = error as Error & { localExecution?: LocalExecutionEvidence };
      await recordLocalCognitionRun({
        correlationId: input.correlationId,
        route: selected,
        workloadClass: input.workloadClass ?? "unclassified",
        outcome: "failed",
        latencyMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: 0,
        evidence: localError.localExecution ?? localFailureEvidence(selected, input.workloadClass ?? "unclassified", reason),
        error: reason,
      });
    }
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