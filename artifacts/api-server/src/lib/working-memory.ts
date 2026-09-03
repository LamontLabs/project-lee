import { desc, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db, workingMemory } from "@workspace/db";
import type { SelectedContext } from "./context-economy";
import { emitEvent } from "./foundation-events";

export const WORKING_MEMORY_MAX_SELECTED = 24;
export const WORKING_MEMORY_MAX_EXCLUDED = 32;
export const WORKING_MEMORY_TEXT_LIMIT = 720;

export const WORKING_MEMORY_CATEGORIES = [
  "objective",
  "project",
  "person",
  "investigation",
  "evidence",
  "approvals",
  "recentChanges",
  "operationalState",
  "plan",
  "task",
  "recentConclusions",
] as const;

export type WorkingMemoryCategory = typeof WORKING_MEMORY_CATEGORIES[number];
export type WorkingMemoryTemperature = "hot" | "warm" | "cool";

export type WorkingMemoryEntry = {
  id: string;
  kind: string;
  text: string;
  attentionScore: number;
  objectiveRelevance: number;
  temperature: WorkingMemoryTemperature;
  ageDays: number;
  confidence: number;
  contradiction: boolean;
  provenance: { sourceRef?: string; evidenceRefs: string[] };
  selection: "selected" | "excluded";
  selectionReason: string;
  score: number;
  contextValueScore: number;
  factorBreakdown: Record<string, number>;
  estimatedTokens: number;
};

export type WorkingMemoryEnvelope = {
  schemaVersion: "1.0";
  scopeKey: string;
  sessionId: string | null;
  objectiveId: string | null;
  activeConversation: {
    query: string;
    mode: string;
    intentType: string | null;
    capturedAt: string;
  };
  categories: Record<WorkingMemoryCategory, string[]>;
  selected: WorkingMemoryEntry[];
  excluded: WorkingMemoryEntry[];
  selectionAudit: {
    selectedTotal: number;
    excludedTotal: number;
    selectedRetained: number;
    excludedRetained: number;
    excludedOverflow: number;
    expiredDiscarded: number;
    budgetTokens: number;
    selectedTokens: number;
  };
  attention: {
    topScore: number;
    averageScore: number;
    objectiveRelevance: number;
  };
  cilHandoff: {
    assetRefs: string[];
    boundary: "asset_refs_only";
    boundedTokenEstimate: number;
    sourceContextChecksum: string;
  };
  updatedAt: string;
};

