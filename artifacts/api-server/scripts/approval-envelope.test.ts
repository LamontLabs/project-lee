import assert from "node:assert/strict";
import test from "node:test";
import { approvalDedupeKey, getApprovalLifecycle, getCerbaSealState, toApprovalEnvelope } from "../src/lib/approval-envelope";

const base = {
  id: "approval-1",
  actionClass: "project_apply",
  targetSystem: "lee-projects",
  status: "HOLD",
  decisionId: null,
  reasonCodes: ["EVIDENCE_CAPTURED"],
  requestPayload: { projectId: "project-1", repairRunId: "repair-1", planHash: "plan-1" },
  responsePayload: null,
  riskLevel: "HIGH",
  reason: "Apply the verified repair plan.",
  evidenceRefs: ["evidence-1"],
  affectedObject: "project:project-1",
  actor: "lee",
  expiresAt: new Date("2026-09-04T00:00:00.000Z"),
  verdict: null,
  createdAt: new Date("2026-09-02T00:00:00.000Z"),
  resolvedAt: null,
};

test("approval envelope gives every source the same review fields", () => {
  const envelope = toApprovalEnvelope(base);
  assert.equal(envelope.lifecycle, "PENDING");
  assert.equal(envelope.source.subsystem, "Project repair");
  assert.equal(envelope.target, "project:project-1");
  assert.equal(envelope.affectedSystem, "lee-projects");
  assert.equal(envelope.risk, "HIGH");
  assert.equal(envelope.evidence[0]?.id, "evidence-1");
  assert.equal(envelope.ownerConfirmationRequired, true);
  assert.match(envelope.postApprovalEffect, /verification/i);
});

test("expired holds become terminal and stale approvals cannot appear pending", () => {
  assert.equal(getApprovalLifecycle(base, new Date("2026-09-05T00:00:00.000Z")), "EXPIRED");
  assert.equal(getApprovalLifecycle({ ...base, status: "REJECT", verdict: "REJECT" }), "REJECTED");
  assert.equal(getApprovalLifecycle({ ...base, status: "ALLOW", verdict: "ALLOW" }), "APPROVED");
});

test("CerbaSeal state preserves unavailable, hold, and allowed explanations", () => {
  assert.equal(getCerbaSealState({ ...base, reasonCodes: ["GOVERNANCE_SERVICE_UNAVAILABLE"] }).state, "UNAVAILABLE");
  assert.equal(getCerbaSealState({ ...base, responsePayload: { verdict: "HOLD", reason_codes: ["OWNER_CONFIRMATION_REQUIRED"] } }).state, "HOLD");
  assert.equal(getCerbaSealState({ ...base, responsePayload: { verdict: "ALLOW", decision_id: "decision-1", authorization_expiry: "2026-09-04T00:00:00.000Z" }, verdict: "ALLOW" }).state, "ALLOWED");
  assert.equal(getCerbaSealState({ ...base, responsePayload: null, verdict: "ALLOW", decisionId: null }).state, "NOT_EVALUATED");
});

test("approval deduplication ignores retry-only fields", () => {
  const first = approvalDedupeKey({ actionType: "project_apply", targetSystem: "lee-projects", affectedObject: "project:project-1", payload: { planHash: "plan-1", correlationId: "a" } });
  const retry = approvalDedupeKey({ actionType: "project_apply", targetSystem: "lee-projects", affectedObject: "project:project-1", payload: { planHash: "plan-1", correlationId: "b", approvalDedupeKey: "old" } });
  assert.equal(first, retry);
});