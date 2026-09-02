import { and, asc, eq, gt, inArray, lte, or } from "drizzle-orm";
import {
  db,
  eventDelivery,
  eventDeliveryAttempt,
  eventLog,
  eventSubscription,
} from "@workspace/db";
import type { DomainEventType } from "./domain-events";

type EventRow = typeof eventLog.$inferSelect;
type DurableHandler = (event: EventRow) => void | Promise<void>;
type RegisterOptions = {
  subscriberId: string;
  eventTypes?: DomainEventType[];
  handler: DurableHandler;
  maxAttempts?: number;
};
type DeliveryOptions = { subscriberId?: string; now?: Date; maxEvents?: number };

const handlers = new Map<string, DurableHandler>();

export async function registerDurableSubscriber(options: RegisterOptions) {
  const eventTypes = options.eventTypes ?? [];
  handlers.set(options.subscriberId, options.handler);
  const [existing] = await db.select().from(eventSubscription).where(eq(eventSubscription.subscriberId, options.subscriberId)).limit(1);
  if (existing) {
    const [updated] = await db.update(eventSubscription).set({
      eventTypes,
      status: "active",
      maxAttempts: options.maxAttempts ?? existing.maxAttempts,
      updatedAt: new Date(),
    }).where(eq(eventSubscription.id, existing.id)).returning();
    return updated;
  }
  const [created] = await db.insert(eventSubscription).values({
    subscriberId: options.subscriberId,
    eventTypes,
    maxAttempts: options.maxAttempts ?? 5,
  }).returning();
  return created;
}

export function detachDurableSubscriber(subscriberId: string) {
  handlers.delete(subscriberId);
}

export async function pauseDurableSubscriber(subscriberId: string) {
  const [subscription] = await db.update(eventSubscription).set({ status: "paused", updatedAt: new Date() }).where(eq(eventSubscription.subscriberId, subscriberId)).returning();
  return subscription ?? null;
}

export async function resumeDurableSubscriber(subscriberId: string) {
  const [subscription] = await db.update(eventSubscription).set({ status: "active", updatedAt: new Date() }).where(eq(eventSubscription.subscriberId, subscriberId)).returning();
  return subscription ?? null;
}

function dueDelivery(subscriptionId: string, now: Date) {
  const staleProcessingAt = new Date(now.getTime() - 30_000);
  return db.select().from(eventDelivery)
    .where(and(
      eq(eventDelivery.subscriptionId, subscriptionId),
      or(
        and(inArray(eventDelivery.status, ["pending", "failed"]), lte(eventDelivery.nextAttemptAt, now)),
        and(eq(eventDelivery.status, "processing"), lte(eventDelivery.lockedAt, staleProcessingAt)),
      ),
    ))
    .orderBy(asc(eventDelivery.nextAttemptAt), asc(eventDelivery.createdAt))
    .limit(1);
}

async function createNextDelivery(subscription: typeof eventSubscription.$inferSelect, now: Date) {
  const types = subscription.eventTypes;
  const typeFilter = types.length ? inArray(eventLog.eventType, types) : undefined;
  const cursorFilter = subscription.cursorCreatedAt
    ? or(
      gt(eventLog.createdAt, subscription.cursorCreatedAt),
      eq(eventLog.createdAt, subscription.cursorCreatedAt),
    )
    : undefined;
  const candidates = await db.select().from(eventLog)
    .where(and(typeFilter, cursorFilter))
    .orderBy(asc(eventLog.createdAt), asc(eventLog.id))
    .limit(100);
  for (const event of candidates) {
    const [existing] = await db.select().from(eventDelivery).where(and(eq(eventDelivery.subscriptionId, subscription.id), eq(eventDelivery.eventId, event.id))).limit(1);
    if (existing?.status === "delivered" || existing?.status === "dead_letter" || existing?.status === "processing") continue;
    const [delivery] = await db.insert(eventDelivery).values({
      subscriptionId: subscription.id,
      eventId: event.id,
      correlationId: event.correlationId,
      causationId: event.causationId,
      nextAttemptAt: now,
    }).onConflictDoNothing({ target: [eventDelivery.subscriptionId, eventDelivery.eventId] }).returning();
    if (delivery) return delivery;
    return existing ?? null;
  }
  return null;
}

