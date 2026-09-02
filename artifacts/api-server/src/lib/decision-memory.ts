import { desc, eq } from "drizzle-orm";
import { db, decisionHeuristicLedger, eventLog } from "@workspace/db";

type Observation = {
  pattern: string;
  statement?: string;
  domain?: string;
  outcome: "support" | "exception";
  sourceRef?: string;
  evidenceRef?: string;
  rationale?: string;
};

function normalizePattern(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 180);
}

function confidenceFor(support: number, exceptions: number) {
  return Math.max(0, Math.min(1, (support + 1) / (support + exceptions + 2)));
}

export async function recordDecisionObservation(observation: Observation) {
  if (!observation.pattern?.trim()) throw new Error("A decision pattern is required.");
  const key = normalizePattern(observation.pattern);
  const [existing] = await db.select().from(decisionHeuristicLedger).where(eq(decisionHeuristicLedger.sourceRef, `decision-pattern:${key}`)).limit(1);
  const now = new Date();
  const previousEvidence = existing?.evidenceRefs ?? [];
  const evidenceRef = observation.evidenceRef ?? observation.sourceRef ?? `decision-observation:${now.toISOString()}`;
  if (existing && previousEvidence.includes(evidenceRef)) return existing;
  const evidenceRefs = previousEvidence.includes(evidenceRef) ? previousEvidence : [...previousEvidence, evidenceRef];
  const priorSupport = Number(existing?.evidence?.supportCount ?? 0);
  const priorExceptions = existing?.exceptionCount ?? 0;
  const supportCount = priorSupport + (observation.outcome === "support" ? 1 : 0);
  const exceptionCount = priorExceptions + (observation.outcome === "exception" ? 1 : 0);
  const confidence = confidenceFor(supportCount, exceptionCount);
  const statement = observation.statement ?? `The owner tends to ${observation.outcome === "support" ? "favor" : "make exceptions to"} ${observation.pattern}.`;
  const [heuristic] = existing
    ? await db.update(decisionHeuristicLedger).set({
      rule: observation.statement ?? existing.rule,
      rationale: observation.rationale ?? existing.rationale,
      confidence,
      evidence: { ...(existing.evidence ?? {}), supportCount, domain: observation.domain ?? existing.evidence?.domain },
      evidenceRefs,
      exceptionCount,
      lastReinforced: observation.outcome === "support" ? now : existing.lastReinforced,
      updatedAt: now,
    }).where(eq(decisionHeuristicLedger.id, existing.id)).returning()
    : await db.insert(decisionHeuristicLedger).values({
      name: observation.pattern.slice(0, 200),
      rule: statement,
      rationale: observation.rationale ?? null,
      sourceRef: `decision-pattern:${key}`,
      confidence,
      evidence: { supportCount, domain: observation.domain ?? "general" },
      evidenceRefs,
      exceptionCount,
      firstObserved: now,
      lastReinforced: observation.outcome === "support" ? now : null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }).returning();
  await db.insert(eventLog).values({
    eventType: existing ? "DecisionHeuristicRevised" : "DecisionHeuristicEstablished",
    aggregateType: "decision_heuristic",
    aggregateId: heuristic.id,
    sourceRef: observation.sourceRef ?? "decision-memory",
    occurredAt: now,
    payload: { heuristicId: heuristic.id, pattern: observation.pattern, outcome: observation.outcome, confidence, evidenceRef },
  });
  return heuristic;
}

export async function recomputeDecisionHeuristics() {
  const events = await db.select().from(eventLog).orderBy(desc(eventLog.occurredAt)).limit(500);
  const observations: Observation[] = [];
  for (const event of events) {
    const payload = event.payload ?? {};
    const pattern = typeof payload.decisionPattern === "string" ? payload.decisionPattern : typeof payload.pattern === "string" ? payload.pattern : typeof payload.preference === "string" ? payload.preference : undefined;
    if (!pattern) continue;
    const outcome = /reject|defer|abandon|exception|contradict/i.test(event.eventType) || payload.outcome === "exception" ? "exception" : /accept|support|complete|favor/i.test(event.eventType) || payload.outcome === "support" ? "support" : undefined;
    if (!outcome) continue;
    observations.push({ pattern, statement: typeof payload.heuristicStatement === "string" ? payload.heuristicStatement : undefined, domain: typeof payload.domain === "string" ? payload.domain : undefined, outcome, sourceRef: event.sourceRef ?? "event-log", evidenceRef: event.id, rationale: typeof payload.rationale === "string" ? payload.rationale : undefined });
  }
  const seen = new Set<string>();
  const applied = [];
  for (const observation of observations.reverse()) {
    const key = normalizePattern(observation.pattern);
    if (seen.has(`${key}:${observation.evidenceRef}`)) continue;
    seen.add(`${key}:${observation.evidenceRef}`);
    applied.push(await recordDecisionObservation(observation));
  }
  return { observations: applied.length, heuristics: await listDecisionHeuristics() };
}

export async function listDecisionHeuristics() {
  return db.select().from(decisionHeuristicLedger).where(eq(decisionHeuristicLedger.status, "active")).orderBy(desc(decisionHeuristicLedger.confidence), desc(decisionHeuristicLedger.updatedAt));
}

export async function evaluatePatternAlignment(recommendationText: string, category?: string) {
  const heuristics = await listDecisionHeuristics();
  const words = new Set(recommendationText.toLowerCase().split(/\W+/).filter((word) => word.length > 3));
  const matches = heuristics.filter((heuristic) => {
    const haystack = `${heuristic.name} ${heuristic.rule} ${heuristic.evidence?.domain ?? ""}`.toLowerCase();
    return [...words].some((word) => haystack.includes(word)) || (!!category && haystack.includes(category.toLowerCase()));
  }).map((heuristic) => {
    const contradicts = /avoid|reject|never|against|slow|portable|evidence/i.test(heuristic.rule) && /fast|lock|vendor|hype|without evidence/i.test(recommendationText);
    return { heuristicId: heuristic.id, statement: heuristic.rule, confidence: heuristic.confidence, evidenceRefs: heuristic.evidenceRefs, exceptionCount: heuristic.exceptionCount, relationship: contradicts ? "conflict" : "support" };
  });
  const conflicts = matches.filter((item) => item.relationship === "conflict" && item.confidence > 0.7);
  return { alignment: conflicts.length ? "CONFLICT" : matches.length ? "ALIGNED" : "UNKNOWN", matches, conflicts, message: conflicts.length ? "This recommendation may not fit established decision patterns." : undefined };
}