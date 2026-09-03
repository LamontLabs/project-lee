import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyCommitmentDirection,
  commitmentStatementsContradict,
  completeCommitment,
  extractCommitmentCandidate,
  shouldSurfaceWaiting,
} from "../src/lib/commitment-intelligence";

const at = new Date("2026-08-01T12:00:00.000Z");

test("classifies the five commitment directions without provider vocabulary", () => {
  assert.equal(classifyCommitmentDirection({ type: "owner" }, { type: "person" }), "owner_owes");
  assert.equal(classifyCommitmentDirection({ type: "person" }, { type: "owner" }), "owed_by_other");
  assert.equal(classifyCommitmentDirection({ type: "person" }, { type: "organization" }), "mutual_waiting");
  assert.equal(classifyCommitmentDirection({ type: "unknown" }, { type: "unknown" }), "task");
  assert.equal(classifyCommitmentDirection({ type: "owner" }, { type: "unknown" }), "task");
});

test("keeps conversational possibilities out of the commitment ledger", () => {
  assert.equal(extractCommitmentCandidate({
    eventType: "EmailReceived",
    sourceRef: "email:possibility",
    payload: { body: "We could maybe discuss a partnership sometime." },
    occurredAt: at,
  }), null);
  const inferred = extractCommitmentCandidate({
    eventType: "EmailReceived",
    sourceRef: "email:waiting",
    payload: { body: "We are waiting for Olivia's response by 2026-08-10." },
    occurredAt: at,
    actor: { type: "person", id: "person-1", label: "Olivia" },
    recipient: { type: "owner", label: "Owner" },
  });
  assert.equal(inferred?.direction, "owed_by_other");
  assert.equal(inferred?.inferred, true);
  assert.equal(inferred?.dueAt?.toISOString(), "2026-08-10T23:59:59.999Z");
});

test("surfaces elapsed, important waiting but not low-signal cadence noise", () => {
  const quiet = {
    id: "quiet", fingerprint: "quiet", actorType: "owner", actorId: null, actorLabel: "Owner",
    recipientType: "person", recipientId: "p", recipientLabel: "Pat", direction: "owner_owes",
    commitmentType: "promise", statement: "Send a routine note", status: "open", confidence: 0.9, inferred: false,
    evidenceRefs: ["capture:1"], completionEvidenceRefs: [], contradictionRefs: [], personIds: ["p"], organizationIds: [], projectIds: [],
    dueAt: null, expectedResponseAt: null, lastMeaningfulActivityAt: new Date("2026-08-10"), completedAt: null,
    importanceScore: 0.1, projectImpactScore: 0.1, cadenceDays: 30, sourceRef: "capture:1", metadata: {},
    createdAt: new Date("2026-08-10"), updatedAt: at,
  } as any;
  assert.equal(shouldSurfaceWaiting(quiet, at), false);
  assert.equal(shouldSurfaceWaiting({ ...quiet, importanceScore: 0.9, projectImpactScore: 0.9, lastMeaningfulActivityAt: new Date("2026-06-01") }, at), true);
});

test("completion requires source evidence before fulfillment", async () => {
  await assert.rejects(() => completeCommitment("00000000-0000-0000-0000-000000000001", "fulfilled", []), /Completion evidence is required/);
});

test("recognizes contradictory evidence and keeps an owner capture auditable", () => {
  assert.equal(commitmentStatementsContradict("I will send the signed proposal.", "I will not send the signed proposal."), true);
  const capture = extractCommitmentCandidate({
    eventType: "AndroidCapture",
    sourceRef: "source:android-1",
    payload: { body: "I will review the launch checklist by 2026-08-12.", tag: "today" },
    actor: { type: "owner", label: "Owner" },
    recipient: { type: "unknown" },
    evidenceRefs: ["source:android-1"],
    occurredAt: at,
  });
  assert.equal(capture?.direction, "task");
  assert.deepEqual(capture?.evidenceRefs, ["source:android-1"]);
});