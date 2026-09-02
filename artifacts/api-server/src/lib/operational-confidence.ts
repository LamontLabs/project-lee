import { desc, eq } from "drizzle-orm";
import { db, assumptionLedger, connector, factLedger, internalCapabilityService, operationalConfidenceSnapshot, semanticIndex, universalObject, initiativeItem } from "@workspace/db";
import { currentWorldState } from "./world-state";
import { emitEvent } from "./foundation-events";
import { currentUncertainty } from "./uncertainty";

type Factor = { key: string; label: string; score: number; weight: number; contribution: number; detail: string };
const factor = (key: string, label: string, score: number, weight: number, detail: string): Factor => ({ key, label, score, weight, contribution: Math.round(score * weight), detail });
export async function computeOperationalConfidence() {
  const [connectors, assumptions, facts, objects, indexRows, services, world, uncertainty] = await Promise.all([
    db.select().from(connector), db.select().from(assumptionLedger), db.select().from(factLedger), db.select().from(universalObject), db.select().from(semanticIndex), db.select().from(internalCapabilityService), currentWorldState(), currentUncertainty(),
  ]);
  const now = Date.now();
  const connectorScore = connectors.length ? connectors.reduce((sum, row) => sum + (row.status === "healthy" && row.lastSyncAt && now - new Date(row.lastSyncAt).getTime() < 2 * 86400000 ? 1 : row.status === "healthy" ? .65 : .2), 0) / connectors.length : .5;
  const staleRatio = facts.length ? facts.filter((item) => ["STALE", "OLD", "EXPIRED"].includes(String(item.ageState))).length / facts.length : 0;
  const assumptionHealth = assumptions.length ? assumptions.filter((item) => item.status === "active" && (!item.reviewAt || new Date(item.reviewAt).getTime() > now)).length / assumptions.length : 1;
  const serviceScore = services.length ? services.reduce((sum, item) => sum + (item.currentHealth === "healthy" ? 1 : item.currentHealth === "degraded" ? .55 : .25), 0) / services.length : .5;
  const worldScore = world.signals.length ? world.signals.reduce((sum, item) => sum + (item.currentValue ? 1 : .4), 0) / world.signals.length : .5;
  const indexScore = indexRows.length ? Math.max(0, Math.min(1, indexRows.filter((item) => now - new Date(item.indexedAt).getTime() < 7 * 86400000).length / indexRows.length)) : .5;
  const expiredImportant = objects.filter((item) => item.importance >= .7 && ["EXPIRED", "STALE"].includes(String(item.ageState))).length;
  const expiredScore = Math.max(0, 1 - Math.min(1, expiredImportant / Math.max(1, objects.filter((item) => item.importance >= .7).length)));
  const factors = [
    factor("connector_freshness", "Connector sync freshness", connectorScore, .2, `${connectors.filter((item) => item.status === "healthy").length}/${connectors.length} connectors healthy and current.`),
    factor("stale_knowledge", "Stale knowledge ratio", 1 - staleRatio, .15, `${Math.round(staleRatio * 100)}% of facts are stale or expired.`),
    factor("assumption_health", "Assumption health", assumptionHealth, .12, `${Math.round(assumptionHealth * 100)}% of assumptions are active and review-current.`),
    factor("cil_cerbaseal_health", "CIL and CerbaSeal health", serviceScore, .18, `${services.filter((item) => item.currentHealth === "healthy").length}/${services.length} internal services healthy.`),
    factor("world_state_freshness", "World state freshness", worldScore, .1, `${world.signals.length} world-state signals available.`),
    factor("semantic_index_freshness", "Semantic Index freshness", indexScore, .1, `${indexRows.length} indexed records, measured over seven days.`),
    factor("expired_important_objects", "Expired high-importance objects", expiredScore, .12, `${expiredImportant} high-importance objects need fresh verification.`),
    factor("situational_uncertainty", "Situational uncertainty", uncertainty.length ? Math.max(0, 1 - uncertainty.reduce((sum: number, item: any) => sum + Number(item.score), 0) / Math.max(1, uncertainty.length * 8)) : 1, .03, `${uncertainty.filter((item: any) => item.level === "HIGH" || item.level === "VERY HIGH").length} objects have high situational uncertainty.`),
  ];
  const score = Math.round(factors.reduce((sum, item) => sum + item.contribution, 0) * 100);
  const lowest = [...factors].sort((a, b) => a.score - b.score)[0];
  const explanation = score >= 85 ? `I am ${score}% confident — the operational picture is current and well-supported.` : score >= 70 ? `I am ${score}% confident — the picture is usable, with attention needed on ${lowest.label.toLowerCase()}.` : `I am ${score}% confident — recommendations may be affected by ${lowest.detail.toLowerCase()}`;
  let triggeredInitiative: string | null = null;
  if (score < 70) {
    const dedupeKey = `operational-confidence:${lowest.key}`;
    const recent = await db.select().from(initiativeItem).orderBy(desc(initiativeItem.generatedAt)).limit(50);
    if (!recent.some((item) => item.dedupeKey === dedupeKey && Date.now() - new Date(item.generatedAt).getTime() < 86400000)) {
      const [initiative] = await db.insert(initiativeItem).values({ category: "operational_confidence", observation: `Operational confidence fell to ${score}%. ${lowest.detail}`, significance: score < 45 ? "HIGH" : "MEDIUM", evidenceRefs: [], generatedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000), actionHint: "Review the contributing factor before relying on current recommendations.", dedupeKey, metadata: { score, factor: lowest.key } }).returning();
      triggeredInitiative = initiative.id;
    }
  }
  const [snapshot] = await db.insert(operationalConfidenceSnapshot).values({ score, explanation, factors, triggeredInitiative }).returning();
  await emitEvent({ eventType: "OperationalConfidenceUpdated", aggregateType: "operational_confidence", aggregateId: snapshot.id, payload: { score, explanation, lowestFactor: lowest.key } });
  return snapshot;
}
export async function currentOperationalConfidence() { const [latest] = await db.select().from(operationalConfidenceSnapshot).orderBy(desc(operationalConfidenceSnapshot.generatedAt)).limit(1); return latest ?? computeOperationalConfidence(); }
export async function operationalConfidenceHistory() { return db.select().from(operationalConfidenceSnapshot).orderBy(desc(operationalConfidenceSnapshot.generatedAt)).limit(720); }