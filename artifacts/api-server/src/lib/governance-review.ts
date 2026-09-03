import { and, eq } from "drizzle-orm";
import { auditLog, db, eventLog, governanceRequest } from "@workspace/db";
import { hasReplayedAuthorization, validUnexpiredAllow } from "./consequential-execution";
import { governanceService } from "../services/internal-services";
import { toApprovalEnvelope, type ApprovalEnvelope } from "./approval-envelope";

export type ReviewVerdict = "ALLOW" | "HOLD" | "REJECT";

export type GovernanceReviewResult =
  | { ok: true; envelope: ApprovalEnvelope }
  | { ok: false; status: number; error: string; reason?: string; envelope?: ApprovalEnvelope };

export async function reviewGovernanceRequest(input: { id: string; verdict: ReviewVerdict; actor: string; source: string }): Promise<GovernanceReviewResult> {
  const [current] = await db.select().from(governanceRequest).where(eq(governanceRequest.id, input.id)).limit(1);
  if (!current) return { ok: false, status: 404, error: "Approval item not found." };
  if (current.status !== "HOLD") {
    return { ok: false, status: 409, error: "This approval has already been resolved.", envelope: toApprovalEnvelope(current) };
  }
  if (current.expiresAt && current.expiresAt <= new Date()) {
    const [expired] = await db.update(governanceRequest).set({ status: "REJECT", verdict: "REJECT", reasonCodes: Array.from(new Set([...current.reasonCodes, "EXPIRED"])), resolvedAt: new Date() }).where(and(eq(governanceRequest.id, input.id), eq(governanceRequest.status, "HOLD"))).returning();
    if (expired) {
      await db.insert(auditLog).values({ action: "governance_expired", actor: input.actor, targetType: "governance_request", targetId: input.id, outcome: "REJECT", metadata: { source: input.source, reason: "Review window expired." } });
      await db.insert(eventLog).values({ eventType: "GovernanceExpired", aggregateType: "governance_request", aggregateId: input.id, actor: input.actor, sourceRef: "governance-review", occurredAt: new Date(), payload: { reason: "Review window expired." } });
    }
    return { ok: false, status: 409, error: "This approval has expired.", reason: "EXPIRED", envelope: expired ? toApprovalEnvelope(expired) : undefined };
  }
  if (input.verdict === "ALLOW" && ["HIGH", "CRITICAL"].includes(current.riskLevel) && current.evidenceRefs.length === 0) {
    return { ok: false, status: 409, error: "Evidence must be shown before approving a HIGH or CRITICAL action.", reason: "EVIDENCE_REQUIRED", envelope: toApprovalEnvelope(current) };
  }

  const response = await governanceService.evaluate({
    lee_request_id: current.leeRequestId,
    action_class: current.actionClass,
    target_system: current.targetSystem,
    actor_identity: input.actor,
    owner_confirmation: input.verdict === "ALLOW",
    human_confirmation: input.verdict === "ALLOW",
    expected_downstream_effect: current.reason ?? "Governed action requires owner review.",
    evidence_refs: current.evidenceRefs,
    payload: current.requestPayload ?? {},
    approval_artifact: {
      source: input.source,
      decision: input.verdict,
      confirmed_at: new Date().toISOString(),
      governance_request_id: current.id,
    },
  });

  if (input.verdict === "ALLOW") {
    const authorization = validUnexpiredAllow(response);
    if (!authorization.ok) {
      const reasonCodes = Array.from(new Set([...current.reasonCodes, authorization.reason, ...(response.reason_codes ?? [])]));
      const [held] = await db.update(governanceRequest).set({ reasonCodes, decisionId: response.decision_id, responsePayload: response as unknown as Record<string, unknown> }).where(and(eq(governanceRequest.id, input.id), eq(governanceRequest.status, "HOLD"))).returning();
      return { ok: false, status: 409, error: "CerbaSeal did not release this approval.", reason: authorization.reason, envelope: held ? toApprovalEnvelope(held) : toApprovalEnvelope(current) };
    }
    if (await hasReplayedAuthorization(response.decision_id, current.id)) {
      const reasonCodes = Array.from(new Set([...current.reasonCodes, "REPLAYED_AUTHORIZATION"]));
      const [held] = await db.update(governanceRequest).set({ reasonCodes, decisionId: response.decision_id, responsePayload: response as unknown as Record<string, unknown> }).where(and(eq(governanceRequest.id, input.id), eq(governanceRequest.status, "HOLD"))).returning();
      return { ok: false, status: 409, error: "This CerbaSeal authorization has already been used.", reason: "REPLAYED_AUTHORIZATION", envelope: held ? toApprovalEnvelope(held) : toApprovalEnvelope(current) };
    }
  }

  const resolvedVerdict: ReviewVerdict = input.verdict === "ALLOW"
    ? response.verdict === "ALLOW" ? "ALLOW" : response.verdict === "REJECT" ? "REJECT" : "HOLD"
    : input.verdict;
  const reasonCodes = Array.from(new Set([...(current.reasonCodes ?? []), ...(response.reason_codes ?? []), ...(resolvedVerdict === "HOLD" ? ["CERBASEAL_HOLD"] : [])]));
  const [updated] = await db.update(governanceRequest).set({
    status: resolvedVerdict,
    verdict: resolvedVerdict,
    decisionId: response.decision_id,
    reasonCodes,
    responsePayload: response as unknown as Record<string, unknown>,
    resolvedAt: resolvedVerdict === "HOLD" ? null : new Date(),
  }).where(and(eq(governanceRequest.id, input.id), eq(governanceRequest.status, "HOLD"))).returning();
  if (!updated) return { ok: false, status: 409, error: "This approval was resolved by another reviewer." };

  await db.insert(auditLog).values({
    action: `governance_${input.source}_${input.verdict.toLowerCase()}`,
    actor: input.actor,
    targetType: "governance_request",
    targetId: input.id,
    outcome: resolvedVerdict,
    metadata: { source: input.source, evidenceShown: updated.evidenceRefs, cerbaSealDecisionId: response.decision_id, reasonCodes },
  });
  await db.insert(eventLog).values({
    eventType: resolvedVerdict === "ALLOW" ? "ExecutionReleased" : resolvedVerdict === "REJECT" ? "GovernanceRejected" : "ExecutionHeld",
    aggregateType: "governance_request",
    aggregateId: input.id,
    actor: input.actor,
    sourceRef: "governance-review",
    occurredAt: new Date(),
    payload: { source: input.source, requestedVerdict: input.verdict, verdict: resolvedVerdict, decisionId: response.decision_id, reasonCodes },
  });
  return { ok: true, envelope: toApprovalEnvelope(updated) };
}