import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeEventLogSequences,
  catalogAllocatorCutoverXid,
  EVENT_LOG_VERIFIER_VERSION,
  expandTransactionId,
  type EventLogSequenceRow,
} from "../src/lib/event-log-continuity";

function event(
  id: string,
  sequence: number,
  xid: number,
  aggregateId = "object-1",
  aggregateType = "universal_object",
): EventLogSequenceRow {
  return {
    id,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    sequence_number: sequence,
    event_xid: String(xid),
  };
}

test("verifier uses a transaction-ID allocator boundary, not event timestamps", () => {
  const result = analyzeEventLogSequences([
    event("numbered-two", 2, 101),
    event("legacy-one", 1, 99),
  ], "100");

  assert.equal(EVENT_LOG_VERIFIER_VERSION, "event-log-continuity-v5");
  assert.deepEqual(result.gaps, []);
  assert.equal(result.provenLegacyPrefixAggregates, 1);
  assert.equal(result.ambiguousLegacyAggregates, 0);
});

test("allocator boundary requires two readable, unfrozen catalog transaction IDs", () => {
  assert.equal(catalogAllocatorCutoverXid("99", "101"), "101");
  assert.equal(catalogAllocatorCutoverXid("2", "101"), null);
  assert.equal(catalogAllocatorCutoverXid("99", null), null);
  assert.equal(catalogAllocatorCutoverXid("not-xid", "101"), null);
});

test("32-bit row transaction IDs expand against the snapshot epoch across wraparound", () => {
  assert.equal(expandTransactionId("4294967290", "4294967300"), "4294967290");
  assert.equal(expandTransactionId("5", "4294967310"), "4294967301");
  assert.equal(expandTransactionId("5", "4294967295"), "5");
  assert.throws(() => expandTransactionId("4294967296", "4294967300"));
});

test("rows created in the allocator cutover transaction are counted as ambiguous", () => {
  const result = analyzeEventLogSequences([
    event("installed-with-row", 1, 100),
    event("after-install", 2, 101),
  ], "100");

  assert.equal(result.boundaryRows, 1);
  assert.equal(result.postCutoverViolations, 0);
});

test("sequence-one rows and numbered rows from before the allocator boundary remain ambiguous", () => {
  const result = analyzeEventLogSequences([
    event("legacy-one", 1, 99),
    event("old-numbered-two", 2, 99),
    event("new-numbered-three", 3, 101),
  ], "100");

  const finding = result.gaps.find((item) => item.kind === "legacy_transition_unproven");
  assert.ok(finding);
  assert.equal(finding.aggregateType, "universal_object");
  assert.deepEqual(finding.eventIds, ["legacy-one", "old-numbered-two"]);
  assert.equal(result.ambiguousLegacyAggregates, 1);
});

test("a truncated legacy-transition event-ID list marks the finding inventory incomplete", () => {
  const rows = [
    event("legacy-one", 1, 99),
    ...Array.from({ length: 500 }, (_, index) => event(`numbered-${index + 2}`, index + 2, 99)),
  ];
  const result = analyzeEventLogSequences(rows, "100");
  const finding = result.gaps.find((item) => item.kind === "legacy_transition_unproven");

  assert.ok(finding);
  assert.equal(finding.eventCount, 501);
  assert.equal(finding.eventIds.length, 500);
  assert.equal(finding.eventIdsComplete, false);
  assert.equal(result.findingsComplete, false);
});

test("a new aggregate may start at sequence one after the allocator boundary", () => {
  const result = analyzeEventLogSequences([
    event("first", 1, 101),
    event("second", 2, 102),
    event("third", 3, 103),
  ], "100");

  assert.deepEqual(result.gaps, []);
  assert.equal(result.provenLegacyPrefixAggregates, 0);
  assert.equal(result.legacyUnsequencedAggregates, 0);
});

test("sequence one after a pre-existing row is a post-cutover allocator violation", () => {
  const result = analyzeEventLogSequences([
    event("old-one", 1, 99),
    event("post-cutover-regression", 1, 101),
    event("post-cutover-two", 2, 102),
  ], "100");

  assert.ok(result.gaps.some((item) =>
    item.kind === "allocator_sequence_violation"
    && item.actual === 1
    && item.expected === 2
    && item.eventIds.includes("post-cutover-regression")));
  assert.equal(result.postCutoverViolations, 1);
});

test("duplicate and missing numbered values retain exact event IDs and ranges", () => {
  const duplicates = analyzeEventLogSequences([
    event("one", 1, 99),
    event("two-a", 2, 99),
    event("two-b", 2, 99),
    event("three", 3, 99),
    event("four", 4, 99),
  ], "100");
  const duplicate = duplicates.gaps.find((item) => item.kind === "duplicate_sequence");
  assert.deepEqual(duplicate?.eventIds, ["two-a", "two-b"]);

  const missing = analyzeEventLogSequences([
    event("one", 1, 99),
    event("two", 2, 99),
    event("four", 4, 99),
  ], "100");
  assert.ok(missing.gaps.some((item) =>
    item.kind === "missing_sequence_range"
    && item.expected === 3
    && item.actual === 4
    && item.missingThrough === 3));
});

test("stream identity uses both aggregate columns", () => {
  const result = analyzeEventLogSequences([
    event("a-one", 1, 99, "x:y", "ab"),
    event("b-two", 2, 99, "y", "ab:x"),
  ], "100");

  assert.equal(result.aggregatesScanned, 2);
  assert.equal(result.gaps.length, 1);
  assert.equal(result.gaps[0].aggregateId, "y");
});