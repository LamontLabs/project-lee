import { and, desc, eq, lte } from "drizzle-orm";
import { db, assumptionLedger, eventLog, person, portfolioState, strategicAnchor, strategicObjective, timeMachineSnapshot, universalObject } from "@workspace/db";
import { emitEvent } from "./foundation-events";

function parseReference(reference: string, events: Array<typeof eventLog.$inferSelect>) {
  if (!reference.trim()) throw new Error("A Time Machine reference is required.");
  const date = new Date(reference);
  if (!Number.isNaN(date.getTime())) return date;
  const lower = reference.toLowerCase();
  const match = events.find((event) => {
    const personName = String(event.payload?.personName ?? "").trim().toLowerCase();
    const eventType = String(event.eventType).trim().toLowerCase();
    return (personName && lower.includes(personName)) || (eventType && lower.includes(eventType));
  });
  if (!match) throw new Error("Time Machine reference must be a valid date or match a known event/person.");
  return match.occurredAt;
}
export async function reconstructTimeMachine(reference: string, name?: string) {
  const allEvents = await db.select().from(eventLog).orderBy(desc(eventLog.occurredAt));
  const targetAt = parseReference(reference, allEvents);
  const [projects, people, objectives, anchors, assumptions, portfolio, events] = await Promise.all([
    db.select().from(universalObject).where(and(eq(universalObject.objectType, "project"), lte(universalObject.createdAt, targetAt))),
    db.select().from(person).where(lte(person.createdAt, targetAt)),
    db.select().from(strategicObjective).where(lte(strategicObjective.createdAt, targetAt)),
    db.select().from(strategicAnchor).where(and(eq(strategicAnchor.active, true), lte(strategicAnchor.createdAt, targetAt))),
    db.select().from(assumptionLedger).where(lte(assumptionLedger.createdAt, targetAt)),
    db.select().from(portfolioState).where(lte(portfolioState.computedAt, targetAt)).orderBy(desc(portfolioState.computedAt)).limit(1),
    allEvents.filter((event) => event.occurredAt <= targetAt),
  ]);
  const snapshot = { targetAt, projects, people, objectives, anchors, assumptions, portfolio: portfolio[0] ?? null, eventCount: events.length, sourceEventIds: events.slice(0, 200).map((event) => event.id) };
  const [saved] = name ? await db.insert(timeMachineSnapshot).values({ name, targetAt, reference, snapshot }).returning() : [null];
  const aggregateId = saved?.id ?? `read-${targetAt.toISOString()}`;
  await emitEvent({ eventType: "TimeMachineSnapshotGenerated", aggregateType: "time_machine", aggregateId, sourceRef: "time-machine", payload: { targetAt: targetAt.toISOString(), reference, named: Boolean(name), eventCount: events.length } });
  return { id: saved?.id, name: saved?.name, reference, ...snapshot };
}
export async function listTimeMachineSnapshots() { return db.select().from(timeMachineSnapshot).orderBy(desc(timeMachineSnapshot.generatedAt)).limit(50); }
export async function getNamedSnapshot(id: string) { const [item] = await db.select().from(timeMachineSnapshot).where(eq(timeMachineSnapshot.id, id)); return item ?? null; }