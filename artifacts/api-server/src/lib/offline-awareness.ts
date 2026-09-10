import { and, desc, eq, isNull } from "drizzle-orm";
import { connector, db, eventLog, providerFreshness, providerFreshnessPeriod } from "@workspace/db";
import { connectorProviders, providerAdapters, type ConnectorProvider } from "./connectors";

export const PROVIDER_FRESHNESS_STATES = ["current", "degraded", "offline", "stale", "reconnected", "unverified"] as const;
export type ProviderFreshnessState = typeof PROVIDER_FRESHNESS_STATES[number];
export type ProviderFreshnessRecord = {
  providerId: string;
  state: ProviderFreshnessState;
  lastSuccessfulRefreshAt: string | null;
  lastAttemptedRefreshAt: string | null;
  lastFailureAt: string | null;
  evidenceAgeMs: number | null;
  failureCount: number;
  activePeriodStartedAt: string | null;
  lastReconnectedAt: string | null;
  limitations: string[];
  lastEvidence: Record<string, unknown>;
};

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const limitationsFor = (state: ProviderFreshnessState) => state === "current" || state === "reconnected"
  ? ["Live provider reads may proceed only through the connected adapter and its permissions.", "External facts are current only as of the recorded refresh time."]
  : [
    "Previously synchronized records remain available locally.",
    "Live provider reads are unavailable or should not be treated as current until a successful refresh.",
    "Consequential actions requiring fresh external evidence remain blocked by existing permission and governance boundaries.",
  ];

function iso(value: Date | null | undefined) { return value?.toISOString() ?? null; }
function ageMs(value: Date | null | undefined, now = Date.now()) { return value ? Math.max(0, now - value.getTime()) : null; }
function normalizedState(value: string | null | undefined): ProviderFreshnessState {
  return PROVIDER_FRESHNESS_STATES.includes(value as ProviderFreshnessState) ? value as ProviderFreshnessState : "unverified";
}

function effectiveState(record: ProviderFreshnessRecord, now = Date.now()): ProviderFreshnessState {
  if (record.state === "current" && record.evidenceAgeMs !== null && record.evidenceAgeMs > STALE_AFTER_MS) return "stale";
  return record.state;
}

function recordFromRow(row: typeof providerFreshness.$inferSelect, now = Date.now()): ProviderFreshnessRecord {
  const evidenceAgeMs = row.lastSuccessfulRefreshAt ? ageMs(row.lastSuccessfulRefreshAt, now) : row.evidenceAgeMs ?? null;
  return {
    providerId: row.providerId,
    state: effectiveState({
      providerId: row.providerId,
      state: normalizedState(row.state),
      lastSuccessfulRefreshAt: iso(row.lastSuccessfulRefreshAt),
      lastAttemptedRefreshAt: iso(row.lastAttemptedRefreshAt),
      lastFailureAt: iso(row.lastFailureAt),
      evidenceAgeMs,
      failureCount: row.failureCount,
      activePeriodStartedAt: iso(row.activePeriodStartedAt),
      lastReconnectedAt: iso(row.lastReconnectedAt),
      limitations: row.limitations,
      lastEvidence: row.lastEvidence,
    }, now),
    lastSuccessfulRefreshAt: iso(row.lastSuccessfulRefreshAt),
    lastAttemptedRefreshAt: iso(row.lastAttemptedRefreshAt),
    lastFailureAt: iso(row.lastFailureAt),
    evidenceAgeMs,
    failureCount: row.failureCount,
    activePeriodStartedAt: iso(row.activePeriodStartedAt),
    lastReconnectedAt: iso(row.lastReconnectedAt),
    limitations: row.limitations,
    lastEvidence: row.lastEvidence,
  };
}

async function ensureState(providerId: string, now: Date) {
  await db.insert(providerFreshness).values({ providerId, updatedAt: now }).onConflictDoNothing({ target: providerFreshness.providerId });
  const [row] = await db.select().from(providerFreshness).where(eq(providerFreshness.providerId, providerId)).limit(1);
  if (!row) throw new Error(`Provider freshness state could not be created for ${providerId}.`);
  return row;
}

export async function recordProviderRefreshAttempt(providerId: string, at = new Date()) {
  const row = await ensureState(providerId, at);
  await db.update(providerFreshness).set({ lastAttemptedRefreshAt: at, updatedAt: at }).where(eq(providerFreshness.id, row.id));
}

