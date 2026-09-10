import assert from "node:assert/strict";
import test from "node:test";
import { buildK6AuthorityRehearsalEvidence } from "../src/lib/k6-authority-rehearsal";

const completeInput = {
  simulationOnly: true,
  ownerApproved: true,
  rollbackCriteria: ["If startup proof fails, keep the previous runtime active."],
  backup: { backupId: "backup-k6-rehearsal", verified: true, restoreTested: true, productionUntouched: true },
  brain: { singular: true, authority: "canonical", checksum: "verified" },
  eventLog: { continuity: true, appendOnly: true, sequenceContinuity: true },
  personality: { version: 1, checksum: "personality-checksum", persisted: true, includedInBackup: true, evolutionHistoryIncluded: true, reversible: true, safetyStatus: "passed" },
  readinessMatrix: [
    "bootstrap-objective",
    "governed-project-operation",
    "cil-routing-authority",
    "cerbaseal-governance",
    "offline-continuity",
    "personality-continuity",
    "backup-restore",
    "packaged-runtime",
  ].map((key) => ({
    key,
    status: "verified",
    detail: `Verified ${key}.`,
    evidence: { source: `test:${key}`, observedAt: "2026-09-10T00:00:00.000Z", refs: [key] },
  })),
  governance: { failClosed: true },
  packagedRuntime: { healthy: true, evidence: { source: "hosted-packaging" } },
  interruption: { previousRuntimePreserved: true, recovered: true, reversalSafe: true },
  noCompetingHistory: true,
};

test("K6 rehearsal passes only when every authority proof is present", () => {
  const result = buildK6AuthorityRehearsalEvidence(completeInput);
  assert.equal(result.status, "passed");
  assert.equal(result.evidence.readinessEligible, true);
  assert.equal(result.evidence.boundary.productionTransferPerformed, false);
  assert.equal(result.evidence.personalityContinuityPreserved, true);
  assert.ok(result.evidence.checks.every((item) => item.result === "PASS"));
});

test("K6 rehearsal records an injected transfer failure without changing authority", () => {
  const result = buildK6AuthorityRehearsalEvidence({ ...completeInput, scenario: "failed" });
  assert.equal(result.status, "failed");
  assert.equal(result.evidence.readinessEligible, false);
  assert.equal(result.evidence.canonicalBrainPreserved, true);
  assert.equal(result.evidence.checks.find((item) => item.key === "simulated-transfer")?.result, "FAIL");
});

test("K6 rehearsal retains interruption and previous-runtime preservation evidence", () => {
  const result = buildK6AuthorityRehearsalEvidence({ ...completeInput, scenario: "interrupted" });
  assert.equal(result.status, "interrupted");
  assert.equal(result.evidence.previousRuntimePreserved, true);
  assert.equal(result.evidence.recoveryCompleted, true);
  assert.equal(result.evidence.readinessEligible, false);
});

test("K6 rehearsal records a safe reversal separately from a passed transfer", () => {
  const result = buildK6AuthorityRehearsalEvidence({ ...completeInput, scenario: "reversed" });
  assert.equal(result.status, "reversed");
  assert.equal(result.evidence.reversalVerified, true);
  assert.equal(result.evidence.readinessEligible, false);
});

test("K6 rehearsal remains incomplete without explicit owner approval and rollback criteria", () => {
  const result = buildK6AuthorityRehearsalEvidence({
    ...completeInput,
    ownerApproved: false,
    rollbackCriteria: [],
  });
  assert.equal(result.status, "incomplete");
  assert.equal(result.evidence.readinessEligible, false);
  assert.equal(result.evidence.checks.find((item) => item.key === "owner-approval-and-rollback-criteria")?.result, "FAIL");
});

test("K6 rehearsal cannot pass from incomplete or stale cross-system evidence", () => {
  const incomplete = buildK6AuthorityRehearsalEvidence({
    ...completeInput,
    readinessMatrix: completeInput.readinessMatrix.slice(1),
  });
  assert.equal(incomplete.status, "failed");
  assert.equal(incomplete.evidence.readinessEligible, false);
  assert.equal(incomplete.evidence.checks.find((item) => item.key === "cross-system-readiness-matrix")?.result, "FAIL");

  const stale = buildK6AuthorityRehearsalEvidence({
    ...completeInput,
    readinessMatrix: completeInput.readinessMatrix.map((row) => row.key === "offline-continuity" ? { ...row, status: "stale" } : row),
  });
  assert.equal(stale.status, "failed");
  assert.equal(stale.evidence.readinessEligible, false);
});