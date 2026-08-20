import { and, eq, inArray } from "drizzle-orm";
import { ageWindowConfig, agingTransition, db, factLedger, interpretationLedger, observation, person, scheduledJob, sourceVault, universalObject } from "@workspace/db";
import { emitEvent } from "./foundation-events";

export const AGE_STATES = ["FRESH", "CURRENT", "OLD", "HISTORICAL", "STALE", "EXPIRED"] as const;
export type AgeState = typeof AGE_STATES[number];
type Window = { freshDays: number | null; currentDays: number | null; oldDays: number; historicalDays: number; staleDays: number | null; expiredDays: number | null };
const defaults: Record<string, Window> = {
  project: { freshDays: 3, currentDays: 14, oldDays: 30, historicalDays: 90, staleDays: 180, expiredDays: 365 },
  competitor: { freshDays: 7, currentDays: 30, oldDays: 90, historicalDays: 180, staleDays: 365, expiredDays: 730 },
  relationship: { freshDays: 7, currentDays: 30, oldDays: 90, historicalDays: 365, staleDays: 730, expiredDays: null },
  assumption: { freshDays: 30, currentDays: 90, oldDays: 180, historicalDays: 365, staleDays: 540, expiredDays: 730 },
  fact: { freshDays: 7, currentDays: 30, oldDays: 90, historicalDays: 180, staleDays: 365, expiredDays: 730 },
  person: { freshDays: null, currentDays: null, oldDays: 730, historicalDays: 1825, staleDays: null, expiredDays: null },
  default: { freshDays: 7, currentDays: 30, oldDays: 90, historicalDays: 180, staleDays: 365, expiredDays: 730 },
};
function daysSince(value: Date | null | undefined) { return Math.max(0, (Date.now() - new Date(value ?? Date.now()).getTime()) / 86400000); }
export function computeAgeState(ageDays: number, window: Window): AgeState {
  if (window.freshDays != null && ageDays <= window.freshDays) return "FRESH";
  if (window.currentDays != null && ageDays <= window.currentDays) return "CURRENT";
  if (ageDays <= window.oldDays) return "OLD";
  if (ageDays <= window.historicalDays) return "HISTORICAL";
  if (window.staleDays != null && ageDays <= window.staleDays) return "STALE";
  if (window.expiredDays != null && ageDays > window.expiredDays) return "EXPIRED";
  return "STALE";
}
async function ensureWindows() {
  for (const [objectType, window] of Object.entries(defaults)) await db.insert(ageWindowConfig).values({ objectType, ...window }).onConflictDoNothing({ target: ageWindowConfig.objectType });
  return db.select().from(ageWindowConfig);
}
async function transition(objectId: string, objectType: string, current: any, window: Window) {
  const ageDays = Math.floor(daysSince(current.lastVerifiedAt ?? current.verifiedAt ?? current.createdAt ?? current.firstSeen));
  const next = computeAgeState(ageDays, window);
  if (next === current.ageState) return { state: next, changed: false, ageDays };
  const table: any = objectType === "fact" ? factLedger : objectType === "interpretation" ? interpretationLedger : objectType === "person" ? person : objectType === "source" ? sourceVault : universalObject;
  await db.update(table).set({ ageState: next }).where(eq(table.id, objectId));
  await db.insert(agingTransition).values({ objectId, objectType, fromState: current.ageState, toState: next, ageDays });
  await emitEvent({ eventType: "KnowledgeAged", aggregateType: objectType, aggregateId: objectId, payload: { objectType, fromState: current.ageState, toState: next, ageDays } });
  if (next === "STALE") {
    await db.insert(observation).values({ observationType: "knowledge_stale", headline: `Verify aging ${objectType}: ${current.name ?? current.subject ?? current.statement ?? current.displayName ?? objectId}`, supportingEvidence: [objectId], affectedObjects: [objectId], confidence: "medium", lifecycle: "new" });
    await emitEvent({ eventType: "KnowledgeStale", aggregateType: objectType, aggregateId: objectId, payload: { objectType, ageDays, lastVerifiedAt: current.lastVerifiedAt ?? current.verifiedAt ?? null } });
  }
  return { state: next, changed: true, ageDays };
}
export async function runKnowledgeAgingScan() {
  const configured = await ensureWindows();
  const windows = new Map(configured.map((item) => [item.objectType, item]));
  const sets: Array<{ type: string; rows: any[] }> = [
    { type: "object", rows: await db.select().from(universalObject) },
    { type: "fact", rows: await db.select().from(factLedger) },
    { type: "interpretation", rows: await db.select().from(interpretationLedger) },
    { type: "person", rows: await db.select().from(person) },
    { type: "source", rows: await db.select().from(sourceVault) },
  ];
  let changed = 0; const counts: Record<string, number> = {};
  for (const set of sets) for (const row of set.rows) {
    const key = set.type === "object" ? row.objectType : set.type;
    const result = await transition(row.id, set.type, row, (windows.get(key) ?? windows.get("default")) as Window);
    counts[result.state] = (counts[result.state] ?? 0) + 1; if (result.changed) changed += 1;
  }
  return { scanned: sets.reduce((sum, set) => sum + set.rows.length, 0), changed, counts };
}
export async function agingSummary() { await ensureWindows(); const rows = [...await db.select({ ageState: universalObject.ageState }).from(universalObject), ...await db.select({ ageState: factLedger.ageState }).from(factLedger), ...await db.select({ ageState: interpretationLedger.ageState }).from(interpretationLedger), ...await db.select({ ageState: person.ageState }).from(person), ...await db.select({ ageState: sourceVault.ageState }).from(sourceVault)]; return { counts: Object.fromEntries(AGE_STATES.map((state) => [state, rows.filter((row) => row.ageState === state).length])), staleCuriosity: (await db.select({ id: observation.id }).from(observation).where(and(eq(observation.observationType, "knowledge_stale"), inArray(observation.lifecycle, ["new", "acknowledged"])))).length }; }
export async function ensureKnowledgeAgingJob() {
  const [existing] = await db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "knowledge_aging_scan")).limit(1);
  if (!existing) await db.insert(scheduledJob).values({ jobType: "knowledge_aging_scan", runAt: new Date(Date.now() + 60_000), recurrence: "daily 03:30", payload: { engine: "Knowledge Aging Engine" } });
}