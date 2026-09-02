import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { contextPacket, db, eventLog, intentRecord } from "@workspace/db";
import { constructContextPacket, DEFAULT_WEIGHTS } from "../src/lib/context-economy";
import { buildContextPacket, hydrateSelectedEmailContext, retrieveEmailCandidates } from "../src/lib/context-engine";
import type { EmailMessage, EmailProvider, EmailThread } from "../src/lib/email-provider";
import { routeModelRequest } from "../src/lib/model-router";
import { runRequestPipeline } from "../src/lib/request-pipeline";
import { reasoningService } from "../src/services/internal-services";

const sender = { name: "Alice", email: "alice@example.com" };
const baseMessage = (id: string, threadId: string, subject: string): EmailMessage => ({
  id,
  threadId,
  subject,
  from: [sender],
  to: [{ email: "owner@example.com" }],
  cc: [],
  date: new Date("2026-08-20T10:00:00.000Z"),
  snippet: "Header-only snippet",
  labels: ["INBOX"],
  unread: true,
  hasAttachments: false,
  attachments: [],
  provider: "mock-mail",
});

function mockProvider(messages: EmailMessage[], threads: Record<string, EmailThread>, fetched: string[]) {
  const provider = {
    async search() {
      return { messages };
    },
    async getThread(threadId: string) {
      fetched.push(threadId);
      return threads[threadId];
    },
  } as unknown as EmailProvider;
  return provider;
}

test("mocked email search returns header-only candidates and never exposes bodies or credentials", async () => {
  const selected = baseMessage("message-selected", "thread-selected", "Launch plan");
  const excluded = baseMessage("message-excluded", "thread-excluded", "Payroll");
  const sensitiveBody = "SELECTED_BODY should only appear after selection.";
  const credentialBody = "UNSELECTED_BODY access_token=never-expose-this";
  const fetched: string[] = [];
  const provider = mockProvider(
    [selected, excluded],
    {
      "thread-selected": {
        id: "thread-selected",
        subject: "Launch plan",
        messages: [{ ...selected, bodyText: sensitiveBody }],
        participants: [sender],
        labels: ["INBOX"],
      },
      "thread-excluded": {
        id: "thread-excluded",
        subject: "Payroll",
        messages: [{ ...excluded, bodyText: credentialBody }],
        participants: [sender],
        labels: ["INBOX"],
      },
    },
    fetched,
  );
  const resolved = {
    provider,
    providerName: "mock-mail",
    connectionId: "mock-connection",
  };

  const result = await retrieveEmailCandidates(
    "Find unread emails from Alice",
    { intentSubtype: "email_search", emailFilters: { sender: "Alice", unread: true } },
    async () => resolved,
  );

  assert.equal(result.unavailable, false);
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.every((candidate) => candidate.item.text.includes("Subject:")));
  assert.ok(result.candidates.every((candidate) => candidate.item.text.includes("From: Alice <alice@example.com>")));
  assert.ok(result.candidates.every((candidate) => !candidate.item.text.includes("SELECTED_BODY")));
  assert.ok(result.candidates.every((candidate) => !candidate.item.text.includes("UNSELECTED_BODY")));
  assert.ok(result.candidates.every((candidate) => !candidate.item.text.includes("access_token")));
  assert.deepEqual(fetched, []);
});

