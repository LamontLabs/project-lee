import { and, eq, lte, sql } from "drizzle-orm";
import { assumptionLedger, assumptionUse, db, notification, simulation, strategicObjective } from "@workspace/db";
const TYPES = ["structural", "behavioral", "market", "technical", "relationship", "temporal"];
export async function createOrReference(statement: string, type: string, confidence: number, evidenceBasis: string[], createdByEngine: string, reviewAt?: Date, rationale?: string) {
  if (!TYPES.includes(type)) throw new Error(`Invalid assumption type: ${type}`);
  const existing = await db.select().from(assumptionLedger).where(and(eq(assumptionLedger.statement, statement), eq(assumptionLedger.status, "active"))).limit(1);
  if (existing[0]) return existing[0];
  const [item] = await db.insert(assumptionLedger).values({ statement, assumptionType: type, confidence, evidenceBasis, sourceRef: evidenceBasis[0] ?? `engine:${createdByEngine}`, createdByEngine, reviewAt, rationale }).returning();
  return item;
}
export async function linkAssumption(id: string, conclusionType: string, conclusionId: string) {
  await db.insert(assumptionUse).values({ assumptionId: id, conclusionType, conclusionId }).onConflictDoNothing();
  const [item] = await db.select().from(assumptionLedger).where(eq(assumptionLedger.id, id)).limit(1);
  if (item && !item.usedIn.includes(conclusionId)) await db.update(assumptionLedger).set({ usedIn: [...item.usedIn, conclusionId], updatedAt: new Date() }).where(eq(assumptionLedger.id, id));
}
export async function markValidated(id: string, source: string) {
  const [item] = await db.update(assumptionLedger).set({ status: "validated", confidence: sql`least(1, ${assumptionLedger.confidence} + 0.1)`, validatedAt: new Date(), invalidationSource: source, updatedAt: new Date() }).where(eq(assumptionLedger.id, id)).returning();
  return item;
}
export async function invalidate(id: string, source: string) {
  const [item] = await db.update(assumptionLedger).set({ status: "invalidated", invalidatedAt: new Date(), invalidationSource: source, updatedAt: new Date() }).where(eq(assumptionLedger.id, id)).returning();
  if (!item) return null;
  const uses = await db.select().from(assumptionUse).where(eq(assumptionUse.assumptionId, id));
  await db.insert(notification).values({ kind: "assumption_invalidated", title: `Assumption invalidated: ${item.statement}`, body: `Review ${uses.length} conclusion(s) that depended on this assumption.`, severity: "high", status: "unread", targetRef: item.id });
  return { ...item, affectedConclusions: uses };
}
export async function expireStale() {
  const now = new Date();
  const expired = await db.update(assumptionLedger).set({ status: "expired", updatedAt: now }).where(and(eq(assumptionLedger.status, "active"), lte(assumptionLedger.reviewAt, now))).returning();
  if (expired.length) await db.insert(notification).values({ kind: "assumptions_expired", title: `${expired.length} assumptions need review`, body: expired.map((item) => item.statement).join(" · "), severity: "high", status: "unread", targetRef: "assumption-ledger" });
  return expired;
}