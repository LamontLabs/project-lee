import { and, desc, eq, sql } from "drizzle-orm";
import { db, eventLog } from "@workspace/db";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { notifySubscribers, subscribe, unsubscribe, causalChain, validateDomainPayload, type DomainEventInput, type DomainEventType } from "./domain-events";
import { recordChangeFromEvent } from "./change-intelligence";

type EventWriter = Pick<typeof db, "select" | "insert">;

export async function emitEvent(input: DomainEventInput, writer: EventWriter = db) {
  const catalog = validateDomainPayload(input.eventType, input.payload);
  const write = async (transaction: EventWriter) => {
    const [latest] = await transaction.select({ sequenceNumber: eventLog.sequenceNumber })
      .from(eventLog)
      .where(and(eq(eventLog.aggregateType, input.aggregateType), eq(eventLog.aggregateId, input.aggregateId)))
      .orderBy(desc(eventLog.sequenceNumber))
      .limit(1);
    const [event] = await transaction.insert(eventLog).values({
      eventType: input.eventType,
      eventVersion: catalog.eventVersion,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload,
      actor: input.actor ?? "lee",
      sourceRef: input.sourceRef ?? "api",
      sequenceNumber: (latest?.sequenceNumber ?? 0) + 1,
      causationId: input.causationId,
      correlationId: input.correlationId,
      sessionId: input.sessionId,
      brainVersion: input.brainVersion,
      occurredAt: new Date(),
    }).returning();
    return event;
  };
  const event = writer === db
    ? await db.transaction(async (transaction) => {
      const lockKey = `${input.aggregateType}:${input.aggregateId}`;
      await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
      return write(transaction);
    })
    : await write(writer);
  if (!event) throw new Error("Event Log append did not return an event.");
  if (writer === db) await recordChangeFromEvent(event);
  await notifySubscribers(event);
  return event;
}

export async function eventsForAggregate(aggregateType: string, aggregateId: string) {
  return db.select().from(eventLog).where(and(eq(eventLog.aggregateType, aggregateType), eq(eventLog.aggregateId, aggregateId))).orderBy(eventLog.sequenceNumber);
}

export async function replayAggregate<T>(aggregateType: string, aggregateId: string, initial: T, apply: (state: T, event: typeof eventLog.$inferSelect) => T) {
  const events = await eventsForAggregate(aggregateType, aggregateId);
  return events.reduce(apply, initial);
}

export const EventBus = {
  emit: emitEvent,
  subscribe: (eventType: DomainEventType, handler: (event: typeof eventLog.$inferSelect) => void | Promise<void>) => subscribe(eventType, handler),
  unsubscribe,
  getCausalChain: causalChain,
};