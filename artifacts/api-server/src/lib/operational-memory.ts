import { and, desc, eq, inArray } from "drizzle-orm";
import { behavioralSignal, db, eventLog, operationalPattern, scheduledJob } from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { queryEngine } from "./query-engine";

function statusFor(observations: number, confidence: number) { return observations >= 10 && confidence >= 0.9 ? "strong" : observations >= 5 && confidence >= 0.7 ? "established" : "candidate"; }
export async function ingestBehavioralSignal(input: { signalType: string; entityRef?: string; occurredAt?: string; metadata?: Record<string, unknown>; evidenceEventId?: string }) {
  const [signal] = await db.insert(behavioralSignal).values({ signalType: input.signalType, entityRef: input.entityRef, occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(), metadata: input.metadata ?? {}, evidenceEventId: input.evidenceEventId }).returning();
  return signal;
}
export async function detectOperationalPatterns() {
  const signalResults = await queryEngine.query({ sources: ["behavioral_signals"], filters: {}, rankingPolicy: "curiosity_scan", confidenceThreshold: 0, limit: 200, requester: "Operational Memory", purpose: "pattern_detection" });
  const signals = signalResults.map((item) => item.object as typeof behavioralSignal.$inferSelect);
  const groups = new Map<string, typeof signals>();
  for (const signal of signals) { const hour = new Date(signal.occurredAt).getHours(); const key = `${signal.signalType}:${hour}`; groups.set(key, [...(groups.get(key) ?? []), signal]); }
  let established = 0;
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const [patternType, hour] = key.split(":");
    const description = `${patternType.replaceAll("_", " ")} activity typically occurs around ${hour}:00.`;
    const patternResults = await queryEngine.query({ sources: ["operational_patterns"], filters: { text: description }, rankingPolicy: "curiosity_scan", confidenceThreshold: 0, limit: 20, requester: "Operational Memory", purpose: "pattern_detection" });
    const existing = patternResults.map((item) => item.object as typeof operationalPattern.$inferSelect).find((item) => item.patternType === patternType && item.patternDescription === description);
    const confidence = group.length >= 10 ? 0.9 : group.length >= 5 ? 0.7 : 0.3;
    const status = statusFor(group.length, confidence);
    if (!existing) {
      const [created] = await db.insert(operationalPattern).values({ patternType, patternDescription: description, observationCount: group.length, confidence, status, evidenceRefs: group.slice(0, 25).map((item) => item.evidenceEventId ?? item.id), lastObservedAt: group[0].occurredAt }).returning();
      if (status === "established") { established += 1; await emitEvent({ eventType: "OperationalPatternEstablished", aggregateType: "operational_pattern", aggregateId: created.id, payload: { patternType, confidence, evidenceCount: group.length } }); }
    } else {
      const nextStatus = statusFor(group.length, confidence);
      if (nextStatus !== existing.status && nextStatus === "established") await emitEvent({ eventType: "OperationalPatternEstablished", aggregateType: "operational_pattern", aggregateId: existing.id, payload: { patternType, confidence, evidenceCount: group.length } });
      await db.update(operationalPattern).set({ observationCount: group.length, confidence, status: nextStatus, evidenceRefs: group.slice(0, 25).map((item) => item.evidenceEventId ?? item.id), lastObservedAt: group[0].occurredAt, updatedAt: new Date() }).where(eq(operationalPattern.id, existing.id));
    }
  }
  const patternResults = await queryEngine.query({ sources: ["operational_patterns"], filters: {}, rankingPolicy: "curiosity_scan", confidenceThreshold: 0, limit: 200, requester: "Operational Memory", purpose: "pattern_detection" });
  return { signals: signals.length, patterns: patternResults.length, established };
}
export async function operationalContext() {
  const now = new Date(); const hour = now.getHours();
  const patternResults = await queryEngine.query({ sources: ["operational_patterns"], filters: {}, rankingPolicy: "curiosity_scan", confidenceThreshold: 0, limit: 200, requester: "Operational Memory", purpose: "operational_context" });
  const patterns = patternResults.map((item) => item.object as typeof operationalPattern.$inferSelect).filter((item) => ["established", "strong"].includes(item.status));
  return { generatedAt: now.toISOString(), currentHour: hour, activePatterns: patterns.filter((pattern) => pattern.patternDescription.includes(`${hour}:00`)), expectedMode: patterns.find((pattern) => pattern.patternType === "work_session" && pattern.patternDescription.includes(`${hour}:00`))?.patternDescription ?? "No established work-session pattern for the current hour.", attentionWindows: patterns.filter((pattern) => pattern.patternType === "attention") };
}
export async function confirmPattern(id: string) { const [pattern] = await db.update(operationalPattern).set({ confidence: 1, status: "strong", updatedAt: new Date() }).where(eq(operationalPattern.id, id)).returning(); return pattern; }
export async function dismissPattern(id: string) { const [pattern] = await db.update(operationalPattern).set({ status: "historic", updatedAt: new Date() }).where(eq(operationalPattern.id, id)).returning(); return pattern; }
export async function createManualPattern(input: { patternType: string; patternDescription: string }) { const [pattern] = await db.insert(operationalPattern).values({ ...input, confidence: 1, observationCount: 0, status: "strong" }).returning(); return pattern; }
export async function ensureOperationalMemoryJob() {
  const [existing] = await db.select({ id: scheduledJob.id }).from(scheduledJob).where(eq(scheduledJob.jobType, "operational_memory_scan")).limit(1);
  if (!existing) await db.insert(scheduledJob).values({ jobType: "operational_memory_scan", runAt: new Date(Date.now() + 60_000), recurrence: "daily", payload: { engine: "Operational Memory Engine" } });
}