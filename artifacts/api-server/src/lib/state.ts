import { and, desc, eq, isNull } from "drizzle-orm";
import { db, eventLog, leeState, stateHistory } from "@workspace/db";
export const OPERATIONAL_STATES = ["Booting", "Learning", "Idle", "Thinking", "Briefing", "Importing", "Synchronizing", "Waiting", "Recovering", "Offline", "Degraded"] as const;
export type OperationalState = typeof OPERATIONAL_STATES[number];
const transitions: Record<OperationalState, OperationalState[]> = {
  Booting: ["Idle", "Recovering", "Offline", "Degraded"], Learning: ["Idle", "Importing", "Recovering", "Degraded"], Idle: ["Thinking", "Briefing", "Importing", "Synchronizing", "Waiting", "Recovering", "Offline", "Degraded"], Thinking: ["Idle", "Waiting", "Recovering", "Offline", "Degraded"], Briefing: ["Idle", "Waiting", "Recovering", "Degraded"], Importing: ["Learning", "Idle", "Recovering", "Offline", "Degraded"], Synchronizing: ["Idle", "Waiting", "Recovering", "Offline", "Degraded"], Waiting: ["Idle", "Thinking", "Recovering", "Degraded"], Recovering: ["Idle", "Booting", "Offline", "Degraded"], Offline: ["Idle", "Recovering", "Degraded"], Degraded: ["Idle", "Recovering", "Offline"],
};
export async function ensureState() { const [current] = await db.select().from(leeState).limit(1); if (current) return current; const now = new Date(); const [created] = await db.insert(leeState).values({ currentState: "Idle", enteredAt: now, reason: "System initialized and ready.", updatedAt: now }).returning(); await db.insert(stateHistory).values({ state: "Idle", enteredAt: now, reason: "System initialized and ready." }); return created; }
export async function getState() { return ensureState(); }
export async function transitionState(nextState: string, reason: string, triggeringJobId?: string, estimatedDurationSeconds?: number) {
  if (!(OPERATIONAL_STATES as readonly string[]).includes(nextState)) throw new Error(`Unknown operational state: ${nextState}`);
  const current = await ensureState(); if (current.currentState === nextState) return current;
  if (!(transitions[current.currentState as OperationalState] ?? []).includes(nextState as OperationalState)) {
    await db.insert(eventLog).values({ eventType: "StateTransitionRejected", aggregateType: "lee_state", aggregateId: current.id, sourceRef: "state-engine", occurredAt: new Date(), payload: { from: current.currentState, to: nextState, reason } });
    throw new Error(`Invalid state transition ${current.currentState} → ${nextState}`);
  }
  const now = new Date(); const durationSeconds = Math.max(0, Math.round((now.getTime() - new Date(current.enteredAt).getTime()) / 1000));
  await db.update(stateHistory).set({ exitedAt: now, durationSeconds }).where(and(eq(stateHistory.state, current.currentState), isNull(stateHistory.exitedAt)));
  const [updated] = await db.update(leeState).set({ currentState: nextState, enteredAt: now, reason, estimatedDurationSeconds, updatedAt: now }).where(eq(leeState.id, current.id)).returning();
  await db.insert(stateHistory).values({ state: nextState, enteredAt: now, reason, triggeringJobId });
  await db.insert(eventLog).values({ eventType: "StateChanged", aggregateType: "lee_state", aggregateId: current.id, sourceRef: "state-engine", occurredAt: now, payload: { from: current.currentState, to: nextState, reason, durationSeconds, triggeringJobId, estimatedDurationSeconds } });
  return updated;
}
export async function stateHistoryList(limit = 100) { return db.select().from(stateHistory).orderBy(desc(stateHistory.enteredAt)).limit(limit); }