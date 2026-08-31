import { eq } from "drizzle-orm";
import { connector, connectorSync, connection, db, eventLog, normalizedConnectorEvent } from "@workspace/db";
import { emailProviderFor, type EmailSyncResult } from "./email-provider";
import { refreshOperationalContextAfterEmailSync, recordActionableEmail } from "./operational-intelligence";

export type GmailSyncSource = "manual" | "push" | "watch_renewal";

type GmailConnectorConfiguration = {
  connectionId?: string;
  historyId?: string;
  watch?: {
    topicName?: string;
    emailAddress?: string;
    historyId?: string;
    expiration?: string;
  };
  [key: string]: unknown;
};

function configurationOf(value: unknown): GmailConnectorConfiguration {
  return value && typeof value === "object" && !Array.isArray(value) ? value as GmailConnectorConfiguration : {};
}

function historyIdOf(configuration: GmailConnectorConfiguration) {
  return typeof configuration.historyId === "string" && configuration.historyId ? configuration.historyId : undefined;
}

function newestHistoryId(...values: Array<string | undefined>) {
  const candidates = values.filter((value): value is string => Boolean(value));
  if (!candidates.length) return undefined;
  return candidates.reduce((newest, candidate) => {
    try {
      return BigInt(candidate) > BigInt(newest) ? candidate : newest;
    } catch {
      return candidate.length > newest.length || (candidate.length === newest.length && candidate > newest) ? candidate : newest;
    }
  });
}

async function ensureConnector(connectionId: string) {
  await db.insert(connector).values({
    provider: "gmail",
    accessMode: "read",
    status: "syncing",
    authStatus: "connected",
    scopes: [],
    configuration: { connectionId },
    updatedAt: new Date(),
  }).onConflictDoNothing({ target: connector.provider });
  const [row] = await db.select().from(connector).where(eq(connector.provider, "gmail")).limit(1);
  if (!row) throw new Error("The Gmail connector could not be initialized.");
  return row;
}

function emailPayload(message: Awaited<ReturnType<ReturnType<typeof emailProviderFor>["getMessage"]>>) {
  return {
    id: message.id,
    threadId: message.threadId,
    subject: message.subject,
    from: message.from,
    to: message.to,
    date: message.date.toISOString(),
    snippet: message.snippet,
    labels: message.labels,
    unread: message.unread,
    hasAttachments: message.hasAttachments,
    webUrl: message.webUrl,
  };
}

async function recordSyncFailure(syncId: string, connectorId: string, source: GmailSyncSource, error: unknown) {
  const message = error instanceof Error ? error.message : "Gmail synchronization failed.";
  const now = new Date();
  await db.update(connectorSync).set({ status: "failed", error: message, completedAt: now }).where(eq(connectorSync.id, syncId));
  const [current] = await db.select().from(connector).where(eq(connector.id, connectorId)).limit(1);
  if (current) {
    await db.update(connector).set({
      status: "degraded",
      lastError: message,
      consecutiveFailureCount: current.consecutiveFailureCount + 1,
      errorHistory: [...(current.errorHistory ?? []), { at: now.toISOString(), source, error: message }].slice(-20),
      updatedAt: now,
    }).where(eq(connector.id, connectorId));
  }
  await db.insert(eventLog).values({
    eventType: "EmailSyncFailed",
    aggregateType: "connector_sync",
    aggregateId: syncId,
    sourceRef: "gmail",
    occurredAt: now,
    payload: { provider: "gmail", source, error: message },
  });
}

