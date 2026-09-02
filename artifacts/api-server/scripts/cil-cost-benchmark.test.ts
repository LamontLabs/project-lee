import assert from "node:assert/strict";
import test from "node:test";
import { cilBenchmarkCorpus, runCILCostBenchmark } from "../src/lib/cil-cost-benchmark";

test("CIL benchmark is reproducible and measures reuse savings without hiding overrides", () => {
  const first = runCILCostBenchmark();
  const second = runCILCostBenchmark();
  assert.deepEqual(first, second);
  assert.equal(first.corpusHash, "32a73d26793273a4b6729a549914f5880f984ee88f2e4a2e8cfea74081550f7c");
  assert.equal(first.metrics.totalRequests, cilBenchmarkCorpus.length);
  assert.equal(first.metrics.t1Hits, 2);
  assert.equal(first.metrics.t2Hits, 3);
  assert.equal(first.metrics.t3Escalations, 2);
  assert.equal(first.metrics.avoidedFrontierCalls, 5);
  assert.equal(first.metrics.frontierCallsWithCIL, 5);
  assert.equal(first.metrics.totalCostUsd, 0.09);
  assert.equal(first.metrics.noReuseCostUsd, 0.12);
  assert.equal(first.metrics.savingsUsd, 0.03);
  assert.equal(first.metrics.correctnessOverrides, 2);
  assert.equal(first.metrics.freshnessOverrides, 2);
  assert.equal(first.metrics.rejectionRate, 0.3);
  assert.ok(first.metrics.savingsPercent > 0);
});