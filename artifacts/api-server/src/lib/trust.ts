import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { db, eventLog, trustEvent, trustScore } from "@workspace/db";
import { enqueueWork } from "./orchestration";
const SUBSYSTEMS = ["Understanding Engine", "Simulation Engine", "Strategy Engine", "Curiosity Engine", "Reflection Engine", "Brief Engine", "Model Router", "Fact Ledger", "Interpretation Ledger", "Database", "Backups", "Intelligence Graph"];
const weights: Record<string, number> = { corrected: -2, invalidated: -2, acted_on: 1.5, dismissed: -0.5, healed: 1, failure: -2 };
export async function ensureTrustScores() {
  for (const subsystemName of SUBSYSTEMS) await db.insert(trustScore).values({ subsystemName }).onConflictDoNothing({ target: trustScore.subsystemName });
}
export async function getTrustScores() { await ensureTrustScores(); return db.select().from(trustScore).orderBy(desc(trustScore.score)); }
export async function recordTrustEvent(subsystemName: string, eventType: string, reason: string, evidenceId?: string) {
  await ensureTrustScores(); const delta = weights[eventType] ?? 0; const now = new Date();
  const [current] = await db.select().from(trustScore).where(eq(trustScore.subsystemName, subsystemName)).limit(1);
  if (!current) return null;
  const score = Math.max(0, Math.min(100, current.score + delta));
  const history = [...current.scoreHistory, { score, at: now.toISOString(), reason }].slice(-100);
  const signals = { ...current.contributingSignals, [eventType]: (current.contributingSignals[eventType] ?? 0) + 1 };
  const [updated] = await db.update(trustScore).set({ score, scoreHistory: history, contributingSignals: signals, lastUpdated: now }).where(eq(trustScore.id, current.id)).returning();
  await db.insert(trustEvent).values({ subsystemName, eventType, delta, reason, evidenceId, timestamp: now });
  return updated;
}
export async function applyTrustDecay() {
  await ensureTrustScores(); const cutoff = new Date(Date.now() - 30 * 86400000); const rows = await db.select().from(trustScore).where(lt(trustScore.lastUpdated, cutoff)); let decayed = 0;
  for (const row of rows) { await recordTrustEvent(row.subsystemName, "decay", "No new trust evidence in the past 30 days."); decayed += 1; }
  await db.insert(eventLog).values({ eventType: "TrustDecayApplied", aggregateType: "trust", aggregateId: "trust", sourceRef: "health-engine", occurredAt: new Date(), payload: { decayed } });
  return decayed;
}
export async function trustStatus() { const scores = await getTrustScores(); const average = scores.length ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length : 50; return { scores, average: Math.round(average), healthContribution: Math.round(average * .15), updatedAt: new Date().toISOString() }; }
export async function queueTrustDecay() { return enqueueWork({ engineName: "Health Engine", action: "trust_decay", priority: "LOW", payload: { cadence: "weekly" } }); }