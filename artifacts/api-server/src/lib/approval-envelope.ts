import { createHash } from "node:crypto";

export type ApprovalLifecycle = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
export type CerbaSealState = "NOT_EVALUATED" | "HOLD" | "ALLOWED" | "REJECTED" | "UNAVAILABLE";

export type ApprovalEnvelope = {
  id: string;
  lifecycle: ApprovalLifecycle;
  requestedAction: string;
  actionClass: string;
  target: string;
  affectedSystem: string;
  reason: string;
  risk: string;
  proposedChange: string;
  evidence: Array<{ id: string; label: string }>;
  cerbaSeal: {
    state: CerbaSealState;
    verdict: string | null;
    decisionId: string | null;
    reasonCodes: string[];
    authorizationExpiresAt: string | null;
  };
  expiresAt: string | null;
  ownerConfirmationRequired: true;
  humanConfirmationRequired: true;
  postApprovalEffect: string;
  source: {
    subsystem: string;
    requestId: string;
    auditTargetId: string;
  };
  outcome: {
    verdict: string | null;
    resolvedAt: string | null;
    reasonCodes: string[];
  };
  requestedAt: string;
};

type GovernanceRow = {
  id: string;
  actionClass: string;
  targetSystem: string;
  status: string;
  decisionId: string | null;
  reasonCodes: string[];
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
  riskLevel: string;
  reason: string | null;
  evidenceRefs: string[];
  affectedObject: string | null;
  actor: string;
  expiresAt: Date | null;
  verdict: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function sourceFor(actionClass: string, payload: Record<string, unknown>) {
  if (payload.repairRunId || actionClass === "project_apply") return "Project repair";
  if (actionClass.startsWith("send_email") || actionClass === "email_draft") return "Email";
  if (actionClass === "model_call") return "Reasoning";
  if (actionClass === "deployment" || actionClass.includes("deploy")) return "Deployment";
  if (actionClass.includes("delete")) return "Deletion";
  if (actionClass === "connector_write" || actionClass.includes("share") || actionClass.includes("github")) return "Provider mutation";
  return "Governed action";
}

function proposedChange(actionClass: string, target: string, payload: Record<string, unknown>) {
  const explicit = payload.proposedChange ?? payload.proposed_change;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  if (actionClass === "project_apply") return `Apply the approved repair plan to ${target}.`;
  if (actionClass.startsWith("send_email") || actionClass === "email_draft") return `Send the prepared email through ${target}.`;
  if (actionClass === "connector_write") return `Write the approved change to ${target}.`;
  if (actionClass.includes("deploy")) return `Publish the approved change through ${target}.`;
  if (actionClass.includes("delete")) return `Delete the approved source or record from ${target}.`;
  return `Execute ${label(actionClass)} for ${target}.`;
}

function postApprovalEffect(actionClass: string, target: string) {
  if (actionClass === "project_apply") return `The approved repair steps may change ${target}; final verification remains required.`;
  if (actionClass.startsWith("send_email") || actionClass === "email_draft") return `The recipient will receive the prepared message through ${target}.`;
  if (actionClass.includes("deploy")) return `The approved build will become available through ${target}.`;
  if (actionClass.includes("delete")) return `The selected data will no longer be available through ${target}.`;
  return `The governed ${label(actionClass).toLowerCase()} will be released to ${target}.`;
}

function gatePayload(row: GovernanceRow) {
  const payload = row.responsePayload ?? {};
  const nested = payload.cerbaSeal;
  return nested && typeof nested === "object" ? nested as Record<string, unknown> : payload;
}

export function getApprovalLifecycle(row: Pick<GovernanceRow, "status" | "expiresAt" | "verdict">, now = new Date()): ApprovalLifecycle {
  if (row.status === "HOLD" && row.expiresAt && row.expiresAt <= now) return "EXPIRED";
  if (row.verdict === "ALLOW" || row.status === "ALLOW") return "APPROVED";
  if (row.verdict === "REJECT" || row.status === "REJECT") return "REJECTED";
  return "PENDING";
}

export function getCerbaSealState(row: Pick<GovernanceRow, "reasonCodes" | "responsePayload" | "decisionId" | "verdict">): ApprovalEnvelope["cerbaSeal"] {
  const gate = gatePayload(row as GovernanceRow);
  const gateVerdict = typeof gate.verdict === "string" ? gate.verdict : null;
  const verdict = gateVerdict ?? (row.responsePayload ? row.verdict : null);
  const reasonCodes = Array.from(new Set([...(row.reasonCodes ?? []), ...(Array.isArray(gate.reason_codes) ? gate.reason_codes.filter((item): item is string => typeof item === "string") : [])]));
  const unavailable = reasonCodes.some((code) => /UNAVAILABLE|MALFORMED|REPLAYED|AUTHENTICATION/i.test(code));
  const hasReleaseProof = verdict !== "ALLOW" || Boolean(gate.decision_id || row.decisionId);
  const state: CerbaSealState = unavailable
    ? "UNAVAILABLE"
    : verdict === "ALLOW" && hasReleaseProof
      ? "ALLOWED"
      : verdict === "REJECT"
        ? "REJECTED"
        : verdict === "HOLD"
          ? "HOLD"
          : "NOT_EVALUATED";
  return {
    state,
    verdict: verdict ?? null,
    decisionId: typeof gate.decision_id === "string" ? gate.decision_id : row.decisionId ?? null,
    reasonCodes,
    authorizationExpiresAt: typeof gate.authorization_expiry === "string" ? gate.authorization_expiry : null,
  };
}

export function toApprovalEnvelope(row: GovernanceRow, now = new Date()): ApprovalEnvelope {
  const payload = row.requestPayload ?? {};
  const target = text(row.affectedObject, text(row.targetSystem, "Lee"));
  const affectedSystem = text(row.targetSystem, text(payload.targetSystem, "Lee"));
  const reason = text(row.reason, "Human review is required before this action can proceed.");
  const lifecycle = getApprovalLifecycle(row, now);
  return {
    id: row.id,
    lifecycle,
    requestedAction: label(row.actionClass),
    actionClass: row.actionClass,
    target,
    affectedSystem,
    reason,
    risk: row.riskLevel,
    proposedChange: proposedChange(row.actionClass, target, payload),
    evidence: (row.evidenceRefs ?? []).map((id) => ({ id, label: `Evidence ${id}` })),
    cerbaSeal: getCerbaSealState(row),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    ownerConfirmationRequired: true,
    humanConfirmationRequired: true,
    postApprovalEffect: postApprovalEffect(row.actionClass, target),
    source: {
      subsystem: sourceFor(row.actionClass, payload),
      requestId: row.id,
      auditTargetId: row.id,
    },
    outcome: {
      verdict: row.verdict,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      reasonCodes: row.reasonCodes ?? [],
    },
    requestedAt: row.createdAt.toISOString(),
  };
}

export function approvalDedupeKey(input: { actionType: string; targetSystem: string; affectedObject?: string; payload: Record<string, unknown> }) {
  const payload = Object.fromEntries(Object.entries(input.payload).filter(([key]) => !["approvalDedupeKey", "correlationId", "correlation_id", "timestamp", "createdAt", "created_at"].includes(key)));
  return createHash("sha256").update(JSON.stringify({ actionType: input.actionType, targetSystem: input.targetSystem, affectedObject: input.affectedObject ?? null, payload }, Object.keys(payload).sort())).digest("hex");
}