async function claimDelivery(subscription: typeof eventSubscription.$inferSelect, now: Date) {
  const staleProcessingAt = new Date(now.getTime() - 30_000);
  const [existing] = await dueDelivery(subscription.id, now);
  const candidate = existing ?? await createNextDelivery(subscription, now);
  if (!candidate) return null;
  const [claimed] = await db.update(eventDelivery).set({
    status: "processing",
    attemptCount: candidate.attemptCount + 1,
    lockedAt: now,
    updatedAt: now,
  }).where(and(
    eq(eventDelivery.id, candidate.id),
    or(
      and(inArray(eventDelivery.status, ["pending", "failed"]), lte(eventDelivery.nextAttemptAt, now)),
      and(eq(eventDelivery.status, "processing"), lte(eventDelivery.lockedAt, staleProcessingAt)),
    ),
  )).returning();
  return claimed ?? null;
}

function backoffMs(attempt: number) {
  return Math.min(60 * 60 * 1000, 1000 * (2 ** Math.max(0, attempt - 1)));
}

async function deliverOne(subscription: typeof eventSubscription.$inferSelect, now: Date) {
  const delivery = await claimDelivery(subscription, now);
  if (!delivery) return { state: "idle" as const };
  const [event] = await db.select().from(eventLog).where(eq(eventLog.id, delivery.eventId)).limit(1);
  const handler = handlers.get(subscription.subscriberId);
  if (!event || !handler) {
    return { state: "failed" as const, error: event ? "Subscriber handler is not registered in this process." : "Event was not found in the immutable Event Log." };
  }
  const [attempt] = await db.insert(eventDeliveryAttempt).values({
    deliveryId: delivery.id,
    subscriptionId: subscription.id,
    eventId: delivery.eventId,
    attemptNumber: delivery.attemptCount,
    status: "started",
    correlationId: event.correlationId,
    causationId: event.causationId,
  }).returning();
  try {
    await handler(event);
    const completedAt = new Date();
    await db.transaction(async (tx) => {
      await tx.update(eventDeliveryAttempt).set({ status: "succeeded", completedAt }).where(eq(eventDeliveryAttempt.id, attempt.id));
      await tx.update(eventDelivery).set({ status: "delivered", deliveredAt: completedAt, lockedAt: null, updatedAt: completedAt }).where(eq(eventDelivery.id, delivery.id));
      await tx.update(eventSubscription).set({
        cursorCreatedAt: event.createdAt,
        cursorEventId: event.id,
        retryCount: 0,
        nextAttemptAt: null,
        lastError: null,
        updatedAt: completedAt,
      }).where(eq(eventSubscription.id, subscription.id));
    });
    return { state: "delivered" as const, eventId: event.id, attempt: delivery.attemptCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const deadLetter = delivery.attemptCount >= subscription.maxAttempts;
    const nextAttemptAt = new Date(now.getTime() + backoffMs(delivery.attemptCount));
    await db.transaction(async (tx) => {
      await tx.update(eventDeliveryAttempt).set({ status: deadLetter ? "dead_lettered" : "failed", completedAt: new Date(), error: message }).where(eq(eventDeliveryAttempt.id, attempt.id));
      await tx.update(eventDelivery).set({
        status: deadLetter ? "dead_letter" : "failed",
        nextAttemptAt,
        lockedAt: null,
        deadLetteredAt: deadLetter ? new Date() : null,
        lastError: message,
        updatedAt: new Date(),
      }).where(eq(eventDelivery.id, delivery.id));
      await tx.update(eventSubscription).set({
        ...(deadLetter ? {
          cursorCreatedAt: event.createdAt,
          cursorEventId: event.id,
          deadLetterCount: subscription.deadLetterCount + 1,
        } : {}),
        retryCount: subscription.retryCount + 1,
        nextAttemptAt: deadLetter ? null : nextAttemptAt,
        lastError: message,
        updatedAt: new Date(),
      }).where(eq(eventSubscription.id, subscription.id));
    });
    return { state: deadLetter ? "dead_letter" as const : "failed" as const, eventId: event.id, attempt: delivery.attemptCount, nextAttemptAt, error: message };
  }
}

export async function deliverDurableEvents(options: DeliveryOptions = {}) {
  const now = options.now ?? new Date();
  const subscriptions = await db.select().from(eventSubscription).where(and(
    eq(eventSubscription.status, "active"),
    options.subscriberId ? eq(eventSubscription.subscriberId, options.subscriberId) : undefined,
  ));
  const results: Array<Record<string, unknown>> = [];
  for (const subscription of subscriptions) {
    if (!handlers.has(subscription.subscriberId)) continue;
    for (let index = 0; index < (options.maxEvents ?? 10); index += 1) {
      const result = await deliverOne(subscription, now);
      results.push({ subscriberId: subscription.subscriberId, ...result });
      if (result.state === "idle") break;
    }
  }
  return results;
}

export async function durableSubscriptionStatus(subscriberId?: string) {
  return db.select().from(eventSubscription).where(subscriberId ? eq(eventSubscription.subscriberId, subscriberId) : undefined);
}