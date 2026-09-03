export type MemoryEpistemicType = "fact" | "interpretation" | "assumption" | "belief" | "prediction" | "causal_claim" | "knowledge_gap" | "event" | "operational" | "policy" | "identity";
export type MemoryFreshness = "fresh" | "current" | "stale" | "expired" | "unknown";
export type MemoryContradictionState = "none" | "open" | "resolved" | "unknown";

export type MemoryEvidence = {
  memoryId: string;
  memoryType: string;
  epistemicType: MemoryEpistemicType;
  sourceRefs: string[];
  provenance: { sourceRefs: string[]; complete: boolean };
  observedAt: string | null;
  ageDays: number | null;
  freshness: MemoryFreshness;
  contradictionState: MemoryContradictionState;
  relevance: { score: number; factors: Record<string, number | string> };
  lastValidatedAt: string | null;
  whatCouldChangeConclusion: string;
};

function dateOf(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function freshnessForAge(ageDays: number | null): MemoryFreshness {
  if (ageDays === null) return "unknown";
  if (ageDays > 90) return "expired";
  if (ageDays > 30) return "stale";
  if (ageDays > 7) return "current";
  return "fresh";
}

export function buildMemoryEvidence(input: {
  id: string;
  type: string;
  epistemicType: MemoryEpistemicType;
  sourceRefs?: string[];
  observedAt?: unknown;
  lastValidatedAt?: unknown;
  contradictionState?: MemoryContradictionState;
  relevance?: number;
  relevanceFactors?: Record<string, number | string>;
}): MemoryEvidence {
  const observedAt = dateOf(input.observedAt);
  const ageDays = observedAt ? Math.max(0, (Date.now() - observedAt.getTime()) / 86_400_000) : null;
  const sourceRefs = [...new Set((input.sourceRefs ?? []).filter(Boolean))];
  return {
    memoryId: input.id,
    memoryType: input.type,
    epistemicType: input.epistemicType,
    sourceRefs,
    provenance: { sourceRefs, complete: sourceRefs.length > 0 },
    observedAt: observedAt?.toISOString() ?? null,
    ageDays,
    freshness: freshnessForAge(ageDays),
    contradictionState: input.contradictionState ?? "unknown",
    relevance: { score: Math.max(0, Math.min(1, Number(input.relevance ?? 0))), factors: input.relevanceFactors ?? {} },
    lastValidatedAt: dateOf(input.lastValidatedAt)?.toISOString() ?? null,
    whatCouldChangeConclusion: input.epistemicType === "fact"
      ? "A newer source or owner verification could change this fact."
      : input.epistemicType === "interpretation"
        ? "New supporting facts, contradictory facts, or owner feedback could change this interpretation."
        : input.epistemicType === "assumption"
          ? "A failed premise or new observed outcome could change this assumption."
          : "New evidence, a freshness change, or an owner decision could change this conclusion.",
  };
}