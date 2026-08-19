import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { z } from "zod";
import { assumptionLedger, db, eventLog, factLedger, interpretationLedger, queryCache, queryLog, universalObject } from "@workspace/db";
import { checkConstitution } from "./constitution";
export const querySpecSchema = z.object({
  sources: z.array(z.enum(["universal_objects", "facts", "interpretations", "assumptions", "events"])).min(1),
  filters: z.object({ objectType: z.string().optional(), status: z.string().optional(), start: z.coerce.date().optional(), end: z.coerce.date().optional(), project: z.string().optional(), person: z.string().optional(), memoryTier: z.string().optional(), text: z.string().optional() }).default({}),
  rankingPolicy: z.enum(["balanced", "brief_generation", "strategy_evaluation", "curiosity_scan", "context_assembly"]).default("balanced"),
  confidenceThreshold: z.number().min(0).max(1).default(0),
  limit: z.number().int().min(1).max(200).default(50),
  requester: z.string().min(1),
  purpose: z.string().min(1),
});
export type QuerySpec = z.infer<typeof querySpecSchema>;
export type StandardQueryResult = { object_id: string; object_type: string; object: unknown; confidence: number; propagated_confidence: number; why_included: Record<string, number>; source_refs: string[]; memory_tier: string | null; age_score: number; importance_score: number };
const TTL: Record<string, number> = { brief_generation: 300, context_assembly: 300, strategy_evaluation: 60, curiosity_scan: 900 };
function cacheKey(spec: QuerySpec) { return createHash("sha256").update(JSON.stringify(spec, (_, value) => value instanceof Date ? value.toISOString() : value)).digest("hex"); }
function rank(object: any, type: string, spec: QuerySpec): StandardQueryResult {
  const date = object.updatedAt ?? object.createdAt ?? object.occurredAt ?? new Date(); const age = Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000); const freshness = 1 / (1 + age / 30); const confidence = Number(object.propagatedConfidence ?? object.confidence ?? 0.5); const importance = Math.min(1, Number(object.priority ?? object.importance ?? 0.5) / 10 + 0.5); const relevance = spec.filters.text ? JSON.stringify(object).toLowerCase().includes(spec.filters.text.toLowerCase()) ? 1 : 0.15 : 0.5; const recencyWeight = spec.rankingPolicy === "brief_generation" ? 1.3 : spec.rankingPolicy === "strategy_evaluation" ? 0.7 : 1; const score = importance * Math.pow(freshness, recencyWeight) * confidence * relevance;
  return { object_id: String(object.id), object_type: type, object, confidence, propagated_confidence: Math.max(0, Math.min(1, confidence * (0.85 + relevance * 0.15))), why_included: { importance, freshness, confidence, relevance, base_score: score }, source_refs: [object.sourceRef, ...(object.sourceRefs ?? [])].filter(Boolean), memory_tier: object.memoryTier ?? null, age_score: freshness, importance_score: importance };
}
export class QueryEngine {
  async query(input: unknown): Promise<StandardQueryResult[]> {
    const spec = querySpecSchema.parse(input); const started = Date.now(); const auth = await checkConstitution("data_retrieval", { requester: spec.requester, sources: spec.sources }, spec.requester); if (!auth.permitted) throw new Error("Query denied by Constitution.");
    const key = cacheKey(spec); const ttl = TTL[spec.purpose] ?? 120; const [cached] = await db.select().from(queryCache).where(eq(queryCache.cacheKey, key)).limit(1); let results: StandardQueryResult[]; let hit = false;
    if (cached && !cached.invalidatedAt && cached.cachedAt.getTime() + cached.ttlSeconds * 1000 > Date.now()) { results = cached.result as StandardQueryResult[]; hit = true; } else {
      const f = spec.filters; const date = (field: any) => [f.start ? gte(field, f.start) : undefined, f.end ? lte(field, f.end) : undefined].filter(Boolean);
      const rows: StandardQueryResult[] = [];
      if (spec.sources.includes("universal_objects")) {
        const conditions = [...date(universalObject.updatedAt), f.objectType ? eq(universalObject.objectType, f.objectType) : undefined, f.status ? eq(universalObject.status, f.status) : undefined, f.memoryTier ? eq(universalObject.memoryTier, f.memoryTier) : undefined, f.text ? or(ilike(universalObject.name, `%${f.text}%`), ilike(universalObject.description, `%${f.text}%`)) : undefined].filter(Boolean) as any[];
        rows.push(...(await db.select().from(universalObject).where(conditions.length ? and(...conditions) : undefined).limit(spec.limit)).map((row) => rank(row, "universal_object", spec)));
      }
      if (spec.sources.includes("facts")) rows.push(...(await db.select().from(factLedger).where(and(...date(factLedger.updatedAt), f.status ? eq(factLedger.status, f.status) : undefined)).limit(spec.limit)).map((row) => rank(row, "fact", spec)));
      if (spec.sources.includes("interpretations")) rows.push(...(await db.select().from(interpretationLedger).where(and(...date(interpretationLedger.updatedAt), f.status ? eq(interpretationLedger.status, f.status) : undefined)).limit(spec.limit)).map((row) => rank(row, "interpretation", spec)));
      if (spec.sources.includes("assumptions")) rows.push(...(await db.select().from(assumptionLedger).where(f.status ? eq(assumptionLedger.status, f.status) : undefined).limit(spec.limit)).map((row) => rank(row, "assumption", spec)));
      if (spec.sources.includes("events")) {
        const conditions = [...date(eventLog.occurredAt), f.text ? ilike(eventLog.eventType, `%${f.text}%`) : undefined].filter(Boolean) as any[];
        rows.push(...(await db.select().from(eventLog).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(eventLog.occurredAt)).limit(spec.limit)).map((row) => rank(row, "event", spec)));
      }
      results = rows.filter((item) => item.confidence >= spec.confidenceThreshold).sort((a, b) => b.why_included.base_score - a.why_included.base_score).slice(0, spec.limit);
      await db.insert(queryCache).values({ cacheKey: key, result: results, ttlSeconds: ttl, cachedAt: new Date(), invalidatedAt: null }).onConflictDoUpdate({ target: queryCache.cacheKey, set: { result: results, cachedAt: new Date(), ttlSeconds: ttl, invalidatedAt: null } });
    }
    await db.insert(queryLog).values({ queryId: randomUUID(), requesterEngine: spec.requester, purpose: spec.purpose, sources: spec.sources, filterSpec: spec.filters, rankingPolicy: spec.rankingPolicy, resultCount: results.length, cacheHit: hit, executionMs: Date.now() - started });
    await db.insert(eventLog).values({ eventType: "QueryExecuted", aggregateType: "query", aggregateId: randomUUID(), sourceRef: "query-engine", occurredAt: new Date(), payload: { requester: spec.requester, purpose: spec.purpose, sources: spec.sources, resultCount: results.length, cacheHit: hit, executionMs: Date.now() - started } });
    return results;
  }
}
export const queryEngine = new QueryEngine();