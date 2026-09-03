import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMemoryHealth, type MemoryHealthMeasurements } from "../src/lib/memory-health";

function healthyMeasurements(): MemoryHealthMeasurements {
  return {
    database: { reachable: true },
    eventLog: { count: 10, sequenceGaps: 0, duplicateSequences: 0, invalidCausation: 0, latestEventId: "event-10", latestSequence: 10 },
    archive: { sourceCount: 4, archivedSourceCount: 2, manifestCount: 2, missingArchivedSources: 0, missingIntegrity: 0, corrupt: 0 },
    semantic: { canonicalCount: 4, indexedCount: 4, staleCount: 0, orphanedCount: 0, modelVersions: ["local-hash-v1"] },
    evidence: { orphanedCount: 0, provenanceBearing: 4, provenanceComplete: 4 },
    duplicates: { groups: 0, records: 0 },
    backup: { count: 1, latestAgeHours: 3, latestVerified: true, checksumValid: true, latestId: "backup-1" },
    restore: { status: "passed", testedAt: new Date().toISOString(), latestId: "backup-1" },
    capacity: { trackedBytes: 10, capacityBytes: 100, pressureScore: 0.1, archiveHealth: "available", corruptCount: 0 },
    consolidation: { staleRuns: 0, stalePhases: 0, failedRuns: 0 },
    contradictions: { open: 0 },
    rebuild: { semantic: 0, projections: 0, workingMemory: 0 },
    corruption: { indicators: 0 },
  };
}

test("memory health passes when canonical and portability evidence are complete", () => {
  const report = evaluateMemoryHealth(healthyMeasurements(), "NORMAL");
  assert.equal(report.overall, "PASS");
  assert.equal(report.canonicalBrain.status, "PASS");
  assert.equal(report.recoveryPlan.length, 0);
  assert.equal(report.machineLossProof.isolatedRestoreRequired, true);
});

test("memory health fails closed for canonical defects and separates derived rebuild warnings", () => {
  const measurements = healthyMeasurements();
  measurements.eventLog.sequenceGaps = 2;
  measurements.evidence.orphanedCount = 1;
  measurements.semantic.staleCount = 3;
  measurements.rebuild.semantic = 3;
  const report = evaluateMemoryHealth(measurements, "RECOVERY_MODE");
  assert.equal(report.overall, "FAIL");
  assert.equal(report.canonicalBrain.status, "FAIL");
  assert.equal(report.checks.find((check) => check.id === "event-log-continuity")?.result, "FAIL");
  assert.equal(report.checks.find((check) => check.id === "semantic-index-freshness")?.result, "WARN");
  assert.ok(report.recoveryPlan.some((item) => item.checkId === "orphaned-evidence"));
  assert.equal(report.retrieval.rebuildableCaches.queryCache, "rebuildable");
});