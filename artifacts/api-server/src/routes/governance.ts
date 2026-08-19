import { createHash, createHmac, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  EvaluateGovernedRequestBody,
  EvaluateGovernedRequestResponse,
} from "@workspace/api-zod";
import { db, eventLog, governanceRequest } from "@workspace/db";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

type Verdict = "ALLOW" | "HOLD" | "REJECT";

function unavailableResponse(request: EvaluateGovernedRequestBody, reason: string) {
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

async function evaluateWithCerbaSeal(request: EvaluateGovernedRequestBody) {
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

  res.json(EvaluateGovernedRequestResponse.parse({
    ...response,
    governance_event_id: resolutionEvent.id,
  }));
});

export default router;