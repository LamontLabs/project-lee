import assert from "node:assert/strict";
import test from "node:test";

const base = "http://127.0.0.1:8080";
const json = async (path, options) => {
  const response = await fetch(`${base}${path}`, { ...options, headers: { "content-type": "application/json", ...(options?.headers ?? {}) } });
  return { response, body: await response.json() };
};

test("projection replay exposes durable checkpoints and deterministic dry-run results", async () => {
  const first = await json("/api/projection/replay", { method: "POST", body: JSON.stringify({ dryRun: true }) });
  const second = await json("/api/projection/replay", { method: "POST", body: JSON.stringify({ dryRun: true }) });
  assert.equal(first.response.status, 200);
  assert.deepEqual(first.body, second.body);
  assert.ok(first.body.every((result) => result.dryRun === true && Array.isArray(result.conflicts)));

  const checkpoints = await json("/api/projection/checkpoints");
  assert.equal(checkpoints.response.status, 200);
  assert.ok(Array.isArray(checkpoints.body));
});

test("universal object mutation appends an event before projection state is returned", async () => {
  const id = crypto.randomUUID();
  const created = await json("/api/objects", {
    method: "POST",
    body: JSON.stringify({ id, objectType: "replay_test", name: "Replay test object", description: "event-first" }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.id, id);
  const events = await json(`/api/events?eventType=UniversalObjectCreated&limit=20`);
  const event = events.body.find((item) => item.aggregateId === id);
  assert.ok(event);
  assert.equal(created.body.version, event.sequenceNumber);
});
