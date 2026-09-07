import { and, eq, lte, sql } from "drizzle-orm";
import { assumptionLedger, assumptionUse, db, notification, simulation, strategicObjective } from "@workspace/db";
import { appendCanonicalMemoryEvent, assertCanonicalMemoryWrite } from "./memory-write-boundary";
const TYPES = ["structural", "behavioral", "market", "technical", "relationship", "temporal"];
export async function createOrReference(statement: string, type: string, confidence: number, evidenceBasis: string[], createdByEngine: string, reviewAt?: Date, rationale?: string) {
  if (!TYPES.includes(type)) throw new Error(`Invalid assumption type: ${type}`);
  const existing = await db.select().from(assumptionLedger).where(and(eq(assumptionLedger.statement, statement), eq(assumptionLedger.status, "active"))).limit(1);
  if (existing[0]) return existing[0];
  if (!evidenceBasis.length) throw new Error("Assumptions require at least one evidence reference.");
  const origin = /owner|founder/i.test(createdByEngine) ? "owner" as const : "engine" as const;
  assertCanonicalMemoryWrite({ recordType: "assumption", operation: "create", sourceRef: evidenceBasis[0], sourceRefs: evidenceBasis, origin, generatedByEngine: origin === "engine" ? createdByEngine : undefined, generatedBy: origin === "engine" ? { engineId: createdByEngine } : undefined, currentOwner: "owner", actor: origin === "owner" ? "owner" : createdByEngine });
  const [item] = await db.insert(assumptionLedger).values({ statement, assumptionType: type, confidence, evidenceBasis, sourceRef: evidenceBasis[0], createdByEngine, reviewAt, rationale }).returning();
  await appendCanonicalMemoryEvent({ recordType: "assumption", operation: "create", sourceRef: item.sourceRef, sourceRefs: item.evidenceBasis, origin, generatedByEngine: origin === "engine" ? item.createdByEngine : undefined, generatedBy: origin === "engine" ? { engineId: item.createdByEngine } : undefined, currentOwner: "owner", actor: origin === "owner" ? "owner" : item.createdByEngine, event: { eventType: "AssumptionRecorded", aggregateType: "assumption", aggregateId: item.id, sourceRef: item.sourceRef, payload: { assumptionId: item.id, assumptionType: item.assumptionType, evidenceBasis: item.evidenceBasis } } });
  return item;
}
export async function linkAssumption(id: string, conclusionType: string, conclusionId: string) {
  await db.insert(assumptionUse).values({ assumptionId: id, conclusionType, conclusionId }).onConflictDoNothing();
  const [item] = await db.select().from(assumptionLedger).where(eq(assumptionLedger.id, id)).limit(1);
  if (item && !item.usedIn.includes(conclusionId)) {
    assertCanonicalMemoryWrite({ recordType: "assumption", operation: "update", sourceRef: item.sourceRef, sourceRefs: item.evidenceBasis, origin: "engine", generatedByEngine: item.createdByEngine, generatedBy: { engineId: item.createdByEngine }, currentOwner: "owner", actor: item.createdByEngine });
    await db.update(assumptionLedger).set({ usedIn: [...item.usedIn, conclusionId], updatedAt: new Date() }).where(eq(assumptionLedger.id, id));
  }
}
export async function markValidated(id: string, source: string) {
  const [prior] = await db.select().from(assumptionLedger).where(eq(assumptionLedger.id, id)).limit(1);
  if (!prior) return undefined;
  assertCanonicalMemoryWrite({ recordType: "assumption", operation: "status_change", sourceRef: prior.sourceRef, sourceRefs: prior.evidenceBasis, origin: "engine", generatedByEngine: prior.createdByEngine, generatedBy: { engineId: prior.createdByEngine }, currentOwner: "owner", actor: prior.createdByEngine });
  const [item] = await db.update(assumptionLedger).set({ status: "validated", confidence: sql`least(1, ${assumptionLedger.confidence} + 0.1)`, validatedAt: new Date(), invalidationSource: source, updatedAt: new Date() }).where(eq(assumptionLedger.id, id)).returning();
  return item;
}
export async function invalidate(id: string, source: string) {
  const [prior] = await db.select().from(assumptionLedger).where(eq(assumptionLedger.id, id)).limit(1);
  if (!prior) return null;
  assertCanonicalMemoryWrite({ recordType: "assumption", operation: "status_change", sourceRef: prior.sourceRef, sourceRefs: prior.evidenceBasis, origin: "engine", generatedByEngine: prior.createdByEngine, generatedBy: { engineId: prior.createdByEngine }, currentOwner: "owner", actor: prior.createdByEngine });
  const [item] = await db.update(assumptionLedger).set({ status: "invalidated", invalidatedAt: new Date(), invalidationSource: source, updatedAt: new Date() }).where(eq(assumptionLedger.id, id)).returning();
  if (!item) return null;
  await appendCanonicalMemoryEvent({ recordType: "assumption", operation: "status_change", sourceRef: item.sourceRef, sourceRefs: item.evidenceBasis, origin: "engine", generatedByEngine: item.createdByEngine, generatedBy: { engineId: item.createdByEngine }, currentOwner: "owner", actor: item.createdByEngine, event: { eventType: "AssumptionInvalidated", aggregateType: "assumption", aggregateId: item.id, sourceRef: item.sourceRef, payload: { assumptionId: item.id, source: source.trim() } } });
  const uses = await db.select().from(assumptionUse).where(eq(assumptionUse.assumptionId, id));
  await db.insert(notification).values({ kind: "assumption_invalidated", title: `Assumption invalidated: ${item.statement}`, body: `Review ${uses.length} conclusion(s) that depended on this assumption.`, severity: "high", status: "unread", targetRef: item.id });
  return { ...item, affectedConclusions: uses };
}
export async function expireStale() {
  const now = new Date();
  const stale = await db.select().from(assumptionLedger).where(and(eq(assumptionLedger.status, "active"), lte(assumptionLedger.reviewAt, now)));
  for (const item of stale) {
    assertCanonicalMemoryWrite({ recordType: "assumption", operation: "status_change", sourceRef: item.sourceRef, sourceRefs: item.evidenceBasis, origin: "engine", generatedByEngine: item.createdByEngine, generatedBy: { engineId: item.createdByEngine }, currentOwner: "owner", actor: item.createdByEngine });
  }
  const expired = stale.length ? await db.update(assumptionLedger).set({ status: "expired", updatedAt: now }).where(and(eq(assumptionLedger.status, "active"), lte(assumptionLedger.reviewAt, now))).returning() : [];
  if (expired.length) await db.insert(notification).values({ kind: "assumptions_expired", title: `${expired.length} assumptions need review`, body: expired.map((item) => item.statement).join(" · "), severity: "high", status: "unread", targetRef: "assumption-ledger" });
  return expired;
}