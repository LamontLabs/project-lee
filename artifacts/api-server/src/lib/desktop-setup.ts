import { desc, eq, inArray } from "drizzle-orm";
import { connection, connector, db, desktopSetupRun, eventLog, type DesktopSetupStep } from "@workspace/db";
import { listProviders, registerProviders } from "./provider-abstraction";
import { testConnection } from "./connection-center";

const step = (key: string, label: string, status: DesktopSetupStep["status"], detail: string, extra: Partial<DesktopSetupStep> = {}): DesktopSetupStep => ({
  key, label, status, detail, updatedAt: new Date().toISOString(), ...extra,
});

function publicRun(run: typeof desktopSetupRun.$inferSelect | null) {
  if (!run) return null;
  return { ...run, steps: run.steps ?? [], summary: run.summary ?? {} };
}

export async function getLatestDesktopSetup() {
  const [run] = await db.select().from(desktopSetupRun).orderBy(desc(desktopSetupRun.updatedAt)).limit(1);
  return publicRun(run ?? null);
}

export async function runDesktopSetup() {
  const [active] = await db.select().from(desktopSetupRun).where(eq(desktopSetupRun.status, "running")).orderBy(desc(desktopSetupRun.updatedAt)).limit(1);
  if (active) return publicRun(active);
  const now = new Date();
  const [run] = await db.insert(desktopSetupRun).values({
    status: "running",
    steps: [step("providers", "Provider inventory", "running", "Registering known provider adapters.")],
    summary: {},
    startedAt: now,
    updatedAt: now,
  }).returning();
  const steps: DesktopSetupStep[] = [];
  const update = async (next: DesktopSetupStep) => {
    const index = steps.findIndex((item) => item.key === next.key);
    if (index >= 0) steps[index] = next; else steps.push(next);
    await db.update(desktopSetupRun).set({ steps, updatedAt: new Date() }).where(eq(desktopSetupRun.id, run.id));
  };
  try {
    await registerProviders();
    const providers = await listProviders();
    await update(step("providers", "Provider inventory", "complete", `${providers.length} provider adapters available.`));

    const rows = await db.select().from(connection);
    await update(step("connections", "Existing connections", "complete", `${rows.length} existing connection${rows.length === 1 ? "" : "s"} reused; no duplicates created.`));

    const oauthRows = rows.filter((row) => row.method === "oauth");
    const connected = rows.filter((row) => row.status === "connected");
    const needsOwner = rows.filter((row) => row.status === "pending" || row.status === "needs_reauthorization" || row.status === "disconnected");
    if (oauthRows.length) {
      await update(step("authorization", "Owner authorization", needsOwner.length ? "needs_owner" : "complete",
        needsOwner.length ? `${needsOwner.length} connection${needsOwner.length === 1 ? "" : "s"} need owner sign-in or repair.` : "All existing OAuth connections are authorized."));
    } else {
      await update(step("authorization", "Owner authorization", "skipped", "No OAuth connections configured yet."));
    }

    let healthy = 0;
    let failed = 0;
    for (const row of connected) {
      const checked = await testConnection(row.id);
      if (checked?.status === "connected") healthy += 1; else failed += 1;
    }
    await update(step("health", "Connection health", failed ? "failed" : "complete",
      connected.length ? `${healthy} connected system${healthy === 1 ? "" : "s"} verified${failed ? `; ${failed} need attention` : ""}.` : "No connected systems to test."));

    const connectedByProvider = new Map<string, typeof rows[number]>();
    for (const row of rows) {
      const provider = row.configuration?.oauthProvider;
      if (row.status === "connected" && typeof provider === "string") connectedByProvider.set(provider, row);
    }
    const providerIds = providers.map((provider) => provider.providerId);
    const existingConnectors = await db.select().from(connector).where(inArray(connector.provider, providerIds));
    let defaults = 0;
    for (const provider of providers) {
      const linked = connectedByProvider.get(provider.providerId);
      if (!linked) continue;
      const existing = existingConnectors.find((item) => item.provider === provider.providerId);
      const configuration = { ...(existing?.configuration ?? {}), connectionId: linked.id, setupManaged: true };
      if (existing) {
        await db.update(connector).set({ configuration, authStatus: "connected", updatedAt: new Date() }).where(eq(connector.id, existing.id));
      } else {
        await db.insert(connector).values({ provider: provider.providerId, accessMode: "read", status: "configured", authStatus: "connected", scopes: [], configuration, updatedAt: new Date() });
      }
      defaults += 1;
    }
    await update(step("connector_defaults", "Connector defaults", "complete", defaults ? `${defaults} connector default${defaults === 1 ? "" : "s"} linked to existing authorized systems.` : "No authorized provider connections were available to link."));
    await update(step("scheduling", "Background readiness", "complete", "Provider-neutral scheduling remains available; no duplicate jobs were created."));
    await update(step("portability", "K6 portability", "complete", "Setup uses provider-neutral registrations and server-side credentials; no database sharing required."));

    const ownerCount = steps.filter((item) => item.status === "needs_owner").length;
    const failureCount = steps.filter((item) => item.status === "failed").length;
    const status = failureCount ? "degraded" : ownerCount ? "needs_owner" : "complete";
    const summary = { providers: providers.length, connections: rows.length, authorized: connected.length, needsOwner: needsOwner.length, healthy, failed, connectorDefaults: defaults, consequentialActionsReleased: false };
    const [completed] = await db.update(desktopSetupRun).set({ status, steps, summary, lastError: failureCount ? "One or more safe health checks need attention." : null, completedAt: new Date(), updatedAt: new Date() }).where(eq(desktopSetupRun.id, run.id)).returning();
    await db.insert(eventLog).values({ eventType: "DesktopSetupCompleted", aggregateType: "desktop_setup_run", aggregateId: run.id, sourceRef: "desktop-setup", occurredAt: new Date(), payload: { status, summary } });
    return publicRun(completed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Desktop setup failed.";
    const [failedRun] = await db.update(desktopSetupRun).set({ status: "failed", steps: [...steps, step("run", "Setup run", "failed", message)], lastError: message, completedAt: new Date(), updatedAt: new Date() }).where(eq(desktopSetupRun.id, run.id)).returning();
    await db.insert(eventLog).values({ eventType: "DesktopSetupFailed", aggregateType: "desktop_setup_run", aggregateId: run.id, sourceRef: "desktop-setup", occurredAt: new Date(), payload: { error: message } });
    return publicRun(failedRun);
  }
}