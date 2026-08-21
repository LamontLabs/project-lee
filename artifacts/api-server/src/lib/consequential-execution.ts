import { createHash, randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { auditLog, db, eventLog, governanceRequest } from "@workspace/db";
import { checkConstitution } from "./constitution";
import { runRequestPipeline } from "./request-pipeline";
import { classifyAction, registerAction, requiresEvidence } from "./governance-engine";
import { governanceService, type GovernedRequest, type GovernedResponse } from "../services/internal-services";

export type ConsequentialActionInput<T> = {
  actionType: string;
  targetSystem: string;
  payload: Record<string, unknown>;
  reason: string;
  evidenceRefs?: string[];
  actor?: string;
  ownerConfirmed: boolean;
  humanConfirmed: boolean;
  intent?: Record<string, unknown>;
  correlationId?: string;
  execute: () => Promise<T> | T;
};

export type ConsequentialActionResult<T> =
  | { executed: true; result: T; governanceRequestId: string; decisionId: string; correlationId: string }
  | { executed: false; reason: string; governanceRequestId?: string; decisionId?: string; correlationId: string };

function requestChecksum(request: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(request, Object.keys(request).sort())).digest("hex");
}

async function recordOutcome(id: string, verdict: "HOLD" | "REJECT", reason: string, response?: GovernedResponse) {
  const now = new Date();
  await db.update(governanceRequest).set({
    status: verdict,
    verdict,
    decisionId: response?.decision_id ?? null,
    reasonCodes: [...(response?.reason_codes ?? []), reason],
    responsePayload: response ? response as unknown as Record<string, unknown> : undefined,
    resolvedAt: verdict === "REJECT" ? now : null,
  }).where(eq(governanceRequest.id, id));
  await db.insert(auditLog).values({
    action: `consequential_write_${verdict.toLowerCase()}`,
    actor: "governance-boundary",
    targetType: "governance_request",
    targetId: id,
    outcome: verdict,
    metadata: { reason, decisionId: response?.decision_id ?? null, reasonCodes: response?.reason_codes ?? [] },
  });
  await db.insert(eventLog).values({
    eventType: verdict === "REJECT" ? "GovernedActionRejected" : "GovernedActionHeld",
    aggregateType: "governance_request",
    aggregateId: id,
    sourceRef: "consequential-execution-boundary",
    occurredAt: now,
    payload: { verdict, reason, decisionId: response?.decision_id ?? null },
  });
}

export function validUnexpiredAllow(response: GovernedResponse, now = new Date()) {
  if (response.reason_codes?.includes("GOVERNANCE_SERVICE_UNAVAILABLE")) return { ok: false, reason: "CERBASEAL_UNAVAILABLE" };
  if (response.verdict !== "ALLOW") return { ok: false, reason: `CERBASEAL_${response.verdict}` };
  if (response.human_confirmation_required) return { ok: false, reason: "HUMAN_CONFIRMATION_REQUIRED" };
  if (!response.decision_id || !response.decision_envelope || !response.replay_checksum) return { ok: false, reason: "MALFORMED_ALLOW_RESPONSE" };
  if (!response.authorization_expiry) return { ok: false, reason: "MISSING_AUTHORIZATION_EXPIRY" };
  const expiry = new Date(response.authorization_expiry);
  if (Number.isNaN(expiry.getTime()) || expiry <= now) return { ok: false, reason: "AUTHORIZATION_EXPIRED" };
  if (!response.timestamp || Number.isNaN(new Date(response.timestamp).getTime())) return { ok: false, reason: "MALFORMED_AUTHORIZATION_TIMESTAMP" };
  return { ok: true as const, reason: "" };
}

export async function hasReplayedAuthorization(decisionId: string, currentRequestId?: string) {
  const predicate = currentRequestId
    ? and(eq(governanceRequest.decisionId, decisionId), ne(governanceRequest.id, currentRequestId))
    : eq(governanceRequest.decisionId, decisionId);
  const [replayedDecision] = await db.select({ id: governanceRequest.id }).from(governanceRequest).where(predicate).limit(1);
  return Boolean(replayedDecision);
}

