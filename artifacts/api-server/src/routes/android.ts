import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { conversation, db, governanceRequest, notification, sourceVault, waitingLoop } from "@workspace/db";
import { buildContextPacket } from "../lib/context-engine";
import { callProvider, estimateCost } from "../lib/ai-providers";

const router: IRouter = Router();
function paired(req: any) {
  const expected = process.env.LEE_ANDROID_PAIRING_TOKEN;
  return Boolean(expected && req.headers["x-lee-device-token"] === expected);
}
function rejectPairing(req: any, res: any) {
  if (!paired(req)) { res.status(401).json({ error: "Android device pairing is required." }); return true; }
  return false;
}

router.post("/android/capture", async (req, res): Promise<void> => {
  if (rejectPairing(req, res)) return;
  const content = String(req.body?.text ?? req.body?.transcript ?? "").trim();
  if (!content) { res.status(400).json({ error: "text or transcript is required." }); return; }
  const checksum = createHash("sha256").update(content).digest("hex");
  const [source] = await db.insert(sourceVault).values({ originalFilename: String(req.body?.filename ?? `android-capture-${Date.now()}.txt`), mimeType: String(req.body?.mimeType ?? "text/plain"), byteSize: Buffer.byteLength(content), checksum, storagePath: `android://${randomUUID()}`, rawContent: content, processingStatus: "pending", metadata: { device: "android", tag: req.body?.tag ?? null, capturedAt: new Date().toISOString() } }).onConflictDoNothing({ target: sourceVault.checksum }).returning();
  res.status(201).json({ sourceId: source?.id ?? null, duplicate: !source, status: source ? "captured" : "duplicate" });
});

router.post("/android/ask", async (req, res): Promise<void> => {
  if (rejectPairing(req, res)) return;
  const message = String(req.body?.message ?? "").trim();
  if (!message) { res.status(400).json({ error: "message is required." }); return; }
  const packet = await buildContextPacket(message, "low_cost", 1800);
  const result = await callProvider("gpt-5-nano", [{ role: "system", content: "You are Lee on a paired Android companion. Be concise, grounded, and explicit about uncertainty." }, { role: "user", content: `Context:\n${packet.items.map((item) => item.text).join("\n")}\n\nQuestion: ${message}` }]);
  res.json({ answer: result.text, model: result.model, estimatedCostUsd: estimateCost(result.model, result.tokensIn, result.tokensOut), contextItems: packet.items.length });
});

router.get("/android/brief", async (req, res): Promise<void> => {
  if (rejectPairing(req, res)) return;
  const rows = await db.select().from(notification).where(eq(notification.status, "unread")).orderBy(desc(notification.createdAt)).limit(10);
  res.json({ title: "Today's Brief", unreadAlerts: rows.length, alerts: rows.map((row) => ({ id: row.id, title: row.title, body: row.body, severity: row.severity })) });
});

router.get("/android/waiting", async (req, res): Promise<void> => {
  if (rejectPairing(req, res)) return;
  res.json(await db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).orderBy(waitingLoop.nextCheckAt));
});

router.get("/android/alerts", async (req, res): Promise<void> => {
  if (rejectPairing(req, res)) return;
  res.json(await db.select().from(notification).where(and(eq(notification.status, "unread"), gt(notification.severity, "info"))).orderBy(desc(notification.createdAt)));
});

router.post("/android/approve", async (req, res): Promise<void> => {
  if (rejectPairing(req, res)) return;
  const id = String(req.body?.governanceRequestId ?? "");
  const decision = req.body?.decision === "approve" ? "approved" : req.body?.decision === "reject" ? "rejected" : null;
  if (!id || !decision) { res.status(400).json({ error: "governanceRequestId and decision are required." }); return; }
  const [updated] = await db.update(governanceRequest).set({ status: decision.toUpperCase(), resolvedAt: new Date(), responsePayload: { source: "android", decision } }).where(eq(governanceRequest.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Governance request not found." }); return; }
  res.json({ id: updated.id, status: updated.status });
});

export default router;