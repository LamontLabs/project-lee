import { desc, eq } from "drizzle-orm";
import { db, initiativeItem, operationalContextSnapshot, universalObject } from "@workspace/db";
import { operationalContext } from "./operational-memory";
import { currentWorldState } from "./world-state";
import { emitEvent } from "./foundation-events";
import { currentProjectMomentum } from "./project-momentum";

const weight: Record<string, number> = { CRITICAL: 100, HIGH: 80, MEDIUM: 50, LOW: 20 };
export async function generateOperationalContext() {
  const [initiatives, memory, world, objects, momentum] = await Promise.all([
    db.select().from(initiativeItem), operationalContext(), currentWorldState(), db.select().from(universalObject), currentProjectMomentum(),
  ]);
  const active = initiatives.filter((item) => !item.dismissedAt && !item.acknowledgedAt && new Date(item.expiresAt) > new Date());
  const scored = active.map((item) => ({ ...item, score: (weight[item.significance] ?? 10) + (new Date(item.generatedAt).getTime() > Date.now() - 21600000 ? 15 : 0) })).sort((a, b) => b.score - a.score);
  const changedItems = scored.slice(0, 5).map((item) => ({ id: item.id, text: item.observation, score: item.score, evidenceRefs: item.evidenceRefs }));
  const waitingItems = initiatives.filter((item) => !item.dismissedAt && !item.acknowledgedAt).slice(0, 10).map((item) => ({ id: item.id, text: item.observation, significance: item.significance }));
  const driftingItems = objects.filter((item: any) => item.ageState === "STALE" || item.ageState === "OLD").slice(0, 10).map((item: any) => ({ id: item.id, text: `${item.title ?? item.name ?? "Knowledge item"} is ${item.ageState.toLowerCase()}.` }));
  const momentumRisk = momentum.filter((item) => item.classification === "Dormant" || item.classification === "Stalled").map((item) => ({ id: item.projectId, text: `Project ${item.projectId} momentum is ${item.classification.toLowerCase()}.`, value: item.score }));
  const atRiskItems = [...world.signals.filter((signal) => signal.signalType === "technical" || signal.currentValue?.alert).map((signal) => ({ id: signal.id, text: signal.signalName, value: signal.currentValue })), ...momentumRisk];
  const momentumDrift = momentum.filter((item) => item.classification === "Declining").map((item) => ({ id: item.projectId, text: `Project ${item.projectId} momentum is declining.` }));
  const canWaitItems = objects.filter((item: any) => item.memoryTier === "archive" || item.memoryTier === "historical").slice(0, 10).map((item: any) => ({ id: item.id, text: item.title ?? item.name ?? "Historical item" }));
  const activePriority = changedItems[0] ?? (memory.activePatterns[0] ? { text: memory.activePatterns[0].patternDescription, score: 35 } : null);
  const [snapshot] = await db.insert(operationalContextSnapshot).values({ activePriority, changedItems, driftingItems: [...driftingItems, ...momentumDrift], waitingItems, blockedItems: [], atRiskItems, canWaitItems, scoringContext: { operationalMemory: memory, worldStateSignals: world.signals.length, momentumProjects: momentum.length, currentState: "live" } }).returning();
  await emitEvent({ eventType: "OperationalContextUpdated", aggregateType: "operational_context", aggregateId: snapshot.id, payload: { previousPriority: null, newPriority: activePriority } });
  return snapshot;
}
export async function currentOperationalContext() { const [latest] = await db.select().from(operationalContextSnapshot).orderBy(desc(operationalContextSnapshot.generatedAt)).limit(1); return latest ?? generateOperationalContext(); }
export async function operationalFocus() { const context = await currentOperationalContext(); return context.activePriority ?? { text: "No immediate operational priority detected.", score: 0 }; }