export async function syncGmailConnection(input: {
  connectionId: string;
  source: GmailSyncSource;
  notificationHistoryId?: string;
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.connectionId)) throw new Error("A valid Gmail connection ID is required.");
  const [gmailConnection] = await db.select().from(connection).where(eq(connection.id, input.connectionId)).limit(1);
  if (!gmailConnection || gmailConnection.method !== "oauth" || gmailConnection.configuration?.oauthProvider !== "gmail" || gmailConnection.status !== "connected") throw new Error("A connected Gmail OAuth connection is required.");
  const initial = await ensureConnector(input.connectionId);
  const initialConfiguration = configurationOf(initial.configuration);
  const syncStartedAt = new Date();
  const [sync] = await db.insert(connectorSync).values({
    connectorId: initial.id,
    provider: "gmail",
    status: "running",
    startedAt: syncStartedAt,
  }).returning();
  if (!sync) throw new Error("The Gmail synchronization record could not be created.");

  let storedCount = 0;
  let result: EmailSyncResult;
  try {
    const provider = emailProviderFor("gmail", input.connectionId);
    result = await provider.sync(historyIdOf(initialConfiguration), input.notificationHistoryId);
    await db.update(connectorSync).set({ receivedCount: result.messages.length }).where(eq(connectorSync.id, sync.id));
    for (const message of result.messages) {
      const existing = await db.select({ id: normalizedConnectorEvent.id })
        .from(normalizedConnectorEvent)
        .where(eq(normalizedConnectorEvent.externalId, `gmail:${message.id}`))
        .limit(1);
      if (existing.length) continue;
      await db.insert(normalizedConnectorEvent).values({
        syncId: sync.id,
        provider: "gmail",
        externalId: `gmail:${message.id}`,
        eventType: message.unread ? "EmailReceived" : "ThreadUpdated",
        sourceRef: `gmail:${message.threadId}`,
        occurredAt: message.date,
        payload: emailPayload(message),
      });
      await recordActionableEmail(message);
      storedCount++;
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      const [latest] = await tx.select().from(connector).where(eq(connector.id, initial.id)).for("update");
      if (!latest) throw new Error("The Gmail connector disappeared during synchronization.");
      const latestConfiguration = configurationOf(latest.configuration);
      const cursor = newestHistoryId(historyIdOf(latestConfiguration), result.nextHistoryId, input.notificationHistoryId);
      await tx.update(connector).set({
        status: "healthy",
        authStatus: "connected",
        lastSyncAt: now,
        lastError: null,
        consecutiveFailureCount: 0,
        configuration: {
          ...latestConfiguration,
          connectionId: input.connectionId,
          ...(cursor ? { historyId: cursor } : {}),
        },
        eventCount: latest.eventCount + storedCount,
        updatedAt: now,
      }).where(eq(connector.id, initial.id));
    });
    await db.update(connectorSync).set({
      status: "completed",
      receivedCount: result.messages.length,
      normalizedCount: storedCount,
      completedAt: now,
    }).where(eq(connectorSync.id, sync.id));
    await db.insert(eventLog).values({
      eventType: "EmailSyncCompleted",
      aggregateType: "connector_sync",
      aggregateId: sync.id,
      sourceRef: "gmail",
      occurredAt: now,
      payload: {
        provider: "gmail",
        source: input.source,
        fullSync: result.fullSync,
        recovery: result.recovery ?? null,
        cursorBefore: historyIdOf(initialConfiguration) ?? null,
        cursorAfter: result.nextHistoryId ?? input.notificationHistoryId ?? null,
        receivedCount: result.messages.length,
        normalizedCount: storedCount,
        duplicateCount: result.duplicateCount,
      },
    });
    if (result.recovery === "history_gap") {
      await db.insert(eventLog).values({
        eventType: "GmailHistoryGapRecovered",
        aggregateType: "connector_sync",
        aggregateId: sync.id,
        sourceRef: "gmail",
        occurredAt: new Date(),
        payload: { provider: "gmail", source: input.source, previousHistoryId: historyIdOf(initialConfiguration) ?? null, fullSync: true },
      });
    }
    const context = await refreshOperationalContextAfterEmailSync(storedCount);
    return {
      ...result,
      storedCount,
      syncId: sync.id,
      source: input.source,
      todayRefreshed: Boolean(context),
    };
  } catch (error) {
    await recordSyncFailure(sync.id, initial.id, input.source, error);
    throw error;
  }
}

function topicNameOf(configuration: GmailConnectorConfiguration) {
  const configured = configuration.watch?.topicName;
  return configured || process.env.GMAIL_PUBSUB_TOPIC_NAME || undefined;
}

function watchIsExpiring(watch: GmailConnectorConfiguration["watch"]) {
  if (!watch?.expiration) return true;
  const expiration = Date.parse(watch.expiration);
  return !Number.isFinite(expiration) || expiration <= Date.now() + 10 * 60_000;
}

export async function ensureGmailWatch(connectionId: string, options: { force?: boolean; topicName?: string } = {}) {
  const current = await ensureConnector(connectionId);
  const configuration = configurationOf(current.configuration);
  const topicName = options.topicName ?? topicNameOf(configuration);
  if (!topicName) throw new Error("A Gmail Pub/Sub topic is required to enable push freshness.");
  if (!/^projects\/[^/]+\/topics\/[^/]+$/.test(topicName)) throw new Error("Gmail Pub/Sub topic must use projects/{project}/topics/{topic}.");
  if (!options.force && !watchIsExpiring(configuration.watch)) return configuration.watch;

  const provider = emailProviderFor("gmail", connectionId);
  const [watch, profile] = await Promise.all([provider.watch(topicName), provider.profile()]);
  const now = new Date();
  const nextWatch = {
    topicName,
    emailAddress: profile.emailAddress,
    historyId: watch.historyId,
    expiration: watch.expiration.toISOString(),
    renewedAt: now.toISOString(),
  };
  await db.transaction(async (tx) => {
    const [latest] = await tx.select().from(connector).where(eq(connector.id, current.id)).for("update");
    if (!latest) throw new Error("The Gmail connector disappeared while renewing its watch.");
    const latestConfiguration = configurationOf(latest.configuration);
    await tx.update(connector).set({
      configuration: { ...latestConfiguration, connectionId, watch: nextWatch },
      updatedAt: now,
    }).where(eq(connector.id, current.id));
  });
  await db.insert(eventLog).values({
    eventType: "GmailWatchRenewed",
    aggregateType: "connector",
    aggregateId: current.id,
    sourceRef: "gmail",
    occurredAt: now,
    payload: { provider: "gmail", topicName, expiration: nextWatch.expiration, emailAddress: profile.emailAddress ?? null },
  });
  return nextWatch;
}

export async function renewGmailWatches() {
  const [current] = await db.select().from(connector).where(eq(connector.provider, "gmail")).limit(1);
  if (!current) return { renewed: 0, skipped: 0, failed: 0 };
  const configuration = configurationOf(current.configuration);
  const connectionId = typeof configuration.connectionId === "string" ? configuration.connectionId : undefined;
  if (!connectionId || !topicNameOf(configuration) || !watchIsExpiring(configuration.watch)) return { renewed: 0, skipped: 1, failed: 0 };
  try {
    await syncGmailConnection({ connectionId, source: "watch_renewal" });
    await ensureGmailWatch(connectionId);
    return { renewed: 1, skipped: 0, failed: 0 };
  } catch (error) {
    await db.insert(eventLog).values({
      eventType: "GmailWatchRenewalFailed",
      aggregateType: "connector",
      aggregateId: current.id,
      sourceRef: "gmail",
      occurredAt: new Date(),
      payload: { provider: "gmail", error: error instanceof Error ? error.message : "Gmail watch renewal failed." },
    });
    return { renewed: 0, skipped: 0, failed: 1 };
  }
}