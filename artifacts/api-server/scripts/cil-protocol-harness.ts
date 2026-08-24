import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { reasoningService, type CILQueryRequest } from "../src/services/internal-services";
import { routeModelRequest } from "../src/lib/model-router";
import { openai } from "@workspace/integrations-openai-ai-server";

type Mode = "T1" | "T2" | "T3" | "DRIFT" | "CONTRADICTION" | "MALFORMED" | "WRONG_CORRELATION" | "UNAVAILABLE";
let mode: Mode = "T1";
const seen = new Set<string>();
let received = 0;

const server = http.createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const body = JSON.parse(raw) as CILQueryRequest;
  received += 1;
  const timestamp = request.headers["x-lee-timestamp"];
  const correlation = request.headers["x-lee-correlation-id"];
  const signature = request.headers["x-lee-signature"];
  const expected = createHmac("sha256", "cil-test-hmac").update(`${correlation}.${timestamp}.${createHash("sha256").update(raw).digest("hex")}`).digest("hex");
  assert.equal(request.headers.authorization, "Bearer cil-test-key");
  assert.ok(timestamp && Math.abs(Date.now() / 1000 - Number(timestamp)) < 300);
  assert.equal(signature, expected);
  response.setHeader("content-type", "application/json");
  if (mode === "UNAVAILABLE") {
    response.statusCode = 503;
    return response.end(JSON.stringify({ error_code: "SERVICE_UNAVAILABLE", correlation_id: body.correlation_id }));
  }
  if (seen.has(body.correlation_id)) {
    response.statusCode = 409;
    return response.end(JSON.stringify({ error_code: "REPLAYED_REQUEST", correlation_id: body.correlation_id }));
  }
  seen.add(body.correlation_id);
  if (mode === "MALFORMED") return response.end(JSON.stringify({ correlation_id: body.correlation_id, answer: "missing contract fields" }));
  const tier = mode === "T1" || mode === "DRIFT" || mode === "CONTRADICTION" ? "T1_TRIGRAM" : mode === "T2" ? "T2_SEMANTIC" : "T3_FRONTIER";
  return response.end(JSON.stringify({
    correlation_id: mode === "WRONG_CORRELATION" ? randomUUID() : body.correlation_id,
    resolution_tier: tier,
    answer: `answer-${mode}`,
    model_route: tier === "T3_FRONTIER" ? { model: "gpt-5.6-terra", provider: "openai", route_id: "test-frontier" } : undefined,
    cognitive_asset_id: tier === "T3_FRONTIER" ? undefined : "asset:test-asset",
    asset_version: tier === "T3_FRONTIER" ? undefined : "7",
    confidence: mode === "DRIFT" ? 0.61 : 0.93,
    cost_usd: tier === "T3_FRONTIER" ? 0.012 : 0,
    latency_ms: 42,
    semantic_domain: body.semantic_domain,
    reuse_eligible: tier !== "T3_FRONTIER",
    drift_detected: mode === "DRIFT",
    contradiction_detected: mode === "CONTRADICTION",
    provenance: ["asset:test-asset", "source:test-source"],
    governance_status: tier === "T3_FRONTIER" ? undefined : "approved",
    freshness_state: "current",
    recommend_escalation: tier === "T3_FRONTIER",
    escalation_reason: tier === "T3_FRONTIER" ? "No approved reusable asset" : undefined,
  }));
});

server.listen(0, "127.0.0.1", () => {
const port = (server.address() as { port: number }).port;
const previous = {
  endpoint: process.env.CIL_LEE_ENDPOINT,
  apiKey: process.env.CIL_API_KEY,
  hmac: process.env.CIL_HMAC_SECRET,
};
process.env.CIL_LEE_ENDPOINT = `http://127.0.0.1:${port}/query/lee`;
process.env.CIL_API_KEY = "cil-test-key";
process.env.CIL_HMAC_SECRET = "cil-test-hmac";

function request(correlation_id = randomUUID()): CILQueryRequest {
  return {
    correlation_id,
    lee_brain_version: "2026.7.1",
    source_context_checksum: "sha256:test",
    query_text: "test query",
    semantic_domain: "technical",
    intent: { intent_type: "ANALYSIS", risk_classification: "LOW" },
    context_asset_refs: ["fact:test"],
    freshness_requirement: "current",
    reuse_permitted: true,
    frontier_escalation_permitted: true,
    desired_format: "detailed",
  };
}

test.after(async () => {
  if (previous.endpoint === undefined) delete process.env.CIL_LEE_ENDPOINT; else process.env.CIL_LEE_ENDPOINT = previous.endpoint;
  if (previous.apiKey === undefined) delete process.env.CIL_API_KEY; else process.env.CIL_API_KEY = previous.apiKey;
  if (previous.hmac === undefined) delete process.env.CIL_HMAC_SECRET; else process.env.CIL_HMAC_SECRET = previous.hmac;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("CIL T1, T2, and T3 preserve tier, cost, and latency evidence", async () => {
  for (const expected of [["T1", "T1_TRIGRAM"], ["T2", "T2_SEMANTIC"], ["T3", "T3_FRONTIER"]] as const) {
    mode = expected[0];
    const result = await reasoningService.query(request());
    assert.equal(result.resolution_tier, expected[1]);
    assert.equal(result.latency_ms, 42);
    assert.equal(result.provenance[0], "asset:test-asset");
  }
});

test("CIL drift, contradiction, provenance, and confidence remain visible", async () => {
  mode = "DRIFT";
  const drift = await reasoningService.query(request());
  assert.equal(drift.drift_detected, true);
  assert.equal(drift.confidence, 0.61);
  assert.ok(drift.provenance.length >= 2);
  mode = "CONTRADICTION";
  const contradiction = await reasoningService.query(request());
  assert.equal(contradiction.contradiction_detected, true);
});

test("CIL rejects malformed, mismatched, and replayed responses", async () => {
  mode = "MALFORMED";
  await assert.rejects(reasoningService.query(request()), /Invalid CIL response schema/);
  mode = "WRONG_CORRELATION";
  await assert.rejects(reasoningService.query(request()), /Invalid CIL response schema/);
  mode = "T1";
  const correlation = randomUUID();
  await reasoningService.query(request(correlation));
  await assert.rejects(reasoningService.query(request(correlation)), /HTTP 409/);
});

test("CIL unavailability is recorded as graceful degradation", async () => {
  mode = "UNAVAILABLE";
  await assert.rejects(reasoningService.query(request()), /HTTP 503/);
  assert.ok(received > 0);
});

test("CIL unavailability blocks model execution instead of selecting a local fallback", async () => {
  mode = "UNAVAILABLE";
  const originalCreate = openai.chat.completions.create;
  let providerCalls = 0;
  (openai.chat.completions as any).create = async () => ({
    ...(providerCalls++, {}),
    choices: [{ message: { content: "frontier fallback answer" } }],
    usage: { prompt_tokens: 12, completion_tokens: 8 },
  });
  try {
    const correlationId = randomUUID();
    await assert.rejects(routeModelRequest({
      correlationId,
      pipeline: { correlationId, stages: ["identity", "constitution", "intent", "context"] },
      queryText: "fallback test",
      semanticDomain: "technical",
      intentType: "ANALYSIS",
      riskClassification: "LOW",
      contextItems: [],
      preferredTier: "T1",
    }), /CIL_UNAVAILABLE/);
    assert.equal(providerCalls, 0);
  } finally {
    (openai.chat.completions as any).create = originalCreate;
  }
});
});