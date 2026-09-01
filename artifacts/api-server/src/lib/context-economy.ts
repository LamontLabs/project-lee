import { db, contextScore } from "@workspace/db";

export type ContextInput = {
  id: string;
  text: string;
  kind: string;
  confidence: number;
  recencyDays: number;
  strategicAnchor: boolean;
  importance?: number;
  relationship?: number;
  projectActivity?: number;
  trust?: number;
  modeRelevance?: number;
  goalMatch?: number;
  ageState?: string;
  provider?: string;
  sourceRef?: string;
  tokenBudget?: number;
};

export type SelectedContext = ContextInput & {
  score: number;
  contextValueScore: number;
  factorBreakdown: Record<string, number>;
  estimatedTokens: number;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function lexicalScore(query: string, text: string): number {
  const terms = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2),
  );
  if (terms.size === 0) return 0;
  const haystack = text.toLowerCase();
  let matches = 0;
  for (const term of terms) {
    if (haystack.includes(term)) matches += 1;
  }
  return matches / terms.size;
}

export const DEFAULT_WEIGHTS = { goal: 1, recency: 0.7, importance: 0.8, relationship: 0.6, project: 0.5, confidence: 0.9, trust: 0.7, mode: 0.5 };
export function scoreContextValue(query: string, item: ContextInput, weights = DEFAULT_WEIGHTS) {
  const factors = {
    goal: Math.max(0, Math.min(1, item.goalMatch ?? lexicalScore(query, item.text))),
    recency: 1 / (1 + Math.log(item.recencyDays + 1)),
    importance: Math.max(0, Math.min(1, item.importance ?? (item.strategicAnchor ? 1 : 0.5))),
    relationship: Math.max(0, Math.min(1, item.relationship ?? 0)),
    project: Math.max(0, Math.min(1, item.projectActivity ?? 0.1)),
    confidence: Math.max(0, Math.min(1, item.confidence ?? 0.5)),
    trust: Math.max(0, Math.min(1, item.trust ?? 0.5)),
    mode: Math.max(0, Math.min(1, item.modeRelevance ?? 0.5)),
  };
  const value = Object.entries(factors).reduce((product, [key, factor]) => product * Math.pow(factor, Number((weights as any)[key] ?? 1)), 1);
  return { value, factors };
}

function clampText(text: string, tokenBudget: number): string {
  const maxChars = Math.max(16, tokenBudget * 4);
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}

export function constructContextPacket(
  query: string,
  items: ContextInput[],
  budgetTokens: number,
  weights = DEFAULT_WEIGHTS,
  intentId?: string,
): { items: SelectedContext[]; excluded: SelectedContext[]; tokens: number } {
  const scored = items.filter((item) => item.ageState !== "EXPIRED").map((item) => ({
    ...item,
    score: scoreContextValue(query, item, weights).value,
    contextValueScore: scoreContextValue(query, item, weights).value * (item.ageState === "STALE" ? 0.5 : 1),
    factorBreakdown: scoreContextValue(query, item, weights).factors,
    estimatedTokens: item.tokenBudget ?? estimateTokens(item.text),
  }));
  const ranked = scored.sort((a, b) => b.score - a.score);
  const selected: SelectedContext[] = [];
  let tokens = 0;
  const excluded: SelectedContext[] = [];
  for (const item of ranked) {
    const remaining = budgetTokens - tokens;
    if (remaining <= 0 || item.estimatedTokens > remaining) { excluded.push({ ...item, estimatedTokens: item.estimatedTokens }); continue; }
    const estimatedTokens = item.estimatedTokens;
    selected.push({
      ...item,
      text: clampText(item.text, estimatedTokens),
      estimatedTokens,
    });
    tokens += estimatedTokens;
  }
  void db.insert(contextScore).values([...selected.map((item) => ({ objectId: item.id, intentId: intentId ?? null, contextValueScore: item.contextValueScore, factorBreakdown: item.factorBreakdown, included: true })), ...excluded.map((item) => ({ objectId: item.id, intentId: intentId ?? null, contextValueScore: item.contextValueScore, factorBreakdown: item.factorBreakdown, included: false, exclusionReason: "Outcompeted or exceeded remaining token budget." }))]).catch(() => undefined);
  return { items: selected, excluded, tokens };
}