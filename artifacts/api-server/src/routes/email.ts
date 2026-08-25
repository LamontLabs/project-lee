import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { connection, connector, connectorSync, db, eventLog, normalizedConnectorEvent } from "@workspace/db";
import { emailProviderFor, type EmailAddress } from "../lib/email-provider";
import { executeProviderWrite } from "../lib/provider-abstraction";
import { recordActionableEmail } from "../lib/operational-intelligence";

const router: IRouter = Router();
const gmailConnection = async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("A valid Gmail connection ID is required.");
  const [row] = await db.select().from(connection).where(eq(connection.id, id)).limit(1);
  if (!row || row.method !== "oauth" || row.configuration?.oauthProvider !== "gmail" || row.status !== "connected") throw new Error("A connected Gmail OAuth connection is required.");
  return emailProviderFor("gmail", id);
};
const addresses = (value: unknown): EmailAddress[] => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item) => ({ email: String(item.email ?? ""), ...(item.name ? { name: String(item.name) } : {}) })).filter((item) => item.email.includes("@")) : [];
const errorResponse = (res: any, error: unknown) => res.status(error instanceof Error && error.message.includes("valid Gmail") ? 400 : error instanceof Error && error.message.includes("connected Gmail") ? 409 : 502).json({ error: error instanceof Error ? error.message : "Email provider request failed." });

router.get("/email/messages", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); res.json(await provider.listMessages({ query: typeof req.query.query === "string" ? req.query.query : undefined, pageToken: typeof req.query.pageToken === "string" ? req.query.pageToken : undefined, maxResults: Number(req.query.maxResults ?? 50) })); } catch (error) { errorResponse(res, error); }
});
router.get("/email/search", async (req, res): Promise<void> => {
  try { const provider = await gmailConnection(String(req.query.connectionId)); const query = String(req.query.q ?? "").trim(); if (!query) { res.status(400).json({ error: "q is required." }); return; } res.json(await provider.search(query, { pageToken: typeof req.query.pageToken === "string" ? req.query.pageToken : undefined })); } catch (error) { errorResponse(res, error); }
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
router.post("/email/sync", async (req, res): Promise<void> => {
  try {
    const connectionId = String(req.body?.connectionId);
    const provider = await gmailConnection(connectionId);
    const [row] = await db.select().from(connector).where(eq(connector.provider, "gmail")).limit(1);
    const configuredHistoryId = typeof row?.configuration?.historyId === "string" ? row.configuration.historyId : undefined;
    const result = await provider.sync(configuredHistoryId);
    const syncAt = new Date();
    await db.insert(connector).values({ provider: "gmail", accessMode: "read", status: "syncing", authStatus: "connected", scopes: [], configuration: { connectionId }, updatedAt: syncAt }).onConflictDoNothing({ target: connector.provider });
    const [current] = await db.select().from(connector).where(eq(connector.provider, "gmail")).limit(1);
    const [sync] = await db.insert(connectorSync).values({ connectorId: current.id, provider: "gmail", status: "running", receivedCount: result.messages.length, startedAt: syncAt }).returning();
    let storedCount = 0;
    for (const message of result.messages) {
      const existing = await db.select({ id: normalizedConnectorEvent.id }).from(normalizedConnectorEvent).where(eq(normalizedConnectorEvent.externalId, `gmail:${message.id}`)).limit(1);
      if (existing.length) continue;
      await db.insert(normalizedConnectorEvent).values({ syncId: sync.id, provider: "gmail", externalId: `gmail:${message.id}`, eventType: message.unread ? "EmailReceived" : "ThreadUpdated", sourceRef: `gmail:${message.threadId}`, occurredAt: message.date, payload: { id: message.id, threadId: message.threadId, subject: message.subject, from: message.from, to: message.to, date: message.date.toISOString(), snippet: message.snippet, labels: message.labels, unread: message.unread, hasAttachments: message.hasAttachments, webUrl: message.webUrl } });
      await recordActionableEmail(message);
      storedCount++;
    }
    await db.update(connectorSync).set({ status: "completed", normalizedCount: storedCount, completedAt: new Date() }).where(eq(connectorSync.id, sync.id));
    await db.update(connector).set({ status: "healthy", authStatus: "connected", lastSyncAt: new Date(), lastError: null, configuration: { ...(current.configuration ?? {}), connectionId, ...(result.nextHistoryId ? { historyId: result.nextHistoryId } : {}) }, eventCount: current.eventCount + storedCount, updatedAt: new Date() }).where(eq(connector.id, current.id));
    await db.insert(eventLog).values({ eventType: "EmailSyncCompleted", aggregateType: "connector_sync", aggregateId: sync.id, sourceRef: "gmail", occurredAt: new Date(), payload: { provider: "gmail", fullSync: result.fullSync, receivedCount: result.messages.length, normalizedCount: storedCount, duplicateCount: result.duplicateCount } });
    res.json({ ...result, storedCount, syncId: sync.id });
  } catch (error) { errorResponse(res, error); }
});

export default router;