test("budget-excluded email threads are not fetched or persisted, while selected threads hydrate within budget", async () => {
  const selected = baseMessage("message-selected-budget", "thread-selected-budget", "Launch plan");
  const excluded = baseMessage("message-excluded-budget", "thread-excluded-budget", "Payroll");
  const selectedBody = "SELECTED_BODY ".repeat(700);
  const excludedBody = "UNSELECTED_BODY access_token=never-expose-this ".repeat(700);
  const fetched: string[] = [];
  const provider = mockProvider(
    [selected, excluded],
    {
      "thread-selected-budget": {
        id: "thread-selected-budget",
        subject: "Launch plan",
        messages: [{ ...selected, bodyText: selectedBody }],
        participants: [sender],
        labels: ["INBOX"],
      },
      "thread-excluded-budget": {
        id: "thread-excluded-budget",
        subject: "Payroll",
        messages: [{ ...excluded, bodyText: excludedBody }],
        participants: [sender],
        labels: ["INBOX"],
      },
    },
    fetched,
  );
  const result = await retrieveEmailCandidates("Find email", { intentSubtype: "email_search" }, async () => ({
    provider,
    providerName: "mock-mail",
    connectionId: "mock-connection",
  }));
  const selection = constructContextPacket(
    "Launch plan",
    result.candidates.map((candidate) => ({ ...candidate.item, tokenBudget: 100 })),
    100,
    DEFAULT_WEIGHTS,
    "privacy-test",
  );
  const hydrated = await hydrateSelectedEmailContext(selection.items, result.candidates);
  const packet = { items: hydrated, excluded: selection.excluded };
  const serialized = JSON.stringify(packet);

  assert.equal(selection.items.length, 1);
  assert.equal(selection.excluded.length, 1);
  assert.equal(selection.items[0].id, "gmail:thread:thread-selected-budget");
  assert.equal(selection.excluded[0].id, "gmail:thread:thread-excluded-budget");
  assert.deepEqual(fetched, ["thread-selected-budget"]);
  assert.ok(hydrated[0].text.includes("SELECTED_BODY"));
  assert.ok(hydrated[0].text.length <= selection.items[0].estimatedTokens * 4);
  assert.ok(!serialized.includes("UNSELECTED_BODY"));
  assert.ok(!serialized.includes("access_token"));
  assert.ok(!selection.excluded[0].text.includes("UNSELECTED_BODY"));
  assert.ok(!selection.excluded[0].text.includes("access_token"));
});

