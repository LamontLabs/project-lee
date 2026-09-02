import { desc } from "drizzle-orm";
import { db, operationalContextSnapshot } from "@workspace/db";
import { operationalContext } from "./operational-memory";
import { currentWorldState } from "./world-state";
import { emitEvent } from "./foundation-events";
import { subscribe, type DomainEventType } from "./domain-events";
import { currentProjectMomentum } from "./project-momentum";
import { currentOperationalCapacity } from "./operational-capacity";
import { currentPortfolioState } from "./portfolio-intelligence";
import { invalidateQueryCache, queryEngine } from "./query-engine";
import { createIfNew } from "./initiative";

const weight: Record<string, number> = { CRITICAL: 100, HIGH: 80, MEDIUM: 50, LOW: 20 };
export const OPERATIONAL_INTELLIGENCE_REACTIVE_EVENTS: DomainEventType[] = [
  "CommitPushed", "PRMerged", "DocumentCreated", "DocumentUpdated", "SourceVaultRecordCreated",
  "WaitingLoopResolved", "EmailReceived", "ThreadUpdated", "FactCreated", "KnowledgeStale",
  "InitiativeItemCreated", "OpportunityDetected", "OperationalCapacityChanged", "ProjectMomentumChanged",
  "PortfolioRiskDetected", "PortfolioOpportunityDetected", "GovernedActionHeld", "GovernedActionRejected",
];

function whyChain(summary: string, evidenceRefs: string[]) {
  return [
    { step: "evidence", summary: `${evidenceRefs.length} source-backed signal(s) support this item.`, evidenceRefs },
    { step: "interpretation", summary, evidenceRefs },
  ];
}

function evidenceItem(input: { id: string; text: string; evidenceRefs?: string[]; significance?: string; value?: unknown; metadata?: Record<string, unknown> }) {
  const evidenceRefs = [...new Set(input.evidenceRefs ?? [])];
  if (evidenceRefs.length === 0) evidenceRefs.push(input.id);
  return {
    id: input.id,
    text: input.text,
    ...(input.significance ? { significance: input.significance } : {}),
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    evidenceRefs,
    whyChain: whyChain(input.text, evidenceRefs),
  };
}

type ActionableEmail = {
  id: string;
  threadId: string;
  subject: string;
  from: Array<{ name?: string; email: string }>;
  snippet: string;
  date: Date;
  unread: boolean;
  hasAttachments: boolean;
  webUrl?: string;
};

/**
 * Promote only explainably actionable unread Gmail messages into the existing
 * Initiative/Today flow. Email remains a source signal, never a second inbox.
 */
export async function recordActionableEmail(message: ActionableEmail) {
  if (!message.unread) return null;
  const sender = message.from[0];
  const text = `${message.subject} ${message.snippet}`.toLowerCase();
  const senderText = `${sender?.name ?? ""} ${sender?.email ?? ""}`.toLowerCase();
  const reasons: string[] = [];
  const categories: string[] = [];
  if (/\b(urgent|asap|immediately|critical|time[- ]sensitive|overdue)\b/.test(text)) reasons.push("urgent language");
  if (/\b(deadline|due\b|renew|expires?|schedule|confirm|approve|sign|payment|invoice|quote|contract)\b/.test(text)) reasons.push("commitment or deadline language");
  if (/\b(decision|decide|choose|review|feedback|proposal|option)\b/.test(text)) { reasons.push("decision language"); categories.push("decisions"); }
  if (/\b(waiting|awaiting|follow[- ]?up|response|reply|remind|status update|next step)\b/.test(text)) { reasons.push("open-loop language"); categories.push("waiting"); }
  if (/\b(project|launch|milestone|build|release|client|customer|pilot)\b/.test(text)) { reasons.push("project language"); categories.push("projects"); }
  if (sender?.email && !/no[-_]?reply|noreply|notifications?|mailer-daemon/.test(senderText)) categories.push("people");
  if (message.hasAttachments) reasons.push("attachment present");
  const promotional = /\b(unsubscribe|newsletter|sale|discount|promotion|digest|marketing)\b/.test(text) || /no[-_]?reply|mailer-daemon/.test(senderText);
  if (promotional || reasons.length === 0) return null;
  if (/\b(commitment|deadline|payment|invoice|contract|approve|sign)\b/.test(reasons.join(" "))) categories.push("commitments");
  const significance = reasons.some((reason) => reason === "urgent language") ? "CRITICAL" : reasons.length >= 2 ? "HIGH" : "MEDIUM";
  const senderLabel = sender?.name || sender?.email || "A contact";
  const subject = message.subject || "(no subject)";
  const evidenceRef = `gmail:${message.id}`;
  const item = await createIfNew({
    category: `email_${categories[0] ?? "action"}`,
    significance,
    observation: `${senderLabel} sent “${subject}”.`,
    evidenceRefs: [evidenceRef, `gmail:thread:${message.threadId}`],
    actionHint: `Review the message: ${reasons.join(", ")}.`,
    dedupeKey: `gmail:actionable:${message.id}`,
    metadata: {
      sourceType: "email",
      provider: "gmail",
      canonicalRef: evidenceRef,
      threadRef: `gmail:thread:${message.threadId}`,
      webUrl: message.webUrl,
      reason: reasons,
      relatedAreas: [...new Set(categories)],
      unreadAtSync: message.date.toISOString(),
    },
  });
  if (item) {
    await emitEvent({
      eventType: "EmailReceived",
      aggregateType: "email",
      aggregateId: message.id,
      sourceRef: evidenceRef,
      payload: { initiativeId: item.id, subject, significance, reason: reasons },
    });
  }
  return item;
}

