import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { contextPacket, db, eventLog } from "@workspace/db";
import { constructContextPacket, DEFAULT_WEIGHTS, type ContextInput, type SelectedContext } from "./context-economy";
import { founderContext } from "./founder-identity";
import { applyLearning } from "./learning";
import { queryEngine, type QueryEngine } from "./query-engine";
import { checkPolicy } from "./policy";
import { connectedEmailProvider, type ConnectedEmailProvider, type EmailProvider, type EmailSearchFilters, type EmailThread } from "./email-provider";
import { parseEmailSearchFilters } from "./intent";

export type ConversationMode = "normal" | "deep_think" | "build" | "write" | "review" | "pilot" | "low_cost" | "private" | "no_model" | "governed_action";

export type EmailCandidate = {
  item: ContextInput;
  provider: EmailProvider;
  threadId: string;
};

export type ContextBuildOptions = {
  resolveEmailProvider?: () => Promise<ConnectedEmailProvider | null>;
  queryEngine?: Pick<QueryEngine, "query">;
  founderContext?: () => Promise<Record<string, unknown>>;
};

function emailCandidateText(message: Awaited<ReturnType<EmailProvider["search"]>>["messages"][number]) {
  const sender = message.from.map((address) => address.name ? `${address.name} <${address.email}>` : address.email).join(", ") || "Unknown sender";
  return `Gmail · Email thread\nSubject: ${message.subject}\nFrom: ${sender}\nReceived: ${message.date.toISOString()}\nThread: ${message.threadId}`;
}

function emailThreadText(thread: EmailThread) {
  const messages = thread.messages.map((message) => {
    const from = message.from.map((address) => address.name ? `${address.name} <${address.email}>` : address.email).join(", ") || "Unknown sender";
    const recipients = message.to.map((address) => address.email).join(", ") || "none";
    const body = message.bodyText?.trim() || message.snippet.trim() || "(No message content available.)";
    return `From: ${from}\nTo: ${recipients}\nDate: ${message.date.toISOString()}\nSubject: ${message.subject}\n\n${body}`;
  });
  return `Gmail · Email thread\nSource: gmail:${thread.id}\nThread ID: ${thread.id}\nSubject: ${thread.subject}\nParticipants: ${thread.participants.map((address) => address.email).join(", ") || "unknown"}\n\n${messages.join("\n\n---\n\n")}`;
}

export async function retrieveEmailCandidates(
  query: string,
  intent?: { intentSubtype?: string | null; emailFilters?: EmailSearchFilters | null },
  resolveProvider: () => Promise<ConnectedEmailProvider | null> = connectedEmailProvider,
) {
  if (intent?.intentSubtype !== "email_search") return { candidates: [] as EmailCandidate[], unavailable: false };
  const resolved = await resolveProvider();
  if (!resolved) return { candidates: [] as EmailCandidate[], unavailable: true };
  const result = await resolved.provider.search(intent.emailFilters ?? parseEmailSearchFilters(query), { maxResults: 12 });
  const uniqueThreads = [...new Map(result.messages.map((message) => [message.threadId, message])).values()];
  const candidates = uniqueThreads.map((message) => ({
    item: {
      id: `gmail:thread:${message.threadId}`,
      text: emailCandidateText(message),
      kind: "email_thread",
      confidence: 0.9,
      recencyDays: Math.max(0, (Date.now() - message.date.getTime()) / 86400000),
      strategicAnchor: false,
      importance: 0.85,
      relationship: 0.6,
      projectActivity: 0.2,
      trust: 0.9,
      modeRelevance: 1,
      goalMatch: 1,
      tokenBudget: 384,
      provider: resolved.providerName,
      sourceRef: `gmail:${message.threadId}`,
    },
    provider: resolved.provider,
    threadId: message.threadId,
  }));
  return { candidates, unavailable: false };
}

