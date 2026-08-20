import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { contextPacket, db, eventLog } from "@workspace/db";
import { constructContextPacket, DEFAULT_WEIGHTS, type SelectedContext } from "./context-economy";
import { founderContext } from "./founder-identity";
import { applyLearning } from "./learning";
import { queryEngine } from "./query-engine";
import { checkPolicy } from "./policy";

export type ConversationMode = "normal" | "deep_think" | "build" | "write" | "review" | "pilot" | "low_cost" | "private" | "no_model" | "governed_action";

export async function buildContextPacket(query: string, mode: ConversationMode, budgetTokens = 3000, intent?: { id?: string; intentType?: string; retrievalMode?: string }) {
  const retrievalFilters = intent?.retrievalMode === "semantic" ? { text: query } : {};
  const retrievalPurpose = intent?.retrievalMode === "semantic" ? "discovery" : "context_assembly";
  const [objectResults, factResults, interpretationResults, waiting, eventResults, founder, trust, objectives, learningRules, constitution, assumptions] = await Promise.all([
    queryEngine.query({ sources: ["universal_objects"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 40, requester: "Context Engine", purpose: retrievalPurpose }),
    queryEngine.query({ sources: ["facts"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 30, requester: "Context Engine", purpose: retrievalPurpose }),
    queryEngine.query({ sources: ["interpretations"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    queryEngine.query({ sources: ["waiting_loops"], filters: { status: "open" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    queryEngine.query({ sources: ["events"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    founderContext(),
    queryEngine.query({ sources: ["trust_scores"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 200, requester: "Context Engine", purpose: retrievalPurpose }),
    queryEngine.query({ sources: ["strategic_objectives"], filters: { status: "active" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 12, requester: "Context Engine", purpose: retrievalPurpose }),
    applyLearning(query),
    queryEngine.query({ sources: ["constitution"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    queryEngine.query({ sources: ["assumptions"], filters: { status: "active" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
  ]);
  const objects = objectResults.map((item) => item.object as any);
  const facts = factResults.map((item) => item.object as any);
  const interpretations = interpretationResults.map((item) => item.object as any);
  const events = eventResults.map((item) => item.object as any);
  const queryText = query.toLowerCase();
  const privacyAllowed = await Promise.all(objects.map(async (item) => ({ item, policy: await checkPolicy("privacy", "context_include", { objectType: item.objectType, sourceType: item.sourceType }, "Context Engine") })));
  const excludedByPolicy = privacyAllowed.filter((entry) => !entry.policy.permitted).map((entry) => entry.item.id);
  const memoryItems = privacyAllowed.filter((entry) => entry.policy.permitted).map((entry) => entry.item).filter((item) => !["archived", "dormant"].includes(item.memoryTier) || `${item.name} ${item.description ?? ""}`.toLowerCase().includes(queryText));
  const items = [
    ...memoryItems.map((item) => {
      const record = item as any;
      const protectedTier = ["canonical", "evergreen", "foundational", "working"].includes(record.memoryTier);
      const text = record.compressionStage >= 2 && record.memorySummary ? `${record.name ?? "Semantic result"}: ${JSON.stringify(record.memorySummary)}` : `${record.name ?? "Semantic result"}: ${record.description ?? record.status ?? record.excerpt ?? ""}`;
      const updatedAt = record.updatedAt ?? record.createdAt ?? new Date();
      return { id: record.id, text, kind: record.objectType ?? "semantic", confidence: record.propagatedConfidence ?? record.confidence ?? record.similarityScore ?? 0.5, recencyDays: Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 86400000), strategicAnchor: protectedTier, memoryTier: record.memoryTier, ageState: record.ageState };
    }),
    ...facts.map((item) => ({ id: item.id, text: `Fact · ${item.subject} ${item.predicate} ${item.object} [${item.factType}]`, kind: "fact", confidence: item.propagatedConfidence ?? item.confidence, recencyDays: Math.max(0, item.updatedAt ? (Date.now() - new Date(item.updatedAt).getTime()) / 86400000 : 0), strategicAnchor: item.canonLevel === "canonical", ageState: item.ageState })),
    ...interpretations.map((item) => ({ id: item.id, text: `Interpretation · ${item.statement} [${item.interpretationType}]`, kind: "interpretation", confidence: item.propagatedConfidence ?? item.confidence, recencyDays: Math.max(0, item.updatedAt ? (Date.now() - new Date(item.updatedAt).getTime()) / 86400000 : 0), strategicAnchor: item.canonLevel === "canonical", ageState: item.ageState })),
    ...waiting.map((item) => ({ id: item.id, text: `Waiting: ${item.subject} (${item.owner ?? "unassigned"})`, kind: "waiting", confidence: 0.8, recencyDays: Math.max(0, (Date.now() - new Date(item.updatedAt).getTime()) / 86400000), strategicAnchor: false })),
    ...events.map((item) => { const record = item as any; const occurredAt = record.occurredAt ?? record.createdAt ?? new Date(); return { id: record.id, text: `${record.eventType ?? "Semantic result"}: ${JSON.stringify(record.payload ?? record.excerpt ?? "")}`, kind: "event", confidence: record.confidence ?? record.similarityScore ?? 0.7, recencyDays: Math.max(0, (Date.now() - new Date(occurredAt).getTime()) / 86400000), strategicAnchor: false }; }),
    ...Object.entries(founder).map(([dimension, record]: [string, any]) => ({ id: `founder-${dimension}`, text: `Founder preference · ${dimension}: ${JSON.stringify(record.value)}`, kind: "founder_profile", confidence: record.confidence === "confirmed" ? 1 : 0.85, recencyDays: 0, strategicAnchor: true })),
    ...objectives.map((item) => ({ id: item.id, text: `Strategy objective · ${item.horizon}: ${item.objective}. Blockers: ${item.blockers.join(", ") || "none"}`, kind: "strategy", confidence: 0.9, recencyDays: 0, strategicAnchor: true })),
    ...learningRules.map((rule) => ({ id: `learning-${rule.id}`, text: `Standing correction rule · ${rule.category}: ${rule.correction}`, kind: "learning_rule", confidence: 0.9, recencyDays: 0, strategicAnchor: true })),
    ...constitution.map((item) => ({ id: `constitution-${item.id}`, text: `Constitution · ${item.title}: ${String(item.machineReadableRule.ruleText ?? item.title)}`, kind: "constitution", confidence: 1, recencyDays: 0, strategicAnchor: true })),
    ...assumptions.map((item) => ({ id: `assumption-${item.id}`, text: `Assumption · ${item.statement}`, kind: "assumption", confidence: item.confidence, recencyDays: 0, strategicAnchor: false })),
  ];
  const fingerprint = createHash("sha256").update(JSON.stringify({ query: query.trim().toLowerCase(), mode, ids: items.map((item) => item.id) })).digest("hex");
  const [cached] = await db.select().from(contextPacket).where(eq(contextPacket.fingerprint, fingerprint)).orderBy(desc(contextPacket.createdAt)).limit(1);
  const trustScoreValue = trust.length ? Math.round(trust.reduce((sum, item) => sum + Number((item.object as any).score ?? 50), 0) / trust.length) : 50;
  const trustAdvisory = { subsystem: "Context Engine", score: trustScoreValue, lowTrust: trustScoreValue < 60 };
  if (cached && cached.expiresAt > new Date()) return { id: cached.id, fingerprint, reused: true, items: (cached.packet.items as SelectedContext[]) ?? [], excluded: (cached.packet.excluded as SelectedContext[]) ?? [], tokens: cached.tokenEstimate, excludedRefs: cached.excludedRefs, trustAdvisory };
  const weightsResult = await checkPolicy("context_economy", "weights", {}, "Context Engine");
  const configured = (weightsResult.value as any)?.[intent?.intentType ?? "defaults"];
  const weights = configured && typeof configured === "object" ? { ...DEFAULT_WEIGHTS, ...configured } : DEFAULT_WEIGHTS;
  const goalMatches = new Map(items.map((item: any) => [item.id, Number(item.similarityScore ?? item.similarity ?? NaN)]));
  const contextItems = items.map((item: any) => ({ ...item, goalMatch: Number.isFinite(goalMatches.get(item.id)) ? goalMatches.get(item.id) : undefined, trust: Math.max(0, Math.min(1, trustScoreValue / 100)), modeRelevance: mode === "deep_think" && /strategy|project|decision/.test(item.kind) ? 1 : mode === "build" && /project|task|decision/.test(item.kind) ? 0.9 : 0.5 }));
  const selected = constructContextPacket(query, contextItems, budgetTokens, weights, intent?.id);
  const excludedRefs = [...new Set([...excludedByPolicy, ...selected.excluded.map((item) => item.id)])];
  const excluded = [...selected.excluded, ...items.filter((item) => excludedByPolicy.includes(item.id)).map((item: any) => ({ ...item, score: 0, contextValueScore: 0, factorBreakdown: {}, estimatedTokens: 0, exclusionReason: "Excluded by Privacy Policy." }))];
  return { id: null, fingerprint, reused: false, items: selected.items, excluded, tokens: selected.tokens, excludedRefs, trustAdvisory };
}