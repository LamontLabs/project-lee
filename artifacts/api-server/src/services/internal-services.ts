import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, internalCapabilityService } from "@workspace/db";
import { emitEvent } from "../lib/foundation-events";

export type ResolutionTier = "T1_TRIGRAM" | "T2_SEMANTIC" | "T3_FRONTIER";
export type CILQueryRequest = { correlation_id: string; query_text: string; semantic_domain: string; intent: Record<string, unknown>; project_id?: string; context_asset_refs: string[]; freshness_requirement: "any" | "current" | "verified"; risk_classification: string; desired_format: string; reuse_permitted: boolean; frontier_escalation_permitted: boolean; cost_ceiling_usd?: number; lee_brain_version: string; source_context_checksum: string };
export type CILQueryResponse = { correlation_id: string; resolution_tier: ResolutionTier; answer: string; cognitive_asset_id?: string; confidence: number; cost_usd: number; latency_ms: number; semantic_domain: string; reuse_eligible: boolean; drift_detected: boolean; contradiction_detected: boolean; provenance: string[]; asset_version?: string; governance_status: "approved" | "nominated" | "unreviewed"; freshness_state: "fresh" | "current" | "stale" | "expired"; recommend_escalation: boolean; escalation_reason?: string };
export type GovernedRequest = Record<string, unknown> & { lee_request_id: string; action_class: string; target_system: string };
export type GovernedResponse = { lee_request_id?: string; verdict: "ALLOW" | "HOLD" | "REJECT"; reason_codes: string[]; checked_invariants: unknown[]; missing_approvals?: unknown[]; remediation_requirements?: string[]; decision_id: string; decision_envelope: string; evidence_bundle_ref: string; audit_entry_ref: string; policy_version: string; timestamp: string; replay_checksum: string; authorization_expiry?: string; human_confirmation_required: boolean };

