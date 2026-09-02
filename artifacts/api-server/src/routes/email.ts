import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { connection, connector, db } from "@workspace/db";
import { emailProviderFor, type EmailAddress } from "../lib/email-provider";
import { executeProviderWrite } from "../lib/provider-abstraction";
import { ensureGmailWatch, syncGmailConnection } from "../lib/gmail-sync";

const router: IRouter = Router();
const gmailConnection = async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("A valid Gmail connection ID is required.");
  const [row] = await db.select().from(connection).where(eq(connection.id, id)).limit(1);
  if (!row || row.method !== "oauth" || row.configuration?.oauthProvider !== "gmail" || row.status !== "connected") throw new Error("A connected Gmail OAuth connection is required.");
  return emailProviderFor("gmail", id);
};
const addresses = (value: unknown): EmailAddress[] => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => ({ email: String(item.email ?? ""), ...(item.name ? { name: String(item.name) } : {}) })).filter((item) => item.email.includes("@")) : [];
const errorResponse = (res: any, error: unknown) => {
  const message = error instanceof Error ? error.message : "Email provider request failed.";
  const badRequest = /valid Gmail|connected Gmail|Pub\/Sub|notification|topic is required|topic must use/.test(message);
  res.status(badRequest ? (message.includes("connected Gmail") ? 409 : 400) : 502).json({ error: message });
};

router.get("/email/messages", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); res.json(await provider.listMessages({ filters: typeof req.query.query === "string" ? { text: req.query.query } : undefined, pageToken: typeof req.query.pageToken === "string" ? req.query.pageToken : undefined, maxResults: Number(req.query.maxResults ?? 50) })); } catch (error) { errorResponse(res, error); }
});
router.get("/email/search", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); const query = String(req.query.q ?? "").trim(); if (!query) { res.status(400).json({ error: "q is required." }); return; } res.json(await provider.search({ text: query }, { pageToken: typeof req.query.pageToken === "string" ? req.query.pageToken : undefined })); } catch (error) { errorResponse(res, error); }
});
router.get("/email/unread", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); res.json({ messages: await provider.listUnread() }); } catch (error) { errorResponse(res, error); }
});
router.get("/email/messages/:id", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); res.json(await provider.getMessage(req.params.id, true)); } catch (error) { errorResponse(res, error); }
});
router.get("/email/threads/:id", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); res.json(await provider.getThread(req.params.id)); } catch (error) { errorResponse(res, error); }
});
router.get("/email/messages/:messageId/attachments/:attachmentId", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); res.json(await provider.getAttachment(req.params.messageId, req.params.attachmentId)); } catch (error) { errorResponse(res, error); }
});
router.post("/email/drafts", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.body?.connectionId)); const input = { to: addresses(req.body?.to), cc: addresses(req.body?.cc), subject: String(req.body?.subject ?? ""), bodyText: String(req.body?.bodyText ?? ""), ...(req.body?.threadId ? { threadId: String(req.body.threadId) } : {}) }; if (!input.to.length || !input.subject) { res.status(400).json({ error: "At least one recipient and a subject are required." }); return; } res.status(201).json(await provider.createDraft(input)); } catch (error) { errorResponse(res, error); }
});
router.patch("/email/drafts/:id", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.body?.connectionId)); res.json(await provider.updateDraft(req.params.id, { to: addresses(req.body?.to), cc: addresses(req.body?.cc), subject: String(req.body?.subject ?? ""), bodyText: String(req.body?.bodyText ?? ""), ...(req.body?.threadId ? { threadId: String(req.body.threadId) } : {}) })); } catch (error) { errorResponse(res, error); }
});
router.post("/email/messages/:id/archive", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.body?.connectionId)); res.json(await provider.archive(req.params.id)); } catch (error) { errorResponse(res, error); }
});
router.post("/email/messages/:id/read-state", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.body?.connectionId)); res.json(await provider.markRead(req.params.id, Boolean(req.body?.read))); } catch (error) { errorResponse(res, error); }
});
router.post("/email/messages/:id/labels", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.body?.connectionId)); res.json(await provider.modifyLabels(req.params.id, Array.isArray(req.body?.addLabelIds) ? req.body.addLabelIds.map(String) : [], Array.isArray(req.body?.removeLabelIds) ? req.body.removeLabelIds.map(String) : [])); } catch (error) { errorResponse(res, error); }
});
router.post("/email/send", async (req, res): Promise<void> => {
  try {
    const provider = await gmailConnection(String(req.body?.connectionId));
    const input = { to: addresses(req.body?.to), cc: addresses(req.body?.cc), subject: String(req.body?.subject ?? ""), bodyText: String(req.body?.bodyText ?? ""), ...(req.body?.threadId ? { threadId: String(req.body.threadId) } : {}), ...(req.body?.inReplyTo ? { inReplyTo: String(req.body.inReplyTo) } : {}), ...(Array.isArray(req.body?.references) ? { references: req.body.references.map(String) } : {}) };
    const result = await executeProviderWrite({ provider: "gmail", actionType: "send_email", targetSystem: "gmail", payload: { connectionId: String(req.body?.connectionId), threadId: input.threadId ?? null, recipientCount: input.to.length + input.cc.length, subjectPresent: Boolean(input.subject) }, reason: String(req.body?.reason ?? "Owner-approved Gmail message"), evidenceRefs: Array.isArray(req.body?.evidenceRefs) ? req.body.evidenceRefs.map(String) : [], actor: "owner", ownerConfirmed: req.body?.ownerConfirmed === true, humanConfirmed: req.body?.humanConfirmed === true, write: () => provider.send(input) });
    res.status(result.executed ? 201 : 202).json(result);
  } catch (error) { errorResponse(res, error); }
});

