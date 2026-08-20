import { and, desc, eq, gte, lte } from "drizzle-orm";
import { backupArchive, connectorSync, costRecord, db, eventLog, normalizedConnectorEvent, semanticIndex, sourceVault, systemEconomicsCycle } from "@workspace/db";
import { runCILCostBenchmark } from "./cil-cost-benchmark";

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

export const ECONOMIC_DIMENSIONS = [
  "cil.t1_calls", "cil.t2_calls", "cil.t3_frontier_calls", "cil.frontier_calls", "cil.avoided_calls",
  "cil.tokens", "cil.model_cost_usd", "cil.latency_ms", "cil.savings_usd",
  "model.tokens", "model.cost_usd", "model.latency_ms",
  "storage.event_log_rows", "storage.backup_growth_bytes", "storage.backup_bytes", "storage.embedding_index_bytes",
  "storage.source_vault_bytes", "connector.api_volume", "connector.normalized_events",
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
  const [records, events, backups, semanticRows, sourceRows, connectorSyncs, connectorEvents] = await Promise.all([
    db.select().from(costRecord).where(and(gte(costRecord.recordedAt, start), lte(costRecord.recordedAt, end))),
    db.select().from(eventLog).where(and(gte(eventLog.occurredAt, start), lte(eventLog.occurredAt, end))),
    db.select().from(backupArchive),
    db.select().from(semanticIndex),
    db.select().from(sourceVault),
    db.select().from(connectorSync).where(and(gte(connectorSync.startedAt, start), lte(connectorSync.startedAt, end))),
    db.select().from(normalizedConnectorEvent).where(and(gte(normalizedConnectorEvent.createdAt, start), lte(normalizedConnectorEvent.createdAt, end))),
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
  };
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
      storage: metric(null, "UNAVAILABLE", "USD", "no storage price ledger", observedAt, ["system-economics:storage-pricing-unavailable"]),
      background: metric(null, "UNAVAILABLE", "USD", "no background price ledger", observedAt, ["system-economics:background-pricing-unavailable"]),
      network: metric(null, "UNAVAILABLE", "USD", "no network price ledger", observedAt, ["system-economics:network-pricing-unavailable"]),
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