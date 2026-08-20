import assert from "node:assert/strict";
import test from "node:test";
import { captureEventDelta, createApiClient } from "./test-support/http.mjs";

test("Console request completes Identity, Constitution, Intent, then Context", async () => {
  const api = createApiClient();
  const before = await api.get("/api/events?eventType=RequestPipelineStageCompleted&limit=100");
  const result = await api.post("/api/ai/context-preview", { message: "What is the current status?", mode: "no_model" });
  const after = await api.get("/api/events?eventType=RequestPipelineStageCompleted&limit=100");
  const beforeIds = new Set(before.map((event) => event.id));
  const captured = { result, events: after.filter((event) => !beforeIds.has(event.id)) };
  assert.equal(captured.result.intent.intentType, "status_check");
  const completed = captured.events
    .filter((event) => event.eventType === "RequestPipelineStageCompleted")
    .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
    .map((event) => event.payload.stage);
  assert.deepEqual(completed, ["identity", "constitution", "intent", "context"]);
});

test("Unauthenticated internal request is rejected before it can bypass the pipeline", async () => {
  const response = await fetch("http://127.0.0.1:8080/api/internal/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "execute irreversible action" }),
  });
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.pipeline.failedStage, "constitution");
  assert.deepEqual(body.pipeline.completedStages, ["identity"]);
});
