import { ReplitConnectors } from "@replit/connectors-sdk";
import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { connector, connectorSync, db, eventLog, normalizedConnectorEvent, sourceVault } from "@workspace/db";
import { connectorProviders, providerAdapters, type ConnectorProvider } from "./connectors";
import { recordNormalizedProviderChange } from "./change-intelligence";
import { recordCommitmentsFromNormalizedEvent } from "./commitment-intelligence";
import { getOAuthAccessToken } from "./connection-center";
import { emailProviderFor } from "./email-provider";

const connectors = new ReplitConnectors();

type RawRecord = { id: string; eventType: string; sourceRef: string; occurredAt?: string; payload: Record<string, unknown> };

async function proxyJson(provider: string, path: string) {
  const response = await connectors.proxy(provider, path, { method: "GET" });
  if (!response.ok) throw new Error(`${provider} request failed (${response.status}).`);
  return response.json() as Promise<any>;
}

async function collect(provider: ConnectorProvider, configuration: Record<string, unknown>): Promise<RawRecord[]> {
  if (provider === "github") {
    const owner = typeof configuration.owner === "string" ? configuration.owner : null;
    const repo = typeof configuration.repo === "string" ? configuration.repo : null;
    const repos = owner && repo
      ? [{ id: `${owner}/${repo}`, full_name: `${owner}/${repo}`, pushed_at: new Date().toISOString() }]
      : await proxyJson("github", "/user/repos?sort=pushed&per_page=25");
    const records: RawRecord[] = [];
    for (const item of repos.slice(0, 25)) {
      records.push({ id: `repo:${item.full_name ?? item.id}`, eventType: "repo_updated", sourceRef: `github:${item.full_name ?? item.id}`, occurredAt: item.pushed_at, payload: { name: item.name, fullName: item.full_name, defaultBranch: item.default_branch, htmlUrl: item.html_url, pushedAt: item.pushed_at } });
    }
    return records;
  }
  if (provider === "google_drive") {
    const files = await proxyJson("google-drive", "/drive/v3/files?trashed=false&pageSize=100&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,parents)");
    return (files.files ?? []).map((file: any) => ({ id: `file:${file.id}`, eventType: "document_changed", sourceRef: `google-drive:${file.id}`, occurredAt: file.modifiedTime, payload: file }));
  }
  if (provider === "google_calendar") {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 14 * 86400000).toISOString();
    const events = await proxyJson("google-calendar", `/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
    return (events.items ?? []).map((event: any) => ({ id: `calendar:${event.id}`, eventType: "meeting_detected", sourceRef: `google-calendar:${event.id}`, occurredAt: event.start?.dateTime ?? event.start?.date, payload: { id: event.id, summary: event.summary, description: event.description, start: event.start, end: event.end, attendees: event.attendees } }));
  }
  if (provider === "gmail") {
    const connectionId = typeof configuration.connectionId === "string" ? configuration.connectionId : null;
    if (!connectionId) throw new Error("Gmail sync requires a connected Gmail OAuth connection.");
    const messages = await emailProviderFor("gmail", connectionId).listMessages({ includeSpamTrash: true, maxResults: 100 });
    return messages.messages.map((message) => ({ id: `gmail:${message.id}`, eventType: message.unread ? "EmailReceived" : "ThreadUpdated", sourceRef: `gmail:${message.threadId}`, occurredAt: message.date.toISOString(), payload: { id: message.id, threadId: message.threadId, subject: message.subject, from: message.from, to: message.to, date: message.date.toISOString(), labels: message.labels, unread: message.unread, hasAttachments: message.hasAttachments } }));
  }
  throw new Error("Replit awareness requires a configured Replit connector.");
}

export async function syncLiveConnector(provider: ConnectorProvider, configuration: Record<string, unknown> = {}) {
  const now = new Date();
  const connectionId = typeof configuration.connectionId === "string"
    ? configuration.connectionId
    : typeof configuration.oauthConnectionId === "string" ? configuration.oauthConnectionId : null;
  if (connectionId) {
    try {
      await getOAuthAccessToken(connectionId);
    } catch {
      return { provider, status: "failed", syncId: "", eventIds: [], eventCount: 0, error: "OAuth authorization needs to be renewed." };
    }
  }
  await db.insert(connector).values({ provider, accessMode: "read", status: "syncing", authStatus: "connected", configuration, updatedAt: now }).onConflictDoNothing({ target: connector.provider });
  const [row] = await db.select().from(connector).where(eq(connector.provider, provider)).limit(1);
  const [sync] = await db.insert(connectorSync).values({ connectorId: row.id, provider, status: "running", startedAt: now }).returning();
  try {
    const raw = await collect(provider, configuration);
    if (raw.length && (provider === "github" || provider === "google_drive" || provider === "gmail")) {
      await db.insert(sourceVault).values(raw.map((event) => {
        const content = JSON.stringify(event.payload);
        return {
          originalFilename: `${provider}-${event.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`,
          mimeType: "application/json",
          byteSize: Buffer.byteLength(content),
          checksum: createHash("sha256").update(`${provider}:${event.id}:${content}`).digest("hex"),
          storagePath: `${provider}://${event.id}`,
          processingStatus: "pending",
          metadata: { connector: provider, externalId: event.id, sourceRef: event.sourceRef },
          rawContent: content,
        };
      })).onConflictDoNothing({ target: sourceVault.checksum });
    }
    const adapter = providerAdapters[provider];
    const normalized = raw.map((event) => adapter.normalize({ externalId: event.id, ...event, occurredAt: new Date(event.occurredAt ?? now) }));
    const stored = normalized.length ? await db.insert(normalizedConnectorEvent).values(normalized.map((event) => ({ syncId: sync.id, provider, externalId: event.externalId, eventType: event.eventType, sourceRef: event.sourceRef, occurredAt: event.occurredAt, payload: event.payload }))).returning() : [];
    const [completed] = await db.update(connectorSync).set({ status: "completed", receivedCount: raw.length, normalizedCount: stored.length, completedAt: new Date() }).where(eq(connectorSync.id, sync.id)).returning();
    const [updated] = await db.update(connector).set({ status: "healthy", authStatus: "connected", lastSyncAt: new Date(), lastError: null, consecutiveFailureCount: 0, eventCount: row.eventCount + stored.length, updatedAt: new Date() }).where(eq(connector.id, row.id)).returning();
    const [syncEvent] = await db.insert(eventLog).values({ eventType: "ConnectorSyncCompleted", aggregateType: "connector_sync", aggregateId: sync.id, sourceRef: `connector:${provider}`, occurredAt: new Date(), payload: { provider, syncId: sync.id, receivedCount: raw.length, normalizedCount: stored.length } }).returning();
    for (const event of stored) await db.insert(eventLog).values({ eventType: "ConnectorEventProduced", aggregateType: "normalized_connector_event", aggregateId: event.id, sourceRef: event.sourceRef, occurredAt: event.occurredAt, payload: { provider, eventType: event.eventType, externalId: event.externalId } });
    for (const event of stored) {
      await recordNormalizedProviderChange(event);
      await recordCommitmentsFromNormalizedEvent(event);
    }
    return { provider, status: completed.status, syncId: sync.id, eventIds: stored.map((event) => event.id), eventCount: stored.length, domainEventId: syncEvent.id, connector: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connector sync failed.";
    const history = [...(row.errorHistory ?? []), { at: now.toISOString(), message }].slice(-20);
    const [failed] = await db.update(connectorSync).set({ status: "failed", error: message, completedAt: new Date() }).where(eq(connectorSync.id, sync.id)).returning();
    const [updated] = await db.update(connector).set({ status: "error", lastError: message, consecutiveFailureCount: row.consecutiveFailureCount + 1, errorHistory: history, updatedAt: new Date() }).where(eq(connector.id, row.id)).returning();
    await db.insert(eventLog).values({ eventType: "ConnectorSyncFailed", aggregateType: "connector_sync", aggregateId: sync.id, sourceRef: `connector:${provider}`, occurredAt: new Date(), payload: { provider, syncId: sync.id, error: message, consecutiveFailureCount: updated.consecutiveFailureCount } });
    return { provider, status: failed.status, syncId: sync.id, eventIds: [], eventCount: 0, error: message, connector: updated };
  }
}

export async function connectorHealthScan() {
  const rows = await db.select().from(connector);
  const results = [];
  for (const provider of connectorProviders) {
    const row = rows.find((item) => item.provider === provider);
    if (!row || row.status === "unconfigured") results.push({ provider, status: "unconfigured" });
    else results.push(await syncLiveConnector(provider, row.configuration));
  }
  return results;
}