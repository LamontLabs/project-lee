import http from "node:http";

export async function startInternalServiceStubs({ cilStatus = 200 } = {}) {
  const calls = [];
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    calls.push({ method: request.method, path: request.url, body: body ? JSON.parse(body) : null });
    response.setHeader("content-type", "application/json");
    if (request.url === "/health") return response.end(JSON.stringify({ status: "ok" }));
    if (request.url === "/policy/current-version") return response.end(JSON.stringify({ policy_pack_version: "2026.7.1", effective_from: "2026-07-01T00:00:00Z" }));
    if (request.url === "/api/capabilities/models") return response.end(JSON.stringify({
      correlation_id: request.headers["x-lee-correlation-id"],
      total_configured: 3,
      total_enabled: 3,
      total_available: 3,
      total_unavailable: 0,
      models: [
        { model_id: "gpt-5-nano", provider: "openai", status: "available", enabled: true, route_ids: ["route-openai"] },
        { model_id: "claude-haiku-4-5", provider: "anthropic", status: "available", enabled: true, route_ids: ["route-anthropic"] },
        { model_id: "gemini-2.5-flash", provider: "gemini", status: "available", enabled: true, route_ids: ["route-gemini"] },
      ],
    }));
    if (request.url === "/v1/query" || request.url === "/query/lee") {
      if (cilStatus !== 200) {
        response.statusCode = cilStatus;
        return response.end(JSON.stringify({ error_code: "SERVICE_UNAVAILABLE", correlation_id: calls.at(-1).body?.correlation_id }));
      }
      return response.end(JSON.stringify({ correlation_id: calls.at(-1).body.correlation_id, resolution_tier: "T1_TRIGRAM", answer: "stub answer", confidence: 0.95, cost_usd: 0, latency_ms: 1, semantic_domain: calls.at(-1).body.semantic_domain ?? "test", reuse_eligible: true, drift_detected: false, contradiction_detected: false, provenance: ["stub"], governance_status: "approved", freshness_state: "fresh", recommend_escalation: false }));
    }
    if (request.url === "/govern/evaluate") return response.end(JSON.stringify({ verdict: "ALLOW", reason_codes: ["TEST_STUB"], checked_invariants: ["stub"], decision_id: "stub-decision", decision_envelope: "stub-envelope", evidence_bundle_ref: "stub-evidence", audit_entry_ref: "stub-audit", policy_version: "test", timestamp: new Date().toISOString(), replay_checksum: "stub-checksum", human_confirmation_required: false }));
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { baseUrl: `http://127.0.0.1:${port}`, calls, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}
