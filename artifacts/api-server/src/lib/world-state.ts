import { and, asc, eq } from "drizzle-orm";
import { db, scheduledJob, worldStateSignal, worldStateSnapshot } from "@workspace/db";
import { emitEvent } from "./foundation-events";

const TZ = process.env.LEE_TIMEZONE ?? "America/Los_Angeles";
const exchangeHours = { open: "06:30", close: "13:00", exchange: "NYSE/NASDAQ", timezone: TZ };

function isoDate(value: Date) { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function localParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(value);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}
function holidaySignals(now: Date) {
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(now));
  const labor = new Date(`${year}-09-07T12:00:00Z`);
  return [{ name: "upcoming_holidays", holidays: [labor].filter((date) => date >= now && date.getTime() <= now.getTime() + 30 * 86400000).map((date) => ({ name: "US Labor Day", date: isoDate(date), region: "US" })) }];
}
async function upsertSignal(signalName: string, value: Record<string, unknown>, source: string, signalType = "universal", configuration: Record<string, unknown> = {}) {
  const [existing] = await db.select().from(worldStateSignal).where(eq(worldStateSignal.signalName, signalName)).limit(1);
  const now = new Date();
  if (!existing) {
    const [created] = await db.insert(worldStateSignal).values({ signalType, signalName, currentValue: value, source, configuration, configured: signalType !== "universal", lastUpdatedAt: now }).returning();
    await db.insert(worldStateSnapshot).values({ signalId: created.id, value, source });
    return created;
  }
  const changed = JSON.stringify(existing.currentValue) !== JSON.stringify(value);
  const [updated] = await db.update(worldStateSignal).set({ currentValue: value, lastUpdatedAt: now, source, configuration }).where(eq(worldStateSignal.id, existing.id)).returning();
  await db.insert(worldStateSnapshot).values({ signalId: existing.id, value, source });
  if (changed) await emitEvent({ eventType: "WorldStateUpdated", aggregateType: "world_state_signal", aggregateId: existing.id, payload: { signalId: existing.id, signalName, oldValue: existing.currentValue, newValue: value, significance: signalType === "technical" ? "high" : "normal" } });
  return updated;
}
export async function refreshWorldState() {
  const now = new Date(); const parts = localParts(now); const minutes = Number(parts.hour) * 60 + Number(parts.minute); const weekday = parts.weekday !== "Saturday" && parts.weekday !== "Sunday";
  await upsertSignal("current_time", { iso: now.toISOString(), localDate: isoDate(now), timezone: TZ, dayOfWeek: parts.weekday, weekOfYear: Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, week: "numeric" } as any).format(now)) || null }, "system-clock");
  await upsertSignal("market_status", { ...exchangeHours, open: weekday && minutes >= 390 && minutes < 780, checkedAt: now.toISOString() }, "market-calendar");
  for (const signal of holidaySignals(now)) await upsertSignal(signal.name, signal, "US-federal-calendar");
  return db.select().from(worldStateSignal).where(eq(worldStateSignal.enabled, true)).orderBy(asc(worldStateSignal.signalType), asc(worldStateSignal.signalName));
}
export async function currentWorldState() { await refreshWorldState(); const signals = await db.select().from(worldStateSignal).where(eq(worldStateSignal.enabled, true)); return { generatedAt: new Date().toISOString(), timezone: TZ, signals, relevant: signals.filter((signal) => signal.signalType !== "universal" || signal.signalName === "market_status" || signal.signalName === "upcoming_holidays") }; }
export async function configureWorldSignal(input: { signalType: string; signalName: string; source?: string; configuration?: Record<string, unknown>; refreshFrequency?: string }) { return upsertSignal(input.signalName, { status: "configured", topic: input.signalName }, input.source ?? "owner-configured", input.signalType, input.configuration ?? {}); }
export async function removeWorldSignal(id: string) { return db.update(worldStateSignal).set({ enabled: false }).where(and(eq(worldStateSignal.id, id), eq(worldStateSignal.configured, true))).returning(); }
export async function ensureWorldStateJob() {
  const [existing] = await db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "world_state_refresh")).limit(1);
  if (!existing) await db.insert(scheduledJob).values({ jobType: "world_state_refresh", runAt: new Date(Date.now() + 60_000), recurrence: "hourly", payload: { engine: "World State Engine" } });
}