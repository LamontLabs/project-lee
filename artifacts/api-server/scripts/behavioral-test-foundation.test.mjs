import assert from "node:assert/strict";
import test from "node:test";
import { isolatedSchemaExists, withIsolatedDatabase } from "./test-support/database.mjs";
import { captureEventDelta, createApiClient } from "./test-support/http.mjs";
import { simulateRestart, withFailureInjection } from "./test-support/process.mjs";
import { startInternalServiceStubs } from "./test-support/service-stubs.mjs";

test("isolated database setup, write, and teardown are deterministic", async () => {
  let schema;
  await withIsolatedDatabase(async (database) => {
    schema = database.schema;
    await database.query("INSERT INTO probe (id, value) VALUES (1, 'isolated');");
    assert.equal(await database.query("SELECT value FROM probe WHERE id = 1;"), "isolated");
  });
  assert.equal(await isolatedSchemaExists(schema), false);
});

test("API helper and event capture observe the live server", async () => {
  const api = createApiClient();
  assert.equal((await api.get("/api/health")).status, "ok");
  const captured = await captureEventDelta(api, () => api.get("/api/events"));
  assert.ok(Array.isArray(captured.events));
  assert.ok(captured.afterCount >= captured.beforeCount);
});

test("restart simulation runs the same worker twice", async () => {
  const result = await simulateRestart(process.execPath, ["-e", "process.stdout.write('ready')"]);
  assert.equal(result.restarted, true);
  assert.equal(result.first.stdout, "ready");
  assert.equal(result.second.stdout, "ready");
});

test("failure injection is observable and contained", async () => {
  const result = await withFailureInjection(new Error("injected failure"), async () => {
    throw new Error("injected failure");
  });
  assert.deepEqual(result, { injected: true, error: "Error: injected failure" });
});

test("CIL and CerbaSeal stubs expose deterministic contracts", async () => {
  const stubs = await startInternalServiceStubs();
  try {
    const health = await fetch(`${stubs.baseUrl}/health`);
    const query = await fetch(`${stubs.baseUrl}/v1/query`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ correlation_id: "test-correlation" }) });
    const governance = await fetch(`${stubs.baseUrl}/govern/evaluate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lee_request_id: "test-request" }) });
    assert.equal(health.status, 200);
    assert.equal((await query.json()).resolution_tier, "T1_TRIGRAM");
    assert.equal((await governance.json()).verdict, "ALLOW");
    assert.equal(stubs.calls.length, 3);
  } finally {
    await stubs.close();
  }
});

test("deliberately broken invariant fails in a child process", async () => {
  const result = await simulateRestart(process.execPath, ["-e", "if (1 + 1 === 3) process.exit(0); process.exit(1)"]);
  assert.equal(result.restarted, false);
  assert.notEqual(result.first.code, 0);
  assert.notEqual(result.second.code, 0);
});
