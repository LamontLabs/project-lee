import { and, asc, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { db, eventLog, universalObject } from "@workspace/db";
import { enqueueWork } from "./orchestration";

export const MEMORY_TIERS = ["recent", "working", "reference", "historical", "archived", "dormant", "evergreen", "foundational", "canonical"] as const;
type Tier = typeof MEMORY_TIERS[number];
const protectedTiers = new Set(["canonical", "evergreen", "foundational"]);
const activeStatuses = new Set(["active", "open", "in_progress", "pending", "working"]);

function automaticTier(object: typeof universalObject.$inferSelect): Tier {
  if (protectedTiers.has(object.memoryTier)) return object.memoryTier as Tier;
  if (object.canonLevel === "canonical") return "canonical";
  if (object.importance >= 0.95 && object.status === "active") return "evergreen";
  if (activeStatuses.has(object.status)) return object.memoryTier === "recent" ? "recent" : "working";
  const ageDays = (Date.now() - object.updatedAt.getTime()) / 86400000;
  if (ageDays <= 7) return "recent";
  if (ageDays <= 30 || object.accessCount >= 3) return "reference";
  if (ageDays <= 180) return "historical";
  if (object.accessCount > 0) return "archived";
  return "dormant";
}

export async function reclassifyMemory() {
  const objects = await db.select().from(universalObject);
  const changed: Array<{ id: string; from: string; to: string }> = [];
  for (const object of objects) {
    if (object.manualTierOverride) continue;
    const next = automaticTier(object);
    if (next === object.memoryTier) continue;
    await db.update(universalObject).set({ memoryTier: next, updatedAt: new Date() }).where(eq(universalObject.id, object.id));
    await db.insert(eventLog).values({ eventType: "MemoryTierChanged", aggregateType: "universal_object", aggregateId: object.id, sourceRef: "memory-architecture", occurredAt: new Date(), payload: { from: object.memoryTier, to: next, automatic: true } });
    changed.push({ id: object.id, from: object.memoryTier, to: next });
  }
  return changed;
}

export async function setMemoryTier(id: string, tier: string, reason: string) {
  if (!(MEMORY_TIERS as readonly string[]).includes(tier)) throw new Error(`Unknown memory tier: ${tier}`);
  const [object] = await db.select().from(universalObject).where(eq(universalObject.id, id)).limit(1);
  if (!object) return null;
  if (protectedTiers.has(object.memoryTier) && object.memoryTier !== tier) throw new Error(`${object.memoryTier} memory requires an owner-led reclassification path.`);
  const [updated] = await db.update(universalObject).set({ memoryTier: tier, manualTierOverride: true, updatedAt: new Date() }).where(eq(universalObject.id, id)).returning();
  await db.insert(eventLog).values({ eventType: "MemoryTierChanged", aggregateType: "universal_object", aggregateId: id, sourceRef: "owner-memory-control", occurredAt: new Date(), payload: { from: object.memoryTier, to: tier, automatic: false, reason } });
  return updated;
}

export async function touchMemory(id: string) {
  const [updated] = await db.update(universalObject).set({ lastAccessedAt: new Date(), accessCount: 1, updatedAt: new Date() }).where(eq(universalObject.id, id)).returning();
  return updated;
}

export async function consolidateHistorical() {
  const candidates = await db.select().from(universalObject).where(and(inArray(universalObject.memoryTier, ["historical", "archived"]), eq(universalObject.compressionStage, 1))).limit(25);
  const results = [];
  for (const object of candidates) {
    const summary = { entity_list: [object.name, object.objectType], key_decisions: [], key_facts: [object.description ?? object.name], original_object_ids: [object.id], compression_stage: 2, source_confidence: object.propagatedConfidence ?? object.confidence };
    const beforeSize = JSON.stringify(object).length; const afterSize = JSON.stringify(summary).length;
    const [updated] = await db.update(universalObject).set({ memorySummary: summary, keyEntities: [object.name, object.objectType], compressionStage: 2, consolidatedAt: new Date(), updatedAt: new Date() }).where(eq(universalObject.id, object.id)).returning();
    await db.insert(eventLog).values({ eventType: "MemoryConsolidated", aggregateType: "universal_object", aggregateId: object.id, sourceRef: "memory-compression-stage-2", occurredAt: new Date(), payload: { beforeSize, afterSize, compressionStage: 2, originalObjectIds: [object.id] } });
    results.push(updated);
  }
  return results;
}

export async function memoryStatus() {
  const objects = await db.select().from(universalObject);
  const distribution = Object.fromEntries(MEMORY_TIERS.map((tier) => [tier, objects.filter((object) => object.memoryTier === tier).length]));
  return { distribution, total: objects.length, consolidationBacklog: objects.filter((object) => ["historical", "archived"].includes(object.memoryTier) && object.compressionStage < 2).length, dormantCount: distribution.dormant ?? 0, stage2Coverage: objects.length ? objects.filter((object) => object.compressionStage >= 2).length / objects.length : 1, roadmap: [{ stage: 1, name: "Full storage", status: "implemented" }, { stage: 2, name: "Summaries", status: "implemented" }, { stage: 3, name: "Hierarchical summaries", status: "planned" }, { stage: 4, name: "Concept maps", status: "planned" }, { stage: 5, name: "Knowledge graph compression", status: "planned" }, { stage: 6, name: "Long-term semantic memory", status: "planned" }] };
}

export async function enqueueMemoryMaintenance() {
  return enqueueWork({ engineName: "Memory Architecture Engine", action: "reclassify_and_consolidate", priority: "LOW", payload: { stages: [1, 2] } });
}