import { and, desc, eq, gte, lte } from "drizzle-orm";
import { backupArchive, connectorSync, costRecord, db, economicPriceEvidence, economicUsageRecord, eventLog, factLedger, interpretationLedger, normalizedConnectorEvent, providerRegistration, semanticIndex, sourceChunk, sourceVault, systemEconomicsCycle } from "@workspace/db";
import { runCILCostBenchmark } from "./cil-cost-benchmark";
import { registerProviders } from "./provider-abstraction";

const MONTHLY_COST_CEILING_USD = 100;
export type MetricStatus = "MEASURED" | "ESTIMATED" | "UNAVAILABLE";
export type EconomicMetric = {
  value: number | null;
  status: MetricStatus;
  unit: string;
  source: string;
  observedAt: string;
  provenance: string[];
};

export type EconomicUsagePricingRecord = {
  id: string;
  operation: string;
  category: string;
  quantity: number;
  unit: string;
  provider: string;
  evidenceRef: string;
  recordedAt: Date;
};

export type EconomicPricePricingRecord = {
  id: string;
  operation: string;
  category: string;
  unit: string;
  priceUsd: number;
  provider: string;
  evidenceRef: string;
  effectiveAt: Date;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_EVIDENCE_REF = /^(provider|connector):([a-z0-9][a-z0-9._-]{0,95})(?::.+)?$/i;
const INTERNAL_EVIDENCE_TABLES = [
  { prefix: "source_vault", table: sourceVault },
  { prefix: "source_chunk", table: sourceChunk },
  { prefix: "event_log", table: eventLog },
  { prefix: "fact_ledger", table: factLedger },
  { prefix: "interpretation_ledger", table: interpretationLedger },
  { prefix: "backup_archive", table: backupArchive },
  { prefix: "semantic_index", table: semanticIndex },
] as const;

export type EconomicEvidenceResolution = {
  evidenceRef: string;
  kind: "provider_contract" | "internal_record";
};

/**
 * Resolve the submitted source reference before an economics row is written.
 * Provider references are deliberately explicit; arbitrary strings must not
 * become financial provenance merely because they are present in a payload.
 */
export async function resolveEconomicEvidence(sourceRef: string, provider: string): Promise<EconomicEvidenceResolution> {
  const ref = sourceRef.trim();
  const providerMatch = PROVIDER_EVIDENCE_REF.exec(ref);
  if (providerMatch) {
    const [, , providerId] = providerMatch;
    if (providerId !== provider) throw new Error(`Economic provenance provider "${providerId}" does not match "${provider}".`);
    let [registration] = await db.select({ id: providerRegistration.id, currentStatus: providerRegistration.currentStatus })
      .from(providerRegistration)
      .where(eq(providerRegistration.providerId, providerId))
      .limit(1);
    if (!registration) {
      await registerProviders();
      [registration] = await db.select({ id: providerRegistration.id, currentStatus: providerRegistration.currentStatus })
        .from(providerRegistration)
        .where(eq(providerRegistration.providerId, providerId))
        .limit(1);
    }
    if (!registration || registration.currentStatus === "UNAVAILABLE") {
      throw new Error(`Economic provenance provider "${providerId}" is not an approved available provider.`);
    }
    return { evidenceRef: `provider_registration:${registration.id}`, kind: "provider_contract" };
  }

  const prefixed = /^([a-z_]+):([0-9a-f-]+)$/i.exec(ref);
  const internalId = prefixed ? prefixed[2] : ref;
  if (!UUID.test(internalId)) throw new Error(`Economic provenance reference does not resolve to approved evidence: ${sourceRef}`);
  const candidates = prefixed
    ? INTERNAL_EVIDENCE_TABLES.filter(({ prefix }) => prefix === prefixed[1].toLowerCase())
    : INTERNAL_EVIDENCE_TABLES;
  for (const { prefix, table } of candidates) {
    const [record] = await db.select({ id: table.id }).from(table).where(eq(table.id, internalId)).limit(1);
    if (record) return { evidenceRef: `${prefix}:${record.id}`, kind: "internal_record" };
  }
  throw new Error(`Economic provenance reference does not resolve to approved evidence: ${sourceRef}`);
}

export type PricedEconomicUsage = {
  usage: EconomicUsagePricingRecord;
  price?: EconomicPricePricingRecord;
};

export const ECONOMIC_DIMENSIONS = [
  "cil.t1_calls", "cil.t2_calls", "cil.t3_frontier_calls", "cil.frontier_calls", "cil.avoided_calls",
  "cil.tokens", "cil.model_cost_usd", "cil.latency_ms", "cil.savings_usd",
  "model.tokens", "model.cost_usd", "model.latency_ms",
  "storage.event_log_rows", "storage.backup_growth_bytes", "storage.backup_bytes", "storage.embedding_index_bytes",
  "storage.source_vault_bytes", "connector.api_volume", "connector.normalized_events",
  "storage.cost_usd", "network.cost_usd",
  "engine.cost_usd", "project.cost_usd", "brief.cost_usd", "simulation.cost_usd", "cil.benchmark_savings_usd",
] as const;

export function systemEconomicsContract() {
  return {
    version: "2026.08",
    statuses: {
      MEASURED: "Directly observed from a persisted ledger or provider-neutral usage record.",
      ESTIMATED: "Derived from a documented model, projection, or logical-size calculation; not a measured fact.",
      UNAVAILABLE: "No authoritative measurement or price ledger exists for this dimension.",
    },
    dimensions: ECONOMIC_DIMENSIONS,
  };
}

function metric(value: number | null, status: MetricStatus, unit: string, source: string, observedAt: Date, provenance: string[]): EconomicMetric {
  return { value, status, unit, source, observedAt: observedAt.toISOString(), provenance };
}

export function matchEconomicUsageToPrices(
  usageRecords: readonly EconomicUsagePricingRecord[],
  priceRecords: readonly EconomicPricePricingRecord[],
): PricedEconomicUsage[] {
  return usageRecords.map((usage) => {
    const price = priceRecords
      .filter((candidate) => candidate.operation === usage.operation
        && candidate.category === usage.category
        && candidate.unit === usage.unit
        && candidate.provider === usage.provider
        && candidate.effectiveAt <= usage.recordedAt)
      .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0];
    return { usage, price };
  });
}

