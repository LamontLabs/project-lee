import { and, desc, eq } from "drizzle-orm";
import { db, eventLog } from "@workspace/db";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { notifySubscribers, subscribe, unsubscribe, causalChain, validateDomainPayload, type DomainEventInput, type DomainEventType } from "./domain-events";

type EventWriter = typeof db;

export async function emitEvent(input: DomainEventInput, writer: EventWriter = db) {
  const catalog = validateDomainPayload(input.eventType, input.payload);
  const [latest] = await writer.select({ sequenceNumber: eventLog.sequenceNumber })
    .from(eventLog)
    .where(and(eq(eventLog.aggregateType, input.aggregateType), eq(eventLog.aggregateId, input.aggregateId)))
    .orderBy(desc(eventLog.sequenceNumber))
    .limit(1);
  const [event] = await writer.insert(eventLog).values({
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