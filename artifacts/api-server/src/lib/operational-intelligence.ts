import { desc } from "drizzle-orm";
import { db, operationalContextSnapshot } from "@workspace/db";
import { operationalContext } from "./operational-memory";
import { currentWorldState } from "./world-state";
import { emitEvent } from "./foundation-events";
import { currentProjectMomentum } from "./project-momentum";
import { currentOperationalCapacity } from "./operational-capacity";
import { currentPortfolioState } from "./portfolio-intelligence";
import { queryEngine } from "./query-engine";

const weight: Record<string, number> = { CRITICAL: 100, HIGH: 80, MEDIUM: 50, LOW: 20 };
export async function generateOperationalContext() {
  const [initiativeResults, memory, world, objectResults, momentum, capacity, portfolio] = await Promise.all([
    queryEngine.query({ sources: ["initiatives"], filters: {}, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Operational Intelligence", purpose: "operational_context" }),
    operationalContext(), currentWorldState(),
    queryEngine.query({ sources: ["universal_objects"], filters: {}, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Operational Intelligence", purpose: "operational_context" }),
    currentProjectMomentum(),
    currentOperationalCapacity(),
    currentPortfolioState(),
  ]);
  const initiatives = initiativeResults.map((item) => item.object as any);
  const objects = objectResults.map((item) => item.object as any);
  const active = initiatives.filter((item) => !item.dismissedAt && !item.acknowledgedAt && (!item.expiresAt || new Date(item.expiresAt) > new Date())).filter((item) => capacity.state !== "LOW" || item.significance === "CRITICAL").filter((item) => capacity.state !== "RECOVERY" || item.significance === "CRITICAL");
  const scored = active.map((item) => ({ ...item, score: (weight[item.significance] ?? 10) + (new Date(item.generatedAt).getTime() > Date.now() - 21600000 ? 15 : 0) })).sort((a, b) => b.score - a.score);
  const changedItems = scored.slice(0, capacity.state === "CONSTRAINED" ? 2 : capacity.state === "LOW" || capacity.state === "RECOVERY" ? 1 : 5).map((item) => ({ id: item.id, text: item.observation, score: item.score, evidenceRefs: item.evidenceRefs }));
  const waitingItems = initiatives.filter((item) => !item.dismissedAt && !item.acknowledgedAt).slice(0, 10).map((item) => ({ id: item.id, text: item.observation, significance: item.significance }));
  const driftingItems = objects.filter((item: any) => item.ageState === "STALE" || item.ageState === "OLD").slice(0, 10).map((item: any) => ({ id: item.id, text: `${item.title ?? item.name ?? "Knowledge item"} is ${item.ageState.toLowerCase()}.` }));
  const momentumRisk = momentum.filter((item) => item.classification === "Dormant" || item.classification === "Stalled").map((item) => ({ id: item.projectId, text: `Project ${item.projectId} momentum is ${item.classification.toLowerCase()}.`, value: item.score }));
  const atRiskItems = [...world.signals.filter((signal) => signal.signalType === "technical" || signal.currentValue?.alert).map((signal) => ({ id: signal.id, text: signal.signalName, value: signal.currentValue })), ...momentumRisk, ...portfolio.alerts.filter((alert) => alert.type === "shared_dependency").map((alert) => ({ id: alert.title, text: alert.title, value: alert.projectIds }))];
  const momentumDrift = momentum.filter((item) => item.classification === "Declining").map((item) => ({ id: item.projectId, text: `Project ${item.projectId} momentum is declining.` }));
  const canWaitItems = objects.filter((item: any) => item.memoryTier === "archive" || item.memoryTier === "historical").slice(0, 10).map((item: any) => ({ id: item.id, text: item.title ?? item.name ?? "Historical item" }));
  const activePriority = changedItems[0] ?? (memory.activePatterns[0] ? { text: memory.activePatterns[0].patternDescription, score: 35 } : null);
  const [snapshot] = await db.insert(operationalContextSnapshot).values({ activePriority, changedItems, driftingItems: [...driftingItems, ...momentumDrift], waitingItems, blockedItems: [], atRiskItems, canWaitItems, scoringContext: { operationalMemory: memory, worldStateSignals: world.signals.length, momentumProjects: momentum.length, capacity: capacity.state, portfolioHealth: portfolio.healthScore, currentState: "live" } }).returning();
  await emitEvent({ eventType: "OperationalContextUpdated", aggregateType: "operational_context", aggregateId: snapshot.id, payload: { previousPriority: null, newPriority: activePriority } });
  return snapshot;
}
export async function currentOperationalContext() { const [latest] = await db.select().from(operationalContextSnapshot).orderBy(desc(operationalContextSnapshot.generatedAt)).limit(1); return latest ?? generateOperationalContext(); }
export async function operationalFocus() { const context = await currentOperationalContext(); return context.activePriority ?? { text: "No immediate operational priority detected.", score: 0 }; }