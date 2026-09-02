import { desc, eq, gte } from "drizzle-orm";
import { db, bootstrapRun, eventLog, opportunity, strategicObjective, universalObject, notification } from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { currentProjectMomentum } from "./project-momentum";
import { anchorContradictions, listAnchors } from "./strategic-anchors";

const DAILY_LIMIT = 3;
const TYPES = ["code_reuse", "strategic_alignment", "resource_leverage"] as const;
type Candidate = { opportunityType: typeof TYPES[number]; title: string; description: string; projectIds: string[]; evidenceRefs: string[]; suggestedAction: string; confidence: number };

export async function detectOpportunities() {
  const [projects, runs, objectives, momentum, anchors] = await Promise.all([
    db.select().from(universalObject).where(eq(universalObject.objectType, "project")),
    db.select().from(bootstrapRun).where(eq(bootstrapRun.status, "completed")),
    db.select().from(strategicObjective).where(eq(strategicObjective.status, "active")),
    currentProjectMomentum(),
    listAnchors(),
  ]);
  const candidates: Candidate[] = [];
  const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
  for (let i = 0; i < runs.length; i += 1) {
    for (let j = i + 1; j < runs.length; j += 1) {
      const a = runs[i].report as any;
      const b = runs[j].report as any;
      const first = new Set([...list(a?.dependencies), ...list(a?.technologyStack)].map(String));
      const second = [...new Set([...list(b?.dependencies), ...list(b?.technologyStack)].map(String))];
      const overlap = second.filter((item) => first.has(item));
      if (overlap.length >= 2) candidates.push({ opportunityType: "code_reuse", title: "Shared implementation pattern", description: `Projects ${runs[i].projectId} and ${runs[j].projectId} share ${overlap.slice(0, 4).join(", ")}.`, projectIds: [runs[i].projectId, runs[j].projectId], evidenceRefs: [runs[i].id, runs[j].id], suggestedAction: "Compare the shared pattern and extract the reusable boundary before building it twice.", confidence: Math.min(.95, .6 + overlap.length * .08) });
    }
  }
  for (const objective of objectives) {
    const relatedProjectIds = list(objective.relatedProjectIds).map(String);
    if (relatedProjectIds.length >= 2) candidates.push({ opportunityType: "strategic_alignment", title: "Shared strategic objective", description: `${objective.objective} links multiple projects and can compound progress across the portfolio.`, projectIds: relatedProjectIds, evidenceRefs: [objective.id], suggestedAction: objective.nextAction ?? "Coordinate the next milestone so both projects advance the objective.", confidence: objective.propagatedConfidence ?? .7 });
  }
  const active = momentum.filter((item) => item.classification === "Rising" || item.classification === "Explosive");
  const stalled = momentum.filter((item) => item.classification === "Stalled" || item.classification === "Dormant");
  if (active.length && stalled.length) candidates.push({ opportunityType: "resource_leverage", title: "Momentum can unlock a stalled project", description: `A high-momentum project (${active[0].projectId}) may contain a reusable operating pattern for stalled project ${stalled[0].projectId}.`, projectIds: [active[0].projectId, stalled[0].projectId], evidenceRefs: [active[0].id, stalled[0].id], suggestedAction: "Inspect the active project's recent changes for a transfer path before adding new work.", confidence: .72 });

  const existing = await db.select().from(opportunity).where(eq(opportunity.lifecycle, "new")).orderBy(desc(opportunity.generatedAt));
  const todayCount = existing.filter((item) => Date.now() - new Date(item.generatedAt).getTime() < 86400000).length;
  const created = [];
  for (const candidate of candidates.filter((item) => item.confidence >= .6).slice(0, Math.max(0, DAILY_LIMIT - todayCount))) {
    if (existing.some((item) => item.headline === candidate.title && Date.now() - new Date(item.generatedAt).getTime() < 14 * 86400000)) continue;
    const whyChain = [{ step: "observed_evidence", evidenceRefs: candidate.evidenceRefs, conclusion: candidate.description, confidence: candidate.confidence }];
    const [item] = await db.insert(opportunity).values({ opportunityType: candidate.opportunityType, headline: candidate.title, supportingEvidence: candidate.evidenceRefs, affectedObjects: candidate.projectIds, confidence: candidate.confidence >= .8 ? "high" : "medium", propagatedConfidence: candidate.confidence, whyChain, relevanceScore: candidate.confidence, potentialValue: candidate.confidence >= .8 ? "high" : "medium", actionSuggestion: candidate.suggestedAction }).returning();
    await emitEvent({ eventType: "OpportunityDetected", aggregateType: "opportunity", aggregateId: item.id, sourceRef: "opportunity-engine", payload: { opportunityId: item.id, opportunityType: item.opportunityType, projectIds: item.affectedObjects, confidence: item.propagatedConfidence ?? candidate.confidence, evidenceRefs: item.supportingEvidence } });
    if ((item.propagatedConfidence ?? 0) >= .8) await db.insert(notification).values({ kind: "opportunity", title: `Opportunity: ${item.headline}`, body: candidate.description, severity: "high", targetRef: item.id });
    created.push(item);
  }
  return created;
}

export async function activeOpportunities() {
  const [rows, anchors] = await Promise.all([
    db.select().from(opportunity).where(eq(opportunity.lifecycle, "new")).orderBy(desc(opportunity.relevanceScore), desc(opportunity.generatedAt)).limit(30),
    listAnchors(),
  ]);
  return rows.map((item) => ({ ...item, title: item.headline, description: item.headline, projectIds: item.affectedObjects, evidenceRefs: item.supportingEvidence, suggestedAction: item.actionSuggestion, confidenceScore: item.propagatedConfidence ?? (item.confidence === "high" ? .9 : .65), anchorContradictions: anchorContradictions(item.headline + " " + item.actionSuggestion, anchors) }));
}
export async function resolveOpportunity(id: string) {
  const [item] = await db.update(opportunity).set({ lifecycle: "acted", actedOnAt: new Date() }).where(eq(opportunity.id, id)).returning();
  if (item) await emitEvent({ eventType: "OpportunityResolved", aggregateType: "opportunity", aggregateId: item.id, sourceRef: "opportunity-engine", payload: { opportunityId: item.id } });
  return item;
}