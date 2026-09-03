import assert from "node:assert/strict";
import test from "node:test";
import { projectConnectionHealth } from "../src/lib/connection-center";

const base = {
  id: "connection-1",
  displayName: "Optional provider",
  targetType: "provider",
  method: "oauth",
  status: "connected",
  authStatus: "authorized",
  baseUrl: "https://provider.invalid",
  healthEndpoint: "/health",
  contractVersion: "v1",
  permissions: ["OBSERVE", "USE"],
  capabilities: [{ id: "read", name: "Read records" }],
  dependencies: [{ id: "network", required: true }],
  configuration: { oauthProvider: "provider" },
  credentialRef: "server-only",
  lastHealthCheck: new Date("2026-09-02T10:00:00.000Z"),
  lastError: null,
} as any;

test("connection health is provider-neutral and redacts Android diagnostics", () => {
  const projection = projectConnectionHealth(base, undefined, ["provider.read"], false);
  assert.equal(projection.authority.primary, "USE");
  assert.deepEqual(projection.capabilities, ["Read records"]);
  assert.equal(projection.credentialConfigured, true);
  assert.equal("diagnostics" in projection, false);
  assert.equal(projection.health.ownerActionRequired, false);
  assert.match(projection.health.summary, /ready/i);
});

test("optional provider degradation explains remaining availability and automatic recovery", () => {
  const projection = projectConnectionHealth({ ...base, status: "degraded", lastError: "Provider timed out." }, undefined, [], false);
  assert.equal(projection.health.whatFailed, "Provider timed out.");
  assert.match(projection.health.remainsAvailable, /synced|local/i);
  assert.equal(projection.health.recoveryAutomatic, true);
  assert.equal(projection.health.ownerActionRequired, false);
  assert.match(projection.health.blocked ?? "", /live|operation/i);
});

test("reauthorization and authority mismatch stay explicit and fail closed", () => {
  const projection = projectConnectionHealth({ ...base, status: "needs_reauthorization", permissions: [], credentialRef: null, lastError: "Authorization expired." }, undefined, [], false);
  assert.equal(projection.authority.primary, "OBSERVE");
  assert.equal(projection.authority.governsConsequentialActions, false);
  assert.equal(projection.health.ownerActionRequired, true);
  assert.equal(projection.health.recoveryAutomatic, true);
  assert.match(projection.health.blocked ?? "", /blocked/i);
});

test("canonical connection failure retains local availability but blocks live operations", () => {
  const projection = projectConnectionHealth({ ...base, status: "unavailable", permissions: ["OBSERVE"], lastError: "Health endpoint unavailable." }, undefined, [], false);
  assert.equal(projection.authority.primary, "OBSERVE");
  assert.match(projection.health.whatFailed ?? "", /unavailable/i);
  assert.match(projection.health.remainsAvailable, /local|previously/i);
  assert.match(projection.health.blocked ?? "", /live/i);
  for (const key of ["whatFailed", "remainsAvailable", "blocked", "recoveryAutomatic", "ownerActionRequired"]) assert.ok(key in projection.health, `missing warning field ${key}`);
});

test("desktop diagnostics are opt-in and connector sync becomes the successful operation", () => {
  const sync = { provider: "provider", lastSyncAt: new Date("2026-09-02T12:00:00.000Z"), lastError: null } as any;
  const projection = projectConnectionHealth({ ...base, baseUrl: "https://provider.invalid?access_token=never-expose", configuration: { oauthProvider: "provider", apiKey: "never-expose", safe: "visible" } }, sync, ["provider.read"], true);
  assert.equal(projection.diagnostics?.baseUrl, "https://provider.invalid/");
  assert.deepEqual(projection.diagnostics?.grantedScopes, ["provider.read"]);
  assert.deepEqual(projection.diagnostics?.configuration, { oauthProvider: "provider", safe: "visible" });
  assert.equal(projection.lastSuccessfulOperation?.label, "Provider sync");
  assert.equal(projection.lastSuccessfulOperation?.at, "2026-09-02T12:00:00.000Z");
});