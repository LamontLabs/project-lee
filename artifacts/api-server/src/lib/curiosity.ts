import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, eventLog, graphEdge, observation, opportunity, curiositySetting } from "@workspace/db";
import { enqueueWork } from "./orchestration";
import { computeConfidence } from "./confidence";
import { WhyChainBuilder } from "./why-chain";
import { recordProvenance } from "./provenance";

const confidence = (count: number) => count >= 5 ? "high" : count >= 3 ? "medium" : "low";
export async function scanCuriosity() {
  const since = new Date(Date.now() - 30 * 86400000);
  const events = await db.select({ id: eventLog.id, eventType: eventLog.eventType, aggregateId: eventLog.aggregateId }).from(eventLog).where(gte(eventLog.occurredAt, since)).orderBy(desc(eventLog.occurredAt));
  const groups = new Map<string, string[]>();
  for (const event of events) groups.set(event.eventType, [...(groups.get(event.eventType) ?? []), event.id]);
  const created = [];
  for (const [type, ids] of groups) {
    if (ids.length < 2) continue;
    const lineage = await computeConfidence(ids.slice(0, 5).map((id) => ({ id, confidence: confidence(ids.length) === "high" ? 0.85 : confidence(ids.length) === "medium" ? 0.65 : 0.45 })), "observation");
    const whyChain = new WhyChainBuilder().addStep("historical_pattern", `${ids.length} recent records share the "${type}" signal.`, confidence(ids.length) === "high" ? 0.85 : 0.65, "Curiosity Engine", ids[0]).addStep("freshness_threshold", "The signal is recent enough to merit deliberate review.", 0.8, "Curiosity Engine").buildNonTrivial();
    const [item] = await db.insert(observation).values({ observationType: "cross_document_pattern", headline: `${ids.length} recent records share the "${type}" signal and merit a deliberate review.`, supportingEvidence: ids.slice(0, 5), affectedObjects: [], confidence: confidence(ids.length), ...lineage, whyChain, relevanceScore: Math.min(1, 0.45 + ids.length / 20) }).returning();
    created.push(item);
    await recordProvenance("observation", item.id, item.supportingEvidence, item.propagatedConfidence ?? 0.5);
  }
  await db.insert(eventLog).values({ eventType: "CuriosityScanCompleted", aggregateType: "curiosity_engine", aggregateId: "curiosity", sourceRef: "curiosity-engine", occurredAt: new Date(), payload: { observationsCreated: created.length, evidenceWindowStart: since.toISOString() } });
  return created;
}
export async function scanOpportunities() {
  const edges = await db.select().from(graphEdge).orderBy(desc(graphEdge.weight)).limit(10);
  const created = [];
  if (edges.length >= 2) {
    const lineage = await computeConfidence(edges.slice(0, 5).map((edge) => ({ id: edge.id, confidence: 0.65 })), "recommendation");
    const whyChain = new WhyChainBuilder().addStep("historical_pattern", "Graph edges connect work across projects.", 0.7, "Opportunity Engine", edges[0].id).addStep("strategy_alignment", "The connected pattern may support a reusable operating decision.", 0.65, "Opportunity Engine").buildNonTrivial();
    const [item] = await db.insert(opportunity).values({ opportunityType: "cross_project_synergy", headline: "The Intelligence Graph contains connected work that may support a reusable operating pattern.", supportingEvidence: edges.slice(0, 5).map((edge) => edge.id), affectedObjects: edges.slice(0, 5).flatMap((edge) => [edge.sourceNodeId, edge.targetNodeId]), confidence: "medium", ...lineage, whyChain, relevanceScore: 0.6, potentialValue: "medium", actionSuggestion: "Review the connected nodes and decide whether to formalize the shared pattern." }).returning();
    created.push(item);
    await recordProvenance("opportunity", item.id, item.supportingEvidence, item.propagatedConfidence ?? 0.5);
  }
  await db.insert(eventLog).values({ eventType: "OpportunityScanCompleted", aggregateType: "opportunity_engine", aggregateId: "opportunity", sourceRef: "opportunity-engine", occurredAt: new Date(), payload: { opportunitiesCreated: created.length } });
  return created;
}
export async function queueCuriosityScans() {
  const curiosity = await enqueueWork({ engineName: "Curiosity Engine", action: "scan", priority: "NORMAL", estimatedCostUsd: 0, payload: { cadence: "4 hours" } });
  const opportunityItem = await enqueueWork({ engineName: "Opportunity Engine", action: "scan", priority: "LOW", dependencies: [curiosity.id], payload: { after: "curiosity" } });
  return { curiosity, opportunity: opportunityItem };
}
export async function updateLifecycle(kind: "observation" | "opportunity", id: string, lifecycle: string) {
  const table = kind === "observation" ? observation : opportunity;
  const now = new Date();
  const field = lifecycle === "acknowledged" ? { acknowledgedAt: now } : lifecycle === "acted_on" ? { actedOnAt: now } : lifecycle === "dismissed" ? { dismissedAt: now } : { promotedAt: now };
  const [updated] = await db.update(table).set({ lifecycle, ...field }).where(eq(table.id, id)).returning();
  if (updated) await db.insert(eventLog).values({ eventType: "CuriosityLifecycleChanged", aggregateType: kind, aggregateId: id, sourceRef: "curiosity-console", occurredAt: now, payload: { lifecycle } });
  return updated;
}
export async function getCuriositySettings() {
  let [settings] = await db.select().from(curiositySetting).where(eq(curiositySetting.profileKey, "primary")).limit(1);
  if (!settings) [settings] = await db.insert(curiositySetting).values({}).returning();
  return settings;
}