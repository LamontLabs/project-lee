import assert from "node:assert/strict";
import test from "node:test";

const base = "http://127.0.0.1:8080";
const request = (path, options = {}) => fetch(`${base}${path}`, { ...options, headers: { ...(options.headers ?? {}) } });

test("internal aliases are not public and reject unauthenticated access", async () => {
  const direct = await request("/internal/registry");
  assert.equal(direct.status, 404);

  const internal = await request("/api/internal/registry");
  assert.equal(internal.status, 403);
  assert.match((await internal.json()).error, /registered engine identity/i);

  const services = await request("/api/internal-services/health");
  assert.equal(services.status, 403);
});

test("internal CORS responses contain no secret values", async () => {
  const response = await request("/api/internal-services/health", {
    method: "OPTIONS",
    headers: { origin: "https://example.test", "access-control-request-method": "GET" },
  });
  assert.ok([403, 204].includes(response.status));
  const text = await response.text();
  assert.doesNotMatch(text, /api[_-]?key|authorization|bearer|session_secret|internal_api_token/i);
  assert.ok(response.headers.get("access-control-allow-origin"));
});

test("registered service identity can use an internal contract", async () => {
  const response = await request("/api/internal/intent/classify", {
    method: "POST",
    headers: { "content-type": "application/json", "x-engine-id": "intent-engine" },
    body: JSON.stringify({ raw_input: "What is the current status?" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.contract_version, "v1");
  assert.equal(body.data.source, "internal");
});
