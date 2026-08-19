import { and, desc, eq, lte } from "drizzle-orm";
import { db, brief, eventLog, factLedger, notification, universalObject, waitingLoop } from "@workspace/db";
import { WhyChainBuilder } from "./why-chain";
import { recordProvenance } from "./provenance";

const DAY = 86_400_000;
const decay: Record<string, { halfLife: number; stale: number }> = {
  project: { halfLife: 7, stale: 14 }, relationship: { halfLife: 14, stale: 28 }, technical_doc: { halfLife: 14, stale: 30 },
  market: { halfLife: 7, stale: 14 }, principle: { halfLife: 365, stale: 730 }, decision: { halfLife: 3650, stale: 3650 }, default: { halfLife: 30, stale: 60 },
};

export function temporalFields(input: { createdAt: Date; updatedAt?: Date | null; lastConfirmedAt?: Date | null; objectType?: string; deadline?: Date | null }, now = new Date()) {
  const created = Math.max(0, Math.floor((now.getTime() - input.createdAt.getTime()) / DAY));
  const confirmed = input.lastConfirmedAt ?? input.updatedAt ?? input.createdAt;
  const staleDays = Math.max(0, Math.floor((now.getTime() - confirmed.getTime()) / DAY));
  const rule = decay[input.objectType ?? "default"] ?? decay.default;
  const freshnessScore = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-staleDays / rule.halfLife))));
  return { ageDays: created, stalenessDays: staleDays, deadlineDistanceDays: input.deadline ? Math.ceil((input.deadline.getTime() - now.getTime()) / DAY) : null, freshnessScore, freshnessState: freshnessScore < 20 ? "critical" : freshnessScore < 50 ? "stale" : freshnessScore < 75 ? "aging" : "fresh", staleThresholdDays: rule.stale };
}

export async function timeOverview() {
  const now = new Date();
  const [objects, loops, notifications, latestBrief] = await Promise.all([
    db.select().from(universalObject).orderBy(desc(universalObject.updatedAt)).limit(500),
    db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).orderBy(waitingLoop.waitingSince),
    db.select().from(notification).where(eq(notification.status, "unread")).orderBy(desc(notification.createdAt)).limit(50),
    db.select().from(brief).where(eq(brief.briefType, "today")).orderBy(desc(brief.generatedAt)).limit(1),
  ]);
  return {
    now: now.toISOString(),
    objects: objects.map((object) => ({ ...object, temporal: temporalFields({ createdAt: object.createdAt, updatedAt: object.updatedAt, lastConfirmedAt: object.lastConfirmedAt, objectType: object.objectType }) })),
    waitingLoops: loops.map((loop) => { const daysWaiting = Math.max(0, Math.floor((now.getTime() - loop.waitingSince.getTime()) / DAY)); const expected = loop.nextCheckAt ? now >= loop.nextCheckAt : false; return { ...loop, daysWaiting, risk: daysWaiting > 30 ? "red" : expected ? "amber" : "green", recommendedAction: daysWaiting > 30 ? "Escalate or close" : expected ? "Check in now" : "Monitor" }; }),
    notifications,
    latestBrief: latestBrief[0] ?? null,
  };
}

export async function generateBrief(briefType: "today" | "evening" | "weekly") {
  const overview = await timeOverview();
  const stale = overview.objects.filter((item) => item.temporal.freshnessState === "stale" || item.temporal.freshnessState === "critical");
  const content = {
    generatedAt: overview.now, focus: overview.objects.filter((item) => item.status === "active").slice(0, 5).map((item) => item.name),
    waiting: overview.waitingLoops, staleContext: stale.map((item) => ({ id: item.id, name: item.name, freshness: item.temporal.freshnessScore })),
    unreadNotifications: overview.notifications.length, changes: await db.select().from(eventLog).orderBy(desc(eventLog.occurredAt)).limit(10),
    factCount: (await db.select().from(factLedger).limit(500)).length,
  };
  const sourcesUsed = ["event_log", "universal_object", "waiting_loop"];
  const whyChain = new WhyChainBuilder().addStep("freshness_threshold", `${stale.length} active objects crossed a freshness threshold.`, stale.length ? 0.8 : 0.6, "Brief Engine", stale[0]?.id).addStep("fact_confirmed", `${overview.notifications.length} notifications and ${overview.waitingLoops.length} waiting loops shaped this brief.`, 0.75, "Brief Engine", "event_log").buildNonTrivial();
  const [saved] = await db.insert(brief).values({ briefType, title: briefType === "today" ? "Today's Brief" : briefType === "evening" ? "Evening Reflection" : "Weekly Review", content, sourcesUsed, whyChain, confidence: stale.length ? 0.72 : 0.86 }).returning();
  await recordProvenance("brief", saved.id, sourcesUsed, saved.confidence);
  await db.insert(eventLog).values({ eventType: "BriefGenerated", aggregateType: "brief", aggregateId: saved.id, sourceRef: "time-engine", occurredAt: new Date(), payload: { briefId: saved.id, briefType, staleCount: stale.length } });
  return saved;
}

export async function scanFreshness() {
  const overview = await timeOverview();
  const stale = overview.objects.filter((item) => item.temporal.freshnessState === "stale" || item.temporal.freshnessState === "critical");
  for (const item of stale.slice(0, 25)) {
    const existing = await db.select({ id: notification.id }).from(notification).where(and(eq(notification.kind, "stale_context"), eq(notification.targetRef, item.id))).limit(1);
    if (!existing.length) await db.insert(notification).values({ kind: "stale_context", title: `Context aging: ${item.name}`, body: `${item.temporal.stalenessDays} days since confirmation.`, severity: item.temporal.freshnessState === "critical" ? "warning" : "info", targetRef: item.id });
  }
  return { staleCount: stale.length };
}