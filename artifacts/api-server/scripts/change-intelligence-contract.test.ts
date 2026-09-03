import test from "node:test";
import assert from "node:assert/strict";
import { buildChangeRecord, classifyChange } from "../src/lib/change-intelligence";

const event = (overrides: Record<string, unknown> = {}) => ({
  id: "00000000-0000-4000-8000-000000000215",
  eventType: "ProjectMomentumChanged",
  eventVersion: "1.0.0",
  aggregateType: "project",
  aggregateId: "project-215",
  payload: {
    previousClassification: "Stable",
    classification: "Declining",
    confidence: 0.92,
    evidenceRefs: ["github:issue:215"],
  },
  actor: "lee",
  sourceRef: "project-momentum",
  sequenceNumber: 2,
  causationId: null,
  correlationId: null,
  sessionId: null,
  brainVersion: null,
  occurredAt: new Date("2026-09-02T12:00:00.000Z"),
  createdAt: new Date("2026-09-02T12:00:00.000Z"),
  ...overrides,
}) as any;

test("state transitions preserve before/after state and source-backed explanation", () => {
  const change = buildChangeRecord(event());
  assert.ok(change);
  assert.equal(change.previousState, "Stable");
  assert.equal(change.currentState, "Declining");
  assert.equal(change.entityType, "project");
  assert.equal(change.entityId, "project-215");
  assert.equal(change.classification, "IMPORTANT");
  assert.equal(change.confidence, 0.92);
  assert.match(change.explanation, /Stable/);
  assert.match(change.explanation, /Declining/);
  assert.ok(change.evidenceRefs.includes("github:issue:215"));
  assert.ok(change.evidenceRefs.includes(`event:${event().id}`));
});

test("explicit significance boundaries map low, high, and critical safely", () => {
  assert.equal(classifyChange(event({ eventType: "CommitPushed", payload: { significance: "LOW" } })).classification, "ROUTINE");
  assert.equal(classifyChange(event({ eventType: "CommitPushed", payload: { significance: "HIGH" } })).classification, "IMPORTANT");
  assert.equal(classifyChange(event({ eventType: "CommitPushed", payload: { significance: "CRITICAL" } })).classification, "CRITICAL");
});

test("connector synchronization noise is suppressed while owner-visible provider changes remain", () => {
  assert.equal(buildChangeRecord(event({ eventType: "EmailSyncCompleted", payload: {} })), null);
  assert.equal(buildChangeRecord(event({ eventType: "EmailReceived", payload: { subject: "Newsletter" } })), null);
  assert.ok(buildChangeRecord(event({ eventType: "EmailReceived", payload: { initiativeId: "initiative-1", reason: ["deadline language"] } })));
  assert.equal(buildChangeRecord(event({ eventType: "UnknownConnectorEvent", payload: {} })), null);
  assert.ok(buildChangeRecord(event({ eventType: "ProviderSpecificImportantChange", payload: { meaningful: true } })));
});

test("replaying the same event produces the same deduplication fingerprint", () => {
  const first = buildChangeRecord(event());
  const replay = buildChangeRecord(event());
  assert.ok(first);
  assert.ok(replay);
  assert.equal(first.fingerprint, replay.fingerprint);
});

test("normalized provider records retain provider-neutral meaning", () => {
  const change = buildChangeRecord(event({
    id: "00000000-0000-4000-8000-000000000216",
    eventType: "document_changed",
    aggregateType: "normalized_connector_event",
    aggregateId: "normalized-216",
    sourceRef: "google-drive:file-216",
    payload: { normalizedFrom: "document_changed", name: "Operating brief", meaningful: true },
  }));
  assert.ok(change);
  assert.equal(change.source, "drive");
  assert.equal(change.changeKind, "document_updated");
  assert.equal(change.entityType, "normalized_connector_event");
});