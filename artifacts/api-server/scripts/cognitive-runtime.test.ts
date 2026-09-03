import assert from "node:assert/strict";
import test from "node:test";
import {
  COGNITIVE_RUNTIME_MODEL_KEYS,
  collectCognitiveRuntimeModels,
  cognitiveRuntimeConfigFingerprint,
  cognitiveRuntimeContinuity,
  type CognitiveRuntimeModelRead,
} from "../src/lib/cognitive-runtime";

function healthyRead(key: string): CognitiveRuntimeModelRead {
  const now = new Date();
  return { evidenceRefs: [`evidence-${key}`], observedAt: now, windowStart: now, state: { key }, summary: { key } };
}

test("runtime continuity links cycles and detects configuration changes", () => {
  const previous = { id: "cycle-previous", cycleNumber: 8, modelConfigFingerprint: "old-fingerprint" };
  const changed = cognitiveRuntimeContinuity(previous, "new-fingerprint");
  assert.equal(changed.previousCycleId, "cycle-previous");
  assert.equal(changed.previousCycleNumber, 8);
  assert.equal(changed.configChangedSincePrevious, true);
  assert.equal(changed.identityPreserved, true);
  assert.equal(changed.governanceBoundariesPreserved, true);

  const unchanged = cognitiveRuntimeContinuity(previous, "old-fingerprint");
  assert.equal(unchanged.configChangedSincePrevious, false);
  assert.equal(cognitiveRuntimeConfigFingerprint(), cognitiveRuntimeConfigFingerprint());
});

test("one model outage is isolated without discarding the rest of the cycle", async () => {
  const readers = Object.fromEntries(COGNITIVE_RUNTIME_MODEL_KEYS.map((key) => [key, async () => healthyRead(key)])) as Record<string, () => Promise<CognitiveRuntimeModelRead>>;
  readers.world = async () => { throw new Error("world provider unavailable"); };
  const snapshots = await collectCognitiveRuntimeModels(readers);
  assert.equal(snapshots.length, COGNITIVE_RUNTIME_MODEL_KEYS.length);
  assert.equal(snapshots.find((item) => item.modelKey === "world")?.status, "degraded");
  assert.match(snapshots.find((item) => item.modelKey === "world")?.degradedReason ?? "", /provider unavailable/);
  assert.equal(snapshots.filter((item) => item.status === "fresh").length, COGNITIVE_RUNTIME_MODEL_KEYS.length - 1);
});