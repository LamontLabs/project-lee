import { and, desc, eq, gte, sql } from "drizzle-orm";
import { correction, db, eventLog, learningAsset, standingCorrectionRule } from "@workspace/db";
import { enqueueWork } from "./orchestration";
export async function recordCorrection(input: { engineName: string; originalOutput: string; correctedOutput: string; correctionType?: string; category?: string; contextSnapshot?: Record<string, unknown> }) {
  const [item] = await db.insert(correction).values({ engineName: input.engineName, originalOutput: input.originalOutput, correctedOutput: input.correctedOutput, correctionType: input.correctionType ?? "owner_edit", category: input.category ?? "general", contextSnapshot: input.contextSnapshot ?? {} }).returning();
  await db.insert(eventLog).values({ eventType: "CorrectionCaptured", aggregateType: "correction", aggregateId: item.id, sourceRef: "learning-engine", occurredAt: new Date(), payload: { engineName: item.engineName, category: item.category } });
  return item;
}
export async function detectLearningPatterns() {
  const since = new Date(Date.now() - 180 * 86400000);
  const rows = await db.select().from(correction).where(gte(correction.capturedAt, since)).orderBy(desc(correction.capturedAt));
  const groups = new Map<string, typeof rows>();
  for (const row of rows) groups.set(row.category, [...(groups.get(row.category) ?? []), row]);
  const proposed = [];
  for (const [category, items] of groups) {
    if (items.length < 3) continue;
    const [rule] = await db.insert(standingCorrectionRule).values({ category, condition: `When output concerns ${category}`, correction: `Prefer the owner's corrected form established across ${items.length} corrections.`, correctionIds: items.slice(0, 10).map((item) => item.id) }).returning();
    proposed.push(rule);
  }
  return proposed;
}
export async function applyLearning(query: string) {
  const rules = await db.select().from(standingCorrectionRule).where(eq(standingCorrectionRule.status, "confirmed"));
  const relevant = rules.filter((rule) => query.toLowerCase().includes(rule.category.toLowerCase()));
  for (const rule of relevant) await db.update(standingCorrectionRule).set({ appliedCount: sql`${standingCorrectionRule.appliedCount} + 1`, updatedAt: new Date() }).where(eq(standingCorrectionRule.id, rule.id));
  return relevant;
}
export async function confirmRule(id: string, status: "confirmed" | "dismissed") {
  const [rule] = await db.update(standingCorrectionRule).set({ status, confirmedAt: status === "confirmed" ? new Date() : null, updatedAt: new Date() }).where(eq(standingCorrectionRule.id, id)).returning();
  if (rule) await db.insert(eventLog).values({ eventType: "StandingCorrectionRuleReviewed", aggregateType: "standing_correction_rule", aggregateId: id, sourceRef: "learning-console", occurredAt: new Date(), payload: { status } });
  return rule;
}
export async function learningStatus() {
  const [corrections, rules, assets] = await Promise.all([db.select().from(correction).orderBy(desc(correction.capturedAt)).limit(100), db.select().from(standingCorrectionRule).orderBy(desc(standingCorrectionRule.updatedAt)), db.select().from(learningAsset).orderBy(desc(learningAsset.updatedAt))]);
  return { corrections, rules, assets, learningAge: corrections.at(-1)?.capturedAt ?? null };
}
export async function queueLearning() { return enqueueWork({ engineName: "Learning Engine", action: "detect_patterns", priority: "LOW", payload: { cadence: "daily" } }); }