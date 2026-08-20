import { asc, eq, lt } from "drizzle-orm";
import { db, engineRegistry, eventLog } from "@workspace/db";

export type EngineStatus = "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
export type EngineSpec = {
  engineId: string; engineName: string; version?: string; owner?: string; capabilities: string[];
  dependencies?: string[]; inputs?: Record<string, string[]>; outputs?: Record<string, string[]>;
  healthEndpoint?: string;
};

const cache = new Map<string, typeof engineRegistry.$inferSelect>();

export async function registerEngine(spec: EngineSpec) {
  const now = new Date();
  const [row] = await db.insert(engineRegistry).values({
    engineId: spec.engineId, name: spec.engineName, version: spec.version ?? "1.0.0",
    status: "HEALTHY", owner: spec.owner ?? "Foundations", lastHeartbeat: now,
    healthEndpoint: spec.healthEndpoint ?? `/internal/${spec.engineId}/health`,
    capabilities: spec.capabilities, dependencies: spec.dependencies ?? [],
    inputs: spec.inputs ?? {}, outputs: spec.outputs ?? {},
  }).onConflictDoUpdate({ target: engineRegistry.name, set: {
    engineId: spec.engineId, version: spec.version ?? "1.0.0", status: "HEALTHY",
    owner: spec.owner ?? "Foundations", lastHeartbeat: now,
    healthEndpoint: spec.healthEndpoint ?? `/internal/${spec.engineId}/health`,
    capabilities: spec.capabilities, dependencies: spec.dependencies ?? [],
    inputs: spec.inputs ?? {}, outputs: spec.outputs ?? {}, updatedAt: now,
  } }).returning();
  cache.set(row.engineId, row); return row;
}

export async function heartbeat(engineId: string) {
  const [row] = await db.update(engineRegistry).set({ lastHeartbeat: new Date(), status: "HEALTHY", updatedAt: new Date() }).where(eq(engineRegistry.engineId, engineId)).returning();
  if (row) cache.set(engineId, row); return row ?? null;
}
export async function getEngines() {
  const rows = await db.select().from(engineRegistry).orderBy(asc(engineRegistry.name));
  rows.forEach((row) => cache.set(row.engineId, row)); return rows;
}
export async function getEngine(engineId: string) { return cache.get(engineId) ?? (await db.select().from(engineRegistry).where(eq(engineRegistry.engineId, engineId)).limit(1))[0] ?? null; }
export async function findCapability(capability: string) { return (await getEngines()).filter((engine) => engine.status === "HEALTHY" && engine.capabilities.includes(capability)); }
export async function markUnavailable(engineId: string, reason: string) {
  const [row] = await db.update(engineRegistry).set({ status: "UNAVAILABLE", updatedAt: new Date() }).where(eq(engineRegistry.engineId, engineId)).returning();
  if (row) { cache.set(engineId, row); await db.insert(eventLog).values({ eventType: "EngineUnavailable", aggregateType: "engine_registry", aggregateId: row.id, sourceRef: "capability-registry", occurredAt: new Date(), payload: { engineId, reason } }); }
  return row ?? null;
}
export async function markStaleEngines(maxAgeSeconds = 180) {
  const cutoff = new Date(Date.now() - maxAgeSeconds * 1000);
  const stale = await db.select().from(engineRegistry).where(lt(engineRegistry.lastHeartbeat, cutoff));
  for (const engine of stale) await markUnavailable(engine.engineId, `Heartbeat missed for more than ${maxAgeSeconds} seconds.`);
  return stale.length;
}