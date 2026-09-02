import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import {
  assumptionLedger,
  behavioralSignal,
  bootstrapRun,
  constitutionProvision,
  db,
  eventLog,
  factLedger,
  interpretationLedger,
  institutionalKnowledgeLedger,
  initiativeItem,
  opportunity,
  operationalPattern,
  person,
  queryCache,
  queryLog,
  strategicAnchor,
  strategicObjective,
  trustScore,
  universalObject,
  waitingLoop,
} from "@workspace/db";
import { checkConstitution } from "./constitution";
import { searchSemantic } from "./semantic-index";

const sourceNames = [
  "universal_objects", "facts", "interpretations", "assumptions", "events",
  "waiting_loops", "strategic_objectives", "constitution", "trust_scores",
  "operational_patterns", "behavioral_signals", "institutional_knowledge",
    "initiatives", "bootstrap_runs", "opportunities", "strategic_anchors", "people",
] as const;

export const querySpecSchema = z.object({
  sources: z.array(z.enum(sourceNames)).min(1),
  filters: z.object({
    objectType: z.string().optional(), status: z.string().optional(),
    start: z.coerce.date().optional(), end: z.coerce.date().optional(),
    project: z.string().optional(), person: z.string().optional(),
    memoryTier: z.string().optional(), lifecycle: z.string().optional(),
    active: z.boolean().optional(), text: z.string().optional(),
  }).default({}),
  rankingPolicy: z.enum(["balanced", "brief_generation", "strategy_evaluation", "curiosity_scan", "context_assembly"]).default("balanced"),
  confidenceThreshold: z.number().min(0).max(1).default(0),
  limit: z.number().int().min(1).max(200).default(50),
  requester: z.string().min(1),
  purpose: z.string().min(1),
});
export type QuerySpec = z.infer<typeof querySpecSchema>;
export type StandardQueryResult = {
  object_id: string; object_type: string; object: unknown; confidence: number;
  propagated_confidence: number; why_included: Record<string, number | string>;
  source_refs: string[]; memory_tier: string | null; age_score: number;
  importance_score: number;
  evidence: {
    source: string;
    epistemic_type: "fact" | "interpretation" | "assumption" | "event" | "operational" | "policy" | "identity";
    authorization: "constitution";
    freshness: number;
    trust: number;
  };
};

const TTL: Record<string, number> = {
  brief_generation: 300, context_assembly: 300, strategy_evaluation: 60, curiosity_scan: 900,
};
const sourceTable = {
  universal_objects: [universalObject, "universal_object"],
  facts: [factLedger, "fact"],
  interpretations: [interpretationLedger, "interpretation"],
  assumptions: [assumptionLedger, "assumption"],
  events: [eventLog, "event"],
  waiting_loops: [waitingLoop, "waiting_loop"],
  strategic_objectives: [strategicObjective, "strategic_objective"],
  constitution: [constitutionProvision, "constitution"],
  trust_scores: [trustScore, "trust_score"],
  operational_patterns: [operationalPattern, "operational_pattern"],
  behavioral_signals: [behavioralSignal, "behavioral_signal"],
  institutional_knowledge: [institutionalKnowledgeLedger, "institutional_knowledge"],
  initiatives: [initiativeItem, "initiative"],
  bootstrap_runs: [bootstrapRun, "bootstrap_run"],
  opportunities: [opportunity, "opportunity"],
  strategic_anchors: [strategicAnchor, "strategic_anchor"],
  people: [person, "person"],
} as const;

function cacheKey(spec: QuerySpec) {
  return createHash("sha256").update(JSON.stringify(spec, (_, value) => value instanceof Date ? value.toISOString() : value)).digest("hex");
}
function epistemicType(type: string): StandardQueryResult["evidence"]["epistemic_type"] {
  if (type === "fact") return "fact";
  if (type === "interpretation" || type === "institutional_knowledge") return "interpretation";
  if (type === "assumption") return "assumption";
  if (type === "event") return "event";
  if (type === "constitution" || type === "strategic_objective" || type === "strategic_anchor") return "policy";
  if (type === "person" || type === "trust_score") return "identity";
  return "operational";
}
function rank(object: any, type: string, source: string, spec: QuerySpec): StandardQueryResult {
  const date = object.updatedAt ?? object.createdAt ?? object.occurredAt ?? object.lastUpdated ?? new Date();
  const age = Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
  const freshness = 1 / (1 + age / 30);
  const confidence = Math.max(0, Math.min(1, Number(object.propagatedConfidence ?? object.confidence ?? 0.5)));
  const importance = Math.min(1, Number(object.priority ?? object.importance ?? 0.5) / 10 + 0.5);
  const relevance = spec.filters.text
    ? JSON.stringify(object).toLowerCase().includes(spec.filters.text.toLowerCase()) ? 1 : 0.15
    : 0.5;
  const trust = Math.max(0, Math.min(1, Number(object.trust ?? object.trustScore ?? 0.5)));
  const recencyWeight = spec.rankingPolicy === "brief_generation" ? 1.3 : spec.rankingPolicy === "strategy_evaluation" ? 0.7 : 1;
  const score = importance * Math.pow(freshness, recencyWeight) * confidence * relevance;
  return {
    object_id: String(object.id), object_type: type, object, confidence,
    propagated_confidence: Math.max(0, Math.min(1, confidence * (0.85 + relevance * 0.15))),
    why_included: { importance, freshness, confidence, relevance, trust, base_score: score },
    source_refs: [object.sourceRef, ...(object.sourceRefs ?? object.evidenceRefs ?? [])].filter(Boolean),
    memory_tier: object.memoryTier ?? null, age_score: freshness, importance_score: importance,
    evidence: { source, epistemic_type: epistemicType(type), authorization: "constitution", freshness, trust },
  };
}

