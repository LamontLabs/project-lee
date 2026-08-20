import { and, desc, eq, gte, lte } from "drizzle-orm";
import { costRecord, db, eventLog, systemEconomicsCycle } from "@workspace/db";
import { runCILCostBenchmark } from "./cil-cost-benchmark";

const MONTHLY_COST_CEILING_USD = 100;

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
  const [records, events] = await Promise.all([
    db.select().from(costRecord).where(and(gte(costRecord.recordedAt, start), lte(costRecord.recordedAt, end))),
    db.select().from(eventLog).where(and(gte(eventLog.occurredAt, start), lte(eventLog.occurredAt, end))),
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
  const reusedRecords = cilRecords.filter((record) => record.cacheHit || record.tier === "T1" || record.tier === "T2");
  const acceptedRecommendations = events.filter((event) => /recommendation.*(accepted|completed)/i.test(event.eventType)).length;
  const completedBriefItems = events.filter((event) => /brief.*(item.*completed|completed)/i.test(event.eventType)).length;
  const simulationResolutions = events.filter((event) => /simulation.*(resolved|completed)/i.test(event.eventType)).length;
  const institutionalKnowledgeEstablished = events.filter((event) => event.eventType === "InstitutionalKnowledgeEstablished").length;
  const computationalCost = [...byEngine.values()].reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  const concentration = [...byEngine.entries()].sort((a, b) => b[1].estimatedCostUsd - a[1].estimatedCostUsd);
  const alerts: string[] = [];
  if (projectedMonthlyCostUsd > MONTHLY_COST_CEILING_USD) alerts.push(`Projected monthly cost exceeds the $${MONTHLY_COST_CEILING_USD} ceiling.`);
  if (concentration[0] && totalCostUsd > 0 && concentration[0][1].estimatedCostUsd / totalCostUsd > 0.6) {
    alerts.push(`${concentration[0][0]} accounts for ${Math.round(concentration[0][1].estimatedCostUsd / totalCostUsd * 100)}% of current cost.`);
  }
  const benchmark = runCILCostBenchmark();
  const summary = {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalCostUsd,
    projectedMonthlyCostUsd,
    costByCategory: { computational: computationalCost, storage: events.length * 0.00001, background: events.filter((event) => /job|cycle|scheduled/i.test(event.eventType)).length * 0.0001, network: events.filter((event) => /sync|query|govern|connector/i.test(event.eventType)).length * 0.00005 },
    byEngine: [...byEngine.entries()].map(([engine, value]) => ({ engine, requestCount: value.requestCount, estimatedCostUsd: value.estimatedCostUsd, totalTokens: value.totalTokens, latencyP50Ms: percentile(value.latencyMs, 0.5), latencyP95Ms: percentile(value.latencyMs, 0.95) })),
    byTier: [...byTier.entries()].map(([tier, value]) => ({ tier, ...value })),
    cil: { requestCount: cilRecords.length, reuseRate: cilRecords.length ? reusedRecords.length / cilRecords.length : 0, reusedRequests: reusedRecords.length, escalationRate: cilRecords.length ? cilRecords.filter((record) => record.tier === "T3").length / cilRecords.length : 0 },
    cilBenchmark: benchmark,
    latency: { p50Ms: percentile(records.map((record) => record.latencyMs).filter(Boolean), 0.5), p95Ms: percentile(records.map((record) => record.latencyMs).filter(Boolean), 0.95) },
    valueRatios: { costPerAcceptedRecommendation: acceptedRecommendations ? totalCostUsd / acceptedRecommendations : null, costPerCompletedBriefItem: completedBriefItems ? totalCostUsd / completedBriefItems : null, costPerSimulation: simulationResolutions ? totalCostUsd / simulationResolutions : null, costPerInstitutionalKnowledge: institutionalKnowledgeEstablished ? totalCostUsd / institutionalKnowledgeEstablished : null },
    valueCounts: { acceptedRecommendations, completedBriefItems, simulationResolutions, institutionalKnowledgeEstablished },
    storage: { eventLogRows: events.length, semanticIndexBytes: null, brainBackupBytes: null },
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