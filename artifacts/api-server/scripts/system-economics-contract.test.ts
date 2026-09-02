import assert from "node:assert/strict";
import test from "node:test";
import { runSystemEconomicsCycle, systemEconomicsContract, type EconomicMetric } from "../src/lib/system-economics";

function assertMetric(value: unknown, path: string) {
  const item = value as EconomicMetric;
  assert.ok(item && typeof item === "object", `${path} is not a metric`);
  assert.ok(["MEASURED", "ESTIMATED", "UNAVAILABLE"].includes(item.status), `${path} has no explicit status`);
  assert.ok(typeof item.unit === "string" && item.unit.length > 0, `${path} has no unit`);
  assert.ok(typeof item.source === "string" && item.source.length > 0, `${path} has no source`);
  assert.ok(typeof item.observedAt === "string" && item.observedAt.length > 0, `${path} has no timestamp`);
  assert.ok(Array.isArray(item.provenance) && item.provenance.length > 0, `${path} has no provenance`);
  if (item.status === "UNAVAILABLE") assert.equal(item.value, null, `${path} unavailable value must be null`);
}

test("System Economics labels every dimension and reconciles ledger totals", async () => {
  const contract = systemEconomicsContract();
  const cycle = await runSystemEconomicsCycle(new Date());
  const summary = cycle.summary as any;
  assert.equal(contract.dimensions.length, 26);
  for (const dimension of contract.dimensions) assert.ok(summary.metrics[dimension], `Missing metric ${dimension}`);
  for (const [key, value] of Object.entries(summary.metrics)) {
    if (value && typeof value === "object" && "status" in (value as object)) assertMetric(value, `metrics.${key}`);
    else for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) assertMetric(nestedValue, `metrics.${key}.${nestedKey}`);
  }
  assert.equal(summary.reconciliation.status, "RECONCILED");
  assert.ok(summary.reconciliation.checks.every((check: any) => check.status === "PASS"));
  assert.equal(summary.metrics["projected_monthly_cost_usd"].status, "ESTIMATED");
  assert.equal(summary.metrics["cil.benchmark_savings_usd"].status, "ESTIMATED");
  assert.equal(summary.costByCategory.storage.status, "UNAVAILABLE");
  assert.equal(summary.costByCategory.network.status, "UNAVAILABLE");
  assert.notEqual(summary.costByCategory.storage.status, "MEASURED");
  for (const value of Object.values(summary.valueRatioMetrics)) assertMetric(value, "valueRatioMetrics");
});