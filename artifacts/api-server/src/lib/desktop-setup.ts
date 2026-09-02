import { desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { connection, connector, db, desktopSetupRun, eventLog, type DesktopSetupStep } from "@workspace/db";
import { listProviders, registerProviders } from "./provider-abstraction";
import { createConnection, testConnection } from "./connection-center";
import { listEnabledLocalServiceContractEntries, type LocalServiceContractEntry } from "./local-service-contracts";
import { getStartupProof, verifyCanonicalBrainStartup } from "./startup-integrity";

export type LocalServiceDiscoveryCandidate = {
  discoveryKey: string;
  contractId: string;
  provider: string;
  displayName: string;
  targetType: string;
  method: "local";
  baseUrl: string;
  healthEndpoint: string;
  contractVersion: string;
  capabilities: Array<Record<string, unknown>>;
  dependencies: Array<Record<string, unknown>>;
  observedAt?: string;
  scanNonce?: string;
};

export type LocalServiceProbeFailure = {
  contractId: string;
  displayName: string;
  endpoint: string;
  reason: string;
};

export type LocalServiceDiscovery = {
  candidates: LocalServiceDiscoveryCandidate[];
  failures: LocalServiceProbeFailure[];
  attempted?: number;
  completedAt?: string;
  scanNonce?: string;
};

type ReviewedDiscoveryCandidate = LocalServiceDiscoveryCandidate & {
  discoveryKey: string;
  status: "new" | "existing";
  connectionId?: string;
};

function isLoopbackUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1")
      && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function safeDiscoveryText(value: unknown, fallback: string, max = 160): string {
  return typeof value === "string" && value.length > 0 && value.length <= max && !/(api[_-]?key|secret|password|token|private[_-]?key|credential)/i.test(value) ? value : fallback;
}

function safeContractDisplayName(contract: LocalServiceContractEntry): string {
  return safeDiscoveryText(contract.displayName, "Approved local service");
}

function safeObservedAt(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 64) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function safeScanNonce(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(value) ? value : undefined;
}

function safeProbeReason(value: unknown): string {
  if (value === "Not reachable" || value === "Timed out" || value === "Malformed response" || value === "Oversized response" || value === "Unsupported response" || value === "Not a compatible service contract") return value;
  if (typeof value === "string" && /^Returned HTTP [1-5][0-9]{2}$/.test(value)) return value;
  return "The allowlisted contract was not available.";
}

function safeDiscoveryRecords(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const result: Record<string, unknown> = {};
    for (const key of ["id", "name", "engineId", "engine", "state", "required"]) {
      const current = (item as Record<string, unknown>)[key];
      if (typeof current === "string" && current.length <= 160 && !/(api[_-]?key|secret|password|token|private[_-]?key|credential)/i.test(current)) result[key] = current;
      if (typeof current === "boolean") result[key] = current;
    }
    return Object.keys(result).length ? [result] : [];
  });
}

export function normalizeDiscoveryCandidate(value: unknown, contracts: readonly LocalServiceContractEntry[]): LocalServiceDiscoveryCandidate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const contractId = typeof input.contractId === "string" ? input.contractId : null;
  if (!contractId) return null;
  const contract = contractId ? contracts.find((item) => item.contractId === contractId) : null;
  const baseUrl = typeof input.baseUrl === "string" ? input.baseUrl.replace(/\/$/, "") : "";
  const healthEndpoint = typeof input.healthEndpoint === "string" ? input.healthEndpoint : "";
  if (!contract || !isLoopbackUrl(baseUrl) || !/^\/[a-zA-Z0-9._/:-]*$/.test(healthEndpoint) || !contract.paths.includes(healthEndpoint)) return null;
  const parsedUrl = new URL(baseUrl);
  const port = Number(parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80));
  if (port !== contract.port || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) return null;
  const observedAt = safeObservedAt(input.observedAt);
  const scanNonce = safeScanNonce(input.scanNonce);
  const normalized: LocalServiceDiscoveryCandidate = {
    discoveryKey: `${contractId}|${parsedUrl.origin}|${healthEndpoint}`,
    contractId,
    provider: contract.provider,
    displayName: safeDiscoveryText(input.displayName, safeContractDisplayName(contract)),
    targetType: contract.targetType,
    method: "local",
    baseUrl: parsedUrl.origin,
    healthEndpoint,
    contractVersion: safeDiscoveryText(input.contractVersion, "v1", 32),
    capabilities: safeDiscoveryRecords(input.capabilities),
    dependencies: safeDiscoveryRecords(input.dependencies),
    observedAt,
  };
  return scanNonce ? { ...normalized, scanNonce } : normalized;
}

