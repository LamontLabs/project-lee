import { createHash, createHmac } from "node:crypto";
import { desc, eq, lt } from "drizzle-orm";
import {
  EvaluateGovernedRequestBody,
  EvaluateGovernedRequestResponse,
} from "@workspace/api-zod";
import { auditLog, db, eventLog, governanceRequest, governanceRule } from "@workspace/db";
import { Router, type IRouter } from "express";
import { registerAction } from "../lib/governance-engine";
import { callProvider } from "../lib/ai-providers";
import { checkConstitution } from "../lib/constitution";

const router: IRouter = Router();

type Verdict = "ALLOW" | "HOLD" | "REJECT";
type GovernedRequest = typeof EvaluateGovernedRequestBody["_output"];

function unavailableResponse(request: GovernedRequest, reason: string) {
  return {
    lee_request_id: request.lee_request_id,
    decision_id: `hold-${request.lee_request_id}`,
    verdict: "HOLD" as Verdict,
    reason_codes: [reason],
    checked_invariants: [],
    decision_envelope: "",
    evidence_bundle_ref: "",
    audit_entry_ref: "",
    replay_checksum: "",
    policy_version: request.policy_pack_version,
    timestamp: new Date().toISOString(),
    human_confirmation_required: true,
  };
}

async function evaluateWithCerbaSeal(request: GovernedRequest) {
  const baseUrl = process.env.CERBASEAL_BASE_URL;
  if (!baseUrl) {
    return {
      response: unavailableResponse(request, "GOVERNANCE_SERVICE_UNAVAILABLE"),
      serviceUnavailable: true,
    };
  }

  const body = JSON.stringify(request);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", process.env.CERBASEAL_HMAC_SECRET ?? "")
    .update(`${request.lee_request_id}.${timestamp}.${bodyHash}`)
    .digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/govern/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.CERBASEAL_API_KEY
          ? { authorization: `Bearer ${process.env.CERBASEAL_API_KEY}` }
          : {}),
        "X-LEE-Timestamp": timestamp,
        "X-LEE-Signature": signature,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        response: unavailableResponse(request, response.status === 429 ? "RATE_LIMITED" : "GOVERNANCE_SERVICE_UNAVAILABLE"),
        serviceUnavailable: true,
      };
    }
    const responseBody = await response.json() as Record<string, unknown>;
    const verdict = responseBody.verdict;
    if (verdict !== "ALLOW" && verdict !== "HOLD" && verdict !== "REJECT") {
      return {
        response: unavailableResponse(request, "INVALID_GOVERNANCE_RESPONSE"),
        serviceUnavailable: true,
      };
    }
    return { response: responseBody as ReturnType<typeof unavailableResponse>, serviceUnavailable: false };
  } catch {
    return {
      response: unavailableResponse(request, "GOVERNANCE_SERVICE_UNAVAILABLE"),
      serviceUnavailable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

router.post("/governance/evaluate", async (req, res): Promise<void> => {
  const parsed = EvaluateGovernedRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const request = parsed.data;
  const constitutional = await checkConstitution(request.action_class, request as unknown as Record<string, unknown>, "Governance Engine");
  if (!constitutional.permitted) {
    res.status(403).json({ error: "Constitution blocked this action.", constitutional });
    return;
  }
  const [existing] = await db
    .select({ id: governanceRequest.id })
    .from(governanceRequest)
    .where(eq(governanceRequest.leeRequestId, request.lee_request_id))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "lee_request_id has already been evaluated." });
    return;
  }

  const submittedAt = new Date();
  const [record] = await db.insert(governanceRequest).values({
    leeRequestId: request.lee_request_id,
    actionClass: request.action_class,
    targetSystem: request.target_system,
    status: "HOLD",
    reasonCodes: [],
    requestPayload: request,
    riskLevel: request.action_class === "model_call" ? "MEDIUM" : "HIGH",
    reason: request.expected_downstream_effect,
    evidenceRefs: request.evidence_refs,
    affectedObject: request.target_system,
    actor: request.actor_identity,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    createdAt: submittedAt,
  }).returning();
  await db.insert(eventLog).values({
    eventType: "GovernedRequestSubmitted",
    aggregateType: "governance_request",
    aggregateId: record.id,
    sourceRef: "governance-engine",
    occurredAt: submittedAt,
    payload: {
      leeRequestId: request.lee_request_id,
      actionClass: request.action_class,
      targetSystem: request.target_system,
    },
  });

  const { response, serviceUnavailable } = await evaluateWithCerbaSeal(request);
  const verdict = response.verdict;
  const reasonCodes = response.reason_codes ?? [];
  const resolvedAt = new Date();
  const [updated] = await db.update(governanceRequest).set({
    status: verdict,
    decisionId: response.decision_id,
    reasonCodes,
    responsePayload: response,
    resolvedAt,
  }).where(eq(governanceRequest.id, record.id)).returning();

  const resolutionType = serviceUnavailable
    ? "GovernanceServiceUnavailable"
    : "GovernedRequestResolved";
  const [resolutionEvent] = await db.insert(eventLog).values({
    eventType: resolutionType,
    aggregateType: "governance_request",
    aggregateId: record.id,
    sourceRef: "cerbaseal",
    occurredAt: resolvedAt,
    payload: {
      leeRequestId: request.lee_request_id,
      verdict,
      decisionId: response.decision_id,
      reasonCodes,
    },
  }).returning();
  await db.insert(eventLog).values({
    eventType: verdict === "ALLOW"
      ? "ExecutionReleased"
      : verdict === "REJECT"
        ? "ExecutionRejected"
        : "ExecutionHeld",
    aggregateType: "governance_request",
    aggregateId: record.id,
    sourceRef: "governance-engine",
    occurredAt: resolvedAt,
    payload: {
      leeRequestId: request.lee_request_id,
      decisionId: response.decision_id,
      verdict,
      reasonCodes,
    },
  });
  await db.insert(auditLog).values({
    action: "governance_evaluate",
    actor: request.actor_identity,
    targetType: "governance_request",
    targetId: record.id,
    outcome: verdict,
    metadata: { actionId: record.id, reason: reasonCodes.join(", "), evidenceShown: request.evidence_refs, wasEdited: false },
  });

  res.json(EvaluateGovernedRequestResponse.parse({
    ...response,
    governance_event_id: resolutionEvent.id,
  }));
});