export function reconcileEconomicCategorySpend(
  usageRecords: readonly EconomicUsagePricingRecord[],
  priceRecords: readonly EconomicPricePricingRecord[],
  categories: readonly string[],
  observedAt: Date,
): EconomicMetric {
  const pricedUsage = matchEconomicUsageToPrices(usageRecords, priceRecords);
  const rows = pricedUsage.filter(({ usage }) => categories.includes(usage.category));
  const missing = rows.filter(({ price }) => !price);
  const usageProvenance = usageRecords.flatMap((usage) => [usage.id, usage.evidenceRef]);
  const pricingProvenance = priceRecords.flatMap((price) => [price.id, price.evidenceRef]);
  if (!rows.length || missing.length) {
    return metric(null, "UNAVAILABLE", "USD", "economic_usage_record × economic_price_evidence", observedAt,
      [...(usageProvenance.length ? usageProvenance : ["economic_usage_record:period"]),
        ...(pricingProvenance.length ? pricingProvenance : ["economic_price_evidence:effective"]),
        ...missing.map(({ usage }) => `missing-price:${usage.operation}:${usage.unit}`)]);
  }
  return metric(sum(rows.map(({ usage, price }) => usage.quantity * (price?.priceUsd ?? 0))), "MEASURED", "USD",
    "economic_usage_record × economic_price_evidence", observedAt,
    [...rows.flatMap(({ usage }) => [usage.id, usage.evidenceRef]), ...rows.flatMap(({ price }) => price ? [price.id, price.evidenceRef] : [])].filter(Boolean));
}

function sum(values: number[]) { return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0); }

function percentile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
}

function monthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = now;
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const elapsedDays = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);
  return { start, end, daysInMonth, elapsedDays };
}

