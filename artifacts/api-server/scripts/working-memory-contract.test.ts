import assert from "node:assert/strict";
import test from "node:test";
import type { SelectedContext } from "../src/lib/context-economy";
import { buildWorkingMemoryEnvelope, WORKING_MEMORY_MAX_EXCLUDED, WORKING_MEMORY_MAX_SELECTED } from "../src/lib/working-memory";

function context(id: string, kind = "project", score = 0.8): SelectedContext {
  return {
    id,
    text: `Project ${id} with owner@example.com and access_token=do-not-store ${"detail ".repeat(180)}`,
    kind,
    confidence: 0.8,
    recencyDays: 2,
    strategicAnchor: false,
    score,
    contextValueScore: score,
    factorBreakdown: { goal: 0.9, confidence: 0.8 },
    estimatedTokens: 64,
  };
}

test("Working Memory keeps selected and excluded entries bounded and redacted", () => {
  const envelope = buildWorkingMemoryEnvelope({
    scopeKey: "test:bounded",
    query: "Review the active project",
    mode: "review",
    intentType: "review_request",
    budgetTokens: 256,
    selected: [...Array.from({ length: 40 }, (_, index) => context(`selected-${index}`, index % 2 ? "event" : "project")), { ...context("expired-1"), ageState: "EXPIRED" }],
    excluded: Array.from({ length: 50 }, (_, index) => ({ ...context(`excluded-${index}`, "governance", 0.05), exclusionReason: "Exceeded the bounded budget." } as SelectedContext & { exclusionReason: string })),
    capturedAt: new Date("2026-09-03T12:00:00.000Z"),
  });

  assert.equal(envelope.selected.length, WORKING_MEMORY_MAX_SELECTED);
  assert.equal(envelope.excluded.length, WORKING_MEMORY_MAX_EXCLUDED);
  assert.equal(envelope.selectionAudit.selectedTotal, 40);
  assert.equal(envelope.selectionAudit.excludedTotal, 50);
  assert.equal(envelope.selectionAudit.excludedOverflow, 18);
  assert.equal(envelope.selectionAudit.expiredDiscarded, 1);
  assert.ok(!envelope.selected.some((item) => item.id === "expired-1"));
  assert.ok(envelope.selected[0].text.length <= 720);
  assert.match(envelope.selected[0].text, /\[REDACTED_EMAIL\]/);
  assert.match(envelope.selected[0].text, /access_token=\[REDACTED\]/);
  assert.equal(envelope.cilHandoff.boundary, "asset_refs_only");
  assert.deepEqual(envelope.cilHandoff.assetRefs, envelope.selected.map((item) => item.id));
});

test("Working Memory rebuild input is deterministic and preserves category rationale", () => {
  const input = {
    scopeKey: "test:rebuild",
    sessionId: "session-1",
    objectiveId: "objective-1",
    query: "What changed and what needs approval?",
    mode: "normal",
    intentType: "status_check",
    budgetTokens: 512,
    selected: [context("objective-1", "strategy", 0.9), context("change-1", "event", 0.7), context("approval-1", "governance", 0.5)],
    excluded: [{ ...context("stale-1", "fact", 0.02), exclusionReason: "Stale context." } as SelectedContext & { exclusionReason: string }],
    capturedAt: new Date("2026-09-03T12:00:00.000Z"),
  };
  const first = buildWorkingMemoryEnvelope(input);
  const second = buildWorkingMemoryEnvelope(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.categories.objective, ["objective-1"]);
  assert.deepEqual(first.categories.recentChanges, ["change-1"]);
  assert.deepEqual(first.categories.approvals, ["approval-1"]);
  assert.equal(first.excluded[0].selectionReason, "Stale context.");
  assert.equal(first.activeConversation.query, input.query);
});