router.get("/governance/requests", async (req, res): Promise<void> => {
  const rows = await db.select().from(governanceRequest).orderBy(desc(governanceRequest.createdAt));
  const status = req.query.status ? String(req.query.status).toUpperCase() : null;
  const risk = req.query.riskLevel ? String(req.query.riskLevel).toUpperCase() : null;
  const action = req.query.actionType ? String(req.query.actionType) : null;
  res.json(rows.filter((row) => (!status || row.status === status) && (!risk || row.riskLevel === risk) && (!action || row.actionClass === action)));
});

router.post("/governance/actions", async (req, res): Promise<void> => {
  const actionType = String(req.body?.actionType ?? "").trim();
  const payload = req.body?.payload && typeof req.body.payload === "object" ? req.body.payload : {};
  if (!actionType || !req.body?.reason) { res.status(400).json({ error: "actionType, payload, and reason are required." }); return; }
  const constitutional = await checkConstitution(actionType, payload, "Governance Engine");
  if (!constitutional.permitted) { res.status(403).json({ error: "Constitution blocked this action.", constitutional }); return; }
  const result = await registerAction({ actionType, payload, reason: String(req.body.reason), evidenceRefs: Array.isArray(req.body.evidenceRefs) ? req.body.evidenceRefs : [], affectedObject: req.body.affectedObject, actor: req.body.actor });
  res.status(result.verdict === "HOLD" ? 202 : 200).json(result);
});

