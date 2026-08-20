import { and, desc, eq, gte } from "drizzle-orm";
import { db, assumptionLedger, eventLog, initiativeItem, operationalConfidenceSnapshot, simulation, strategicObjective, uncertaintyState, universalObject, waitingLoop } from "@workspace/db";
import { emitEvent } from "./foundation-events";
const levels = ["LOW", "MEDIUM", "HIGH", "VERY HIGH"] as const;
const classify = (score: number) => score >= 7 ? "VERY HIGH" : score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";
export async function computeUncertainty() {
  const [loops, assumptions, simulations, objectives, projects] = await Promise.all([
    db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")),
    db.select().from(assumptionLedger).where(eq(assumptionLedger.status, "active")),
    db.select().from(simulation).where(eq(simulation.scenarioStatus, "active")),
    db.select().from(strategicObjective).where(eq(strategicObjective.status, "active")),
    db.select().from(universalObject).where(eq(universalObject.objectType, "project")),
  ]);
  const results: Array<typeof uncertaintyState.$inferInsert> = [];
  const add = (objectId: string, objectType: string, score: number, signals: string[]) => { const level = classify(score); results.push({ objectId, objectType, outcomeLevel: classify(score * .6), timingLevel: classify(score * .8), scopeLevel: classify(score * .4), level, score, signals }); };
  add("portfolio", "portfolio", loops.length * .8 + assumptions.length * .3 + simulations.length * .6, [`${loops.length} open waiting loops`, `${assumptions.length} active assumptions`, `${simulations.length} unresolved simulations`]);
  for (const project of projects) {
    const related = loops.filter((loop) => JSON.stringify(loop).includes(project.id)).length;
    add(project.id, "project", related * 2 + assumptions.length * .15, [`${related} project-linked waiting loops`, `${assumptions.length} active assumptions in the system`]);
  }
  for (const objective of objectives.filter((item) => !item.lastReviewedAt || Date.now() - item.lastReviewedAt.getTime() > 14 * 86400000)) add(objective.id, "objective", 4, ["No recent objective review signal"]);
  const prior = await db.select().from(uncertaintyState).orderBy(desc(uncertaintyState.computedAt)).limit(500);
  for (const result of results) {
    const previous = prior.find((item) => item.objectId === result.objectId && item.objectType === result.objectType);
    await db.insert(uncertaintyState).values(result);
    if (previous && previous.level !== result.level) await emitEvent({ eventType: "UncertaintyLevelChanged", aggregateType: result.objectType, aggregateId: result.objectId, sourceRef: "uncertainty-engine", payload: { objectId: result.objectId, objectType: result.objectType, previousLevel: previous.level, level: result.level, score: result.score } });
  }
  return results;
}
export async function currentUncertainty(objectId?: string, objectType?: string): Promise<any[]> {
  const rows = objectId ? await db.select().from(uncertaintyState).where(and(eq(uncertaintyState.objectId, objectId), objectType ? eq(uncertaintyState.objectType, objectType) : undefined)).orderBy(desc(uncertaintyState.computedAt)).limit(1) : await db.select().from(uncertaintyState).orderBy(desc(uncertaintyState.computedAt)).limit(500);
  return rows.length ? rows : computeUncertainty();
}