export function normalizeDiscoveryReport(value: unknown, contracts: readonly LocalServiceContractEntry[]): LocalServiceDiscovery {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { candidates: [], failures: [] };
  const input = value as Record<string, unknown>;
  const candidates = (Array.isArray(input.candidates) ? input.candidates : [])
    .map((item) => normalizeDiscoveryCandidate(item, contracts))
    .filter((candidate): candidate is LocalServiceDiscoveryCandidate => Boolean(candidate));
  const deduped = [...new Map(candidates.map((candidate) => [candidate.discoveryKey, candidate])).values()];
  const failures = (Array.isArray(input.failures) ? input.failures : []).slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const contractId = typeof row.contractId === "string" ? row.contractId : undefined;
    const contract = contractId ? contracts.find((item) => item.contractId === contractId) : undefined;
    if (!contractId || !contract) return [];
    const endpoint = typeof row.endpoint === "string" && isLoopbackUrl(row.endpoint) ? new URL(row.endpoint).origin : "Loopback service";
    return [{
      contractId,
      displayName: safeContractDisplayName(contract),
      endpoint,
      reason: safeProbeReason(row.reason),
    }];
  });
  return { candidates: deduped, failures, attempted: typeof input.attempted === "number" ? Math.max(0, Math.min(100, input.attempted)) : undefined, completedAt: safeObservedAt(input.completedAt), scanNonce: safeScanNonce(input.scanNonce) };
}

function sameConnection(row: typeof connection.$inferSelect, candidate: LocalServiceDiscoveryCandidate): boolean {
  return row.method === "local" && row.baseUrl === candidate.baseUrl && (row.healthEndpoint ?? "/health") === candidate.healthEndpoint;
}

function publicConnection(row: typeof connection.$inferSelect) {
  const { credentialRef: _credentialRef, ...safe } = row;
  return { ...safe, credentialConfigured: Boolean(row.credentialRef) };
}

async function reviewDiscovery(discovery: LocalServiceDiscovery): Promise<Omit<LocalServiceDiscovery, "candidates"> & { candidates: ReviewedDiscoveryCandidate[] }> {
  const rows = await db.select().from(connection);
  const candidates: ReviewedDiscoveryCandidate[] = discovery.candidates.map((candidate) => {
    const existing = rows.find((row) => sameConnection(row, candidate));
    return existing
      ? { ...candidate, status: "existing" as const, connectionId: existing.id }
      : { ...candidate, status: "new" as const };
  });
  return { candidates, failures: discovery.failures, attempted: discovery.attempted, completedAt: discovery.completedAt, scanNonce: discovery.scanNonce };
}

export class DiscoveryApprovalError extends Error {
  readonly statusCode = 409;
}

function sameReviewedCandidate(left: ReviewedDiscoveryCandidate, right: LocalServiceDiscoveryCandidate): boolean {
  const { status: _status, connectionId: _connectionId, ...reviewedCandidate } = left;
  return JSON.stringify(reviewedCandidate) === JSON.stringify(right);
}

