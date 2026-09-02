import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { androidPairing, auditLog, conversation, db, governanceRequest, notification, sourceVault, waitingLoop } from "@workspace/db";
import { sampleResources } from "../lib/resource";
import { getState } from "../lib/state";
import { routeModelRequest } from "../lib/model-router";
import { verifyAndroidPairing } from "./android-pairing";
import { pipelineFailureResponse, runRequestPipeline } from "../lib/request-pipeline";
import { hasReplayedAuthorization, validUnexpiredAllow } from "../lib/consequential-execution";
import { governanceService } from "../services/internal-services";

const router: IRouter = Router();
async function paired(req: any) {
  const supplied = req.headers["x-lee-device-token"] ?? String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (typeof supplied !== "string" || supplied.length < 8) return null;
  if (await verifyAndroidPairing(supplied)) return true;
  const hash = createHash("sha256").update(supplied).digest("hex");
  const [record] = await db.select().from(androidPairing).where(and(eq(androidPairing.tokenHash, hash), eq(androidPairing.active, true), gt(androidPairing.expiresAt, new Date()))).limit(1);
  if (!record) return null;
  return record;
}
async function rejectPairing(req: any, res: any) {
  if (!(await paired(req))) { res.status(401).json({ error: "Android device pairing is required." }); return true; }
  return false;
}

function issueToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}
router.post("/android/capture", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const content = String(req.body?.text ?? req.body?.transcript ?? "").trim();
  if (!content) { res.status(400).json({ error: "text or transcript is required." }); return; }
  const checksum = createHash("sha256").update(content).digest("hex");
  const [source] = await db.insert(sourceVault).values({ originalFilename: String(req.body?.filename ?? `android-capture-${Date.now()}.txt`), mimeType: String(req.body?.mimeType ?? "text/plain"), byteSize: Buffer.byteLength(content), checksum, storagePath: `android://${randomUUID()}`, rawContent: content, processingStatus: "pending", metadata: { device: "android", tag: req.body?.tag ?? null, capturedAt: new Date().toISOString() } }).onConflictDoNothing({ target: sourceVault.checksum }).returning();
  res.status(201).json({ sourceId: source?.id ?? null, duplicate: !source, status: source ? "captured" : "duplicate" });
});
router.post("/android/battery", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  res.json(await sampleResources({ batteryLevel: Number(req.body?.batteryLevel), charging: Boolean(req.body?.charging) }));
});
router.post("/android/push-token", async (req, res): Promise<void> => {
  const pairing = await paired(req);
  if (!pairing || pairing === true) { res.status(401).json({ error: "Android device pairing is required." }); return; }
  const pushToken = String(req.body?.pushToken ?? "").trim();
  const platform = String(req.body?.platform ?? "android").trim().toLowerCase();
  if (!pushToken || pushToken.length < 16 || platform !== "android") { res.status(400).json({ error: "An Android push token is required." }); return; }
  await db.update(androidPairing).set({ fcmToken: pushToken, pushPlatform: platform, pushUpdatedAt: new Date() }).where(eq(androidPairing.id, pairing.id));
  res.json({ registered: true });
});

router.post("/android/ask", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const message = String(req.body?.message ?? "").trim();
  if (!message) { res.status(400).json({ error: "message is required." }); return; }
  const pipeline = await runRequestPipeline({ text: message, origin: "android", actionType: "android_ask", engineName: "Android Companion", mode: "low_cost", budgetTokens: 1800 });
  if (!pipeline.ok) { res.status(422).json(pipelineFailureResponse(pipeline)); return; }
  const packet = pipeline.context;
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  res.status(200).set({
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  const send = (event: string, data: unknown) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  try {
     const result = await routeModelRequest({
       correlationId: pipeline.correlationId,
       pipeline,
       queryText: message,
       semanticDomain: "android-companion",
       intentType: pipeline.intent.intentType,
       riskClassification: "LOW",
       contextItems: packet.items,
       preferredTier: "auto",
       costCeilingUsd: 0,
     });
     if (!result.answer.trim()) throw new Error("Lee returned an empty response.");
     send("start", {
       model: result.model,
       tier: result.tier,
       contextItems: packet.items.length,
       evidence: packet.items.map((item) => ({ id: item.id, kind: item.kind, confidence: item.confidence })),
     });
     send("chunk", { text: result.answer });
    send("complete", {
       answer: result.answer,
       model: result.model,
       tier: result.tier,
       estimatedCostUsd: result.estimatedCostUsd,
      contextItems: packet.items.length,
      evidence: packet.items.map((item) => ({ id: item.id, kind: item.kind, confidence: item.confidence })),
    });
  } catch (error) {
    if (!controller.signal.aborted) send("error", { error: error instanceof Error ? error.message : "Lee could not answer right now." });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

router.get("/android/brief", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const rows = await db.select().from(notification).where(eq(notification.status, "unread")).orderBy(desc(notification.createdAt)).limit(10);
  const state = await getState();
  res.json({ title: "Today's Brief", state: state.currentState, stateReason: state.reason, unreadAlerts: rows.length, alerts: rows.map((row) => ({ id: row.id, title: row.title, body: row.body, severity: row.severity })) });
});

router.get("/android/waiting", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  res.json(await db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).orderBy(waitingLoop.nextCheckAt));
});

router.post("/android/waiting/:id/action", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const action = req.body?.action;
  const nextCheckAt = action === "snooze" ? new Date(Date.now() + Number(req.body?.hours ?? 24) * 3600000) : null;
  const [updated] = await db.update(waitingLoop).set({ status: action === "resolve" ? "resolved" : "open", nextCheckAt, updatedAt: new Date() }).where(eq(waitingLoop.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Waiting loop not found." }); return; }
  res.json(updated);
});

router.get("/android/alerts", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  res.json(await db.select().from(notification).where(and(eq(notification.status, "unread"), gt(notification.severity, "info"))).orderBy(desc(notification.createdAt)));
});

router.post("/android/alerts/:id/action", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const [updated] = await db.update(notification).set({ status: req.body?.action === "dismiss" ? "dismissed" : "read", readAt: new Date() }).where(eq(notification.id, req.params.id)).returning();
  if (!updated) { res.status(404).json({ error: "Alert not found." }); return; }
  res.json(updated);
});

