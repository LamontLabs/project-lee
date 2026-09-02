import { createHash } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db, economicUsageRecord, eventLog, factLedger, interpretationLedger, semanticIndex, universalObject } from "@workspace/db";
import { enqueueWork } from "./orchestration";
import { checkConstitution } from "./constitution";
const DIMENSIONS = 64; const MODEL_VERSION = "local-hash-v1";
function vectorize(text: string) { const vector = Array.from({ length: DIMENSIONS }, () => 0); for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) { const digest = createHash("sha256").update(token).digest(); for (let i = 0; i < 4; i++) vector[digest[i] % DIMENSIONS] += (digest[i + 4] / 255) * (digest[i] % 2 ? -1 : 1); } const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1; return vector.map((value) => value / norm); }
function cosine(a: number[], b: number[]) { const length = Math.min(a.length, b.length); return length ? a.slice(0, length).reduce((sum, value, index) => sum + value * b[index], 0) : 0; }
async function sourceRecord(objectId: string, objectType: string) {
  if (objectType === "universal_object") return (await db.select().from(universalObject).where(eq(universalObject.id, objectId)).limit(1))[0];
  if (objectType === "fact") return (await db.select().from(factLedger).where(eq(factLedger.id, objectId)).limit(1))[0];
  if (objectType === "interpretation") return (await db.select().from(interpretationLedger).where(eq(interpretationLedger.id, objectId)).limit(1))[0];
  if (objectType === "event") return (await db.select().from(eventLog).where(eq(eventLog.id, objectId)).limit(1))[0];
  return undefined;
}
function representation(objectType: string, object: any) { return objectType === "fact" ? `${object.subject} ${object.predicate} ${object.object}` : objectType === "interpretation" ? object.statement : objectType === "event" ? `${object.eventType} ${JSON.stringify(object.payload)}` : `${object.name} ${object.description ?? ""} ${object.status ?? ""}`; }
export async function indexObject(objectId: string, objectType: string) {
  const auth = await checkConstitution("semantic_index_local_write", { objectId, objectType, modelVersion: MODEL_VERSION }, "Semantic Index"); if (!auth.permitted) throw new Error("Semantic indexing denied by Constitution.");
  const object = await sourceRecord(objectId, objectType); if (!object) return null; const record = object as any; const text = representation(objectType, record); const sourceUpdatedAt = objectType === "event" ? record.occurredAt : record.updatedAt ?? record.createdAt; const embedding = vectorize(text); const [row] = await db.insert(semanticIndex).values({ objectId, objectType, embedding, indexedAt: new Date(), sourceUpdatedAt, modelVersion: MODEL_VERSION, excerpt: text.slice(0, 500) }).onConflictDoUpdate({ target: [semanticIndex.objectId, semanticIndex.objectType], set: { embedding, indexedAt: new Date(), sourceUpdatedAt, modelVersion: MODEL_VERSION, excerpt: text.slice(0, 500) } }).returning(); await db.insert(economicUsageRecord).values({ operation: "embedding", category: "embedding", quantity: Buffer.byteLength(JSON.stringify(embedding), "utf8"), unit: "bytes", provider: "semantic-index-local", sourceRef: row.id, evidenceRef: `semantic_index:${row.id}`, metadata: { objectId, objectType, modelVersion: MODEL_VERSION }, recordedAt: row.indexedAt }); return row;
}
export async function queueIndex(objectId: string, objectType: string) { return enqueueWork({ engineName: "Semantic Index", action: "index_object", priority: "LOW", payload: { objectId, objectType, modelVersion: MODEL_VERSION } }); }
export async function searchSemantic(queryText: string, filters: { objectType?: string; start?: Date; end?: Date } = {}, topK = 10, requester = "unknown") {
  const auth = await checkConstitution("semantic_search_local", { requester }, requester); if (!auth.permitted) throw new Error("Semantic search denied by Constitution.");
  const queryVector = vectorize(queryText); const rows = await db.select().from(semanticIndex).where(filters.objectType ? eq(semanticIndex.objectType, filters.objectType) : undefined).orderBy(desc(semanticIndex.indexedAt)).limit(2000);
  const results = rows.filter((row) => (!filters.start || row.sourceUpdatedAt >= filters.start) && (!filters.end || row.sourceUpdatedAt <= filters.end)).map((row) => ({ object_id: row.objectId, object_type: row.objectType, similarity_score: Number(cosine(queryVector, row.embedding).toFixed(6)), excerpt: row.excerpt, indexed_at: row.indexedAt, model_version: row.modelVersion })).sort((a, b) => b.similarity_score - a.similarity_score).slice(0, topK);
  await db.insert(eventLog).values({ eventType: "SemanticSearchExecuted", aggregateType: "semantic_search", aggregateId: crypto.randomUUID(), sourceRef: "semantic-index", occurredAt: new Date(), payload: { requester, queryHash: createHash("sha256").update(queryText).digest("hex"), resultCount: results.length, topK } });
  return results;
}
export async function rebuildIndex() {
  await db.delete(semanticIndex); const [objects, facts, interpretations, events] = await Promise.all([db.select().from(universalObject), db.select().from(factLedger), db.select().from(interpretationLedger), db.select().from(eventLog).limit(5000)]); const records = [...objects.map((item) => ({ id: item.id, type: "universal_object" })), ...facts.map((item) => ({ id: item.id, type: "fact" })), ...interpretations.map((item) => ({ id: item.id, type: "interpretation" })), ...events.map((item) => ({ id: item.id, type: "event" }))]; for (const record of records) await indexObject(record.id, record.type); return { queued: records.length, modelVersion: MODEL_VERSION };
}
export async function freshness() { const stale = await db.select().from(semanticIndex).where(gt(sql`now() - ${semanticIndex.indexedAt}`, sql`interval '7 days'`)); const [total] = await db.select({ count: sql<number>`count(*)` }).from(semanticIndex); return { indexedCount: Number(total?.count ?? 0), staleCount: stale.length, modelVersion: MODEL_VERSION }; }