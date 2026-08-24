import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import test from "node:test";
import { startInternalServiceStubs } from "./test-support/service-stubs.mjs";
import { createApiClient } from "./test-support/http.mjs";

let api;
let apiProcess;
let stubs;

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi(baseUrl) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not become ready for the pipeline acceptance test.");
}

test.before(async () => {
  stubs = await startInternalServiceStubs();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  apiProcess = spawn(process.execPath, ["dist/index.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      CIL_LEE_ENDPOINT: `${stubs.baseUrl}/query/lee`,
      CIL_API_KEY: "pipeline-test-key",
      CIL_HMAC_SECRET: "pipeline-test-hmac",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  apiProcess.stderr.on("data", (chunk) => { stderr += chunk; });
  apiProcess.on("exit", (code) => {
    if (code !== null && code !== 0) stderr = `${stderr}\nAPI exited with code ${code}`;
  });
  await waitForApi(baseUrl).catch((error) => {
    apiProcess.kill("SIGTERM");
    throw new Error(`${error.message}\n${stderr}`);
  });
  api = createApiClient(baseUrl);
});

test.after(async () => {
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill("SIGTERM");
    await new Promise((resolve) => apiProcess.once("exit", resolve));
  }
  await stubs?.close();
});

test("Console request completes Identity, Constitution, Intent, Context, and CIL consultation", async () => {
  const before = await api.get("/api/events?eventType=RequestPipelineStageCompleted&limit=100");
  const beforeCil = await api.get("/api/events?eventType=CILQueryRequested&limit=100");
  const result = await api.post("/api/ai/context-preview", { message: "What is the current status?", mode: "no_model" });
  const after = await api.get("/api/events?eventType=RequestPipelineStageCompleted&limit=100");
  const afterCil = await api.get("/api/events?eventType=CILQueryResolved&limit=100");
  const beforeIds = new Set(before.map((event) => event.id));
  const beforeCilIds = new Set(beforeCil.map((event) => event.id));
  const captured = { result, events: after.filter((event) => !beforeIds.has(event.id)) };
  assert.equal(captured.result.intent.intentType, "status_check");
  const completed = captured.events
    .filter((event) => event.eventType === "RequestPipelineStageCompleted")
    .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
    .map((event) => event.payload.stage);
  assert.deepEqual(completed, ["identity", "constitution", "intent", "context"]);
  const cilEvents = afterCil.filter((event) => !beforeCilIds.has(event.id));
  const consultation = cilEvents.find((event) => event.aggregateId === result.cil.correlation_id);
  assert.ok(consultation, "the request must emit a CIL consultation event");
  assert.equal(result.cil.resolution_tier, "T1_TRIGRAM");
});

test("Unauthenticated internal request is rejected before it can bypass the pipeline", async () => {
  const response = await fetch(`${api.baseUrl ?? ""}/api/internal/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "execute irreversible action" }),
  });
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.pipeline.failedStage, "constitution");
  assert.deepEqual(body.pipeline.completedStages, ["identity"]);
});

test("CIL model inventory remains observable and read-only", async () => {
  const result = await api.get("/api/systems/cil/model-inventory");
  assert.equal(result.readOnly, true);
  assert.equal(result.inventory.total_configured, 3);
  assert.equal(result.inventory.total_available, 3);
  assert.deepEqual(result.inventory.models.map((model) => model.provider).sort(), ["anthropic", "gemini", "openai"]);
  const inventoryCall = stubs.calls.find((call) => call.path === "/api/capabilities/models");
  assert.equal(inventoryCall?.method, "GET");
  assert.equal(inventoryCall?.body, null);
});
