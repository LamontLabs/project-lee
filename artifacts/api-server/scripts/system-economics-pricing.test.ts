import assert from "node:assert/strict";
import test from "node:test";
import { reconcileEconomicCategorySpend, type EconomicPricePricingRecord, type EconomicUsagePricingRecord } from "../src/lib/system-economics";

const observedAt = new Date("2026-09-01T12:00:00.000Z");

function usage(id: string, recordedAt = observedAt): EconomicUsagePricingRecord {
  return {
    id,
    operation: "backup",
    category: "storage",
    quantity: 10,
    unit: "bytes",
    provider: "smoke-provider",
    evidenceRef: `source_vault:${id}`,
    recordedAt,
  };
}

function price(id: string, effectiveAt: string, priceUsd: number): EconomicPricePricingRecord {
  return {
    id,
    operation: "backup",
    category: "storage",
    unit: "bytes",
    priceUsd,
    provider: "smoke-provider",
    evidenceRef: `source_vault:${id}`,
    effectiveAt: new Date(effectiveAt),
  };
}

function assertMetricContract(metric: ReturnType<typeof reconcileEconomicCategorySpend>) {
  assert.equal(metric.unit, "USD");
  assert.equal(metric.source, "economic_usage_record × economic_price_evidence");
  assert.equal(metric.observedAt, observedAt.toISOString());
  assert.ok(metric.provenance.length > 0);
}

test("measured usage without matching price remains explicitly unavailable", () => {
  const result = reconcileEconomicCategorySpend([usage("usage-missing")], [], ["storage"], observedAt);

  assertMetricContract(result);
  assert.equal(result.status, "UNAVAILABLE");
  assert.equal(result.value, null);
  assert.ok(result.provenance.includes("usage-missing"));
  assert.ok(result.provenance.includes("economic_price_evidence:effective"));
  assert.ok(result.provenance.includes("missing-price:backup:bytes"));
});

test("usage with a dated matching price is measured with usage and price provenance", () => {
  const result = reconcileEconomicCategorySpend(
    [usage("usage-matched")],
    [price("price-before-usage", "2026-08-31T00:00:00.000Z", 0.25)],
    ["storage"],
    observedAt,
  );

  assertMetricContract(result);
  assert.equal(result.status, "MEASURED");
  assert.equal(result.value, 2.5);
  assert.ok(result.provenance.includes("usage-matched"));
  assert.ok(result.provenance.includes("price-before-usage"));
});

test("out-of-order price evidence uses the latest price effective at observation time", () => {
  const result = reconcileEconomicCategorySpend(
    [usage("usage-out-of-order")],
    [
      price("price-future", "2026-09-02T00:00:00.000Z", 0.9),
      price("price-latest-before-usage", "2026-09-01T08:00:00.000Z", 0.4),
      price("price-earlier", "2026-08-01T00:00:00.000Z", 0.1),
    ],
    ["storage"],
    observedAt,
  );

  assertMetricContract(result);
  assert.equal(result.status, "MEASURED");
  assert.equal(result.value, 4);
  assert.ok(result.provenance.includes("price-latest-before-usage"));
  assert.ok(!result.provenance.includes("price-future"));
  assert.ok(!result.provenance.includes("price-earlier"));
});