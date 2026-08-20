import test from "node:test";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:8080/api";

async function reconstruct(reference) {
  const response = await fetch(`${base}/time-machine/reconstruct`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reference }),
  });
  return { response, body: await response.json() };
}

test("Time Machine rejects empty and unresolved references instead of using the current time", async () => {
  const empty = await reconstruct("");
  assert.equal(empty.response.status, 400);
  assert.match(empty.body.error, /reference is required/i);

  const unresolved = await reconstruct("not-a-date");
  assert.equal(unresolved.response.status, 400);
  assert.match(unresolved.body.error, /valid date or match/i);
});

test("Time Machine still reconstructs a valid historical date", async () => {
  const result = await reconstruct("2020-01-01T00:00:00.000Z");
  assert.equal(result.response.status, 200);
  assert.equal(result.body.targetAt, "2020-01-01T00:00:00.000Z");
});