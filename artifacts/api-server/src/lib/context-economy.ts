export type ContextInput = {
  id: string;
  text: string;
  kind: string;
  confidence: number;
  recencyDays: number;
  strategicAnchor: boolean;
};

export type SelectedContext = ContextInput & {
  score: number;
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

function scoreItem(query: string, item: ContextInput): number {
  const recency = 1 / (1 + item.recencyDays);
  return item.confidence * 0.5 + recency * 0.3 + lexicalScore(query, item.text) * 0.2;
}

function clampText(text: string, tokenBudget: number): string {
  const maxChars = Math.max(16, tokenBudget * 4);
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
}

export function constructContextPacket(
  query: string,
  items: ContextInput[],
  budgetTokens: number,
): { items: SelectedContext[]; tokens: number } {
  const scored = items.map((item) => ({
    ...item,
    score: item.strategicAnchor ? 1 : scoreItem(query, item),
    estimatedTokens: estimateTokens(item.text),
  }));
  const anchors = scored.filter((item) => item.strategicAnchor);
  const ranked = scored
    .filter((item) => !item.strategicAnchor)
    .sort((a, b) => b.score - a.score);
  const selected: SelectedContext[] = [];
  let tokens = 0;

  const anchorBudget = Math.max(1, Math.floor(budgetTokens / Math.max(1, anchors.length)));
  for (const item of anchors) {
    const remaining = budgetTokens - tokens;
    const estimatedTokens = Math.min(item.estimatedTokens, anchorBudget, remaining);
    selected.push({
      ...item,
      text: clampText(item.text, estimatedTokens),
      estimatedTokens,
    });
    tokens += estimatedTokens;
  }

  for (const item of ranked) {
    const remaining = budgetTokens - tokens;
    if (remaining <= 0) break;
    const estimatedTokens = Math.min(item.estimatedTokens, remaining);
    selected.push({
      ...item,
      text: clampText(item.text, estimatedTokens),
      estimatedTokens,
    });
    tokens += estimatedTokens;
  }

  return { items: selected, tokens };
}