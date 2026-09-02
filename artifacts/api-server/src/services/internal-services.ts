import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, internalCapabilityService } from "@workspace/db";
import { emitEvent } from "../lib/foundation-events";
import { callUniversalSystem, registerUniversalSystem } from "../lib/universal-systems";

export type ResolutionTier = "T1_TRIGRAM" | "T2_SEMANTIC" | "T3_FRONTIER";
export type CILQueryRequest = { correlation_id: string; query_text: string; semantic_domain: string; intent: { intent_type: string; risk_classification: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; project_id?: string }; project_id?: string; context_asset_refs: string[]; freshness_requirement: "any" | "current" | "verified"; desired_format: "concise" | "detailed" | "structured" | "narrative"; reuse_permitted: boolean; frontier_escalation_permitted: boolean; cost_ceiling_usd?: number; lee_brain_version: string; source_context_checksum: string; execution_failure?: { model: string; reason: string } };
export type CILModelRoute = { model: string; provider: string; route_id: string };
export type CILQueryResponse = { correlation_id: string; resolution_tier: ResolutionTier; answer: string; cognitive_asset_id?: string; asset_version?: string; model_route?: CILModelRoute; selected_model?: string; confidence: number; cost_usd: number; latency_ms: number; semantic_domain: string; reuse_eligible: boolean; drift_detected: boolean; contradiction_detected: boolean; provenance: string[]; governance_status?: "approved" | "nominated" | "unreviewed"; freshness_state: "fresh" | "current" | "stale" | "expired"; recommend_escalation: boolean; escalation_reason?: string };
export type CILInventoryModel = { model_id: string; provider: string; status: string; enabled: boolean; route_ids: string[] };
export type CILModelInventory = { correlation_id: string; total_configured: number; total_enabled: number; total_available: number; total_unavailable: number; models: CILInventoryModel[] };
export type GovernedRequest = Record<string, unknown> & { lee_request_id: string; action_class: string; target_system: string };
export type GovernedResponse = { lee_request_id?: string; verdict: "ALLOW" | "HOLD" | "REJECT"; reason_codes: string[]; checked_invariants: unknown[]; missing_approvals?: unknown[]; remediation_requirements?: string[]; decision_id: string; decision_envelope: string; evidence_bundle_ref: string; audit_entry_ref: string; policy_version: string; timestamp: string; replay_checksum: string; authorization_expiry?: string; human_confirmation_required: boolean };

let internalServiceRegistration: Promise<unknown> | undefined;
function ensureInternalServicesRegistered() {
  internalServiceRegistration ??= registerInternalServices().then(async () => {
    const endpoint = process.env.CIL_LEE_ENDPOINT ?? process.env.LEE_CIL_ENDPOINT;
    if (endpoint) {
      await registerUniversalSystem({
        systemId: "cil",
        displayName: "CIL Reasoning Runtime",
        category: "reasoning",
        baseUrl: process.env.CIL_BASE_URL ?? new URL(endpoint).origin,
        healthEndpoint: process.env.CIL_HEALTH_ENDPOINT ?? "/health",
        failurePolicy: "graceful_degradation",
        credentialEnvKey: "CIL_API_KEY",
        capabilities: ["query", "model_inventory"],
        requestEnvelope: "direct",
      });
    }
  });
  return internalServiceRegistration;
}

