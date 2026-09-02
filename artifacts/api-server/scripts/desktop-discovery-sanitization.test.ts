import assert from "node:assert/strict";
import test from "node:test";
import { eq } from "drizzle-orm";
import { connection, db, pool } from "@workspace/db";
import {
  acceptDiscoveredService,
  normalizeDiscoveryReport,
} from "../src/lib/desktop-setup.ts";
import { DEFAULT_LOCAL_SERVICE_CONTRACTS } from "../src/lib/local-service-contracts.ts";

const contracts = DEFAULT_LOCAL_SERVICE_CONTRACTS.map(({ description: _description, ...contract }) => contract);

test("discovery review keeps failure reasons and metadata safe", () => {
  const report = normalizeDiscoveryReport({
    candidates: [
      {
        contractId: "k6",
        baseUrl: "http://127.0.0.1:6420",
        healthEndpoint: "/k6/contract",
        displayName: "api_key=do-not-forward",
        contractVersion: "secret=do-not-forward",
        capabilities: [
          { id: "api_key=do-not-forward", name: "worker", state: "ready", extra: "discarded" },
          { name: "token=do-not-forward" },
        ],
        dependencies: [
          { id: "password=do-not-forward", name: "database", required: true },
          { engine: "credential=do-not-forward", state: "ready" },
        ],
        observedAt: "not-a-timestamp",
      },
      {
        contractId: "k6",
        baseUrl: "http://127.0.0.1:6420/?token=do-not-forward",
        healthEndpoint: "/k6/contract",
      },
      {
        contractId: "unknown-service",
        baseUrl: "http://127.0.0.1:6420",
        healthEndpoint: "/k6/contract",
      },
    ],
    failures: [
      { contractId: "k6", displayName: "secret=do-not-forward", endpoint: "http://127.0.0.1:6420/private", reason: "Malformed response" },
      { contractId: "k6", endpoint: "http://127.0.0.1:6420/?api_key=do-not-forward", reason: "Oversized response" },
      { contractId: "k6", endpoint: "http://127.0.0.1:6420", reason: "oversized response with secret=do-not-forward" },
      { contractId: "k6", endpoint: "http://127.0.0.1:6420", reason: "Returned HTTP 502" },
    ],
    attempted: 999,
    completedAt: "token=do-not-forward",
  }, contracts);

  assert.equal(report.candidates.length, 1);
  assert.deepEqual(report.candidates[0], {
    discoveryKey: "k6|http://127.0.0.1:6420|/k6/contract",
    contractId: "k6",
    provider: "k6",
    displayName: "K6 Service Contract",
    targetType: "service",
    method: "local",
    baseUrl: "http://127.0.0.1:6420",
    healthEndpoint: "/k6/contract",
    contractVersion: "v1",
    capabilities: [{ name: "worker", state: "ready" }],
    dependencies: [{ name: "database", required: true }, { state: "ready" }],
    observedAt: undefined,
  });
  assert.deepEqual(report.failures, [
    { contractId: "k6", displayName: "K6 Service Contract", endpoint: "http://127.0.0.1:6420", reason: "Malformed response" },
    { contractId: "k6", displayName: "K6 Service Contract", endpoint: "http://127.0.0.1:6420", reason: "Oversized response" },
    { contractId: "k6", displayName: "K6 Service Contract", endpoint: "http://127.0.0.1:6420", reason: "The allowlisted contract was not available." },
    { contractId: "k6", displayName: "K6 Service Contract", endpoint: "http://127.0.0.1:6420", reason: "Returned HTTP 502" },
  ]);
  assert.equal(report.attempted, 100);
  assert.equal(report.completedAt, undefined);
  assert.doesNotMatch(JSON.stringify(report), /do-not-forward|api[_-]?key|secret|password|token|credential/i);
});

test("malformed discovery cannot create or reuse a local connection", async () => {
  const before = await db
    .select({ id: connection.id, baseUrl: connection.baseUrl, healthEndpoint: connection.healthEndpoint })
    .from(connection)
    .where(eq(connection.method, "local"));

  await assert.rejects(
    () => acceptDiscoveredService({
      contractId: "k6",
      baseUrl: "http://127.0.0.1:6420/?token=do-not-forward",
      healthEndpoint: "/k6/contract",
      displayName: "secret=do-not-forward",
    }),
    /not an approved discovery candidate/,
  );

  const after = await db
    .select({ id: connection.id, baseUrl: connection.baseUrl, healthEndpoint: connection.healthEndpoint })
    .from(connection)
    .where(eq(connection.method, "local"));
  assert.deepEqual(after, before);
});

test.after(async () => {
  await pool.end();
});