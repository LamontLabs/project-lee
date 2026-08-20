import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db, eventLog, initiativeItem, projectMomentum, projectMomentumHistory as projectMomentumHistoryTable, universalObject } from "@workspace/db";
import { emitEvent } from "./foundation-events";

const WINDOWS = { commits: .25, documentation: .15, captures: .15, decisions: .15, responses: .1, waiting: .2 };
const signalTypes: Record<string, string[]> = { commits: ["CommitPushed", "PRMerged"], documentation: ["DocumentCreated", "DocumentUpdated", "FileCreated", "FileUpdated"], captures: ["SourceVaultRecordCreated"], decisions: ["RecommendationGenerated", "GovernanceItemApproved", "DecisionRecorded"], responses: ["EmailReceived", "ThreadUpdated"], waiting: ["WaitingLoopResolved"] };
function classification(score: number, counts: Record<string, number>) {
  if (score >= 80) return "Explosive";
  if (score >= 60) return "Rising";
  if (score >= 40) return "Stable";
  if (score >= 20) return "Declining";
  return Object.values(counts).every((value) => value === 0) ? "Stalled" : "Dormant";
}
function projectMatches(event: typeof eventLog.$inferSelect, projectId: string) {
  const payload = event.payload ?? {};
  return [payload.projectId, payload.project_id, payload.projectRef, payload.projectId].includes(projectId) || event.aggregateId === projectId;
}
export async function computeProjectMomentum(projectId?: string) {
  const projects = await db.select().from(universalObject).where(eq(universalObject.objectType, "project"));
  const selected = projectId ? projects.filter((project) => project.id === projectId) : projects;
  const since = new Date(Date.now() - 7 * 86400000);
  const events = await db.select().from(eventLog).where(gte(eventLog.occurredAt, since));
  const results = [];
  for (const project of selected) {
    const counts = Object.fromEntries(Object.keys(WINDOWS).map((key) => [key, events.filter((event) => signalTypes[key].includes(event.eventType) && projectMatches(event, project.id)).length])) as Record<string, number>;
    const contributions = Object.entries(WINDOWS).map(([key, weight]) => ({ key, label: key[0].toUpperCase() + key.slice(1), count: counts[key], weight, contribution: Math.min(100, counts[key] * 20) * weight }));
    const score = Math.round(contributions.reduce((sum, item) => sum + item.contribution, 0));
    const current = await db.select().from(projectMomentum).where(eq(projectMomentum.projectId, project.id)).orderBy(desc(projectMomentum.computedAt)).limit(1);
    const previous = current[0];
    const direction = previous ? score > previous.score + 5 ? "up" : score < previous.score - 5 ? "down" : "flat" : score > 0 ? "up" : "flat";
    const nextClass = classification(score, counts);
    const [snapshot] = await db.insert(projectMomentum).values({ projectId: project.id, score, classification: nextClass, direction, contributions }).returning();
    await db.insert(projectMomentumHistoryTable).values({ projectId: project.id, score, classification: nextClass, direction, contributions });
    if (previous && previous.classification !== nextClass && (nextClass === "Explosive" || nextClass === "Stalled" || previous.classification === "Rising" && nextClass === "Dormant")) {
      await emitEvent({ eventType: "ProjectMomentumChanged", aggregateType: "project", aggregateId: project.id, sourceRef: "project-momentum", payload: { projectId: project.id, previousClassification: previous.classification, classification: nextClass, previousScore: previous.score, score } });
      const dedupeKey = `project-momentum:${project.id}:${nextClass}`;
      const recent = await db.select().from(initiativeItem).orderBy(desc(initiativeItem.generatedAt)).limit(100);
      if (!recent.some((item) => item.dedupeKey === dedupeKey)) await db.insert(initiativeItem).values({ category: "project_momentum", observation: `${project.name} momentum changed from ${previous.classification} to ${nextClass}.`, significance: "MEDIUM", evidenceRefs: [], expiresAt: new Date(Date.now() + 7 * 86400000), dedupeKey, actionHint: "Review the project trajectory and decide whether attention or a deliberate pause is needed.", metadata: { projectId: project.id, score } });
    }
    results.push({ ...snapshot, project });
  }
  return results;
}
export async function currentProjectMomentum(projectId?: string) {
  const rows = projectId ? await db.select().from(projectMomentum).where(eq(projectMomentum.projectId, projectId)).orderBy(desc(projectMomentum.computedAt)).limit(1) : await db.select().from(projectMomentum).orderBy(desc(projectMomentum.computedAt)).limit(500);
  return rows;
}
export async function projectMomentumHistory(projectId: string) { return db.select().from(projectMomentumHistoryTable).where(eq(projectMomentumHistoryTable.projectId, projectId)).orderBy(desc(projectMomentumHistoryTable.computedAt)).limit(30); }