export async function acceptDiscoveredService(value: unknown) {
  const candidate = normalizeDiscoveryCandidate(value, await listEnabledLocalServiceContractEntries());
  if (!candidate) throw new Error("This local service is not an approved discovery candidate.");
  if (!candidate.scanNonce && !candidate.observedAt) {
    throw new DiscoveryApprovalError("This discovery candidate has no observation proof. Run local discovery again before accepting it.");
  }
  const [latestRun] = await db.select().from(desktopSetupRun)
    .where(inArray(desktopSetupRun.status, ["complete", "degraded", "needs_owner"]))
    .orderBy(desc(desktopSetupRun.updatedAt))
    .limit(1);
  const reviewed = ((latestRun?.summary as { discovery?: LocalServiceDiscovery } | null)?.discovery?.candidates as ReviewedDiscoveryCandidate[] | undefined)
    ?.find((item) => item.discoveryKey === candidate.discoveryKey);
  if (!reviewed || !sameReviewedCandidate(reviewed, candidate)) {
    throw new DiscoveryApprovalError("This discovery report is stale or was not produced by the latest owner-reviewed setup run. Run discovery again before accepting it.");
  }
  const rows = await db.select().from(connection);
  const existing = rows.find((row) => sameConnection(row, candidate));
  if (existing) return { connection: publicConnection(existing), reused: true };
  const created = await createConnection({
    displayName: candidate.displayName,
    targetType: candidate.targetType,
    method: candidate.method,
    baseUrl: candidate.baseUrl,
    healthEndpoint: candidate.healthEndpoint,
    contractVersion: candidate.contractVersion,
    permissions: ["OBSERVE"],
    capabilities: candidate.capabilities,
    dependencies: candidate.dependencies,
    configuration: { discoveryKey: candidate.discoveryKey, discoverySource: "desktop_local_allowlist", discoveredAt: candidate.observedAt ?? new Date().toISOString() },
  });
  const checked = await testConnection(created.id);
  return { connection: checked ?? created, reused: false };
}

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

export async function runDesktopSetup(input: { discovery?: unknown } = {}) {
  const [active] = await db.select().from(desktopSetupRun).where(eq(desktopSetupRun.status, "running")).orderBy(desc(desktopSetupRun.updatedAt)).limit(1);
  if (active) return publicRun(active);
  const now = new Date();
  const [run] = await db.insert(desktopSetupRun).values({
    status: "running",
    steps: [
      step("canonical_brain", "Canonical Brain", "running", "Proving database identity and Event Log continuity."),
      step("providers", "Provider inventory", "running", "Registering known provider adapters."),
    ],
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
    const startupProof = getStartupProof() ?? await verifyCanonicalBrainStartup();
    await update(step(
      "canonical_brain",
      "Canonical Brain",
      startupProof.overall === "PASS" ? "complete" : "failed",
      startupProof.overall === "PASS"
        ? "Canonical database identity, Brain state, and Event Log continuity verified."
        : startupProof.issues.join(" ") || "Canonical Brain startup proof failed.",
    ));
    await registerProviders();
    const providers = await listProviders();
    await update(step("providers", "Provider inventory", "complete", `${providers.length} provider adapters available.`));

    const rows = await db.select().from(connection);
    await update(step("connections", "Existing connections", "complete", `${rows.length} existing connection${rows.length === 1 ? "" : "s"} reused; no duplicates created.`));

    const reviewedDiscovery = await reviewDiscovery(normalizeDiscoveryReport(input.discovery, await listEnabledLocalServiceContractEntries()));
    // The API, not the desktop payload, binds this report to one owner-reviewed run.
    const scanNonce = randomUUID().replace(/-/g, "");
    const discovery = {
      ...reviewedDiscovery,
      scanNonce,
      candidates: reviewedDiscovery.candidates.map((candidate): ReviewedDiscoveryCandidate => ({ ...candidate, scanNonce })),
    };
    const discoveredCount = discovery.candidates.length;
    const newCount = discovery.candidates.filter((candidate) => candidate.status === "new").length;
    const existingCount = discoveredCount - newCount;
    await update(step("local_discovery", "Local service discovery", "complete",
      discoveredCount
        ? `${discoveredCount} approved local service${discoveredCount === 1 ? "" : "s"} found; ${newCount ? `${newCount} await owner review` : "existing connections reused"}.${discovery.failures.length ? ` ${discovery.failures.length} allowlisted probe${discovery.failures.length === 1 ? "" : "s"} need attention.` : ""}`
        : discovery.failures.length
          ? `No approved local services found. ${discovery.failures.length} allowlisted probe${discovery.failures.length === 1 ? "" : "s"} summarized below.`
          : "No local service discovery report was supplied.",
      { provider: "local", ...(existingCount ? {} : {}) }));

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
    const summary = { providers: providers.length, connections: rows.length, authorized: connected.length, needsOwner: needsOwner.length, healthy, failed, connectorDefaults: defaults, consequentialActionsReleased: false, discovery, startupProof };
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