router.patch("/governance/requests/:id/verdict", async (req, res): Promise<void> => {
  const verdict = String(req.body?.verdict ?? "").toUpperCase();
  if (!["ALLOW", "HOLD", "REJECT"].includes(verdict)) { res.status(400).json({ error: "verdict must be ALLOW, HOLD, or REJECT." }); return; }
  const [current] = await db.select().from(governanceRequest).where(eq(governanceRequest.id, req.params.id)).limit(1);
  if (!current) { res.status(404).json({ error: "Governance item not found." }); return; }
  if (verdict === "ALLOW" && ["HIGH", "CRITICAL"].includes(current.riskLevel) && current.evidenceRefs.length === 0) {
    res.status(409).json({ error: "Evidence must be shown before approving a HIGH or CRITICAL action." }); return;
  }
  const now = new Date();
  const [updated] = await db.update(governanceRequest).set({ status: verdict, verdict, resolvedAt: verdict === "HOLD" ? null : now, wasEdited: Boolean(req.body?.wasEdited), responsePayload: { ...(current.responsePayload ?? {}), decisionReason: req.body?.reason ?? null } }).where(eq(governanceRequest.id, current.id)).returning();
  await db.insert(auditLog).values({ action: `governance_${verdict.toLowerCase()}`, actor: String(req.body?.actor ?? "founder"), targetType: "governance_request", targetId: current.id, outcome: verdict, metadata: { actionId: current.id, reason: req.body?.reason ?? null, evidenceShown: current.evidenceRefs, wasEdited: Boolean(req.body?.wasEdited) } });
  await db.insert(eventLog).values({ eventType: `Governance${verdict[0]}${verdict.slice(1).toLowerCase()}`, aggregateType: "governance_request", aggregateId: current.id, actor: String(req.body?.actor ?? "founder"), sourceRef: "governance-engine", occurredAt: now, payload: { verdict, reason: req.body?.reason ?? null } });
  res.json(updated);
});

router.get("/governance/audit", async (_req, res): Promise<void> => {
  res.json(await db.select().from(auditLog).where(eq(auditLog.targetType, "governance_request")).orderBy(desc(auditLog.createdAt)).limit(500));
});

router.get("/governance/rules", async (_req, res): Promise<void> => {
  res.json(await db.select().from(governanceRule).orderBy(desc(governanceRule.createdAt)));
});

router.post("/governance/rules", async (req, res): Promise<void> => {
  const ruleType = String(req.body?.ruleType ?? "");
  if (!["always_allow", "always_hold", "always_reject"].includes(ruleType) || !req.body?.actionPattern) { res.status(400).json({ error: "ruleType and actionPattern are required." }); return; }
  const [rule] = await db.insert(governanceRule).values({ ruleType, actionPattern: String(req.body.actionPattern), reason: req.body.reason ? String(req.body.reason) : null, createdBy: String(req.body.createdBy ?? "founder") }).returning();
  res.status(201).json(rule);
});

router.patch("/governance/rules/:id", async (req, res): Promise<void> => {
  const [rule] = await db.update(governanceRule).set({ active: Boolean(req.body?.active), updatedAt: new Date(), version: Number(req.body?.version ?? 1) + 1 }).where(eq(governanceRule.id, req.params.id)).returning();
  if (!rule) { res.status(404).json({ error: "Governance rule not found." }); return; }
  res.json(rule);
});

router.post("/governance/requests/:id/ask-why", async (req, res): Promise<void> => {
  const [item] = await db.select().from(governanceRequest).where(eq(governanceRequest.id, req.params.id)).limit(1);
  if (!item) { res.status(404).json({ error: "Governance item not found." }); return; }
  const explanation = await callProvider("gpt-5-nano", [{ role: "system", content: "Explain Lee's governance reasoning clearly, distinguish evidence from inference, and never approve the action." }, { role: "user", content: JSON.stringify({ action: item.actionClass, risk: item.riskLevel, reason: item.reason, evidence: item.evidenceRefs, payload: item.requestPayload }) }]);
  res.json({ explanation: explanation.text, model: explanation.model, governanceRequestId: item.id });
});

router.post("/governance/expire", async (_req, res): Promise<void> => {
  const now = new Date();
  const expired = await db.select().from(governanceRequest).where(eq(governanceRequest.status, "HOLD"));
  const due = expired.filter((item) => item.expiresAt && item.expiresAt < now);
  for (const item of due) {
    await db.update(governanceRequest).set({ status: "REJECT", verdict: "REJECT", resolvedAt: now, reasonCodes: [...item.reasonCodes, "EXPIRED"] }).where(eq(governanceRequest.id, item.id));
    await db.insert(auditLog).values({ action: "governance_expired", actor: "lee", targetType: "governance_request", targetId: item.id, outcome: "REJECT", metadata: { reason: "Review window expired." } });
  }
  res.json({ expired: due.length });
});

export default router;