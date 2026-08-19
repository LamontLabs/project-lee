import { asc, eq, gt } from "drizzle-orm";
import { db, eventLog, universalObject } from "@workspace/db";

export type ProjectionResult = { processed: number; lastEventId: string | null };

export async function replayFrom(eventId?: string): Promise<ProjectionResult> {
  const events = await db.select().from(eventLog).where(eventId ? gt(eventLog.createdAt, new Date(eventId)) : undefined).orderBy(asc(eventLog.createdAt), asc(eventLog.sequenceNumber));
  let processed = 0;
  for (const event of events) {
    if (event.eventType === "UniversalObjectCreated") {
      const payload = event.payload;
      await db.insert(universalObject).values({
        id: event.aggregateId,
        objectType: String(payload.objectType ?? event.aggregateType),
        name: String(payload.name ?? event.aggregateId),
        description: typeof payload.description === "string" ? payload.description : null,
        status: typeof payload.status === "string" ? payload.status : "active",
        version: event.sequenceNumber,
      }).onConflictDoNothing();
    } else if (event.eventType === "UniversalObjectUpdated") {
      await db.update(universalObject).set({
        ...(typeof event.payload.name === "string" ? { name: event.payload.name } : {}),
        ...(typeof event.payload.description === "string" ? { description: event.payload.description } : {}),
        ...(typeof event.payload.status === "string" ? { status: event.payload.status } : {}),
        version: event.sequenceNumber,
        updatedAt: event.occurredAt,
      }).where(eq(universalObject.id, event.aggregateId));
    }
    processed += 1;
  }
  return { processed, lastEventId: events.at(-1)?.id ?? null };
}