/**
 * A Gmail notification is only a freshness hint. Today is rebuilt after the
 * corresponding normalized events have been accepted, and never for a
 * duplicate or empty sync.
 */
export async function refreshOperationalContextAfterEmailSync(normalizedCount: number) {
  if (normalizedCount <= 0) return null;
  return generateOperationalContext();
}

export async function generateOperationalContext() {
  await invalidateQueryCache("operational-intelligence");
  const [initiativeResults, memory, world, objectResults, momentum, capacity, portfolio] = await Promise.all([
    queryEngine.query({ sources: ["initiatives"], filters: {}, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 150, requester: "Operational Intelligence", purpose: "operational_context" }),
    operationalContext(), currentWorldState(),
    queryEngine.query({ sources: ["universal_objects"], filters: {}, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 150, requester: "Operational Intelligence", purpose: "operational_context" }),
    currentProjectMomentum(),
    currentOperationalCapacity(),
    currentPortfolioState(),
  ]);
  const initiatives = initiativeResults.map((item) => item.object as any);
  const objects = objectResults.map((item) => item.object as any);
  const active = initiatives.filter((item) => !item.dismissedAt && !item.acknowledgedAt && (!item.expiresAt || new Date(item.expiresAt) > new Date())).filter((item) => capacity.state !== "LOW" || item.significance === "CRITICAL").filter((item) => capacity.state !== "RECOVERY" || item.significance === "CRITICAL");
  const scored = active.map((item) => ({ ...item, score: (weight[item.significance] ?? 10) + (new Date(item.generatedAt).getTime() > Date.now() - 21600000 ? 15 : 0) })).sort((a, b) => b.score - a.score);
  const limit = capacity.state === "CONSTRAINED" ? 2 : capacity.state === "LOW" || capacity.state === "RECOVERY" ? 1 : 5;
  const changedItems = scored.slice(0, limit).map((item) => evidenceItem({ id: item.id, text: item.observation, evidenceRefs: item.evidenceRefs, significance: item.significance, value: item.score, metadata: item.metadata }));
  const waitingItems = initiatives.filter((item) => !item.dismissedAt && !item.acknowledgedAt).slice(0, 10).map((item) => evidenceItem({ id: item.id, text: item.observation, evidenceRefs: item.evidenceRefs, significance: item.significance, metadata: item.metadata }));
  const driftingItems = objects.filter((item: any) => item.ageState === "STALE" || item.ageState === "OLD").slice(0, 10).map((item: any) => evidenceItem({ id: item.id, text: `${item.title ?? item.name ?? "Knowledge item"} is ${item.ageState.toLowerCase()}.`, evidenceRefs: item.sourceRefs, value: item.ageState }));
  const momentumRisk = momentum.filter((item) => item.classification === "Dormant" || item.classification === "Stalled").map((item) => evidenceItem({ id: item.projectId, text: `Project ${item.projectId} momentum is ${item.classification.toLowerCase()}.`, evidenceRefs: [item.id], value: item.score }));
  const technicalRisk = world.signals.filter((signal) => signal.signalType === "technical" || signal.currentValue?.alert).map((signal) => evidenceItem({ id: signal.id, text: signal.signalName, evidenceRefs: [signal.id], value: signal.currentValue }));
  const dependencyRisk = portfolio.alerts.filter((alert) => alert.type === "shared_dependency").map((alert) => evidenceItem({ id: alert.title, text: alert.title, evidenceRefs: alert.evidenceRefs, value: alert.projectIds }));
  const atRiskItems = [...technicalRisk, ...momentumRisk, ...dependencyRisk];
  const momentumDrift = momentum.filter((item) => item.classification === "Declining").map((item) => evidenceItem({ id: item.projectId, text: `Project ${item.projectId} momentum is declining.`, evidenceRefs: [item.id], value: item.score }));
  const blockedItems = [
    ...initiatives.filter((item) => Boolean((item.metadata as Record<string, unknown>).blocked) || /blocked|dependency/i.test(item.observation)).map((item) => evidenceItem({ id: item.id, text: item.observation, evidenceRefs: item.evidenceRefs, significance: item.significance })),
    ...objects.filter((item: any) => item.status === "blocked").map((item: any) => evidenceItem({ id: item.id, text: `${item.name} is blocked.`, evidenceRefs: item.sourceRefs, value: item.status })),
  ];
  const canWaitItems = objects.filter((item: any) => item.memoryTier === "archive" || item.memoryTier === "historical").slice(0, 10).map((item: any) => evidenceItem({ id: item.id, text: item.name ?? "Historical item", evidenceRefs: item.sourceRefs, value: item.memoryTier }));
  const changedIds = new Set(changedItems.map((item) => item.id));
  const ignoreTodayItems = initiatives.filter((item) => !changedIds.has(item.id) && !item.dismissedAt && !item.acknowledgedAt).slice(0, 10).map((item) => evidenceItem({ id: item.id, text: item.observation, evidenceRefs: item.evidenceRefs, significance: item.significance }));
  const activePriority = changedItems[0] ?? (memory.activePatterns[0] ? evidenceItem({ id: "operational-memory", text: memory.activePatterns[0].patternDescription, evidenceRefs: memory.activePatterns[0].evidenceRefs, value: 35 }) : null);
  const [snapshot] = await db.insert(operationalContextSnapshot).values({ activePriority, changedItems, driftingItems: [...driftingItems, ...momentumDrift], waitingItems, blockedItems, atRiskItems, canWaitItems, ignoreTodayItems, scoringContext: { operationalMemory: memory, worldStateSignals: world.signals.length, momentumProjects: momentum.length, capacity: capacity.state, portfolioHealth: portfolio.healthScore, currentState: "live", evidenceContract: "Every category item carries evidenceRefs and whyChain." } }).returning();
  await emitEvent({ eventType: "OperationalContextUpdated", aggregateType: "operational_context", aggregateId: snapshot.id, payload: { previousPriority: null, newPriority: activePriority, categoryCounts: { changed: changedItems.length, drifting: driftingItems.length + momentumDrift.length, waiting: waitingItems.length, blocked: blockedItems.length, atRisk: atRiskItems.length, canWait: canWaitItems.length, ignoreToday: ignoreTodayItems.length } } });
  return snapshot;
}

export function registerOperationalIntelligenceRefresh() {
  return OPERATIONAL_INTELLIGENCE_REACTIVE_EVENTS.map((eventType) => subscribe(eventType, async () => {
    await generateOperationalContext();
  }));
}
export async function currentOperationalContext() { const [latest] = await db.select().from(operationalContextSnapshot).orderBy(desc(operationalContextSnapshot.generatedAt)).limit(1); return latest ?? generateOperationalContext(); }
export async function operationalFocus() { const context = await currentOperationalContext(); return context.activePriority ?? { text: "No immediate operational priority detected.", score: 0 }; }