import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { ListConnectorHealthResponse, SyncConnectorBody, SyncConnectorResponse } from "@workspace/api-zod";
import {
  connector,
  connectorSync,
  db,
  eventLog,
  normalizedConnectorEvent,
} from "@workspace/db";
import { connectorProviders, providerAdapters, type ConnectorProvider } from "../lib/connectors";
import { connectorHealthScan, syncLiveConnector } from "../lib/connector-engine";

const router: IRouter = Router();

router.post("/connectors/sync", async (req, res): Promise<void> => {
  const parsed = SyncConnectorBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid connector sync input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  if (input.mode === "write") {
    res.status(403).json({
      error: "Connector writes require an explicit CerbaSeal ALLOW decision.",
    });
    return;
  }

  const adapter = providerAdapters[input.provider as ConnectorProvider];
  const normalized = input.events.map((event) =>
    adapter.normalize({
      ...event,
      occurredAt: new Date(event.occurredAt),
    }),
  );
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    await tx
      .insert(connector)
      .values({
        provider: input.provider,
        accessMode: "read",
        status: "healthy",
        lastSyncAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: connector.provider });
    const [connectorRow] = await tx
      .select()
      .from(connector)
      .where(eq(connector.provider, input.provider))
      .limit(1);

    const [sync] = await tx
      .insert(connectorSync)
      .values({
        connectorId: connectorRow.id,
        provider: input.provider,
        status: "running",
        receivedCount: input.events.length,
        normalizedCount: normalized.length,
        startedAt: now,
      })
      .returning();

    const storedEvents = normalized.length
      ? await tx
          .insert(normalizedConnectorEvent)
          .values(
            normalized.map((event) => ({
              syncId: sync.id,
              provider: input.provider,
              externalId: event.externalId,
              eventType: event.eventType,
              sourceRef: event.sourceRef,
              occurredAt: event.occurredAt,
              payload: event.payload,
            })),
          )
          .returning()
      : [];

    const [completedSync] = await tx
      .update(connectorSync)
      .set({
        status: "completed",
        completedAt: now,
      })
      .where(eq(connectorSync.id, sync.id))
      .returning();
    await tx
      .update(connector)
      .set({
        status: "healthy",
        lastSyncAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(connector.id, connectorRow.id));

    const [syncEvent, healthEvent] = await tx
      .insert(eventLog)
      .values([
        {
          eventType: "ConnectorSyncCompleted",
          aggregateType: "connector_sync",
          aggregateId: sync.id,
          sourceRef: `connector:${input.provider}`,
          occurredAt: now,
          payload: {
            provider: input.provider,
            syncId: sync.id,
            receivedCount: completedSync.receivedCount,
            normalizedCount: completedSync.normalizedCount,
          },
        },
        {
          eventType: "ConnectorHealthChanged",
          aggregateType: "connector",
          aggregateId: connectorRow.id,
          sourceRef: `connector:${input.provider}`,
          occurredAt: now,
          payload: {
            provider: input.provider,
            status: "healthy",
            lastSyncAt: now.toISOString(),
          },
        },
      ])
      .returning();

    return {
      syncId: sync.id,
      eventIds: storedEvents.map((event) => event.id),
      domainEventId: syncEvent.id,
      healthEventId: healthEvent.id,
      receivedCount: completedSync.receivedCount,
      normalizedCount: completedSync.normalizedCount,
    };
  });

  res.status(201).json(
    SyncConnectorResponse.parse({
      syncId: result.syncId,
      provider: input.provider,
      status: "completed",
      receivedCount: result.receivedCount,
      normalizedCount: result.normalizedCount,
      eventIds: result.eventIds,
      domainEventId: result.domainEventId,
    }),
  );
});

router.get("/connectors/health", async (_req, res): Promise<void> => {
  const rows = await db.select().from(connector);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));
  res.json(
    ListConnectorHealthResponse.parse(
      connectorProviders.map((provider) => {
        const row = byProvider.get(provider);
        return {
          provider,
          providerCategory: providerAdapters[provider]?.category,
          adapterName: providerAdapters[provider]?.adapterName,
          supportedEvents: providerAdapters[provider]?.supportedEvents ?? [],
          accessMode: row?.accessMode ?? "read",
          status: row?.status ?? "unconfigured",
          authStatus: row?.authStatus ?? "not_connected",
          lastSyncAt: row?.lastSyncAt ?? undefined,
          lastError: row?.lastError ?? undefined,
          consecutiveFailureCount: row?.consecutiveFailureCount ?? 0,
          eventCount: row?.eventCount ?? 0,
        };
      }),
    ),
  );
});

router.post("/connectors/:provider/sync-live", async (req, res): Promise<void> => {
  const provider = req.params.provider as ConnectorProvider;
  if (!connectorProviders.includes(provider)) { res.status(400).json({ error: "Unsupported connector provider." }); return; }
  const result = await syncLiveConnector(provider, req.body?.configuration ?? {});
  res.status(result.status === "failed" ? 502 : 201).json(result);
});

router.post("/connectors/health-scan", async (_req, res): Promise<void> => {
  res.json({ results: await connectorHealthScan() });
});

export default router;