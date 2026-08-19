import { createHash } from "node:crypto";
import { avg, desc, eq } from "drizzle-orm";
import { assumptionLedger, contextPacket, db, eventLog, factLedger, interpretationLedger, universalObject, waitingLoop, trustScore, strategicObjective, constitutionProvision } from "@workspace/db";
import { constructContextPacket, type SelectedContext } from "./context-economy";
import { founderContext } from "./founder-identity";
import { applyLearning } from "./learning";
import { queryEngine } from "./query-engine";
import { checkPolicy } from "./policy";

export type ConversationMode = "normal" | "deep_think" | "build" | "write" | "review" | "pilot" | "low_cost" | "private" | "no_model" | "governed_action";

export async function buildContextPacket(query: string, mode: ConversationMode, budgetTokens = 3000) {
  const [objectResults, factResults, interpretationResults, waiting, eventResults, founder, trust, objectives, learningRules, constitution, assumptions] = await Promise.all([
    queryEngine.query({ sources: ["universal_objects"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 40, requester: "Context Engine", purpose: "context_assembly" }),
    queryEngine.query({ sources: ["facts"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 30, requester: "Context Engine", purpose: "context_assembly" }),
    queryEngine.query({ sources: ["interpretations"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: "context_assembly" }),
    db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).limit(20),
    queryEngine.query({ sources: ["events"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: "context_assembly" }),
    founderContext(),
    db.select({ score: avg(trustScore.score) }).from(trustScore),
    db.select().from(strategicObjective).where(eq(strategicObjective.status, "active")).limit(12),
    applyLearning(query),
    db.select().from(constitutionProvision).where(eq(constitutionProvision.active, true)).limit(20),
    db.select().from(assumptionLedger).where(eq(assumptionLedger.status, "active")).limit(20),
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
      const protectedTier = ["canonical", "evergreen", "foundational", "working"].includes(item.memoryTier);
      const text = item.compressionStage >= 2 && item.memorySummary ? `${item.name}: ${JSON.stringify(item.memorySummary)}` : `${item.name}: ${item.description ?? item.status}`;
      return { id: item.id, text, kind: item.objectType, confidence: item.propagatedConfidence ?? item.confidence, recencyDays: Math.max(0, (Date.now() - item.updatedAt.getTime()) / 86400000), strategicAnchor: protectedTier, memoryTier: item.memoryTier };
    }),
    ...facts.map((item) => ({ id: item.id, text: `Fact · ${item.subject} ${item.predicate} ${item.object} [${item.factType}]`, kind: "fact", confidence: item.propagatedConfidence ?? item.confidence, recencyDays: Math.max(0, item.updatedAt ? (Date.now() - item.updatedAt.getTime()) / 86400000 : 0), strategicAnchor: item.canonLevel === "canonical" })),
    ...interpretations.map((item) => ({ id: item.id, text: `Interpretation · ${item.statement} [${item.interpretationType}]`, kind: "interpretation", confidence: item.propagatedConfidence ?? item.confidence, recencyDays: Math.max(0, item.updatedAt ? (Date.now() - item.updatedAt.getTime()) / 86400000 : 0), strategicAnchor: item.canonLevel === "canonical" })),
    ...waiting.map((item) => ({ id: item.id, text: `Waiting: ${item.subject} (${item.owner ?? "unassigned"})`, kind: "waiting", confidence: 0.8, recencyDays: Math.max(0, (Date.now() - item.updatedAt.getTime()) / 86400000), strategicAnchor: false })),
    ...events.map((item) => ({ id: item.id, text: `${item.eventType}: ${JSON.stringify(item.payload)}`, kind: "event", confidence: 0.7, recencyDays: Math.max(0, (Date.now() - item.occurredAt.getTime()) / 86400000), strategicAnchor: false })),
    ...Object.entries(founder).map(([dimension, record]: [string, any]) => ({ id: `founder-${dimension}`, text: `Founder preference · ${dimension}: ${JSON.stringify(record.value)}`, kind: "founder_profile", confidence: record.confidence === "confirmed" ? 1 : 0.85, recencyDays: 0, strategicAnchor: true })),
    ...objectives.map((item) => ({ id: item.id, text: `Strategy objective · ${item.horizon}: ${item.objective}. Blockers: ${item.blockers.join(", ") || "none"}`, kind: "strategy", confidence: 0.9, recencyDays: 0, strategicAnchor: true })),
    ...learningRules.map((rule) => ({ id: `learning-${rule.id}`, text: `Standing correction rule · ${rule.category}: ${rule.correction}`, kind: "learning_rule", confidence: 0.9, recencyDays: 0, strategicAnchor: true })),
    ...constitution.map((item) => ({ id: `constitution-${item.id}`, text: `Constitution · ${item.title}: ${String(item.machineReadableRule.ruleText ?? item.title)}`, kind: "constitution", confidence: 1, recencyDays: 0, strategicAnchor: true })),
    ...assumptions.map((item) => ({ id: `assumption-${item.id}`, text: `Assumption · ${item.statement}`, kind: "assumption", confidence: item.confidence, recencyDays: 0, strategicAnchor: false })),
  ];
  const fingerprint = createHash("sha256").update(JSON.stringify({ query: query.trim().toLowerCase(), mode, ids: items.map((item) => item.id) })).digest("hex");
  const [cached] = await db.select().from(contextPacket).where(eq(contextPacket.fingerprint, fingerprint)).orderBy(desc(contextPacket.createdAt)).limit(1);
  const trustScoreValue = Math.round(Number(trust[0]?.score ?? 50));
  const trustAdvisory = { subsystem: "Context Engine", score: trustScoreValue, lowTrust: trustScoreValue < 60 };
  if (cached && cached.expiresAt > new Date()) return { id: cached.id, fingerprint, reused: true, items: (cached.packet.items as SelectedContext[]) ?? [], tokens: cached.tokenEstimate, excludedRefs: cached.excludedRefs, trustAdvisory };
  const selected = constructContextPacket(query, items, budgetTokens);
  const excludedRefs = [...new Set([...excludedByPolicy, ...items.filter((item) => !selected.items.some((chosen) => chosen.id === item.id)).map((item) => item.id)])];
  return { id: null, fingerprint, reused: false, items: selected.items, tokens: selected.tokens, excludedRefs, trustAdvisory };
}