function signedHeaders(body: string, bearerCredential: string | undefined, hmacSecret: string | undefined, correlationId: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString(); const digest = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", hmacSecret ?? bearerCredential ?? "").update(`${correlationId}.${timestamp}.${digest}`).digest("hex");
  return { "content-type": "application/json", "X-LEE-Identity": "lee", "X-LEE-Correlation-Id": correlationId, "X-LEE-Timestamp": timestamp, "X-LEE-Signature": signature, ...(bearerCredential ? { authorization: `Bearer ${bearerCredential}` } : {}) };
}
async function setHealth(serviceId: string, health: "healthy" | "degraded" | "unavailable", metrics?: Record<string, unknown>) {
  await db.update(internalCapabilityService).set({ currentHealth: health, lastHealthCheck: new Date(), updatedAt: new Date(), ...(metrics ? { metrics } : {}) }).where(eq(internalCapabilityService.serviceId, serviceId));
}
export async function registerInternalServices() {
  const definitions = [{ serviceId: "cil", displayName: "CIL Reasoning Runtime", category: "reasoning", baseUrl: process.env.CIL_BASE_URL, healthEndpoint: "/health", failurePolicy: "graceful_degradation", credentialEnvKey: "CIL_API_KEY" }, { serviceId: "cerbaseal", displayName: "CerbaSeal Governance", category: "governance", baseUrl: process.env.CERBASEAL_BASE_URL, healthEndpoint: "/health", failurePolicy: "fail_closed", credentialEnvKey: "CERBASEAL_API_KEY" }];
  for (const item of definitions) {
    const [existing] = await db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, item.serviceId));
    if (existing) await db.update(internalCapabilityService).set({ baseUrl: item.baseUrl ?? null, updatedAt: new Date() }).where(eq(internalCapabilityService.id, existing.id));
    else await db.insert(internalCapabilityService).values(item);
  }
  return db.select().from(internalCapabilityService);
}
async function requestJson(serviceId: string, url: string, body: unknown, timeoutMs = 8000, method = "POST") {
  const correlationId = (body as any).correlation_id ?? (body as any).lee_request_id ?? randomUUID(); const encoded = JSON.stringify(body); const envKey = serviceId === "cil" ? "CIL_API_KEY" : "CERBASEAL_API_KEY"; const credential = process.env[envKey];
  const hmacSecret = serviceId === "cerbaseal" ? process.env.CERBASEAL_HMAC_SECRET : undefined;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(url, { method, headers: signedHeaders(method === "GET" ? "" : encoded, credential, hmacSecret, correlationId), ...(method === "GET" ? {} : { body: encoded }), signal: controller.signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const contentType = response.headers.get("content-type") ?? ""; if (!contentType.includes("application/json")) throw new Error("Invalid non-JSON service response"); return await response.json(); }
  finally { clearTimeout(timeout); }
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
    approvalArtifact: null,
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
  await emitEvent({ eventType: "CILQueryRequested", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, semanticDomain: request.semantic_domain, projectId: request.project_id, riskClassification: request.risk_classification, costCeilingUsd: request.cost_ceiling_usd } });
  const baseUrl = process.env.CIL_BASE_URL; if (!baseUrl) { await setHealth("cil", "unavailable"); await emitEvent({ eventType: "CILUnavailable", aggregateType: "cil_service", aggregateId: request.correlation_id, payload: { errorSummary: "CIL_BASE_URL is not configured", fallbackUsed: true } }); throw new Error("CIL unavailable"); }
  const started = Date.now(); try { const result = await requestJson("cil", `${baseUrl.replace(/\/$/, "")}/v1/query`, request) as Record<string, any>; if (!result || typeof result.answer !== "string") throw new Error("Invalid CIL response"); const response = { ...result, correlation_id: request.correlation_id, latency_ms: result.latency_ms ?? Date.now() - started } as CILQueryResponse; await setHealth("cil", "healthy", { lastTier: response.resolution_tier }); await emitEvent({ eventType: "CILQueryResolved", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, resolutionTier: response.resolution_tier, confidence: response.confidence, costUsd: response.cost_usd, latencyMs: response.latency_ms } }); if (response.resolution_tier === "T1_TRIGRAM" || response.resolution_tier === "T2_SEMANTIC") await emitEvent({ eventType: "CILReuseHit", aggregateType: "cil_query", aggregateId: request.correlation_id, payload: { correlationId: request.correlation_id, cognitiveAssetId: response.cognitive_asset_id, tier: response.resolution_tier } }); return response; } catch (error) { await setHealth("cil", "degraded", { lastError: String(error) }); await emitEvent({ eventType: "CILUnavailable", aggregateType: "cil_service", aggregateId: request.correlation_id, payload: { errorSummary: String(error), fallbackUsed: true } }); throw error; }
} };
export interface GovernanceService { evaluate(request: GovernedRequest): Promise<GovernedResponse>; }
export const governanceService: GovernanceService = { async evaluate(request) {
  const baseUrl = process.env.CERBASEAL_BASE_URL; if (!baseUrl) { await setHealth("cerbaseal", "unavailable"); await emitEvent({ eventType: "GovernanceServiceUnavailable", aggregateType: "governance_service", aggregateId: request.lee_request_id, payload: { errorSummary: "CERBASEAL_BASE_URL is not configured", actionClass: request.action_class } }); return { verdict: "HOLD", reason_codes: ["GOVERNANCE_SERVICE_UNAVAILABLE"], checked_invariants: [], decision_id: `hold-${request.lee_request_id}`, decision_envelope: "", evidence_bundle_ref: "", audit_entry_ref: "", policy_version: String(request.policy_pack_version ?? "unknown"), timestamp: new Date().toISOString(), replay_checksum: "", human_confirmation_required: true }; }
  try { const raw = await requestJson("cerbaseal", cerbaSealEndpoint("evaluate"), { ...request, policy_pack_version: request.policy_pack_version ?? process.env.CERBASEAL_POLICY_PACK_VERSION }, 10000) as Record<string, any>; const response = raw.decisionEnvelope ? normalizeGateResult(request, raw) : raw as GovernedResponse; if (!["ALLOW", "HOLD", "REJECT"].includes(response.verdict) || !response.decision_id || !response.decision_envelope || !response.evidence_bundle_ref || !response.audit_entry_ref || !response.policy_version || !response.timestamp || !response.replay_checksum || typeof response.human_confirmation_required !== "boolean") throw new Error("Invalid CerbaSeal response schema"); await setHealth("cerbaseal", "healthy", { lastVerdict: response.verdict, policyVersion: response.policy_version }); return response; } catch (error) { await setHealth("cerbaseal", "unavailable", { lastError: String(error) }); await emitEvent({ eventType: "GovernanceServiceUnavailable", aggregateType: "governance_service", aggregateId: request.lee_request_id, payload: { errorSummary: String(error), actionClass: request.action_class } }); return { verdict: "HOLD", reason_codes: ["GOVERNANCE_SERVICE_UNAVAILABLE"], checked_invariants: [], decision_id: `hold-${request.lee_request_id}`, decision_envelope: "", evidence_bundle_ref: "", audit_entry_ref: "", policy_version: String(request.policy_pack_version ?? "unknown"), timestamp: new Date().toISOString(), replay_checksum: "", human_confirmation_required: true }; }
} };
async function probeCerbaSeal() {
  try {
    const response = await requestJson("cerbaseal", cerbaSealEndpoint("health"), {}, 5000, "GET") as Record<string, any>;
    if (!response || !["ok", "healthy"].includes(String(response.status).toLowerCase())) throw new Error("Invalid CerbaSeal health response");
    const policy = await requestJson("cerbaseal", cerbaSealEndpoint("policy"), {}, 5000, "GET") as Record<string, any>;
    if (typeof policy.policy_pack_version !== "string") throw new Error("Invalid CerbaSeal policy response");
    await setHealth("cerbaseal", "healthy", { policyVersion: policy.policy_pack_version, health: response });
  } catch (error) {
    await setHealth("cerbaseal", "unavailable", { lastError: String(error) });
  }
}
export async function internalServiceHealth() { await registerInternalServices(); if (process.env.CERBASEAL_BASE_URL) await probeCerbaSeal(); return db.select().from(internalCapabilityService); }