function clamp(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function boundedText(text: string) {
  const redacted = text
    .replace(/\b(access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]");
  return redacted.length <= WORKING_MEMORY_TEXT_LIMIT ? redacted : `${redacted.slice(0, WORKING_MEMORY_TEXT_LIMIT - 1)}…`;
}

function categoryFor(item: { kind: string }): WorkingMemoryCategory {
  const kind = item.kind.toLowerCase();
  if (/strategy|objective|anchor/.test(kind)) return "objective";
  if (/project/.test(kind)) return "project";
  if (/person|relationship|commitment/.test(kind)) return "person";
  if (/contradiction|conflict|uncertainty|investigation/.test(kind)) return "investigation";
  if (/fact|interpretation|email|source|evidence|semantic/.test(kind)) return "evidence";
  if (/governance|approval/.test(kind)) return "approvals";
  if (/event|change|milestone/.test(kind)) return "recentChanges";
  if (/system|health|state|service/.test(kind)) return "operationalState";
  if (/waiting|plan/.test(kind)) return "plan";
  if (/task|schedule|job/.test(kind)) return "task";
  if (/conclusion|decision|learning|reflection/.test(kind)) return "recentConclusions";
  return "evidence";
}

function toEntry(item: SelectedContext, selection: "selected" | "excluded"): WorkingMemoryEntry {
  const source = item as SelectedContext & { evidenceRefs?: string[]; exclusionReason?: string };
  const score = clamp(item.score);
  const objectiveRelevance = clamp(item.factorBreakdown?.goal);
  return {
    id: item.id,
    kind: item.kind,
    text: boundedText(item.text),
    attentionScore: score,
    objectiveRelevance,
    temperature: score >= 0.35 ? "hot" : score >= 0.12 ? "warm" : "cool",
    ageDays: Math.max(0, Number(item.recencyDays ?? 0)),
    confidence: clamp(item.confidence, 0.5),
    contradiction: item.kind === "contradiction" || item.kind === "conflict" || Boolean(item.factorBreakdown?.contradiction),
    provenance: { sourceRef: item.sourceRef, evidenceRefs: source.evidenceRefs ?? [] },
    selection,
    selectionReason: selection === "selected" ? "Highest Context Value within the bounded Working Memory budget." : source.exclusionReason ?? "Outcompeted or exceeded the remaining Working Memory budget.",
    score: Number(item.score ?? 0),
    contextValueScore: Number(item.contextValueScore ?? 0),
    factorBreakdown: item.factorBreakdown ?? {},
    estimatedTokens: Number(item.estimatedTokens ?? 0),
  };
}

function emptyCategories(): Record<WorkingMemoryCategory, string[]> {
  return Object.fromEntries(WORKING_MEMORY_CATEGORIES.map((category) => [category, []])) as unknown as Record<WorkingMemoryCategory, string[]>;
}

function uniqueEntries(items: WorkingMemoryEntry[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function buildWorkingMemoryEnvelope(input: {
  scopeKey: string;
  sessionId?: string | null;
  objectiveId?: string | null;
  query: string;
  mode: string;
  intentType?: string | null;
  budgetTokens: number;
  selected: SelectedContext[];
  excluded: SelectedContext[];
  capturedAt?: Date;
}): WorkingMemoryEnvelope {
  const validSelected = input.selected.filter((item) => item.ageState !== "EXPIRED");
  const validExcluded = input.excluded.filter((item) => item.ageState !== "EXPIRED");
  const selected = uniqueEntries(validSelected.map((item) => toEntry(item, "selected"))).slice(0, WORKING_MEMORY_MAX_SELECTED);
  const excluded = uniqueEntries(validExcluded.map((item) => toEntry(item, "excluded"))).slice(0, WORKING_MEMORY_MAX_EXCLUDED);
  const categories = emptyCategories();
  for (const item of [...selected, ...excluded]) categories[categoryFor(item)].push(item.id);
  const topScore = selected.reduce((max, item) => Math.max(max, item.attentionScore), 0);
  const averageScore = selected.length ? selected.reduce((sum, item) => sum + item.attentionScore, 0) / selected.length : 0;
  const objectiveRelevance = selected.length ? selected.reduce((sum, item) => sum + item.objectiveRelevance, 0) / selected.length : 0;
  const assetRefs = selected.map((item) => item.id);
  return {
    schemaVersion: "1.0",
    scopeKey: input.scopeKey,
    sessionId: input.sessionId ?? null,
    objectiveId: input.objectiveId ?? null,
    activeConversation: {
      query: boundedText(input.query),
      mode: input.mode,
      intentType: input.intentType ?? null,
      capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    },
    categories,
    selected,
    excluded,
    selectionAudit: {
      selectedTotal: validSelected.length,
      excludedTotal: validExcluded.length,
      selectedRetained: selected.length,
      excludedRetained: excluded.length,
      excludedOverflow: Math.max(0, validExcluded.length - excluded.length),
      expiredDiscarded: input.selected.length + input.excluded.length - validSelected.length - validExcluded.length,
      budgetTokens: input.budgetTokens,
      selectedTokens: selected.reduce((sum, item) => sum + item.estimatedTokens, 0),
    },
    attention: { topScore, averageScore, objectiveRelevance },
    cilHandoff: {
      assetRefs,
      boundary: "asset_refs_only",
      boundedTokenEstimate: selected.reduce((sum, item) => sum + item.estimatedTokens, 0),
      sourceContextChecksum: createHash("sha256").update(JSON.stringify(assetRefs)).digest("hex"),
    },
    updatedAt: (input.capturedAt ?? new Date()).toISOString(),
  };
}

function validUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function persistWorkingMemory(input: {
  scopeKey: string;
  sessionId?: string | null;
  objectiveId?: string | null;
  query: string;
  mode: string;
  intentType?: string | null;
  budgetTokens: number;
  selected: SelectedContext[];
  excluded: SelectedContext[];
  correlationId?: string;
  reason?: string;
  rebuilt?: boolean;
}) {
  const envelope = buildWorkingMemoryEnvelope(input);
  const now = new Date();
  const [record] = await db.insert(workingMemory).values({
    scopeKey: input.scopeKey,
    sessionId: input.sessionId ?? null,
    objectiveId: input.objectiveId ?? null,
    version: 1,
    fingerprint: envelope.cilHandoff.sourceContextChecksum,
    envelope: envelope as unknown as Record<string, unknown>,
    selectedRefs: envelope.selected.map((item) => item.id),
    excludedRefs: envelope.excluded.map((item) => item.id),
    tokenEstimate: envelope.cilHandoff.boundedTokenEstimate,
    attentionScore: envelope.attention.topScore,
    lastReason: input.reason ?? "Context packet refresh",
    lastAssembledAt: now,
    rebuiltAt: input.rebuilt ? now : null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: workingMemory.scopeKey,
    set: {
      sessionId: input.sessionId ?? null,
      objectiveId: input.objectiveId ?? null,
      version: sql`${workingMemory.version} + 1`,
      fingerprint: envelope.cilHandoff.sourceContextChecksum,
      envelope: envelope as unknown as Record<string, unknown>,
      selectedRefs: envelope.selected.map((item) => item.id),
      excludedRefs: envelope.excluded.map((item) => item.id),
      tokenEstimate: envelope.cilHandoff.boundedTokenEstimate,
      attentionScore: envelope.attention.topScore,
      lastReason: input.reason ?? "Context packet refresh",
      lastAssembledAt: now,
      rebuiltAt: input.rebuilt ? now : undefined,
      updatedAt: now,
    },
  }).returning();
  if (!record) throw new Error("Working Memory projection was not persisted.");
  const event = await emitEvent({
    eventType: input.rebuilt ? "WorkingMemoryRebuilt" : "WorkingMemoryUpdated",
    aggregateType: "working_memory",
    aggregateId: record.id,
    correlationId: input.correlationId,
    sessionId: validUuid(input.sessionId) ? input.sessionId ?? undefined : undefined,
    sourceRef: "working-memory",
    payload: {
      scopeKey: input.scopeKey,
      selectedRefs: record.selectedRefs,
      excludedRefs: record.excludedRefs,
      selectedCount: envelope.selectionAudit.selectedRetained,
      excludedCount: envelope.selectionAudit.excludedRetained,
      excludedOverflow: envelope.selectionAudit.excludedOverflow,
      tokenEstimate: record.tokenEstimate,
      attentionScore: record.attentionScore,
      reason: input.reason ?? "Context packet refresh",
      rebuilt: Boolean(input.rebuilt),
    },
  });
  return { record, envelope, event };
}

export async function getWorkingMemory(scopeKey?: string) {
  const rows = scopeKey
    ? await db.select().from(workingMemory).where(eq(workingMemory.scopeKey, scopeKey)).limit(1)
    : await db.select().from(workingMemory).orderBy(desc(workingMemory.updatedAt)).limit(1);
  return rows[0] ?? null;
}