export async function recordProviderRefreshSuccess(providerId: string, input: { refreshAt?: Date; changedCount?: number; syncId?: string; preservedLocalObservationCount?: number } = {}) {
  const refreshAt = input.refreshAt ?? new Date();
  const row = await ensureState(providerId, refreshAt);
  const previous = normalizedState(row.state);
  const wasInterrupted = ["offline", "degraded", "stale"].includes(previous) || Boolean(row.activePeriodStartedAt);
  const evidence = {
    providerId,
    syncId: input.syncId ?? null,
    changedCount: input.changedCount ?? 0,
    preservedLocalObservationCount: input.preservedLocalObservationCount ?? 0,
    refreshedAt: refreshAt.toISOString(),
  };
  await db.transaction(async (tx) => {
    if (wasInterrupted && row.activePeriodStartedAt) {
      await tx.update(providerFreshnessPeriod).set({ endedAt: refreshAt }).where(and(eq(providerFreshnessPeriod.providerId, providerId), isNull(providerFreshnessPeriod.endedAt)));
    }
    await tx.update(providerFreshness).set({
      state: "current",
      lastSuccessfulRefreshAt: refreshAt,
      lastAttemptedRefreshAt: refreshAt,
      lastFailureAt: null,
      evidenceAgeMs: 0,
      failureCount: 0,
      activePeriodStartedAt: null,
      lastReconnectedAt: wasInterrupted ? refreshAt : row.lastReconnectedAt,
      limitations: limitationsFor("current"),
      lastEvidence: evidence,
      updatedAt: refreshAt,
    }).where(eq(providerFreshness.id, row.id));
    if (wasInterrupted) {
      await tx.insert(eventLog).values({
        eventType: "ProviderReconnected",
        aggregateType: "provider_freshness",
        aggregateId: row.id,
        sourceRef: `provider:${providerId}`,
        occurredAt: refreshAt,
        payload: evidence,
      });
    }
  });
  return { reconnected: wasInterrupted, evidence };
}

export async function recordProviderRefreshFailure(providerId: string, error: string, input: { attemptedAt?: Date; syncId?: string } = {}) {
  const attemptedAt = input.attemptedAt ?? new Date();
  const row = await ensureState(providerId, attemptedAt);
  const previous = normalizedState(row.state);
  const nextState: ProviderFreshnessState = row.lastSuccessfulRefreshAt ? "degraded" : "offline";
  const startsPeriod = !row.activePeriodStartedAt || !["degraded", "offline"].includes(previous);
  const periodStartedAt = startsPeriod ? attemptedAt : row.activePeriodStartedAt;
  const evidence = { providerId, syncId: input.syncId ?? null, error, attemptedAt: attemptedAt.toISOString() };
  await db.transaction(async (tx) => {
    await tx.update(providerFreshness).set({
      state: nextState,
      lastAttemptedRefreshAt: attemptedAt,
      lastFailureAt: attemptedAt,
      evidenceAgeMs: row.lastSuccessfulRefreshAt ? ageMs(row.lastSuccessfulRefreshAt, attemptedAt.getTime()) : null,
      failureCount: row.failureCount + 1,
      activePeriodStartedAt: periodStartedAt,
      limitations: limitationsFor(nextState),
      lastEvidence: evidence,
      updatedAt: attemptedAt,
    }).where(eq(providerFreshness.id, row.id));
    if (startsPeriod) {
      await tx.insert(providerFreshnessPeriod).values({
        providerId,
        state: nextState,
        startedAt: attemptedAt,
        lastSuccessfulRefreshAt: row.lastSuccessfulRefreshAt,
        evidenceAgeMs: row.lastSuccessfulRefreshAt ? ageMs(row.lastSuccessfulRefreshAt, attemptedAt.getTime()) : null,
        limitations: limitationsFor(nextState),
        evidence,
      });
    }
    await tx.insert(eventLog).values({
      eventType: "ProviderRefreshUnavailable",
      aggregateType: "provider_freshness",
      aggregateId: row.id,
      sourceRef: `provider:${providerId}`,
      occurredAt: attemptedAt,
      payload: { ...evidence, state: nextState, failureCount: row.failureCount + 1 },
    });
  });
  return { state: nextState, periodStartedAt, evidence };
}

export async function getProviderFreshnessMap() {
  const rows = await db.select().from(providerFreshness);
  return new Map(rows.map((row) => [row.providerId, recordFromRow(row)]));
}

export async function getProviderFreshnessHistory(providerId: string, limit = 20) {
  return db.select().from(providerFreshnessPeriod)
    .where(eq(providerFreshnessPeriod.providerId, providerId))
    .orderBy(desc(providerFreshnessPeriod.startedAt))
    .limit(limit);
}