async function setHealth(serviceId: string, health: "healthy" | "degraded" | "unavailable", metrics?: Record<string, unknown>) {
  await db.update(internalCapabilityService).set({ currentHealth: health, lastHealthCheck: new Date(), updatedAt: new Date(), ...(metrics ? { metrics } : {}) }).where(eq(internalCapabilityService.serviceId, serviceId));
}
export async function registerInternalServices() {
  const definitions = [
    { systemId: "cil", displayName: "CIL Reasoning Runtime", category: "reasoning", baseUrl: process.env.CIL_BASE_URL ?? (process.env.CIL_LEE_ENDPOINT ?? process.env.LEE_CIL_ENDPOINT ? new URL(process.env.CIL_LEE_ENDPOINT ?? process.env.LEE_CIL_ENDPOINT!).origin : undefined), healthEndpoint: process.env.CIL_HEALTH_ENDPOINT ?? "/health", failurePolicy: "graceful_degradation" as const, credentialEnvKey: "CIL_API_KEY", capabilities: ["query", "model_inventory"], requestEnvelope: "direct" as const },
    { systemId: "cerbaseal", displayName: "CerbaSeal Governance", category: "governance", baseUrl: process.env.CERBASEAL_BASE_URL, healthEndpoint: "/health", failurePolicy: "fail_closed" as const, credentialEnvKey: "CERBASEAL_API_KEY", capabilities: ["evaluate", "health", "policy"], requestEnvelope: "direct" as const },
    { systemId: "replit-ai-openai", displayName: "Replit AI OpenAI Bridge", category: "reasoning", baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL, healthEndpoint: "/models", failurePolicy: "graceful_degradation" as const, credentialEnvKey: "AI_INTEGRATIONS_OPENAI_API_KEY", capabilities: ["chat"], requestEnvelope: "direct" as const },
    { systemId: "replit-ai-anthropic", displayName: "Replit AI Anthropic Bridge", category: "reasoning", baseUrl: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL, healthEndpoint: "/v1/messages", failurePolicy: "graceful_degradation" as const, credentialEnvKey: "AI_INTEGRATIONS_ANTHROPIC_API_KEY", credentialHeader: "x-api-key", capabilities: ["chat"], requestEnvelope: "direct" as const },
    { systemId: "replit-ai-gemini", displayName: "Replit AI Gemini Bridge", category: "reasoning", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL, healthEndpoint: "/models", failurePolicy: "graceful_degradation" as const, credentialEnvKey: "AI_INTEGRATIONS_GEMINI_API_KEY", credentialHeader: "x-goog-api-key", capabilities: ["chat"], requestEnvelope: "direct" as const },
  ];
  for (const item of definitions) {
    if (item.baseUrl) await registerUniversalSystem({ ...item, baseUrl: item.baseUrl });
    else {
      const [existing] = await db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, item.systemId));
      if (existing) await db.update(internalCapabilityService).set({ baseUrl: null, updatedAt: new Date() }).where(eq(internalCapabilityService.id, existing.id));
    }
  }
  return db.select().from(internalCapabilityService);
}
function cerbaSealEndpoint(name: "health" | "evaluate" | "policy") {
  const explicit = name === "health" ? process.env.CERBASEAL_HEALTH_ENDPOINT : name === "evaluate" ? process.env.CERBASEAL_EVALUATE_ENDPOINT : process.env.CERBASEAL_POLICY_VERSION_ENDPOINT;
  return explicit ?? `${(process.env.CERBASEAL_BASE_URL ?? "").replace(/\/$/, "")}/${name === "evaluate" ? "evaluate" : name === "policy" ? "policy/current-version" : "health"}`;
}
function toCerbaSealRequest(request: GovernedRequest): Record<string, unknown> {
  const actionClass = request.action_class === "connector_write" ? "escalate" : request.action_class;
  return {
    requestId: request.lee_request_id,
    workflowClass: String(request.workflow_class ?? "your_workflow_class"),
    jurisdiction: "internal",
    actorId: String(request.actor_identity ?? "lee-service"),
    actorAuthorityClass: "system",
    proposedActionClass: actionClass,
    proposal: { proposalSourceKind: "deterministic_rule", authorityBearing: true, requestedActionClass: actionClass, confidence: 1, reasonCodes: [], proposalCreatedAt: new Date().toISOString() },
    sensitive: false,
    prohibitedUse: false,
    policyPackRef: { id: "cerbaseal", version: String(request.policy_pack_version ?? process.env.CERBASEAL_POLICY_PACK_VERSION ?? "unknown") },
    provenanceRef: { modelVersion: "lee", ruleSetVersion: String(request.policy_pack_version ?? "unknown"), sourceHash: createHash("sha256").update(JSON.stringify(request)).digest("hex") },
    approvalRequired: request.human_confirmation !== false,
    approvalArtifact: request.approval_artifact ?? null,
    loggingReady: true,
    controlStatus: { criticalControlsValid: true, stale: false, verificationRunId: request.lee_request_id },
    trustState: { trusted: true, trustStateId: request.lee_request_id },
    createdAt: new Date().toISOString(),
  };
}
function normalizeGateResult(request: GovernedRequest, raw: Record<string, any>): GovernedResponse {
  const envelope = raw.decisionEnvelope;
  if (!envelope || !["ALLOW", "HOLD", "REJECT"].includes(envelope.finalState) || !envelope.envelopeId || !envelope.trace) throw new Error("Invalid CerbaSeal GateResult");
  const release = raw.releaseAuthorization;
  const releasedAt = release?.releasedAt ?? envelope.issuedAt ?? new Date().toISOString();
  return {
    lee_request_id: request.lee_request_id,
    verdict: envelope.finalState,
    reason_codes: Array.isArray(envelope.trace.reasonCodes) ? envelope.trace.reasonCodes : [],
    checked_invariants: Array.isArray(envelope.trace.checkedInvariants) ? envelope.trace.checkedInvariants : [],
    decision_id: release?.releaseAuthorizationId ?? envelope.envelopeId,
    decision_envelope: envelope.envelopeId,
    evidence_bundle_ref: envelope.evidenceBundleId,
    audit_entry_ref: `cerbaseal-audit:${request.lee_request_id}`,
    policy_version: String(request.policy_pack_version ?? process.env.CERBASEAL_POLICY_PACK_VERSION ?? "unknown"),
    timestamp: envelope.issuedAt ?? releasedAt,
    replay_checksum: createHash("sha256").update(JSON.stringify(envelope)).digest("hex"),
    authorization_expiry: release ? new Date(new Date(releasedAt).getTime() + Number(process.env.CERBASEAL_ALLOW_TTL_SECONDS ?? 300) * 1000).toISOString() : undefined,
    human_confirmation_required: Boolean(envelope.humanApprovalRequired && !envelope.humanApprovalPresent),
  };
}
export interface ReasoningService { query(request: CILQueryRequest): Promise<CILQueryResponse>; }
export const reasoningService: ReasoningService = { async query(request) {
  await ensureInternalServicesRegistered();
  await emitEvent({ eventType: "CILQueryRequested", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, semanticDomain: request.semantic_domain, projectId: request.project_id ?? request.intent.project_id, riskClassification: request.intent.risk_classification, costCeilingUsd: request.cost_ceiling_usd } });
  const endpoint = process.env.CIL_LEE_ENDPOINT ?? process.env.LEE_CIL_ENDPOINT;
   if (!endpoint) { await setHealth("cil", "unavailable"); await emitEvent({ eventType: "CILUnavailable", aggregateType: "cil_service", aggregateId: request.correlation_id, payload: { errorSummary: "CIL_LEE_ENDPOINT is not configured", modelExecutionBlocked: true } }); throw new Error("CIL unavailable"); }
  const started = Date.now();
  try {
    const path = endpoint ? new URL(endpoint).pathname : "/query/lee";
    const result = (await callUniversalSystem("cil", path, request, request.correlation_id)).result as Record<string, any>;
    if (!result || result.correlation_id !== request.correlation_id || !["T1_TRIGRAM", "T2_SEMANTIC", "T3_FRONTIER"].includes(result.resolution_tier) || typeof result.answer !== "string" || typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 1 || typeof result.cost_usd !== "number" || result.cost_usd < 0 || typeof result.latency_ms !== "number" || result.latency_ms < 0 || result.semantic_domain !== request.semantic_domain || typeof result.reuse_eligible !== "boolean" || typeof result.drift_detected !== "boolean" || typeof result.contradiction_detected !== "boolean" || !Array.isArray(result.provenance) || !["fresh", "current", "stale", "expired"].includes(result.freshness_state) || typeof result.recommend_escalation !== "boolean" || (result.resolution_tier === "T3_FRONTIER" && (typeof result.model_route?.model !== "string" || typeof result.model_route?.provider !== "string" || typeof result.model_route?.route_id !== "string"))) throw new Error("Invalid CIL response schema or correlation");
    const response = result as CILQueryResponse;
    await setHealth("cil", "healthy", { lastTier: response.resolution_tier, lastCostUsd: response.cost_usd, lastLatencyMs: response.latency_ms, lastConfidence: response.confidence, lastProvenance: response.provenance, lastCognitiveAssetId: response.cognitive_asset_id, driftDetected: response.drift_detected, contradictionDetected: response.contradiction_detected });
    await emitEvent({ eventType: "CILQueryResolved", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, resolutionTier: response.resolution_tier, confidence: response.confidence, costUsd: response.cost_usd, latencyMs: response.latency_ms, provenance: response.provenance, cognitiveAssetId: response.cognitive_asset_id, assetVersion: response.asset_version } });
    if (response.resolution_tier === "T1_TRIGRAM" || response.resolution_tier === "T2_SEMANTIC") await emitEvent({ eventType: "CILReuseHit", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, cognitiveAssetId: response.cognitive_asset_id, assetVersion: response.asset_version, tier: response.resolution_tier } });
    if (response.resolution_tier === "T3_FRONTIER") await emitEvent({ eventType: "CILFrontierEscalated", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, escalationReason: response.escalation_reason } });
    if (response.drift_detected) await emitEvent({ eventType: "CILDriftDetected", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, cognitiveAssetId: response.cognitive_asset_id } });
    if (response.contradiction_detected) await emitEvent({ eventType: "CILContradictionDetected", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, cognitiveAssetId: response.cognitive_asset_id } });
    return response;
   } catch (error) { await setHealth("cil", "degraded", { lastError: String(error), lastLatencyMs: Date.now() - started }); await emitEvent({ eventType: "CILUnavailable", aggregateType: "cil_service", aggregateId: request.correlation_id, payload: { errorSummary: String(error), modelExecutionBlocked: true } }); throw error; }
} };
export async function getCILModelInventory(correlationId = randomUUID()): Promise<CILModelInventory> {
  await ensureInternalServicesRegistered();
  await emitEvent({ eventType: "CILModelInventoryRequested", aggregateType: "cil_service", aggregateId: correlationId, correlationId, payload: { correlationId } });
  try {
    const raw = (await callUniversalSystem("cil", "/api/capabilities/models", {}, correlationId, { method: "GET" })).result as Record<string, any>;
    const models = Array.isArray(raw?.models) ? raw.models : [];
    const inventory: CILModelInventory = {
      correlation_id: String(raw?.correlation_id ?? ""),
      total_configured: Number(raw?.total_configured),
      total_enabled: Number(raw?.total_enabled),
      total_available: Number(raw?.total_available),
      total_unavailable: Number(raw?.total_unavailable),
      models: models.map((model: any) => ({ model_id: String(model?.model_id ?? ""), provider: String(model?.provider ?? ""), status: String(model?.status ?? ""), enabled: Boolean(model?.enabled), route_ids: Array.isArray(model?.route_ids) ? model.route_ids.map(String) : [] })),
    };
    if (inventory.correlation_id !== correlationId || !Number.isInteger(inventory.total_configured) || !Number.isInteger(inventory.total_enabled) || !Number.isInteger(inventory.total_available) || !Number.isInteger(inventory.total_unavailable) || inventory.models.some((model) => !model.model_id || !model.provider || !model.status)) throw new Error("Invalid CIL model inventory schema or correlation");
    await emitEvent({ eventType: "CILModelInventoryResolved", aggregateType: "cil_service", aggregateId: correlationId, correlationId, payload: { correlationId, totalConfigured: inventory.total_configured, totalEnabled: inventory.total_enabled, totalAvailable: inventory.total_available, totalUnavailable: inventory.total_unavailable, providers: [...new Set(inventory.models.map((model) => model.provider))] } });
    return inventory;
  } catch (error) {
    await emitEvent({ eventType: "CILModelInventoryUnavailable", aggregateType: "cil_service", aggregateId: correlationId, correlationId, payload: { correlationId, errorSummary: String(error) } });
    throw error;
  }
}
export interface GovernanceService { evaluate(request: GovernedRequest): Promise<GovernedResponse>; }
export const governanceService: GovernanceService = { async evaluate(request) {
   await ensureInternalServicesRegistered();
  const baseUrl = process.env.CERBASEAL_BASE_URL; if (!baseUrl) { await setHealth("cerbaseal", "unavailable"); await emitEvent({ eventType: "GovernanceServiceUnavailable", aggregateType: "governance_service", aggregateId: request.lee_request_id, payload: { errorSummary: "CERBASEAL_BASE_URL is not configured", actionClass: request.action_class } }); return { verdict: "HOLD", reason_codes: ["GOVERNANCE_SERVICE_UNAVAILABLE"], checked_invariants: [], decision_id: `hold-${request.lee_request_id}`, decision_envelope: "", evidence_bundle_ref: "", audit_entry_ref: "", policy_version: String(request.policy_pack_version ?? "unknown"), timestamp: new Date().toISOString(), replay_checksum: "", human_confirmation_required: true }; }
   try { const path = new URL(cerbaSealEndpoint("evaluate")).pathname; const raw = (await callUniversalSystem("cerbaseal", path, { ...request, policy_pack_version: request.policy_pack_version ?? process.env.CERBASEAL_POLICY_PACK_VERSION }, request.lee_request_id, { timeoutMs: 10000 })).result as Record<string, any>; const response = raw.decisionEnvelope ? normalizeGateResult(request, raw) : raw as GovernedResponse; if (!["ALLOW", "HOLD", "REJECT"].includes(response.verdict) || !response.decision_id || !response.decision_envelope || !response.evidence_bundle_ref || !response.audit_entry_ref || !response.policy_version || !response.timestamp || !response.replay_checksum || typeof response.human_confirmation_required !== "boolean") throw new Error("Invalid CerbaSeal response schema"); await setHealth("cerbaseal", "healthy", { lastVerdict: response.verdict, policyVersion: response.policy_version }); return response; } catch (error) { await setHealth("cerbaseal", "unavailable", { lastError: String(error) }); await emitEvent({ eventType: "GovernanceServiceUnavailable", aggregateType: "governance_service", aggregateId: request.lee_request_id, payload: { errorSummary: String(error), actionClass: request.action_class } }); return { verdict: "HOLD", reason_codes: ["GOVERNANCE_SERVICE_UNAVAILABLE"], checked_invariants: [], decision_id: `hold-${request.lee_request_id}`, decision_envelope: "", evidence_bundle_ref: "", audit_entry_ref: "", policy_version: String(request.policy_pack_version ?? "unknown"), timestamp: new Date().toISOString(), replay_checksum: "", human_confirmation_required: true }; }
} };
async function probeCerbaSeal() {
  try {
    const response = (await callUniversalSystem("cerbaseal", new URL(cerbaSealEndpoint("health")).pathname, {}, randomUUID(), { method: "GET", timeoutMs: 5000 })).result as Record<string, any>;
    if (!response || !["ok", "healthy"].includes(String(response.status).toLowerCase())) throw new Error("Invalid CerbaSeal health response");
    const policy = (await callUniversalSystem("cerbaseal", new URL(cerbaSealEndpoint("policy")).pathname, {}, randomUUID(), { method: "GET", timeoutMs: 5000 })).result as Record<string, any>;
    if (typeof policy.policy_pack_version !== "string") throw new Error("Invalid CerbaSeal policy response");
    await setHealth("cerbaseal", "healthy", { policyVersion: policy.policy_pack_version, health: response });
  } catch (error) {
    await setHealth("cerbaseal", "unavailable", { lastError: String(error) });
  }
}
export async function internalServiceHealth() { await registerInternalServices(); if (process.env.CERBASEAL_BASE_URL) await probeCerbaSeal(); return db.select().from(internalCapabilityService); }