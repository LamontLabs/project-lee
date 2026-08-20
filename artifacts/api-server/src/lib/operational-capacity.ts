import { desc, eq, gte } from "drizzle-orm";
import { db, eventLog, initiativeItem, operationalCapacity, operationalCapacityHistory } from "@workspace/db";
import { emitEvent } from "./foundation-events";

export async function computeOperationalCapacity(source = "inference") {
  const since = new Date(Date.now() - 7 * 86400000);
  const events = await db.select().from(eventLog).where(gte(eventLog.occurredAt, since));
  const completed = events.filter((e) => /Resolved|Completed|Approved|Merged|Dismissed/.test(e.eventType)).length;
  const activity = events.length;
  const waiting = events.filter((e) => /Waiting|Governance.*Held/.test(e.eventType)).length;
  const captures = events.filter((e) => /Capture|SourceVaultRecordCreated|Voice/.test(e.eventType)).length;
  const completionRate = completed / Math.max(1, activity);
  const signals = { activity, completed, waiting, captures, completionRate };
  const score = Math.max(0, Math.min(100, Math.round(activity * 2 + completionRate * 45 + captures * 2 - waiting * 4)));
  const [previous] = await db.select().from(operationalCapacity).orderBy(desc(operationalCapacity.observedAt)).limit(1);
  const state = score >= 65 ? "HIGH" : score >= 40 ? "NOMINAL" : score >= 20 ? "CONSTRAINED" : previous?.state === "LOW" && activity > 0 ? "RECOVERY" : "LOW";
  const override = previous?.overrideState;
  const effective = override ?? state;
  const [current] = await db.insert(operationalCapacity).values({ state: effective, score, signals, inferred: !override, overrideState: override }).returning();
  await db.insert(operationalCapacityHistory).values({ state: effective, score, signals, source });
  if (previous && previous.state !== effective) await emitEvent({ eventType: "OperationalCapacityChanged", aggregateType: "operational_capacity", aggregateId: current.id, payload: { from: previous.state, to: effective, score, signals } });
  if (effective === "LOW" && score < 20) await db.insert(initiativeItem).values({ category: "capacity", observation: "I've noticed a quieter period — here is the single most important thing to address when ready.", significance: "LOW", evidenceRefs: events.slice(-5).map((e) => e.id), expiresAt: new Date(Date.now() + 86400000), actionHint: "Choose one important next step when ready.", dedupeKey: "capacity:low" }).onConflictDoNothing();
  return current;
}
export async function currentOperationalCapacity() { const [row] = await db.select().from(operationalCapacity).orderBy(desc(operationalCapacity.observedAt)).limit(1); return row ?? computeOperationalCapacity(); }
export async function setCapacityOverride(state: string | null) { const current = await currentOperationalCapacity(); return db.update(operationalCapacity).set({ overrideState: state, state: state ?? current.state, inferred: !state }).where(eq(operationalCapacity.id, current.id)).returning(); }