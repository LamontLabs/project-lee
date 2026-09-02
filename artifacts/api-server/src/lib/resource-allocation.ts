import { desc, eq, gt } from "drizzle-orm";
import { db, initiativeItem, resourceAllocation, resourceAllocationOverride, strategicAnchor, strategicObjective, universalObject, waitingLoop } from "@workspace/db";
import { currentOperationalCapacity } from "./operational-capacity";
import { currentProjectMomentum } from "./project-momentum";
import { emitEvent } from "./foundation-events";
import { currentPortfolioState } from "./portfolio-intelligence";
import { currentExecutionReadiness } from "./execution-readiness";
const DAILY_HOURS = 8; const WEEKLY_HOURS = 40;
export async function computeResourceAllocation() {
  const [projects, momentum, objectives, anchors, loops, capacity, overrides, portfolio, readiness] = await Promise.all([
    db.select().from(universalObject).where(eq(universalObject.objectType, "project")), currentProjectMomentum(),
    db.select().from(strategicObjective).where(eq(strategicObjective.status, "active")), db.select().from(strategicAnchor).where(eq(strategicAnchor.active, true)),
    db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")), currentOperationalCapacity(),
    db.select().from(resourceAllocationOverride).where(gt(resourceAllocationOverride.expiresAt, new Date())), currentPortfolioState(), currentExecutionReadiness(),
  ]);
  if (!projects.length) return [];
  const raw = projects.map((project) => {
    const momentumScore = momentum.find((item) => item.projectId === project.id)?.score ?? 20;
    const objectiveScore = objectives.reduce((sum, item) => sum + ((item.relatedProjectIds ?? []).includes(project.id) ? 30 : 0), 0);
    const anchorScore = anchors.reduce((sum, item) => sum + (item.projectId === project.id ? 20 : 0), 0);
    const waitingPenalty = loops.filter((item) => JSON.stringify(item).includes(project.id)).length * 8;
    const readinessBonus = Math.max(0, (readiness.find((item: any) => item.projectId === project.id)?.overallScore ?? 0) - 70) * .25;
    const score = Math.max(1, momentumScore * .55 + objectiveScore + anchorScore + readinessBonus - waitingPenalty);
    return { project, score, why: { momentum: momentumScore, objectives: objectiveScore, anchors: anchorScore, readinessBonus, waitingPenalty } };
  });
  const total = raw.reduce((sum, item) => sum + item.score, 0);
  const locked = new Map(overrides.map((item) => [item.projectId, item]));
  const lockedTotal = [...locked.values()].reduce((sum, item) => sum + item.percentage, 0);
  const result = raw.map((item) => {
    const override = locked.get(item.project.id); const percentage = override ? override.percentage : Math.max(1, (100 - lockedTotal) * item.score / Math.max(1, total - [...locked].filter(([projectId]) => projectId !== item.project.id).reduce((sum, [projectId]) => sum + (raw.find((r) => r.project.id === projectId)?.score ?? 0), 0)));
    const constrained = capacity.state === "LOW" || capacity.state === "RECOVERY"; const adjusted = constrained && !override ? percentage * .75 : percentage;
    return { projectId: item.project.id, percentage: Math.round(adjusted * 10) / 10, impliedDailyHours: Math.round(adjusted / 100 * DAILY_HOURS * 10) / 10, impliedWeeklyHours: Math.round(adjusted / 100 * WEEKLY_HOURS * 10) / 10, why: item.why, narrative: override ? `Owner override: ${override.reason}` : `${item.project.name} allocation reflects momentum, objective alignment, anchors, and dependency waiting signals.` };
  });
  for (const item of result) { const [saved] = await db.insert(resourceAllocation).values(item).returning(); await emitEvent({ eventType: "ResourceAllocationUpdated", aggregateType: "resource_allocation", aggregateId: saved.id, sourceRef: "resource-allocation", payload: item }); }
  for (const item of result) {
    const observed = portfolio.attentionDistribution?.find((entry: any) => entry.projectId === item.projectId)?.share ?? 0;
    if (Math.abs(observed - item.percentage) >= 25) {
      const dedupeKey = `allocation-divergence:${item.projectId}`;
      const recent = await db.select().from(initiativeItem).where(eq(initiativeItem.dedupeKey, dedupeKey)).orderBy(desc(initiativeItem.generatedAt)).limit(1);
      if (!recent[0] || Date.now() - recent[0].generatedAt.getTime() > 86400000) await db.insert(initiativeItem).values({ category: "resource_allocation", observation: `Observed attention is ${observed}% versus recommended allocation ${item.percentage}%.`, significance: "MEDIUM", evidenceRefs: [item.projectId], generatedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000), actionHint: "Review whether current attention still reflects the operating priorities.", dedupeKey, metadata: { observed, recommended: item.percentage } });
    }
  }
  return result.map((item) => ({ ...item, project: projects.find((project) => project.id === item.projectId) }));
}
export async function currentResourceAllocation() { const rows = await db.select().from(resourceAllocation).orderBy(desc(resourceAllocation.computedAt)).limit(100); const latest = new Map<string, any>(); for (const row of rows) if (!latest.has(row.projectId)) latest.set(row.projectId, row); return latest.size ? [...latest.values()] : computeResourceAllocation(); }
export async function allocationHistory() { return db.select().from(resourceAllocation).orderBy(desc(resourceAllocation.computedAt)).limit(200); }
export async function createAllocationOverride(input: { projectId: string; percentage: number; reason: string; expiresAt: Date }) { return db.insert(resourceAllocationOverride).values(input).returning(); }
const OVERRIDE_EXPIRING_WINDOW_MS = 7 * 86400000;
export async function allocationOverrideStatus() {
  const [overrides, projects] = await Promise.all([
    db.select().from(resourceAllocationOverride).orderBy(desc(resourceAllocationOverride.expiresAt)),
    db.select({ id: universalObject.id, name: universalObject.name }).from(universalObject).where(eq(universalObject.objectType, "project")),
  ]);
  const now = Date.now();
  return overrides.map((override) => {
    const expiresAt = override.expiresAt.getTime();
    const status = expiresAt <= now ? "expired" : expiresAt - now <= OVERRIDE_EXPIRING_WINDOW_MS ? "expiring" : "active";
    return {
      ...override,
      status,
      project: projects.find((project) => project.id === override.projectId) ?? { id: override.projectId, name: override.projectId },
      daysRemaining: status === "expired" ? 0 : Math.ceil((expiresAt - now) / 86400000),
    };
  });
}
export async function releaseAllocationOverride(id: string) {
  return db.delete(resourceAllocationOverride).where(eq(resourceAllocationOverride.id, id)).returning();
}