export function summarizeProviderStates(items: Array<{ provider: string; state: ProviderFreshnessState; connectorStatus: string }>) {
  const configured = items.filter((item) => item.connectorStatus !== "unconfigured" || item.state !== "unverified");
  const current = configured.filter((item) => ["current", "reconnected"].includes(item.state));
  const degraded = configured.filter((item) => ["degraded", "stale"].includes(item.state));
  const unavailable = configured.filter((item) => item.state === "offline");
  const state = !configured.length ? "unverified" : unavailable.length === configured.length ? "offline" : unavailable.length || degraded.length ? "degraded" : "current";
  return {
    state,
    mode: state === "offline" ? "offline" : state === "degraded" ? "partial" : state === "current" ? "online" : "unverified",
    counts: { configured: configured.length, current: current.length, degraded: degraded.length, unavailable: unavailable.length },
    affectedProviders: [...unavailable, ...degraded].map((item) => item.provider),
  };
}

function unverified(providerId: string): ProviderFreshnessRecord {
  return { providerId, state: "unverified", lastSuccessfulRefreshAt: null, lastAttemptedRefreshAt: null, lastFailureAt: null, evidenceAgeMs: null, failureCount: 0, activePeriodStartedAt: null, lastReconnectedAt: null, limitations: ["No successful provider refresh is recorded.", "External facts must be treated as unverified until a provider refresh succeeds."], lastEvidence: {} };
}

export async function getOfflineAwareness() {
  const [connectors, freshness] = await Promise.all([db.select().from(connector), getProviderFreshnessMap()]);
  const now = Date.now();
  const providers = connectorProviders.map((provider) => {
    const connectorRow = connectors.find((row) => row.provider === provider);
    const saved = freshness.get(provider) ?? unverified(provider);
    const fallbackSuccess = connectorRow?.lastSyncAt ?? null;
    const base = fallbackSuccess && !saved.lastSuccessfulRefreshAt
      ? { ...saved, state: connectorRow?.status === "healthy" ? "current" as const : connectorRow?.status === "error" ? "degraded" as const : saved.state, lastSuccessfulRefreshAt: iso(fallbackSuccess), evidenceAgeMs: ageMs(fallbackSuccess, now), limitations: limitationsFor(saved.state) }
      : saved;
    const state = effectiveState(base, now);
    return {
      provider,
      label: providerAdapters[provider].adapterName,
      category: providerAdapters[provider].category,
      state,
      freshnessLabel: state === "current" || state === "reconnected" ? "current" : state === "stale" ? "stale" : state === "offline" ? "unavailable" : state === "degraded" ? "degraded" : "unverified",
      lastSuccessfulRefreshAt: base.lastSuccessfulRefreshAt,
      evidenceAgeMs: base.evidenceAgeMs,
      lastAttemptedRefreshAt: base.lastAttemptedRefreshAt,
      lastFailureAt: base.lastFailureAt,
      failureCount: base.failureCount,
      activePeriodStartedAt: base.activePeriodStartedAt,
      lastReconnectedAt: base.lastReconnectedAt,
      limitations: state === base.state ? base.limitations : limitationsFor(state),
      evidence: base.lastEvidence,
      connectorStatus: connectorRow?.status ?? "unconfigured",
    };
  });
  const summary = summarizeProviderStates(providers);
  const lastSuccessfulRefreshAt = providers.filter((item) => summary.state !== "unverified" && item.connectorStatus !== "unconfigured").map((item) => item.lastSuccessfulRefreshAt).filter(Boolean).sort().at(-1) ?? null;
  const unavailable = providers.filter((item) => item.state === "offline");
  const degraded = providers.filter((item) => ["degraded", "stale"].includes(item.state));
  const overallState = summary.state;
  const expectedLimitations = overallState === "current"
    ? ["External facts are labeled with their last successful refresh time.", "Local Brain, Event Log, diagnostics, and approved local cognition remain available independently."]
    : ["The canonical Brain, Event Log, local indexes, diagnostics, and approved local cognition remain available when their local dependencies are healthy.", "External provider facts are labeled by freshness and are never represented as current without a successful refresh.", "Provider-dependent actions remain gated by permissions, freshness requirements, CIL, and existing governance."];
  return {
    mode: summary.mode,
    state: overallState,
    summary: overallState === "offline"
      ? "External providers are offline; local LEE capabilities remain available, while live provider reality is unavailable."
      : overallState === "degraded"
        ? "Some provider evidence is degraded or stale; local records remain available and live external claims are labeled."
        : overallState === "current"
          ? "Configured provider evidence has a successful refresh; each external fact still carries its refresh time."
          : "No provider refresh state is verified in this runtime.",
    lastSuccessfulRefreshAt,
    affectedProviders: summary.affectedProviders,
    expectedLimitations,
    localCapabilities: ["canonical_brain", "event_log", "postgresql", "local_indexes", "diagnostics", "approved_local_cognition"],
    providers,
    counts: summary.counts,
  };
}