test("Ask Lee request pipeline keeps excluded email content out of packets, model input, and audit events", async () => {
  const marker = randomUUID();
  const query = `Find unread emails about launch-${marker}`;
  const selected = baseMessage(`message-selected-pipeline-${marker}`, `thread-selected-pipeline-${marker}`, `Launch ${marker}`);
  const excluded = baseMessage(`message-excluded-pipeline-${marker}`, `thread-excluded-pipeline-${marker}`, "Payroll");
  const selectedBody = `SELECTED_BODY_${marker}`;
  const excludedBody = `UNSELECTED_BODY_${marker} access_token=never-expose-this refresh_token=never-expose-this`;
  const searchFilters: unknown[] = [];
  const fetched: string[] = [];
  const provider = {
    async search(filters: unknown) {
      searchFilters.push(filters);
      return { messages: [selected, excluded] };
    },
    async getThread(threadId: string) {
      fetched.push(threadId);
      return threadId === selected.threadId
        ? { id: threadId, subject: selected.subject, messages: [{ ...selected, bodyText: selectedBody }], participants: [sender], labels: ["INBOX"] }
        : { id: threadId, subject: excluded.subject, messages: [{ ...excluded, bodyText: excludedBody }], participants: [sender], labels: ["INBOX"] };
    },
  } as unknown as EmailProvider;
  const resolveEmailProvider = async () => ({
    provider,
    providerName: "mock-mail",
    connectionId: `mock-connection-${marker}`,
  });
  const queryEngine = { query: async () => [] };
  let intentId: string | undefined;
  let packetId: string | undefined;
  const originalCILQuery = reasoningService.query;
  const cilRequests: unknown[] = [];

  try {
    const pipeline = await runRequestPipeline({
      text: query,
      origin: "api",
      actionType: "conversation_message",
      engineName: "Ask Lee",
      mode: "normal",
      budgetTokens: 384,
      correlationId: randomUUID(),
    }, { context: { resolveEmailProvider, queryEngine, founderContext: async () => ({}) } });
    assert.equal(pipeline.ok, true);
    if (!pipeline.ok) return;
    intentId = pipeline.intent.id;
    assert.equal(pipeline.context.id, null);
    assert.equal(pipeline.context.items.length, 1);
    assert.equal(pipeline.context.excluded.length, 1);
    assert.equal(pipeline.context.items[0].id, `gmail:thread:${selected.threadId}`);
    assert.equal(pipeline.context.excluded[0].id, `gmail:thread:${excluded.threadId}`);
    assert.ok(pipeline.context.tokens <= 384);
    assert.ok(pipeline.context.items[0].text.includes(selectedBody));
    assert.ok(!JSON.stringify(pipeline.context).includes(excludedBody));
    assert.ok(!JSON.stringify(pipeline.context).includes("access_token"));
    assert.deepEqual(fetched, [selected.threadId]);
    assert.ok(searchFilters.every((filters: any) => filters.unread === true));

    const [storedPacket] = await db.insert(contextPacket).values({
      fingerprint: pipeline.context.fingerprint,
      intent: query,
      mode: "normal",
      packet: { items: pipeline.context.items, excluded: pipeline.context.excluded },
      sourceRefs: pipeline.context.items.map((item) => item.id),
      excludedRefs: pipeline.context.excludedRefs,
      tokenEstimate: pipeline.context.tokens,
      estimatedCostUsd: 0,
      selectedTier: "T1",
      selectedModel: "test-model",
      riskLevel: "LOW",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    }).returning();
    packetId = storedPacket.id;

    const cached = await buildContextPacket(query, "normal", 384, pipeline.intent, {
      resolveEmailProvider,
      queryEngine,
      founderContext: async () => ({}),
    });
    assert.equal(cached.id, packetId);
    assert.equal(cached.reused, true);
    assert.equal(cached.items.length, 1);
    assert.equal(cached.excluded.length, 1);
    assert.ok(cached.items[0].text.includes(selectedBody));
    assert.ok(!JSON.stringify(cached).includes(excludedBody));
    assert.ok(!JSON.stringify(cached).includes("access_token"));
    assert.deepEqual(fetched, [selected.threadId], "cached packet must not hydrate the excluded or selected thread again");

    reasoningService.query = async (request) => {
      cilRequests.push(request);
      return {
        correlation_id: request.correlation_id,
        resolution_tier: "T1_TRIGRAM",
        answer: "safe test answer",
        confidence: 1,
        cost_usd: 0,
        latency_ms: 0,
        semantic_domain: request.semantic_domain,
        reuse_eligible: true,
        drift_detected: false,
        contradiction_detected: false,
        provenance: ["privacy-test"],
        freshness_state: "current",
        recommend_escalation: false,
      };
    };
    const route = await routeModelRequest({
      correlationId: pipeline.correlationId,
      pipeline,
      queryText: query,
      semanticDomain: "conversation",
      intentType: pipeline.intent.intentType,
      riskClassification: "LOW",
      contextItems: pipeline.context.items,
      preferredTier: "auto",
    });
    assert.equal(route.answer, "safe test answer");
    assert.equal(cilRequests.length, 1);
    assert.ok(!JSON.stringify(cilRequests[0]).includes(excludedBody));
    assert.ok(!JSON.stringify(cilRequests[0]).includes("access_token"));
    assert.deepEqual((cilRequests[0] as any).context_asset_refs, [`gmail:thread:${selected.threadId}`]);

    const auditEvents = await db.select().from(eventLog).where(eq(eventLog.correlationId, pipeline.correlationId));
    assert.ok(auditEvents.length >= 8);
    const auditText = JSON.stringify(auditEvents);
    assert.ok(!auditText.includes(selectedBody));
    assert.ok(!auditText.includes(excludedBody));
    assert.ok(!auditText.includes("access_token"));
    assert.ok(!auditText.includes("refresh_token"));
  } finally {
    reasoningService.query = originalCILQuery;
    if (packetId) await db.delete(contextPacket).where(eq(contextPacket.id, packetId));
    if (intentId) await db.delete(intentRecord).where(eq(intentRecord.id, intentId));
  }
});