export async function executeConsequentialAction<T>(input: ConsequentialActionInput<T>): Promise<ConsequentialActionResult<T>> {
  const correlationId = input.correlationId ?? randomUUID();
  const classification = classifyAction(input.actionType, input.payload);
  const evidenceRefs = input.evidenceRefs ?? [];
  const local = await registerAction({
    actionType: input.actionType,
    payload: { ...input.payload, targetSystem: input.targetSystem, correlationId },
    reason: input.reason,
    evidenceRefs,
    actor: input.actor,
  });

  const block = async (reason: string, verdict: "HOLD" | "REJECT" = "HOLD", response?: GovernedResponse): Promise<ConsequentialActionResult<T>> => {
    await recordOutcome(local.record.id, verdict, reason, response);
    return { executed: false, reason, governanceRequestId: local.record.id, decisionId: response?.decision_id, correlationId };
  };

  if (!classification.known) return block("UNKNOWN_ACTION_TYPE");
  if (requiresEvidence(classification.riskLevel, evidenceRefs)) return block("EVIDENCE_REQUIRED");
  if (!input.ownerConfirmed || !input.humanConfirmed) return block("HUMAN_CONFIRMATION_REQUIRED");

  const pipeline = await runRequestPipeline({
    text: input.reason,
    origin: "internal",
    actionType: input.actionType,
    engineName: "Consequential Execution Boundary",
    payload: { ...input.payload, targetSystem: input.targetSystem },
    correlationId,
    budgetTokens: 800,
  });
  if (!pipeline.ok) return block(`REQUEST_PIPELINE_BLOCKED:${pipeline.failedStage}`);
  const constitutional = await checkConstitution(input.actionType, input.payload, "Consequential Execution Boundary");
  if (!constitutional.permitted) return block("CONSTITUTION_BLOCKED", "REJECT");
  const leeRequestId = local.record.leeRequestId;
  const governedRequest: GovernedRequest = {
    lee_request_id: leeRequestId,
    action_class: input.actionType,
    target_system: input.targetSystem,
    correlation_id: correlationId,
    actor_identity: input.actor ?? "lee",
    owner_confirmation: input.ownerConfirmed,
    human_confirmation: input.humanConfirmed,
    expected_downstream_effect: input.reason,
    evidence_refs: evidenceRefs,
    intent: input.intent ?? pipeline.intent,
    payload: input.payload,
    request_checksum: requestChecksum({ leeRequestId, actionType: input.actionType, targetSystem: input.targetSystem, payload: input.payload }),
  };
  let response: GovernedResponse;
  try {
    response = await governanceService.evaluate(governedRequest);
  } catch {
    return block("CERBASEAL_UNAVAILABLE");
  }
  const authorization = validUnexpiredAllow(response);
  if (!authorization.ok) return block(authorization.reason, response.verdict === "REJECT" ? "REJECT" : "HOLD", response);

  if (await hasReplayedAuthorization(response.decision_id, local.record.id)) return block("REPLAYED_AUTHORIZATION", "REJECT", response);
  await db.update(governanceRequest).set({
    status: "ALLOW",
    verdict: "ALLOW",
    decisionId: response.decision_id,
    responsePayload: response as unknown as Record<string, unknown>,
    resolvedAt: new Date(),
  }).where(eq(governanceRequest.id, local.record.id));
  const immediatelyBeforeExecution = validUnexpiredAllow(response);
  if (!immediatelyBeforeExecution.ok) return block(immediatelyBeforeExecution.reason, "HOLD", response);
  try {
    const result = await input.execute();
    await db.insert(eventLog).values({ eventType: "ExecutionReleased", aggregateType: "governance_request", aggregateId: local.record.id, correlationId, sourceRef: "consequential-execution-boundary", occurredAt: new Date(), payload: { actionType: input.actionType, targetSystem: input.targetSystem, decisionId: response.decision_id } });
    return { executed: true, result, governanceRequestId: local.record.id, decisionId: response.decision_id, correlationId };
  } catch (error) {
    await recordOutcome(local.record.id, "REJECT", "EXECUTION_FAILED", response);
    throw error;
  }
}