export async function hydrateSelectedEmailContext(items: SelectedContext[], candidates: EmailCandidate[]) {
  const byId = new Map(candidates.map((candidate) => [candidate.item.id, candidate]));
  return Promise.all(items.map(async (item) => {
    const candidate = byId.get(item.id);
    if (!candidate) return item;
    const thread = await candidate.provider.getThread(candidate.threadId);
    const maxChars = Math.max(64, item.estimatedTokens * 4);
    const text = emailThreadText(thread);
    return { ...item, text: text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…` };
  }));
}

export async function buildContextPacket(query: string, mode: ConversationMode, budgetTokens = 3000, intent?: { id?: string; intentType?: string; intentSubtype?: string | null; retrievalMode?: string; emailFilters?: EmailSearchFilters | null }, options: ContextBuildOptions = {}) {
  const retrievalFilters = intent?.retrievalMode === "semantic" ? { text: query } : {};
  const retrievalPurpose = intent?.retrievalMode === "semantic" ? "discovery" : "context_assembly";
  const runQuery = (request: Parameters<QueryEngine["query"]>[0]) =>
    options.queryEngine ? options.queryEngine.query(request) : queryEngine.query(request);
  const [objectResults, factResults, interpretationResults, waiting, commitments, eventResults, founder, trust, objectives, learningRules, constitution, assumptions, costResults, governanceResults, serviceResults, conflictResults, emailResult] = await Promise.all([
    runQuery({ sources: ["universal_objects"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 40, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["facts"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 30, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["interpretations"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["waiting_loops"], filters: { status: "open" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["commitments"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 30, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["events"], filters: retrievalFilters, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    options.founderContext ? options.founderContext() : founderContext(),
    runQuery({ sources: ["trust_scores"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 200, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["strategic_objectives"], filters: { status: "active" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 12, requester: "Context Engine", purpose: retrievalPurpose }),
    applyLearning(query),
    runQuery({ sources: ["constitution"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["assumptions"], filters: { status: "active" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["cost_records"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 30, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["governance_requests"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["internal_services"], filters: {}, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    runQuery({ sources: ["memory_conflicts"], filters: { status: "open" }, rankingPolicy: "context_assembly", confidenceThreshold: 0, limit: 20, requester: "Context Engine", purpose: retrievalPurpose }),
    retrieveEmailCandidates(query, intent, options.resolveEmailProvider),
  ]);
  const objects = objectResults.map((item) => item.object as any);
  const facts = factResults.map((item) => item.object as any);
  const interpretations = interpretationResults.map((item) => item.object as any);
  const events = eventResults.map((item) => item.object as any);
  const waitingRecords = waiting.map((item) => item.object as any);
  const commitmentRecords = commitments.map((item) => item.object as any);
  const objectiveRecords = objectives.map((item) => item.object as any);
  const constitutionRecords = constitution.map((item) => item.object as any);
  const assumptionRecords = assumptions.map((item) => item.object as any);
  const costRecords = costResults.map((item) => item.object as any);
  const governanceRecords = governanceResults.map((item) => item.object as any);
  const serviceRecords = serviceResults.map((item) => item.object as any);
  const conflictRecords = conflictResults.map((item) => item.object as any);
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
    ...waitingRecords.map((item) => ({ id: item.id, text: `Waiting: ${item.subject} (${item.owner ?? "unassigned"})`, kind: "waiting", confidence: 0.8, recencyDays: Math.max(0, (Date.now() - new Date(item.updatedAt).getTime()) / 86400000), strategicAnchor: false })),
    ...commitmentRecords
      .filter((item) => item.status === "open" || item.status === "uncertain")
      .map((item) => ({
        id: item.id,
        text: `Commitment · ${item.direction ?? "uncertain"} · ${item.statement}`,
        kind: "commitment",
        confidence: item.confidence ?? 0.5,
        recencyDays: Math.max(0, (Date.now() - new Date(item.updatedAt ?? item.createdAt).getTime()) / 86400000),
        strategicAnchor: false,
        evidenceRefs: item.evidenceRefs ?? [],
        sourceRef: item.sourceRef,
      })),
     ...events.map((item) => { const record = item as any; const occurredAt = record.occurredAt ?? record.createdAt ?? new Date(); return { id: record.id, text: `Event · ${record.eventType ?? "Recorded change"} · ${new Date(occurredAt).toISOString()}`, kind: "event", confidence: record.confidence ?? record.similarityScore ?? 0.7, recencyDays: Math.max(0, (Date.now() - new Date(occurredAt).getTime()) / 86400000), strategicAnchor: false, sourceRef: record.sourceRef, evidenceRefs: record.evidenceRefs ?? [] }; }),
    ...Object.entries(founder).map(([dimension, record]: [string, any]) => ({ id: `founder-${dimension}`, text: `Founder preference · ${dimension}: ${JSON.stringify(record.value)}`, kind: "founder_profile", confidence: record.confidence === "confirmed" ? 1 : 0.85, recencyDays: 0, strategicAnchor: true })),
    ...objectiveRecords.map((item) => ({ id: item.id, text: `Strategy objective · ${item.horizon}: ${item.objective}. Blockers: ${item.blockers.join(", ") || "none"}`, kind: "strategy", confidence: 0.9, recencyDays: 0, strategicAnchor: true })),
    ...learningRules.map((rule) => ({ id: `learning-${rule.id}`, text: `Standing correction rule · ${rule.category}: ${rule.correction}`, kind: "learning_rule", confidence: 0.9, recencyDays: 0, strategicAnchor: true })),
    ...constitutionRecords.map((item) => ({ id: `constitution-${item.id}`, text: `Constitution · ${item.title}: ${String(item.machineReadableRule.ruleText ?? item.title)}`, kind: "constitution", confidence: 1, recencyDays: 0, strategicAnchor: true })),
    ...assumptionRecords.map((item) => ({ id: `assumption-${item.id}`, text: `Assumption · ${item.statement}`, kind: "assumption", confidence: item.confidence, recencyDays: 0, strategicAnchor: false })),
     ...costRecords.map((item) => ({ id: item.id, text: `Cost observation · ${item.engine} via ${item.provider} · ${item.tier} · $${Number(item.estimatedCostUsd ?? 0).toFixed(4)} · ${new Date(item.recordedAt ?? new Date()).toISOString()}`, kind: "cost", confidence: 0.9, recencyDays: Math.max(0, (Date.now() - new Date(item.recordedAt ?? new Date()).getTime()) / 86400000), strategicAnchor: false, sourceRef: `cost-record:${item.id}` })),
     ...governanceRecords.map((item) => ({ id: item.id, text: `Governance · ${item.actionClass} for ${item.targetSystem} · ${item.status ?? item.verdict ?? "pending"} · risk ${item.riskLevel ?? "unknown"}`, kind: "governance", confidence: 0.9, recencyDays: Math.max(0, (Date.now() - new Date(item.createdAt ?? new Date()).getTime()) / 86400000), strategicAnchor: true, sourceRef: `governance:${item.id}`, evidenceRefs: item.evidenceRefs ?? [] })),
     ...serviceRecords.map((item) => ({ id: item.id, text: `System · ${item.displayName} · ${item.category} · health ${item.currentHealth}`, kind: "system", confidence: 0.95, recencyDays: Math.max(0, (Date.now() - new Date(item.updatedAt ?? new Date()).getTime()) / 86400000), strategicAnchor: true, sourceRef: `system:${item.serviceId}` })),
     ...conflictRecords.map((item) => ({ id: item.id, text: `Contradiction · ${item.summary}`, kind: "contradiction", confidence: 0.5, recencyDays: Math.max(0, (Date.now() - new Date(item.createdAt ?? new Date()).getTime()) / 86400000), strategicAnchor: false, sourceRef: `memory-conflict:${item.id}` })),
    ...emailResult.candidates.map((candidate) => candidate.item),
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
  const contextItems = items.map((item: any) => ({ ...item, goalMatch: Number.isFinite(goalMatches.get(item.id)) ? goalMatches.get(item.id) : item.goalMatch, trust: Math.max(0, Math.min(1, trustScoreValue / 100)), modeRelevance: mode === "deep_think" && /strategy|project|decision/.test(item.kind) ? 1 : mode === "build" && /project|task|decision/.test(item.kind) ? 0.9 : item.modeRelevance ?? 0.5 }));
  const selected = constructContextPacket(query, contextItems, budgetTokens, weights, intent?.id);
  const hydratedItems = await hydrateSelectedEmailContext(selected.items, emailResult.candidates);
  const excludedRefs = [...new Set([...excludedByPolicy, ...selected.excluded.map((item) => item.id)])];
  const excluded = [...selected.excluded, ...items.filter((item) => excludedByPolicy.includes(item.id)).map((item: any) => ({ ...item, score: 0, contextValueScore: 0, factorBreakdown: {}, estimatedTokens: 0, exclusionReason: "Excluded by Privacy Policy." }))];
  if (emailResult.unavailable) {
    const unavailableItem = { id: "gmail:unavailable", text: "Gmail · No connected email account is available for this request.", kind: "email_status", confidence: 1, recencyDays: 0, strategicAnchor: false, provider: "gmail", sourceRef: "gmail:connection", score: 0, contextValueScore: 0, factorBreakdown: {}, estimatedTokens: 0 };
    return { id: null, fingerprint, reused: false, items: [...hydratedItems, unavailableItem], excluded, tokens: selected.tokens, excludedRefs, trustAdvisory };
  }
  return { id: null, fingerprint, reused: false, items: hydratedItems, excluded, tokens: selected.tokens, excludedRefs, trustAdvisory };
}