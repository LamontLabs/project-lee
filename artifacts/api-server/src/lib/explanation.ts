import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, explanationAudienceProfile, interpretationLedger, queryCache } from "@workspace/db";
import { queryEngine, type StandardQueryResult } from "./query-engine";
import { recordProvenance } from "./provenance";
import { WhyChainBuilder } from "./why-chain";
import { checkConstitution } from "./constitution";
const PROFILES = {
  Developer: { vocabularyLevel: "technical", depth: "deep", tone: "precise", emphasis: ["mechanics", "architecture", "trade-offs"], sentenceLength: "detailed" },
  Investor: { vocabularyLevel: "business", depth: "medium", tone: "forward-looking", emphasis: ["outcomes", "risk", "opportunity"], sentenceLength: "concise" },
  Founder: { vocabularyLevel: "operational", depth: "deep", tone: "direct", emphasis: ["decisions", "constraints", "next moves"], sentenceLength: "direct" },
  Executive: { vocabularyLevel: "plain-business", depth: "summary", tone: "action-oriented", emphasis: ["consequences", "actions", "risks"], sentenceLength: "concise" },
  Legal: { vocabularyLevel: "precise", depth: "deep", tone: "hedged", emphasis: ["implications", "boundaries", "uncertainty"], sentenceLength: "careful" },
  Technical: { vocabularyLevel: "technical", depth: "deep", tone: "precise", emphasis: ["implementation", "behavior", "trade-offs"], sentenceLength: "detailed" },
  General: { vocabularyLevel: "plain", depth: "accessible", tone: "clear", emphasis: ["meaning", "context"], sentenceLength: "short" },
} as const;
export type AudienceProfile = keyof typeof PROFILES;
export const audienceProfiles = PROFILES;
function cacheKey(objectId: string, explanationType: string, audience: AudienceProfile) { return `explanation:${createHash("sha256").update(`${objectId}:${explanationType}:${audience}`).digest("hex")}`; }
function headline(object: any, type: string) { return `${type.replaceAll("_", " ")}: ${object?.name ?? object?.statement ?? object?.title ?? object?.subject ?? "Lee record"}`; }
function render(object: any, facts: StandardQueryResult[], audience: AudienceProfile, type: string) {
  const profile = PROFILES[audience]; const label = object?.name ?? object?.statement ?? object?.title ?? object?.subject ?? "This Lee record"; const evidence = facts.slice(0, 5).map((item) => String((item.object as any)?.statement ?? (item.object as any)?.name ?? (item.object as any)?.subject ?? item.object_type)).join("; ");
  const emphasis = profile.emphasis.join(", ");
  return `${label} is explained for a ${audience.toLowerCase()} audience with ${profile.depth} depth. The explanation emphasizes ${emphasis}. ${evidence ? `Source-backed context: ${evidence}.` : "No additional source-backed context was found."} The practical implication is to treat this as a ${type.replaceAll("_", " ")} with confidence ${Math.round((facts[0]?.propagated_confidence ?? 0.6) * 100)}% and verify important claims before acting.`;
}
export async function ensureAudienceProfiles() {
  for (const [name, profile] of Object.entries(PROFILES)) await db.insert(explanationAudienceProfile).values({ name, vocabularyLevel: profile.vocabularyLevel, depth: profile.depth, tone: profile.tone, emphasis: [...profile.emphasis], sentenceLengthPreference: profile.sentenceLength }).onConflictDoUpdate({ target: explanationAudienceProfile.name, set: { vocabularyLevel: profile.vocabularyLevel, depth: profile.depth, tone: profile.tone, emphasis: [...profile.emphasis], sentenceLengthPreference: profile.sentenceLength } });
}
export async function explain(input: { objectId: string; explanationType: string; audienceProfile?: AudienceProfile; requester?: string }) {
  await ensureAudienceProfiles(); const audience = input.audienceProfile ?? "Founder"; const auth = await checkConstitution("data_retrieval", { requester: input.requester ?? "Explanation Engine", sources: ["universal_objects", "facts", "interpretations"] }, "Explanation Engine"); if (!auth.permitted) throw new Error("Explanation retrieval denied by Constitution.");
  const key = cacheKey(input.objectId, input.explanationType, audience); const [cached] = await db.select().from(queryCache).where(eq(queryCache.cacheKey, key)).limit(1);
  if (cached && !cached.invalidatedAt && cached.cachedAt.getTime() + cached.ttlSeconds * 1000 > Date.now()) return (cached.result as any[])[0];
  const [objects, facts, interpretations] = await Promise.all([
    queryEngine.query({ sources: ["universal_objects"], filters: {}, rankingPolicy: "balanced", confidenceThreshold: 0, limit: 200, requester: "Explanation Engine", purpose: "explanation_assembly" }),
    queryEngine.query({ sources: ["facts"], filters: {}, rankingPolicy: "balanced", confidenceThreshold: 0, limit: 50, requester: "Explanation Engine", purpose: "explanation_assembly" }),
    queryEngine.query({ sources: ["interpretations"], filters: {}, rankingPolicy: "balanced", confidenceThreshold: 0, limit: 50, requester: "Explanation Engine", purpose: "explanation_assembly" }).catch(() => []),
  ]);
  const source = objects.find((item) => item.object_id === input.objectId) ?? interpretations.find((item) => item.object_id === input.objectId) ?? facts.find((item) => item.object_id === input.objectId);
  if (!source) throw new Error("Explanation target was not found.");
  const supporting = [source, ...facts.slice(0, 5), ...interpretations.slice(0, 3)]; const object = source.object as any; const profile = PROFILES[audience]; const statement = render(object, supporting, audience, input.explanationType); const whyChain = new WhyChainBuilder().addStep("fact_confirmed", "Source-backed records were selected from Query Engine results.", 0.8, "Explanation Engine", supporting[0]?.object_id).addStep("strategy_alignment", `Audience profile ${audience} was applied for ${profile.emphasis.join(", ")}.`, 0.9, "Explanation Engine").buildNonTrivial(); const brief = { headline: headline(object, input.explanationType), keyFacts: supporting.slice(0, 5).map((item) => item.object_id), audienceProfile: audience, explanationType: input.explanationType, confidence: source.propagated_confidence };
  const [saved] = await db.insert(interpretationLedger).values({ statement, interpretationType: "explanation", inputFacts: supporting.filter((item) => item.object_type === "fact").map((item) => item.object_id), inputInterpretations: supporting.filter((item) => item.object_type === "interpretation").map((item) => item.object_id), basis: source.object_id, sourceRef: source.source_refs[0] ?? source.object_id, confidence: source.confidence, propagatedConfidence: source.propagated_confidence, confidenceLineage: { engine: "Explanation Engine", audience, factors: source.why_included }, whyChain, generatedByEngine: "Explanation Engine", generatedBy: { engineId: "Explanation Engine", audience, explanationType: input.explanationType }, validFrom: new Date(), status: "active", canonLevel: "working", needsReview: false, audienceProfile: audience, explanationType: input.explanationType, sourceObjectIds: supporting.map((item) => item.object_id), explanationBrief: { ...brief, whyChain } }).returning();
  await recordProvenance("explanation", saved.id, supporting.flatMap((item) => item.source_refs).slice(0, 20), saved.confidence);
  const result = { id: saved.id, statement: saved.statement, audienceProfile: audience, explanationType: input.explanationType, confidence: saved.propagatedConfidence ?? saved.confidence, sourceObjectIds: supporting.map((item) => item.object_id), whyChain, brief };
  await db.insert(queryCache).values({ cacheKey: key, result: [result], ttlSeconds: 300, cachedAt: new Date(), invalidatedAt: null }).onConflictDoUpdate({ target: queryCache.cacheKey, set: { result: [result], cachedAt: new Date(), invalidatedAt: null } });
  return result;
}