router.post("/android/approve", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const id = String(req.body?.governanceRequestId ?? "");
  const decision = req.body?.decision === "approve" ? "approved" : req.body?.decision === "reject" ? "rejected" : req.body?.decision === "hold" ? "hold" : null;
  if (!id || !decision) { res.status(400).json({ error: "governanceRequestId and decision are required." }); return; }
  const [current] = await db.select().from(governanceRequest).where(eq(governanceRequest.id, id)).limit(1);
  if (!current) { res.status(404).json({ error: "Governance request not found." }); return; }
  if (current.status !== "HOLD") { res.status(409).json({ error: "This governance request has already been resolved." }); return; }
  if (current.expiresAt && current.expiresAt <= new Date()) { res.status(409).json({ error: "This governance request has expired." }); return; }
  if (decision === "approved" && ["HIGH", "CRITICAL"].includes(current.riskLevel) && current.evidenceRefs.length === 0) { res.status(409).json({ error: "Evidence is required before approving this action." }); return; }
  const cerbaSealResponse = await governanceService.evaluate({
    lee_request_id: current.leeRequestId,
    action_class: current.actionClass,
    target_system: current.targetSystem,
    actor_identity: "android-founder",
    owner_confirmation: decision === "approved",
    human_confirmation: decision === "approved",
    expected_downstream_effect: current.reason,
    evidence_refs: current.evidenceRefs,
    payload: current.requestPayload ?? {},
    approval_artifact: {
      source: "android-founder",
      decision,
      confirmed_at: new Date().toISOString(),
      governance_request_id: current.id,
    },
  });
  const authorization = decision === "approved" ? validUnexpiredAllow(cerbaSealResponse) : { ok: true as const, reason: "" };
  if (decision === "approved" && !authorization.ok) {
    res.status(409).json({ error: "CerbaSeal did not release this request.", reason: authorization.reason });
    return;
  }
  if (cerbaSealResponse.verdict === "ALLOW" && await hasReplayedAuthorization(cerbaSealResponse.decision_id, current.id)) {
    res.status(409).json({ error: "This CerbaSeal authorization has already been used.", reason: "REPLAYED_AUTHORIZATION" });
    return;
  }
  // A phone rejection/hold is input to CerbaSeal, never an instruction to
  // manufacture an ALLOW if a gate implementation responds permissively.
  const resolvedVerdict = decision === "approved"
    ? cerbaSealResponse.verdict
    : cerbaSealResponse.verdict === "REJECT" ? "REJECT" : "HOLD";
  const [updated] = await db.update(governanceRequest).set({
    status: resolvedVerdict,
    verdict: resolvedVerdict,
    decisionId: cerbaSealResponse.decision_id,
    reasonCodes: cerbaSealResponse.reason_codes,
    resolvedAt: resolvedVerdict === "HOLD" ? null : new Date(),
    responsePayload: { source: "android", decision, cerbaSeal: cerbaSealResponse },
  }).where(and(eq(governanceRequest.id, id), eq(governanceRequest.status, "HOLD"))).returning();
  if (!updated) { res.status(404).json({ error: "Governance request not found." }); return; }
  await db.insert(auditLog).values({ action: `governance_android_confirmation_${decision}`, actor: "android-founder", targetType: "governance_request", targetId: updated.id, outcome: resolvedVerdict, metadata: { actionId: updated.id, evidenceShown: updated.evidenceRefs, cerbaSealDecisionId: cerbaSealResponse.decision_id, wasEdited: false } });
  res.json({ id: updated.id, status: updated.status });
});

router.get("/android/approvals", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  res.json(await db.select().from(governanceRequest).where(eq(governanceRequest.status, "HOLD")).orderBy(desc(governanceRequest.createdAt)));
});

export default router;

async function revokeActiveTokens() {
  await db.update(androidPairing).set({ active: false, revokedAt: new Date() }).where(eq(androidPairing.active, true));
}
