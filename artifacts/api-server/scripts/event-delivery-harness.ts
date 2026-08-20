import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  eventDelivery,
  eventDeliveryAttempt,
  eventLog,
  eventSubscription,
} from "@workspace/db";
import { emitEvent } from "../src/lib/foundation-events";
import {
  deliverDurableEvents,
  detachDurableSubscriber,
  registerDurableSubscriber,
} from "../src/lib/event-delivery";

test("durable delivery resumes after handler restart and remains idempotent", async () => {
  const subscriberId = `restart-harness-${randomUUID()}`;
  const correlationId = randomUUID();
  const received: typeof eventLog.$inferSelect[] = [];
  let shouldFail = true;
  const [baseline] = await db.select().from(eventLog).orderBy(desc(eventLog.createdAt), desc(eventLog.id)).limit(1);
  await registerDurableSubscriber({
    subscriberId,
    eventTypes: ["EventDeliveryTested"],
    maxAttempts: 3,
    handler: async () => {
      if (shouldFail) throw new Error("simulated process crash");
    },
  });
  const [registered] = await db.select().from(eventSubscription).where(eq(eventSubscription.subscriberId, subscriberId)).limit(1);
  await db.update(eventSubscription).set({ cursorCreatedAt: baseline?.createdAt ?? null, cursorEventId: baseline?.id ?? null }).where(eq(eventSubscription.id, registered.id));
  const parent = await emitEvent({
    eventType: "EventDeliveryTested",
    aggregateType: "delivery_harness",
    aggregateId: randomUUID(),
    correlationId,
    sourceRef: "event-delivery-harness",
    payload: { phase: "parent" },
  });
  const child = await emitEvent({
    eventType: "EventDeliveryTested",
    aggregateType: "delivery_harness",
    aggregateId: randomUUID(),
    correlationId,
    causationId: parent.id,
    sourceRef: "event-delivery-harness",
    payload: { phase: "child" },
  });

  const first = await deliverDurableEvents({ subscriberId, now: new Date(), maxEvents: 1 });
  assert.equal(first[0]?.state, "failed");
  detachDurableSubscriber(subscriberId);

  await registerDurableSubscriber({
    subscriberId,
    eventTypes: ["EventDeliveryTested"],
    handler: async (event) => { received.push(event); },
  });
  shouldFail = false;
  const restartTime = new Date(Date.now() + 2_000);
  for (let cycle = 0; cycle < 5 && received.length < 2; cycle += 1) {
    await deliverDurableEvents({ subscriberId, now: new Date(restartTime.getTime() + cycle * 2_000), maxEvents: 1 });
  }
  assert.deepEqual(received.map((event) => event.id), [parent.id, child.id]);
  assert.equal(received[1].causationId, parent.id);
  assert.equal(received[1].correlationId, correlationId);

  const beforeIdempotency = received.length;
  await deliverDurableEvents({ subscriberId, now: new Date(Date.now() + 60_000), maxEvents: 10 });
  assert.equal(received.length, beforeIdempotency);
  const [subscription] = await db.select().from(eventSubscription).where(eq(eventSubscription.subscriberId, subscriberId)).limit(1);
  assert.equal(subscription.cursorEventId, child.id);
  const deliveries = await db.select().from(eventDelivery).where(eq(eventDelivery.subscriptionId, subscription.id));
  assert.equal(deliveries.filter((delivery) => delivery.status === "delivered").length, 2);
  const attempts = await db.select().from(eventDeliveryAttempt).where(eq(eventDeliveryAttempt.subscriptionId, subscription.id));
  assert.equal(attempts.length, 3);
});

test("durable delivery dead-letters after bounded exponential retries", async () => {
  const subscriberId = `dead-letter-harness-${randomUUID()}`;
  const [baseline] = await db.select().from(eventLog).orderBy(desc(eventLog.createdAt), desc(eventLog.id)).limit(1);
  await registerDurableSubscriber({
    subscriberId,
    eventTypes: ["ManifestGenerated"],
    maxAttempts: 2,
    handler: async () => { throw new Error("permanent subscriber failure"); },
  });
  const [registered] = await db.select().from(eventSubscription).where(eq(eventSubscription.subscriberId, subscriberId)).limit(1);
  await db.update(eventSubscription).set({ cursorCreatedAt: baseline?.createdAt ?? null, cursorEventId: baseline?.id ?? null }).where(eq(eventSubscription.id, registered.id));
  const event = await emitEvent({
    eventType: "ManifestGenerated",
    aggregateType: "dead_letter_harness",
    aggregateId: randomUUID(),
    sourceRef: "event-delivery-harness",
    payload: { phase: "dead-letter" },
  });
  await deliverDurableEvents({ subscriberId, now: new Date(), maxEvents: 1 });
  await deliverDurableEvents({ subscriberId, now: new Date(Date.now() + 2_000), maxEvents: 1 });
  const [subscription] = await db.select().from(eventSubscription).where(eq(eventSubscription.subscriberId, subscriberId)).limit(1);
  const [delivery] = await db.select().from(eventDelivery).where(and(eq(eventDelivery.subscriptionId, subscription.id), eq(eventDelivery.eventId, event.id))).limit(1);
  assert.equal(delivery.status, "dead_letter");
  assert.equal(delivery.attemptCount, 2);
  assert.equal(subscription.deadLetterCount, 1);
  assert.equal(subscription.cursorEventId, event.id);
  const attempts = await db.select().from(eventDeliveryAttempt).where(eq(eventDeliveryAttempt.deliveryId, delivery.id)).orderBy(desc(eventDeliveryAttempt.attemptNumber));
  assert.deepEqual(attempts.map((attempt) => attempt.status).sort(), ["dead_lettered", "failed"]);
});