import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, initiativeItem, initiativeLimitConfig, operationalPattern, worldStateSignal } from "@workspace/db";
import { emitEvent } from "./foundation-events";

const rank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
export async function createIfNew(input: { category: string; observation: string; significance: string; evidenceRefs?: string[]; actionHint?: string; dedupeKey: string; metadata?: Record<string, unknown> }) {
  const now = new Date();
  const [recent] = await db.select().from(initiativeItem).where(and(eq(initiativeItem.dedupeKey, input.dedupeKey), gte(initiativeItem.generatedAt, new Date(now.getTime() - 72 * 3600000)))).limit(1);
  if (recent) return null;
  const [item] = await db.insert(initiativeItem).values({ ...input, evidenceRefs: input.evidenceRefs ?? [], expiresAt: new Date(now.getTime() + 7 * 86400000) }).returning();
  await emitEvent({ eventType: "InitiativeItemCreated", aggregateType: "initiative_item", aggregateId: item.id, payload: { category: item.category, significance: item.significance, observation: item.observation } });
  return item;
}
export async function generateInitiatives() {
  const candidates: Parameters<typeof createIfNew>[0][] = [];
  const stale = await db.select().from(worldStateSignal).where(eq(worldStateSignal.enabled, true));
  for (const signal of stale.filter((item) => item.signalType === "technical" && item.currentValue.deprecation)) candidates.push({ category: "technical_health", significance: "HIGH", observation: `${signal.signalName} has an active deprecation signal.`, evidenceRefs: [signal.id], dedupeKey: `technical:${signal.id}`, actionHint: "You may want to review the affected dependency." });
  const patterns = await db.select().from(operationalPattern).where(eq(operationalPattern.status, "historic"));
  for (const pattern of patterns) candidates.push({ category: "operational_rhythm", significance: "LOW", observation: `An established operational pattern changed: ${pattern.patternDescription}`, evidenceRefs: pattern.evidenceRefs, dedupeKey: `pattern:${pattern.id}`, actionHint: "You may want to review whether this pattern is still accurate." });
  const limit = (await db.select().from(initiativeLimitConfig).limit(1))[0] ?? { dailyHighCritical: 5, dailyOther: 10 };
  const created = []; let high = 0; let other = 0;
  for (const candidate of candidates.sort((a, b) => rank[b.significance] - rank[a.significance])) { if (["HIGH", "CRITICAL"].includes(candidate.significance) ? high >= limit.dailyHighCritical : other >= limit.dailyOther) continue; const item = await createIfNew(candidate); if (item) { created.push(item); if (["HIGH", "CRITICAL"].includes(candidate.significance)) high++; else other++; } }
  return { created, candidates: candidates.length };
}
export async function activeInitiatives() { const now = new Date(); return db.select().from(initiativeItem).where(and(isNull(initiativeItem.dismissedAt), lte(initiativeItem.generatedAt, now), gte(initiativeItem.expiresAt, now))).orderBy(desc(initiativeItem.significance), desc(initiativeItem.generatedAt)); }
export async function acknowledgeInitiative(id: string) { return db.update(initiativeItem).set({ acknowledgedAt: new Date() }).where(eq(initiativeItem.id, id)).returning(); }
export async function dismissInitiative(id: string) { return db.update(initiativeItem).set({ dismissedAt: new Date() }).where(eq(initiativeItem.id, id)).returning(); }