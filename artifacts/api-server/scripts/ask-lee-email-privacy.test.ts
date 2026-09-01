import assert from "node:assert/strict";
import test from "node:test";
import { constructContextPacket, DEFAULT_WEIGHTS } from "../src/lib/context-economy";
import { hydrateSelectedEmailContext, retrieveEmailCandidates } from "../src/lib/context-engine";
import type { EmailMessage, EmailProvider, EmailThread } from "../src/lib/email-provider";

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