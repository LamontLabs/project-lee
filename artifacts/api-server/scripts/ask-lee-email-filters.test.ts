import assert from "node:assert/strict";
import test from "node:test";
import { parseEmailSearchFilters } from "../src/lib/intent";

test("Ask Lee extracts provider-neutral sender, subject, date range, and unread filters", () => {
  const filters = parseEmailSearchFilters(
    "Find unread emails from alice@example.com with subject launch between 2026-08-01 and 2026-08-31",
  );

  assert.deepEqual(filters, {
    sender: "alice@example.com",
    subject: "launch",
    after: "2026-08-01",
    before: "2026-08-31",
    unread: true,
  });
});

test("Ask Lee preserves a free-text email topic alongside a sender filter", () => {
  const filters = parseEmailSearchFilters("Show emails from Sarah about budget planning");

  assert.equal(filters.sender, "Sarah");
  assert.equal(filters.subject, "budget planning");
  assert.equal(filters.text, undefined);
});

test("Ask Lee keeps sender and date clauses separate when both use from", () => {
  const filters = parseEmailSearchFilters("Find emails from alice@example.com from 2026-08-01 to 2026-08-31");

  assert.deepEqual(filters, {
    sender: "alice@example.com",
    after: "2026-08-01",
    before: "2026-08-31",
  });
});

test("Ask Lee supports a single date and explicit read state", () => {
  const filters = parseEmailSearchFilters("Show read messages on 2026-08-15");

  assert.deepEqual(filters, {
    after: "2026-08-15",
    before: "2026-08-15",
    unread: false,
  });
});