export class QueryEngine {
  async query(input: unknown): Promise<StandardQueryResult[]> {
    const spec = querySpecSchema.parse(input);
    const started = Date.now();
    const auth = await checkConstitution("data_retrieval", { requester: spec.requester, sources: spec.sources }, spec.requester);
    if (!auth.permitted) throw new Error("Query denied by Constitution.");
    const key = cacheKey(spec);
    const ttl = TTL[spec.purpose] ?? 120;
    const [cached] = await db.select().from(queryCache).where(eq(queryCache.cacheKey, key)).limit(1);
    let results: StandardQueryResult[];
    let hit = false;
    if (cached && !cached.invalidatedAt && cached.cachedAt.getTime() + cached.ttlSeconds * 1000 > Date.now()) {
      results = cached.result as StandardQueryResult[];
      hit = true;
    } else {
      const f = spec.filters;
      const rows: StandardQueryResult[] = [];
      for (const source of spec.sources) {
        const [table, type] = sourceTable[source];
        const columns = table as any;
        const dateColumn = columns.updatedAt ?? columns.occurredAt ?? columns.lastUpdated ?? columns.generatedAt ?? columns.computedAt ?? columns.createdAt;
        const conditions = [
          f.status && columns.status ? eq(columns.status, f.status) : undefined,
          f.objectType && columns.objectType ? eq(columns.objectType, f.objectType) : undefined,
          f.memoryTier && columns.memoryTier ? eq(columns.memoryTier, f.memoryTier) : undefined,
          f.lifecycle && columns.lifecycle ? eq(columns.lifecycle, f.lifecycle) : undefined,
          f.active !== undefined && columns.active ? eq(columns.active, f.active) : undefined,
          f.start && dateColumn ? gte(dateColumn, f.start) : undefined,
          f.end && dateColumn ? lte(dateColumn, f.end) : undefined,
        ].filter(Boolean) as any[];
        const baseQuery = db.select().from(table as any)
          .where(conditions.length ? and(...conditions) : undefined);
        const records = dateColumn
          ? await baseQuery.orderBy(desc(dateColumn)).limit(spec.limit)
          : await baseQuery.limit(spec.limit);
        rows.push(...records
          .filter((record: any) => !f.text || JSON.stringify(record).toLowerCase().includes(f.text.toLowerCase()))
          .map((record: any) => rank(record, type, source, spec)));
      }
      const structured = rows.filter((item) => item.confidence >= spec.confidenceThreshold);
      const semantic = spec.purpose === "discovery" && f.text
        ? await searchSemantic(f.text, { objectType: f.objectType, start: f.start, end: f.end }, spec.limit, spec.requester)
        : [];
      const semanticResults: StandardQueryResult[] = semantic.map((item) => ({
        object_id: item.object_id, object_type: item.object_type,
        object: { excerpt: item.excerpt, similarityScore: item.similarity_score },
        confidence: item.similarity_score, propagated_confidence: item.similarity_score,
        why_included: { importance: 0.5, freshness: 1, confidence: item.similarity_score, relevance: item.similarity_score, trust: 0.5, base_score: item.similarity_score },
        source_refs: [], memory_tier: null, age_score: 1, importance_score: 0.5,
        evidence: { source: "semantic-index", epistemic_type: epistemicType(item.object_type), authorization: "constitution", freshness: 1, trust: 0.5 },
      }));
      results = [...structured, ...semanticResults]
        .sort((a, b) => Number(b.why_included.base_score) - Number(a.why_included.base_score))
        .slice(0, spec.limit);
      await db.insert(queryCache).values({ cacheKey: key, result: results, ttlSeconds: ttl, cachedAt: new Date(), invalidatedAt: null })
        .onConflictDoUpdate({ target: queryCache.cacheKey, set: { result: results, cachedAt: new Date(), ttlSeconds: ttl, invalidatedAt: null } });
    }
    await db.insert(queryLog).values({
      queryId: randomUUID(), requesterEngine: spec.requester, purpose: spec.purpose,
      sources: spec.sources, filterSpec: spec.filters, rankingPolicy: spec.rankingPolicy,
      resultCount: results.length, cacheHit: hit, executionMs: Date.now() - started,
    });
    await db.insert(eventLog).values({
      eventType: "QueryExecuted", aggregateType: "query", aggregateId: randomUUID(),
      sourceRef: "query-engine", occurredAt: new Date(),
      payload: { requester: spec.requester, purpose: spec.purpose, sources: spec.sources, resultCount: results.length, cacheHit: hit, executionMs: Date.now() - started },
    });
    return results;
  }
}
export const queryEngine = new QueryEngine();
export async function invalidateQueryCache(source = "system") {
  await db.update(queryCache).set({ invalidatedAt: new Date() }).where(isNull(queryCache.invalidatedAt));
  return { invalidated: true, source };
}