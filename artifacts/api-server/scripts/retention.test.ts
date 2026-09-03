import assert from "node:assert/strict";
import test from "node:test";
import { ARCHIVE_INTEGRITY_STATES, REPRESENTATION_LAYERS } from "@workspace/db";
import {
  DEFAULT_RETENTION_POLICIES,
  archiveIntegrityState,
  pressureStage,
  protectedRetentionReasons,
  retentionPolicyForSourceKind,
  sourceKindFor,
} from "../src/lib/retention";

const source = (metadata: Record<string, unknown>, storagePath: string) => ({
  metadata,
  storagePath,
  createdAt: new Date(),
}) as any;

test("source-specific retention policies cover every required owner", () => {
  assert.deepEqual(DEFAULT_RETENTION_POLICIES.map((policy) => policy.sourceKind), ["gmail", "github", "drive", "local_capture"]);
  for (const policy of DEFAULT_RETENTION_POLICIES) {
    assert.ok(policy.reason.length > 20);
    assert.equal(retentionPolicyForSourceKind(policy.sourceKind).policyKey, policy.policyKey);
  }
});

test("provider evidence maps to the correct retention owner", () => {
  assert.equal(sourceKindFor(source({ provider: "gmail" }, "provider://message")), "gmail");
  assert.equal(sourceKindFor(source({ provider: "github" }, "provider://repo"),), "github");
  assert.equal(sourceKindFor(source({ provider: "google_drive" }, "provider://file")), "drive");
  assert.equal(sourceKindFor(source({ device: "android" }, "android://capture")), "local_capture");
});

test("media lineage keeps original and derived layers distinct", () => {
  assert.deepEqual(REPRESENTATION_LAYERS, ["original", "transcript", "structured_fact", "commitment", "semantic_index", "summary"]);
  assert.notEqual(REPRESENTATION_LAYERS.indexOf("original"), REPRESENTATION_LAYERS.indexOf("summary"));
});

test("pressure response escalates through the staged capacity plan", () => {
  const stages = [0, .5, .65, .75, .82, .88, .94, 1].map((score) => pressureStage(score));
  assert.deepEqual(stages.map((item) => item.stage), ["normal", "temporary_cleanup", "cache_cleanup", "deduplicate", "cold_compress", "archive_move", "owner_alert", "expansion_recommended"]);
  assert.ok(stages.every((item, index) => index === 0 || item.order > stages[index - 1].order));
});

test("protected records and archive loss remain explicit", () => {
  assert.equal(protectedRetentionReasons({ constitutional: true }).length, 1);
  assert.equal(protectedRetentionReasons({ ownerTruth: true, criticalDecision: true }).length, 2);
  assert.equal(protectedRetentionReasons({ unrelated: true }).length, 0);
  assert.deepEqual(ARCHIVE_INTEGRITY_STATES, ["pending", "verified", "missing", "corrupt"]);
  assert.equal(archiveIntegrityState("a", null), "missing");
  assert.equal(archiveIntegrityState("a", "a"), "verified");
  assert.equal(archiveIntegrityState("a", "b"), "corrupt");
});