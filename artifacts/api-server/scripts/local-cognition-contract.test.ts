import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import http from "node:http";
import { eq } from "drizzle-orm";
import { costRecord, db, economicUsageRecord, eventLog, internalCapabilityService, resourceSnapshot } from "@workspace/db";
import {
  LOCAL_BACKGROUND_WORKLOADS,
  callOllama,
  getOllamaStatus,
  isApprovedLocalWorkload,
  localFailureEvidence,
  localResourceLimits,
  recordLocalCognitionRun,
} from "../src/lib/local-cognition";
import { routeModelRequest } from "../src/lib/model-router";

test("local cognition exposes only explicit approved background workloads", () => {
  assert.ok(LOCAL_BACKGROUND_WORKLOADS.includes("consolidation"));
  assert.equal(isApprovedLocalWorkload("consolidation"), true);
  assert.equal(isApprovedLocalWorkload("interactive_chat"), false);
  assert.equal(isApprovedLocalWorkload(undefined), false);
});

test("local limits are bounded and become stricter under constrained resources", () => {
  const normal = localResourceLimits(false);
  const constrained = localResourceLimits(true);
  assert.ok(normal.maxInputCharacters > 0);
  assert.ok(normal.maxContextTokens > 0);
  assert.ok(constrained.maxOutputTokens <= normal.maxOutputTokens);
  assert.ok(constrained.timeoutMs <= 120_000);
});

test("a CIL-selected local route cannot execute without an approved workload", async () => {
  const correlationId = randomUUID();
  await assert.rejects(routeModelRequest({
    correlationId,
    pipeline: { correlationId, stages: ["identity", "constitution", "intent", "context"] },
    queryText: "interactive request",
    semanticDomain: "technical",
    intentType: "ANALYSIS",
    riskClassification: "LOW",
    contextItems: [],
    preferredTier: "T3",
  }, {
    correlation_id: correlationId,
    resolution_tier: "T3_FRONTIER",
    answer: "",
    model_route: { model: "llama3.2", provider: "ollama", route_id: "cil-local-test" },
    confidence: 0.9,
    cost_usd: 0,
    latency_ms: 1,
    semantic_domain: "technical",
    reuse_eligible: false,
    drift_detected: false,
    contradiction_detected: false,
    provenance: ["cil:test"],
    freshness_state: "current",
    recommend_escalation: false,
  }), /LOCAL_WORKLOAD_NOT_APPROVED/);
});

test("local failure evidence preserves CIL authority and route identity", () => {
  const evidence = localFailureEvidence(
    { model: "llama3.2", provider: "ollama", routeId: "cil-route-1" },
    "consolidation",
    "OLLAMA_UNAVAILABLE",
  );
  assert.equal(evidence.routeAuthority, "cil");
  assert.equal(evidence.destination, "local_k6");
  assert.equal(evidence.routeId, "cil-route-1");
  assert.equal(evidence.availability, "unavailable");
  assert.equal(evidence.degradedReason, "OLLAMA_UNAVAILABLE");
});

test("Ollama adapter normalizes local output and honors cancellation", async () => {
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.url === "/api/tags") {
      response.end(JSON.stringify({ models: [{ name: "llama3.2:latest", size: 123 }] }));
      return;
    }
    if (request.url === "/api/chat") {
      response.end(JSON.stringify({ message: { content: "local answer" }, prompt_eval_count: 9, eval_count: 5 }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const previousBaseUrl = process.env.OLLAMA_BASE_URL;
  const [previousService] = await db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, "ollama")).limit(1);
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${address.port}`;
  try {
    await db.insert(resourceSnapshot).values({
      overallState: "HEALTHY",
      dimensionStates: { cpu: { level: "HEALTHY" }, memory: { level: "HEALTHY" }, disk: { level: "HEALTHY" } },
    });
    const result = await callOllama(
      { model: "llama3.2", provider: "ollama", routeId: "cil-ollama-test" },
      [{ role: "user", content: "Summarize this local test." }],
      randomUUID(),
      "summarization",
    );
    assert.equal(result.text, "local answer");
    assert.equal(result.tokensIn, 9);
    assert.equal(result.tokensOut, 5);
    assert.equal(result.estimatedCostUsd, 0);
    assert.equal(result.localExecution?.routeAuthority, "cil");
    assert.equal(result.localExecution?.privacy, "local_only");
    assert.equal(result.localExecution?.availability, "available");
    assert.equal((await getOllamaStatus()).health, "healthy");

    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      callOllama(
        { model: "llama3.2", provider: "ollama", routeId: "cil-ollama-cancel-test" },
        [{ role: "user", content: "This request must be cancelled." }],
        randomUUID(),
        "summarization",
        controller.signal,
      ),
    );
    assert.equal((await getOllamaStatus()).health, "healthy", "caller cancellation must not mark a healthy runtime degraded");
  } finally {
    if (previousBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previousBaseUrl;
    if (previousService) {
      await db.update(internalCapabilityService).set({
        baseUrl: previousService.baseUrl,
        currentHealth: previousService.currentHealth,
        lastHealthCheck: previousService.lastHealthCheck,
        lastCallAt: previousService.lastCallAt,
        metrics: previousService.metrics,
        updatedAt: new Date(),
      }).where(eq(internalCapabilityService.id, previousService.id));
    }
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("local runs write cost, measured usage, and event evidence together", async () => {
  const correlationId = randomUUID();
  const route = { model: "llama3.2", provider: "ollama", routeId: "cil-ledger-test" } as const;
  const evidence = localFailureEvidence(route, "consolidation", "test");
  const recorded = await recordLocalCognitionRun({
    correlationId,
    route,
    workloadClass: "consolidation",
    outcome: "failed",
    latencyMs: 21,
    promptTokens: 10,
    completionTokens: 4,
    estimatedCostUsd: 0,
    evidence,
    error: "OLLAMA_UNAVAILABLE",
  });
  const [cost] = await db.select().from(costRecord).where(eq(costRecord.id, recorded.costRecordId)).limit(1);
  const [usage] = await db.select().from(economicUsageRecord).where(eq(economicUsageRecord.id, recorded.usageRecordId)).limit(1);
  const [event] = await db.select().from(eventLog).where(eq(eventLog.id, recorded.eventId)).limit(1);
  assert.equal(cost?.provider, "ollama");
  assert.equal(cost?.tier, "LOCAL");
  assert.equal(cost?.estimatedCostUsd, 0);
  assert.equal(usage?.quantity, 14);
  assert.equal(usage?.evidenceRef, `event:${recorded.eventId}`);
  assert.equal(event?.eventType, "LocalCognitionRunFailed");
  assert.equal((event?.payload as any)?.routeAuthority, "cil");
});