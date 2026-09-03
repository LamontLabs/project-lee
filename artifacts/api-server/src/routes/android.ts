import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { androidPairing, conversation, db, governanceRequest, notification, sourceVault, waitingLoop } from "@workspace/db";
import { sampleResources } from "../lib/resource";
import { getState } from "../lib/state";
import { routeModelRequest } from "../lib/model-router";
import { verifyAndroidPairing } from "./android-pairing";
import { pipelineFailureResponse, runRequestPipeline } from "../lib/request-pipeline";
import { reviewGovernanceRequest } from "../lib/governance-review";
import { toApprovalEnvelope } from "../lib/approval-envelope";
import { listConnectionHealth } from "../lib/connection-center";
import { extractCommitmentCandidate, recordCommitmentCandidate, reconcileWaitingLoops } from "../lib/commitment-intelligence";

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
  if (source) {
    const candidate = extractCommitmentCandidate({
      eventType: "AndroidCapture",
      sourceRef: source.id,
      payload: { body: content, tag: req.body?.tag ?? null },
      actor: { type: "owner", label: "Owner" },
      recipient: { type: "unknown" },
      evidenceRefs: [source.id],
    });
    if (candidate) {
      await recordCommitmentCandidate(candidate);
      await reconcileWaitingLoops();
    }
  }
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
  const verdict = req.body?.decision === "approve" || req.body?.decision === "ALLOW" ? "ALLOW" : req.body?.decision === "reject" || req.body?.decision === "REJECT" ? "REJECT" : req.body?.decision === "hold" || req.body?.decision === "HOLD" ? "HOLD" : null;
  if (!id || !verdict) { res.status(400).json({ error: "governanceRequestId and decision are required." }); return; }
  const result = await reviewGovernanceRequest({ id, verdict, actor: "android-founder", source: "android" });
  if (!result.ok) { res.status(result.status).json({ error: result.error, reason: result.reason, approval: result.envelope }); return; }
  res.json(result.envelope);
});

router.get("/android/approvals", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const rows = await db.select().from(governanceRequest).where(eq(governanceRequest.status, "HOLD")).orderBy(desc(governanceRequest.createdAt));
  res.json(rows.map((row) => toApprovalEnvelope(row)));
});

router.get("/android/connections", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  res.json(await listConnectionHealth());
});

router.post("/android/approvals/:id/ask-why", async (req, res): Promise<void> => {
  if (await rejectPairing(req, res)) return;
  const [item] = await db.select().from(governanceRequest).where(eq(governanceRequest.id, req.params.id)).limit(1);
  if (!item) { res.status(404).json({ error: "Approval item not found." }); return; }
  const queryText = `Explain this approval without approving it: ${JSON.stringify({ action: item.actionClass, risk: item.riskLevel, reason: item.reason, evidence: item.evidenceRefs, target: item.targetSystem })}`;
  const pipeline = await runRequestPipeline({ text: queryText, origin: "android", actionType: "android_governance_explanation", engineName: "Android Governance Explanation", mode: "review", budgetTokens: 1200 });
  if (!pipeline.ok) { res.status(422).json(pipelineFailureResponse(pipeline)); return; }
  try {
    const explanation = await routeModelRequest({ correlationId: pipeline.correlationId, pipeline, queryText, semanticDomain: "governance-explanation", intentType: pipeline.intent.intentType, riskClassification: "LOW", contextItems: pipeline.context.items, preferredTier: "auto" });
    res.json({ explanation: explanation.answer, approvalId: item.id });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Lee could not explain this approval." });
  }
});

export default router;

async function revokeActiveTokens() {
  await db.update(androidPairing).set({ active: false, revokedAt: new Date() }).where(eq(androidPairing.active, true));
}