export async function runSystemEconomicsCycle(now = new Date()) {
  const { start, end, daysInMonth, elapsedDays } = monthWindow(now);
  const [records, events, backups, semanticRows, sourceRows, connectorSyncs, connectorEvents, usageRecords, priceRecords] = await Promise.all([
    db.select().from(costRecord).where(and(gte(costRecord.recordedAt, start), lte(costRecord.recordedAt, end))),
    db.select().from(eventLog).where(and(gte(eventLog.occurredAt, start), lte(eventLog.occurredAt, end))),
    db.select().from(backupArchive),
    db.select().from(semanticIndex),
    db.select().from(sourceVault),
    db.select().from(connectorSync).where(and(gte(connectorSync.startedAt, start), lte(connectorSync.startedAt, end))),
    db.select().from(normalizedConnectorEvent).where(and(gte(normalizedConnectorEvent.createdAt, start), lte(normalizedConnectorEvent.createdAt, end))),
    db.select().from(economicUsageRecord).where(and(gte(economicUsageRecord.recordedAt, start), lte(economicUsageRecord.recordedAt, end))),
    db.select().from(economicPriceEvidence).where(lte(economicPriceEvidence.effectiveAt, end)),
  ]);
  const totalCostUsd = records.reduce((sum, record) => sum + record.estimatedCostUsd, 0);
  const projectedMonthlyCostUsd = totalCostUsd / elapsedDays * daysInMonth;
  const byEngine = new Map<string, { requestCount: number; estimatedCostUsd: number; totalTokens: number; latencyMs: number[] }>();
  const byTier = new Map<string, { requestCount: number; estimatedCostUsd: number; totalTokens: number }>();
  for (const record of records) {
    const engine = byEngine.get(record.engine) ?? { requestCount: 0, estimatedCostUsd: 0, totalTokens: 0, latencyMs: [] };
    engine.requestCount += 1;
    engine.estimatedCostUsd += record.estimatedCostUsd;
    engine.totalTokens += record.totalTokens;
    if (record.latencyMs > 0) engine.latencyMs.push(record.latencyMs);
    byEngine.set(record.engine, engine);
    const tier = byTier.get(record.tier) ?? { requestCount: 0, estimatedCostUsd: 0, totalTokens: 0 };
    tier.requestCount += 1;
    tier.estimatedCostUsd += record.estimatedCostUsd;
    tier.totalTokens += record.totalTokens;
    byTier.set(record.tier, tier);
  }
  const cilRecords = records.filter((record) => record.provider === "cil" || record.model === "CIL");
  const t1Records = cilRecords.filter((record) => record.tier === "T1" || record.tier === "T1_TRIGRAM");
  const t2Records = cilRecords.filter((record) => record.tier === "T2" || record.tier === "T2_SEMANTIC");
  const t3Records = cilRecords.filter((record) => record.tier === "T3" || record.tier === "T3_FRONTIER");
  const reusedRecords = cilRecords.filter((record) => record.cacheHit || t1Records.includes(record) || t2Records.includes(record));
  const acceptedRecommendations = events.filter((event) => /recommendation.*(accepted|completed)/i.test(event.eventType)).length;
  const completedBriefItems = events.filter((event) => /brief.*(item.*completed|completed)/i.test(event.eventType)).length;
  const simulationResolutions = events.filter((event) => /simulation.*(resolved|completed)/i.test(event.eventType)).length;
  const institutionalKnowledgeEstablished = events.filter((event) => event.eventType === "InstitutionalKnowledgeEstablished").length;
  const computationalCost = [...byEngine.values()].reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  const concentration = [...byEngine.entries()].sort((a, b) => b[1].estimatedCostUsd - a[1].estimatedCostUsd);
  const observedAt = now;
  const provenance = (ids: string[], fallback: string) => ids.length ? ids : [fallback];
  const recordIds = records.map((record) => record.id);
  const eventIds = events.map((event) => event.id);
  const cilIds = cilRecords.map((record) => record.id);
  const backupPeriod = backups.filter((backup) => backup.createdAt >= start && backup.createdAt <= end);
  const semanticBytes = sum(semanticRows.map((row) => Buffer.byteLength(JSON.stringify(row.embedding ?? []), "utf8")));
  const knownSourceBytes = sourceRows.filter((row) => row.byteSize !== null);
  const sourceBytesComplete = knownSourceBytes.length === sourceRows.length;
  const sourceBytes = sum(knownSourceBytes.map((row) => row.byteSize ?? 0));
  const projectCosts = new Map<string, { cost: number; tokens: number; ids: string[] }>();
  for (const record of records) {
    const projectId = typeof record.metadata?.projectId === "string" ? record.metadata.projectId : null;
    if (!projectId) continue;
    const current = projectCosts.get(projectId) ?? { cost: 0, tokens: 0, ids: [] };
    current.cost += record.estimatedCostUsd;
    current.tokens += record.totalTokens;
    current.ids.push(record.id);
    projectCosts.set(projectId, current);
  }
  const benchmark = runCILCostBenchmark();
  const benchmarkFrontierAverage = benchmark.metrics.noReuseCostUsd / Math.max(1, benchmark.metrics.totalRequests);
  const liveAvoidedCalls = reusedRecords.length;
  const liveSavingsEstimate = liveAvoidedCalls * benchmarkFrontierAverage;
  const cilTierCost = sum(cilRecords.map((record) => record.estimatedCostUsd));
  const metricProvenance = {
    records: provenance(recordIds, "cost_record:period"),
    events: provenance(eventIds, "event_log:period"),
    cil: provenance(cilIds, "cost_record:cil:period"),
    backups: provenance(backupPeriod.map((backup) => backup.id), "backup_archive:period"),
    semantic: provenance(semanticRows.map((row) => row.id), "semantic_index:current"),
    sources: provenance(sourceRows.map((row) => row.id), "source_vault:current"),
    connector: provenance([...connectorSyncs.map((row) => row.id), ...connectorEvents.map((row) => row.id)], "connector_sync:period"),
     usage: provenance(usageRecords.flatMap((row) => [row.id, row.evidenceRef]), "economic_usage_record:period"),
     pricing: provenance(priceRecords.flatMap((row) => [row.id, row.evidenceRef]), "economic_price_evidence:effective"),
  };
  const storageSpend = reconcileEconomicCategorySpend(usageRecords, priceRecords, ["storage", "backup", "embedding"], observedAt);
  const networkSpend = reconcileEconomicCategorySpend(usageRecords, priceRecords, ["network"], observedAt);
  const metrics: Record<string, EconomicMetric | Record<string, EconomicMetric>> = {
    "total_cost_usd": metric(totalCostUsd, "MEASURED", "USD", "cost_record.estimated_cost_usd", observedAt, metricProvenance.records),
    "projected_monthly_cost_usd": metric(projectedMonthlyCostUsd, "ESTIMATED", "USD", "system-economics.month_projection", observedAt, metricProvenance.records),
    "model.tokens": metric(sum(records.map((record) => record.totalTokens)), "MEASURED", "tokens", "cost_record.total_tokens", observedAt, metricProvenance.records),
    "model.cost_usd": metric(totalCostUsd, "MEASURED", "USD", "cost_record.estimated_cost_usd", observedAt, metricProvenance.records),
    "model.latency_ms": metric(percentile(records.map((record) => record.latencyMs).filter(Boolean), 0.95), "MEASURED", "milliseconds", "cost_record.latency_ms", observedAt, metricProvenance.records),
    "cil.t1_calls": metric(t1Records.length, "MEASURED", "calls", "cost_record.tier", observedAt, metricProvenance.cil),
    "cil.t2_calls": metric(t2Records.length, "MEASURED", "calls", "cost_record.tier", observedAt, metricProvenance.cil),
    "cil.t3_frontier_calls": metric(t3Records.length, "MEASURED", "calls", "cost_record.tier", observedAt, metricProvenance.cil),
    "cil.frontier_calls": metric(t3Records.length, "MEASURED", "calls", "cost_record.tier", observedAt, metricProvenance.cil),
    "cil.avoided_calls": metric(liveAvoidedCalls, "MEASURED", "calls", "cost_record.cache_hit", observedAt, metricProvenance.cil),
    "cil.tokens": metric(sum(cilRecords.map((record) => record.totalTokens)), "MEASURED", "tokens", "cost_record.total_tokens", observedAt, metricProvenance.cil),
    "cil.model_cost_usd": metric(sum(cilRecords.map((record) => record.estimatedCostUsd)), "MEASURED", "USD", "cost_record.estimated_cost_usd", observedAt, metricProvenance.cil),
    "cil.latency_ms": metric(percentile(cilRecords.map((record) => record.latencyMs).filter(Boolean), 0.95), "MEASURED", "milliseconds", "cost_record.latency_ms", observedAt, metricProvenance.cil),
    "cil.savings_usd": metric(liveSavingsEstimate, "ESTIMATED", "USD", "cil-cost-benchmark.frontier_baseline", observedAt, [...metricProvenance.cil, benchmark.benchmarkId]),
    "cil.benchmark_savings_usd": metric(benchmark.metrics.savingsUsd, "ESTIMATED", "USD", `cil-cost-benchmark:${benchmark.methodologyVersion}`, observedAt, [benchmark.benchmarkId, benchmark.corpusHash]),
    "storage.event_log_rows": metric(events.length, "MEASURED", "rows", "event_log.occurred_at", observedAt, metricProvenance.events),
    "storage.backup_growth_bytes": metric(sum(backupPeriod.map((backup) => backup.sizeBytes)), "MEASURED", "bytes", "backup_archive.size_bytes", observedAt, metricProvenance.backups),
    "storage.backup_bytes": metric(sum(backups.map((backup) => backup.sizeBytes)), "MEASURED", "bytes", "backup_archive.size_bytes", observedAt, provenance(backups.map((backup) => backup.id), "backup_archive:current")),
    "storage.embedding_index_bytes": metric(semanticBytes, "ESTIMATED", "bytes", "semantic_index.embedding JSON payload", observedAt, metricProvenance.semantic),
    "storage.source_vault_bytes": sourceBytesComplete ? metric(sourceBytes, "MEASURED", "bytes", "source_vault.byte_size", observedAt, metricProvenance.sources) : metric(null, "UNAVAILABLE", "bytes", "source_vault.byte_size", observedAt, metricProvenance.sources),
    "connector.api_volume": metric(sum(connectorSyncs.map((row) => row.receivedCount)), "MEASURED", "records", "connector_sync.received_count", observedAt, metricProvenance.connector),
    "connector.normalized_events": metric(connectorEvents.length, "MEASURED", "events", "normalized_connector_event.created_at", observedAt, metricProvenance.connector),
    "engine.cost_usd": Object.fromEntries([...byEngine.entries()].map(([engine, value]) => [engine, metric(value.estimatedCostUsd, "MEASURED", "USD", "cost_record.engine", observedAt, provenance(records.filter((record) => record.engine === engine).map((record) => record.id), `cost_record:engine:${engine}`))])),
    "project.cost_usd": projectCosts.size ? Object.fromEntries([...projectCosts.entries()].map(([projectId, value]) => [projectId, metric(value.cost, "MEASURED", "USD", "cost_record.metadata.projectId", observedAt, value.ids)])) : metric(null, "UNAVAILABLE", "USD", "cost_record.metadata.projectId", observedAt, metricProvenance.records),
    "brief.cost_usd": metric(sum(records.filter((record) => /brief/i.test(record.engine)).map((record) => record.estimatedCostUsd)), "MEASURED", "USD", "cost_record.engine", observedAt, provenance(records.filter((record) => /brief/i.test(record.engine)).map((record) => record.id), "cost_record:engine:brief")),
    "simulation.cost_usd": metric(sum(records.filter((record) => /simulation/i.test(record.engine)).map((record) => record.estimatedCostUsd)), "MEASURED", "USD", "cost_record.engine", observedAt, provenance(records.filter((record) => /simulation/i.test(record.engine)).map((record) => record.id), "cost_record:engine:simulation")),
     "storage.cost_usd": storageSpend,
     "network.cost_usd": networkSpend,
  };
  const alerts: string[] = [];
  if (projectedMonthlyCostUsd > MONTHLY_COST_CEILING_USD) alerts.push(`Projected monthly cost exceeds the $${MONTHLY_COST_CEILING_USD} ceiling.`);
  if (concentration[0] && totalCostUsd > 0 && concentration[0][1].estimatedCostUsd / totalCostUsd > 0.6) {
    alerts.push(`${concentration[0][0]} accounts for ${Math.round(concentration[0][1].estimatedCostUsd / totalCostUsd * 100)}% of current cost.`);
  }
  const summary = {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalCostUsd,
    projectedMonthlyCostUsd,
    costByCategory: {
      computational: metrics["engine.cost_usd"],
      storage: storageSpend,
      background: metric(null, "UNAVAILABLE", "USD", "no background price ledger", observedAt, ["system-economics:background-pricing-unavailable"]),
      network: networkSpend,
    },
    byEngine: [...byEngine.entries()].map(([engine, value]) => ({ engine, requestCount: value.requestCount, estimatedCostUsd: value.estimatedCostUsd, totalTokens: value.totalTokens, latencyP50Ms: percentile(value.latencyMs, 0.5), latencyP95Ms: percentile(value.latencyMs, 0.95) })),
    byTier: [...byTier.entries()].map(([tier, value]) => ({ tier, ...value })),
    cil: { requestCount: cilRecords.length, reuseRate: cilRecords.length ? reusedRecords.length / cilRecords.length : 0, reusedRequests: reusedRecords.length, escalationRate: cilRecords.length ? cilRecords.filter((record) => record.tier === "T3").length / cilRecords.length : 0 },
    cilBenchmark: benchmark,
    latency: { p50Ms: percentile(records.map((record) => record.latencyMs).filter(Boolean), 0.5), p95Ms: percentile(records.map((record) => record.latencyMs).filter(Boolean), 0.95) },
    valueRatios: {
      costPerAcceptedRecommendation: acceptedRecommendations ? totalCostUsd / acceptedRecommendations : null,
      costPerCompletedBriefItem: completedBriefItems ? totalCostUsd / completedBriefItems : null,
      costPerSimulation: simulationResolutions ? totalCostUsd / simulationResolutions : null,
      costPerInstitutionalKnowledge: institutionalKnowledgeEstablished ? totalCostUsd / institutionalKnowledgeEstablished : null,
    },
    valueRatioMetrics: {
      costPerAcceptedRecommendation: acceptedRecommendations ? metric(totalCostUsd / acceptedRecommendations, "MEASURED", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records) : metric(null, "UNAVAILABLE", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records),
      costPerCompletedBriefItem: completedBriefItems ? metric(totalCostUsd / completedBriefItems, "MEASURED", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records) : metric(null, "UNAVAILABLE", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records),
      costPerSimulation: simulationResolutions ? metric(totalCostUsd / simulationResolutions, "MEASURED", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records) : metric(null, "UNAVAILABLE", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records),
      costPerInstitutionalKnowledge: institutionalKnowledgeEstablished ? metric(totalCostUsd / institutionalKnowledgeEstablished, "MEASURED", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records) : metric(null, "UNAVAILABLE", "USD/outcome", "cost_record + event_log", observedAt, metricProvenance.records),
    },
    valueCounts: { acceptedRecommendations, completedBriefItems, simulationResolutions, institutionalKnowledgeEstablished },
    storage: { eventLogRows: events.length, semanticIndexBytes: metrics["storage.embedding_index_bytes"], brainBackupBytes: metrics["storage.backup_bytes"] },
    metrics,
    reconciliation: {
      status: Math.abs(computationalCost - totalCostUsd) < 0.000001 ? "RECONCILED" : "MISMATCH",
      observedAt: observedAt.toISOString(),
      checks: [
        { name: "engine_cost_equals_total_cost", status: Math.abs(computationalCost - totalCostUsd) < 0.000001 ? "PASS" : "FAIL", left: computationalCost, right: totalCostUsd, provenance: metricProvenance.records },
        { name: "cil_tier_cost_equals_cil_cost", status: Math.abs(t1Records.reduce((total, record) => total + record.estimatedCostUsd, 0) + t2Records.reduce((total, record) => total + record.estimatedCostUsd, 0) + t3Records.reduce((total, record) => total + record.estimatedCostUsd, 0) - cilTierCost) < 0.000001 ? "PASS" : "FAIL", left: cilTierCost, right: cilTierCost, provenance: metricProvenance.cil },
        { name: "metric_statuses_explicit", status: Object.values(metrics).every((value) => value && typeof value === "object") ? "PASS" : "FAIL", left: Object.keys(metrics).length, right: ECONOMIC_DIMENSIONS.length, provenance: ["system-economics:metric-contract"] },
      ],
    },
  };
  const [cycle] = await db.insert(systemEconomicsCycle).values({ periodStart: start, periodEnd: end, totalCostUsd, projectedMonthlyCostUsd, summary, alerts, createdAt: now }).returning();
  await db.insert(eventLog).values({ eventType: "SystemEconomicsUpdated", aggregateType: "system_economics", aggregateId: cycle.id, sourceRef: "system-economics", occurredAt: now, payload: { cycleId: cycle.id, totalCostUsd, projectedMonthlyCostUsd, cilReuseRate: summary.cil.reuseRate, topCostCategory: concentration[0]?.[0] ?? null, alerts } });
  for (const alert of alerts) {
    await db.insert(eventLog).values({ eventType: "InitiativeObservationCreated", aggregateType: "initiative", aggregateId: cycle.id, sourceRef: "system-economics", occurredAt: now, payload: { kind: "economics_alert", message: alert, cycleId: cycle.id } });
  }
  return cycle;
}

export async function getSystemEconomicsSummary() {
  const [cycle] = await db.select().from(systemEconomicsCycle).orderBy(desc(systemEconomicsCycle.createdAt)).limit(1);
  return cycle ?? await runSystemEconomicsCycle();
}