router.post("/email/gmail/watch", async (req, res): Promise<void> => {
  try {
    const connectionId = String(req.body?.connectionId);
    const topicName = typeof req.body?.topicName === "string" ? req.body.topicName : undefined;
    const sync = await syncGmailConnection({ connectionId, source: "manual" });
    const watch = await ensureGmailWatch(connectionId, { force: true, topicName });
    res.status(201).json({ watch, baselineSync: sync });
  } catch (error) { errorResponse(res, error); }
});

function gmailPushPayload(body: unknown) {
  const message = body && typeof body === "object" && "message" in body ? (body as { message?: { data?: unknown } }).message : undefined;
  if (!message || typeof message.data !== "string" || !message.data) throw new Error("A Gmail Pub/Sub notification payload is required.");
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(message.data, "base64").toString("utf8")); } catch { throw new Error("The Gmail Pub/Sub notification data is invalid."); }
  if (!parsed || typeof parsed !== "object") throw new Error("The Gmail Pub/Sub notification data is invalid.");
  const emailAddress = (parsed as Record<string, unknown>).emailAddress;
  const historyId = (parsed as Record<string, unknown>).historyId;
  if (typeof emailAddress !== "string" || !emailAddress || typeof historyId !== "string" || !/^\d+$/.test(historyId)) throw new Error("The Gmail Pub/Sub notification is missing a valid emailAddress or historyId.");
  return { emailAddress, historyId };
}

/**
 * Google Pub/Sub is the only unauthenticated-looking route in this router.
 * private-auth explicitly allows this exact path; the watched mailbox address
 * still has to match the server-side watch configuration.
 */
router.post("/email/gmail/webhook", async (req, res): Promise<void> => {
  try {
    const notification = gmailPushPayload(req.body);
    const [row] = await db.select().from(connector).where(eq(connector.provider, "gmail")).limit(1);
    const configuration = row?.configuration && typeof row.configuration === "object" ? row.configuration : {};
    const watch = configuration.watch && typeof configuration.watch === "object" ? configuration.watch as Record<string, unknown> : {};
    if (!row || typeof configuration.connectionId !== "string") { res.status(409).json({ error: "No configured Gmail watch is available." }); return; }
    if (typeof watch.emailAddress !== "string" || watch.emailAddress.toLowerCase() !== notification.emailAddress.toLowerCase()) { res.status(403).json({ error: "The Gmail notification mailbox is not the configured watch." }); return; }
    const result = await syncGmailConnection({ connectionId: configuration.connectionId, source: "push", notificationHistoryId: notification.historyId });
    const renewedWatch = await ensureGmailWatch(configuration.connectionId);
    res.status(202).json({ accepted: true, notificationHistoryId: notification.historyId, sync: result, watch: renewedWatch });
  } catch (error) {
    errorResponse(res, error);
  }
});

router.post("/email/sync", async (req, res): Promise<void> => {
  try {
    const connectionId = String(req.body?.connectionId);
    // The shared sync service preserves the provider boundary, cursor safety,
    // duplicateCount, existing-record deduplication, and the granted scopes
    // never leave Connection Center.
    res.json(await syncGmailConnection({ connectionId, source: "manual" }));
  } catch (error) { errorResponse(res, error); }
});

export default router;