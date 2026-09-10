import assert from "node:assert/strict";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { db, eventLog, providerFreshness, providerFreshnessPeriod } from "@workspace/db";
import {
  getOfflineAwareness,
  getProviderFreshnessHistory,
  getProviderFreshnessMap,
  recordProviderRefreshAttempt,
  recordProviderRefreshFailure,
  recordProviderRefreshSuccess,
  summarizeProviderStates,
} from "../src/lib/offline-awareness";

test("offline periods persist last successful evidence, limitations, and safe reconnection", async () => {
  const providerId = `offline-contract-${Date.now()}`;
  const firstAttempt = new Date(Date.now() - 5 * 60 * 1000);
  const reconnectAt = new Date(Date.now() - 60 * 1000);
  await recordProviderRefreshAttempt(providerId, firstAttempt);
  const failed = await recordProviderRefreshFailure(providerId, "Provider timed out.", { attemptedAt: firstAttempt });
  assert.equal(failed.state, "offline");

  const offline = (await getProviderFreshnessMap()).get(providerId);
  assert.equal(offline?.state, "offline");
  assert.equal(offline?.lastSuccessfulRefreshAt, null);
  assert.match(offline?.limitations.join(" ") ?? "", /previously synchronized|live provider/i);
  assert.ok(offline?.activePeriodStartedAt);

  const recovery = await recordProviderRefreshSuccess(providerId, { refreshAt: reconnectAt, changedCount: 2, preservedLocalObservationCount: 1 });
  assert.equal(recovery.reconnected, true);
  const current = (await getProviderFreshnessMap()).get(providerId);
  assert.equal(current?.state, "current");
  assert.equal(current?.lastSuccessfulRefreshAt, reconnectAt.toISOString());
  assert.equal(current?.failureCount, 0);
  assert.equal(current?.activePeriodStartedAt, null);
  assert.equal(current?.lastReconnectedAt, reconnectAt.toISOString());

  const history = await getProviderFreshnessHistory(providerId);
  assert.equal(history.length, 1);
  assert.equal(history[0].state, "offline");
  assert.equal(history[0].endedAt?.toISOString(), reconnectAt.toISOString());

  const events = await db.select().from(eventLog).where(eq(eventLog.sourceRef, `provider:${providerId}`));
  assert.deepEqual(events.map((event) => event.eventType).sort(), ["ProviderRefreshUnavailable", "ProviderReconnected"].sort());
});

test("freshness is computed as stale without rewriting canonical provider records", async () => {
  const providerId = `stale-contract-${Date.now()}`;
  const lastSuccess = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  await db.insert(providerFreshness).values({
    providerId,
    state: "current",
    lastSuccessfulRefreshAt: lastSuccess,
    evidenceAgeMs: 0,
    limitations: ["test limitation"],
  });
  const before = await db.select().from(providerFreshness).where(eq(providerFreshness.providerId, providerId));
  const projected = (await getProviderFreshnessMap()).get(providerId);
  const after = await db.select().from(providerFreshness).where(eq(providerFreshness.providerId, providerId));
  assert.equal(projected?.state, "stale");
  assert.equal(after[0].state, before[0].state);
  assert.equal((await getOfflineAwareness()).localCapabilities.includes("event_log"), true);
});

test("one failed provider produces partial awareness without taking current providers offline", () => {
  const summary = summarizeProviderStates([
    { provider: "github", state: "current", connectorStatus: "healthy" },
    { provider: "google_drive", state: "offline", connectorStatus: "error" },
  ]);
  assert.equal(summary.state, "degraded");
  assert.equal(summary.mode, "partial");
  assert.deepEqual(summary.counts, { configured: 2, current: 1, degraded: 0, unavailable: 1 });
  assert.deepEqual(summary.affectedProviders, ["google_drive"]);
});