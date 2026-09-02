import assert from "node:assert/strict";
import test from "node:test";

const base = "http://127.0.0.1:8080";
const json = async (path, options) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "content-type": "application/json", ...(options?.headers ?? {}) } });
  return { response, body: await response.json() };
};

test("Full System Check runs behavioral diagnostics with timestamped evidence", async () => {
  const before = await json("/api/events?eventType=SelfTestCompleted&limit=20");
  const run = await json("/api/self-tests/run", { method: "POST", body: "{}" });
  assert.equal(run.response.status, 201);
  assert.match(run.body.test_run_id, /^[0-9a-f-]{36}$/i);
  assert.ok(["PASS", "WARN", "FAIL"].includes(run.body.overall_result));
  assert.ok(run.body.test_suites.length >= 4);
  const tests = run.body.test_suites.flatMap((suite) => {
    assert.ok(["PASS", "WARN", "FAIL"].includes(suite.result));
    return suite.tests;
  });
  assert.ok(tests.length >= 20);
  for (const item of tests) {
    assert.ok(["PASS", "WARN", "FAIL"].includes(item.result));
    assert.ok(item.started_at && item.completed_at);
    assert.ok(item.evidence && item.evidence.observed_at);
    assert.notEqual(item.evidence.synthetic, true);
  }
  const history = await json("/api/self-tests");
  assert.equal(history.response.status, 200);
  assert.ok(history.body.some((item) => item.testRunId === run.body.test_run_id));
  const after = await json("/api/events?eventType=SelfTestCompleted&limit=20");
  const newEvents = after.body.filter((event) => !before.body.some((previous) => previous.id === event.id) && event.aggregateId === run.body.test_run_id);
  assert.equal(newEvents.length, 1);
  assert.equal(newEvents[0].payload.overallResult, run.body.overall_result);
});