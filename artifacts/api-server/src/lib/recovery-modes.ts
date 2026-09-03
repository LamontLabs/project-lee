import { createHash, randomUUID } from "node:crypto";
import { desc, eq, isNull } from "drizzle-orm";
import { bootHistory, cleanShutdown, db, eventLog, recoveryAgenda } from "@workspace/db";
import { getEngines, setLifecycleState } from "./capability-registry";
import { getStartupProof, verifyCanonicalBrainStartup } from "./startup-integrity";

export const RECOVERY_MODES = ["COLD_BOOT", "WARM_RESTART", "SAFE_MODE", "RECOVERY_MODE", "MIGRATION_MODE", "READ_ONLY"] as const;
export type RecoveryMode = typeof RECOVERY_MODES[number];
let activeMode: RecoveryMode = "COLD_BOOT";
let activeReason = "Default full validation boot.";
let activeAgenda: typeof recoveryAgenda.$inferSelect | null = null;

export function getRecoveryMode() { return { mode: activeMode, reason: activeReason, agenda: activeAgenda, proof: getStartupProof() }; }
export function criticalStateChecksum() { return createHash("sha256").update("lee-critical-state-v1").digest("hex"); }

export async function selectBootMode(explicit?: string): Promise<{ mode: RecoveryMode; reason: string; agenda: typeof recoveryAgenda.$inferSelect | null }> {
  if (explicit && RECOVERY_MODES.includes(explicit as RecoveryMode)) return { mode: explicit as RecoveryMode, reason: "Explicit boot_mode selection.", agenda: null };
  const [agenda] = await db.select().from(recoveryAgenda).where(isNull(recoveryAgenda.resolvedAt)).orderBy(desc(recoveryAgenda.createdAt)).limit(1);
  if (agenda) return { mode: "RECOVERY_MODE", reason: `Repair agenda contains ${agenda.issues.length} unresolved issue(s).`, agenda };
  const [marker] = await db.select().from(cleanShutdown).where(isNull(cleanShutdown.consumedAt)).orderBy(desc(cleanShutdown.createdAt)).limit(1);
  if (marker && marker.stateChecksum === criticalStateChecksum()) return { mode: "WARM_RESTART", reason: "Previous session recorded a verified clean shutdown.", agenda: null };
  return { mode: "COLD_BOOT", reason: marker ? "Clean shutdown checksum mismatch; full validation required." : "No clean shutdown marker found; full validation required.", agenda: null };
}
export async function startBoot(explicit?: string) {
  const started = new Date();
  const selection = await selectBootMode(explicit ?? process.env.LEE_BOOT_MODE);
  const proof = await verifyCanonicalBrainStartup();
  activeMode = selection.mode; activeReason = selection.reason; activeAgenda = selection.agenda;
  if (proof.overall !== "PASS" && activeMode !== "READ_ONLY") {
    activeMode = "RECOVERY_MODE";
    activeReason = proof.issues.join(" ") || "Canonical Brain startup proof failed.";
    if (!activeAgenda) {
      const [agenda] = await db.insert(recoveryAgenda).values({
        status: "OPEN",
        source: "canonical-brain-startup",
        issues: proof.issues.map((description, index) => ({ id: `startup-${index + 1}`, description, status: "OPEN" })),
      }).returning();
      activeAgenda = agenda ?? null;
    }
  }
  const [history] = await db.insert(bootHistory).values({ bootMode: activeMode, reason: activeReason, agendaSummary: activeAgenda ? `${activeAgenda.issues.length} issues` : null, startedAt: started }).returning();
  await db.insert(eventLog).values({ eventType: "BootStarted", aggregateType: "boot", aggregateId: history.id, sourceRef: "boot-manager", occurredAt: started, payload: { bootMode: activeMode, reason: activeReason, agendaSummary: activeAgenda ? `${activeAgenda.issues.length} issues` : null, startupProof: proof.overall } });
  if (activeMode === "SAFE_MODE") {
    const engines = await getEngines();
    for (const engine of engines.filter((item) => !["Foundations", "Coordination"].includes(item.owner))) await setLifecycleState(engine.engineId, "UNAVAILABLE", ["Safe Mode: intelligence capabilities disabled."]);
  }
  const engines = await getEngines();
  const engineStates = Object.fromEntries(engines.map((engine) => [engine.engineId, activeMode === "SAFE_MODE" && !["Foundations", "Coordination"].includes(engine.owner) ? "UNAVAILABLE" : engine.lifecycleState]));
  const completed = new Date();
  const success = proof.overall === "PASS" && activeMode !== "RECOVERY_MODE";
  await db.update(bootHistory).set({ completedAt: completed, engineStates, success }).where(eq(bootHistory.id, history.id));
  await db.insert(eventLog).values({ eventType: "BootCompleted", aggregateType: "boot", aggregateId: history.id, sourceRef: "boot-manager", occurredAt: completed, payload: { bootMode: activeMode, durationMs: completed.getTime() - started.getTime(), engineStates } });
  return { ...getRecoveryMode(), historyId: history.id };
}
export async function recordCleanShutdown(sessionId: string = randomUUID()) {
  const [marker] = await db.insert(cleanShutdown).values({ sessionId, stateChecksum: criticalStateChecksum() }).returning();
  await db.insert(eventLog).values({ eventType: "CleanShutdownRecorded", aggregateType: "boot", aggregateId: marker.id, sourceRef: "boot-manager", occurredAt: new Date(), payload: { sessionId, stateChecksum: marker.stateChecksum } });
  return marker;
}
export async function resolveAgenda(id: string) {
  const [agenda] = await db.update(recoveryAgenda).set({ status: "RESOLVED", resolvedAt: new Date() }).where(eq(recoveryAgenda.id, id)).returning();
  activeAgenda = agenda ?? activeAgenda; return agenda;
}