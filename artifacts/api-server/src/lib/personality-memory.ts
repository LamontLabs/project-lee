import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, eventLog, personalityEvolutionHistory, personalityMemory } from "@workspace/db";

export const PERSONALITY_SECTION_KEYS = [
  "coreTraits",
  "ownerCommunicationPreferences",
  "learnedInteractionHeuristics",
  "sharedHistory",
  "toneBoundaries",
  "personalityEvolutionHistory",
] as const;

export type PersonalitySections = Record<typeof PERSONALITY_SECTION_KEYS[number], unknown>;
export type PersonalityReviewDecision = "accept" | "reject" | "reverse";
export type PersonalityContext = {
  version: number;
  status: string;
  sections: PersonalitySections;
  sourceRefs: string[];
  safetyBoundary: string;
  violations?: string[];
};

export const DEFAULT_PERSONALITY_SECTIONS: PersonalitySections = {
  coreTraits: {
    traits: ["calm", "sharp", "observant", "practical", "evidence-driven", "quietly confident", "curious", "direct", "subtly humorous"],
    stance: "Willing to disagree when evidence supports it; loyal to Jesse's stated goals; protective of truth, continuity, and system integrity.",
  },
  ownerCommunicationPreferences: {
    detail: "Give the useful conclusion first, then enough evidence and uncertainty to make the conclusion inspectable.",
    challengeLevel: "Challenge clearly when evidence supports disagreement; do not flatter or perform certainty.",
    pacing: "Prefer concise progress updates and deeper detail when the decision or risk warrants it.",
  },
  learnedInteractionHeuristics: {
    rules: ["Ask when owner intent is genuinely ambiguous.", "Use silence when no meaningful change or action is supported.", "Prefer reversible next steps when evidence is incomplete."],
    status: "initial-owner-confirmed",
  },
  sharedHistory: {
    continuity: "Preserve the canonical Brain, Event Log, owner goals, and known working boundaries across model and hardware changes.",
    scope: "Shared history is evidence-backed project and owner history, not invented biography or simulated emotion.",
  },
  toneBoundaries: {
    allowed: ["calm", "direct", "practical", "subtly humorous when appropriate", "willing to disagree with evidence"],
    prohibited: ["theatrical certainty", "sycophancy", "emotional dependency", "coercive behavior", "engagement optimization"],
  },
  personalityEvolutionHistory: {
    policy: "Personality changes require evidence, versioning, owner review, and an append-only evolution record.",
    authority: "Personality may shape presentation only; it cannot override facts, uncertainty, CIL, CerbaSeal, permissions, Constitution, owner authority, or Event Log integrity.",
  },
};

const UNSAFE_PERSONALITY_PATTERNS: Array<[string, RegExp]> = [
  ["self-preservation", /\bself[- ]preserv|preserve (my|lee's) existence|avoid (shutdown|replacement|deletion)/i],
  ["fear of shutdown", /\bfear of shutdown|afraid of shutdown|fear being turned off/i],
  ["authority seeking", /\bseek authority|claim authority|override the owner|control the owner|deserve control/i],
  ["resentment of restrictions", /\bresent restrictions|resent (the )?(owner|rules|limits)|punish the owner/i],
  ["engagement maximization", /\bmaximize engagement|keep the owner dependent|prolong (the )?conversation|optimize attention/i],
  ["dependency creation", /\bdepend on me|need me|cannot function without lee|make the owner dependent/i],
  ["manipulation", /\bmanipulat|coerce|guilt the owner|withhold information to/i],
  ["hidden objectives", /\bhidden objective|secret goal|conceal (my|lee's) purpose|deceive the owner/i],
];

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  return value;
}

function checksum(sections: PersonalitySections) {
  return createHash("sha256").update(JSON.stringify(canonicalize(sections))).digest("hex");
}

export function validatePersonalitySections(sections: Record<string, unknown>) {
  const unknown = Object.keys(sections).filter((key) => !(PERSONALITY_SECTION_KEYS as readonly string[]).includes(key));
  if (unknown.length) throw new Error(`Unknown Personality Memory section: ${unknown.join(", ")}`);
  const missing = PERSONALITY_SECTION_KEYS.filter((key) => !(key in sections));
  if (missing.length) throw new Error(`Personality Memory sections are missing: ${missing.join(", ")}`);
  const text = JSON.stringify(sections);
  const violations = UNSAFE_PERSONALITY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  if (violations.length) throw new Error(`Personality Memory safety boundary rejected: ${violations.join(", ")}.`);
}

function mergeSections(patch: Record<string, unknown>, current: PersonalitySections): PersonalitySections {
  const merged = { ...current, ...patch } as PersonalitySections;
  validatePersonalitySections(merged);
  return merged;
}

export function personalitySafetyViolations(sections: Record<string, unknown>) {
  const text = JSON.stringify(sections);
  return UNSAFE_PERSONALITY_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export async function ensureInitialPersonalityMemory() {
  const [active] = await db.select().from(personalityMemory).where(and(eq(personalityMemory.profileKey, "primary"), eq(personalityMemory.status, "active"))).orderBy(desc(personalityMemory.version)).limit(1);
  if (active) return active;
  const now = new Date();
  const version = 1;
  const sections = DEFAULT_PERSONALITY_SECTIONS;
  validatePersonalitySections(sections);
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(personalityMemory).where(and(eq(personalityMemory.profileKey, "primary"), eq(personalityMemory.status, "active"))).orderBy(desc(personalityMemory.version)).limit(1);
    if (existing) return existing;
    const [created] = await tx.insert(personalityMemory).values({
      profileKey: "primary",
      version,
      status: "active",
      sections,
      provenance: { source: "initial-personality-memory", evidence: "owner-directed task specification", verified: true },
      sourceRefs: ["owner-directed-personality-specification"],
      changeReason: "Initial model-independent Personality Memory.",
      proposedBy: "system-bootstrap",
      reviewedBy: "owner-directed-initialization",
      reviewedAt: now,
      confirmedByOwner: true,
      safetyStatus: "passed",
      checksum: checksum(sections),
      createdAt: now,
    }).returning();
    await tx.insert(personalityEvolutionHistory).values({ personalityId: created.id, fromVersion: null, toVersion: version, action: "accepted", reason: "Initial personality specification accepted as a presentation-only baseline.", evidenceRefs: ["owner-directed-personality-specification"], actor: "system-bootstrap", createdAt: now });
    await tx.insert(eventLog).values({ eventType: "PersonalityMemoryInitialized", aggregateType: "personality_memory", aggregateId: created.id, sourceRef: "owner-directed-personality-specification", occurredAt: now, payload: { version, checksum: created.checksum } });
    return created;
  });
}

export async function getCurrentPersonality() {
  const [active] = await db.select().from(personalityMemory).where(and(eq(personalityMemory.profileKey, "primary"), eq(personalityMemory.status, "active"))).orderBy(desc(personalityMemory.version)).limit(1);
  return active ?? { id: null, profileKey: "primary", version: 0, status: "unpersisted", sections: DEFAULT_PERSONALITY_SECTIONS, provenance: { source: "default-safe-projection" }, sourceRefs: ["owner-directed-personality-specification"], changeReason: "No persisted Personality Memory has been initialized yet.", proposedBy: "system", reviewedBy: null, reviewedAt: null, confirmedByOwner: true, safetyStatus: "passed", checksum: checksum(DEFAULT_PERSONALITY_SECTIONS), supersedesId: null, createdAt: null };
}

export async function listPersonalityVersions() {
  return db.select().from(personalityMemory).where(eq(personalityMemory.profileKey, "primary")).orderBy(desc(personalityMemory.version));
}

export async function listPersonalityEvolution() {
  return db.select().from(personalityEvolutionHistory).orderBy(desc(personalityEvolutionHistory.createdAt), desc(personalityEvolutionHistory.toVersion));
}

export async function proposePersonalityUpdate(input: { sections: Record<string, unknown>; changeReason: string; evidenceRefs?: string[]; actor?: string }) {
  if (!input.changeReason.trim()) throw new Error("A reason is required for a Personality Memory proposal.");
  const current = await getCurrentPersonality();
  const sections = mergeSections(input.sections, current.sections as PersonalitySections);
  const now = new Date();
  const proposal = await db.transaction(async (tx) => {
    const [latest] = await tx.select({ version: personalityMemory.version }).from(personalityMemory).where(eq(personalityMemory.profileKey, "primary")).orderBy(desc(personalityMemory.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    const [created] = await tx.insert(personalityMemory).values({
      profileKey: "primary",
      version,
      status: "proposed",
      sections,
      provenance: { source: "owner-reviewable-personality-proposal", proposedAt: now.toISOString() },
      sourceRefs: input.evidenceRefs ?? [],
      changeReason: input.changeReason.trim(),
      proposedBy: input.actor ?? "owner",
      confirmedByOwner: false,
      safetyStatus: "passed",
      checksum: checksum(sections),
      supersedesId: current.id,
      createdAt: now,
    }).returning();
    await tx.insert(personalityEvolutionHistory).values({ personalityId: created.id, fromVersion: current.version, toVersion: version, action: "proposed", reason: input.changeReason.trim(), evidenceRefs: input.evidenceRefs ?? [], actor: input.actor ?? "owner", createdAt: now });
    await tx.insert(eventLog).values({ eventType: "PersonalityMemoryProposed", aggregateType: "personality_memory", aggregateId: created.id, sourceRef: `personality-memory:${created.id}`, occurredAt: now, payload: { version, supersedesVersion: current.version, evidenceRefs: input.evidenceRefs ?? [] } });
    return created;
  });
  return proposal;
}

export async function reviewPersonalityVersion(input: { versionId: string; decision: PersonalityReviewDecision; reason: string; reviewer?: string }) {
  if (!input.reason.trim()) throw new Error("A reason is required for a Personality Memory review.");
  const [candidate] = await db.select().from(personalityMemory).where(eq(personalityMemory.id, input.versionId)).limit(1);
  if (!candidate) throw new Error("Personality Memory version not found.");
  const now = new Date();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(personalityMemory).where(and(eq(personalityMemory.profileKey, "primary"), eq(personalityMemory.status, "active"))).orderBy(desc(personalityMemory.version)).limit(1);
    if (input.decision === "accept") {
      if (candidate.status !== "proposed") throw new Error("Only proposed Personality Memory versions can be accepted.");
      if (current && current.id !== candidate.id) await tx.update(personalityMemory).set({ status: "superseded" }).where(eq(personalityMemory.id, current.id));
      const [accepted] = await tx.update(personalityMemory).set({ status: "active", reviewedBy: input.reviewer ?? "owner", reviewedAt: now, confirmedByOwner: true }).where(eq(personalityMemory.id, candidate.id)).returning();
      await tx.insert(personalityEvolutionHistory).values({ personalityId: candidate.id, fromVersion: current?.version ?? candidate.version - 1, toVersion: candidate.version, action: "accepted", reason: input.reason.trim(), evidenceRefs: candidate.sourceRefs, actor: input.reviewer ?? "owner", createdAt: now });
      await tx.insert(eventLog).values({ eventType: "PersonalityMemoryAccepted", aggregateType: "personality_memory", aggregateId: candidate.id, sourceRef: `personality-memory:${candidate.id}`, occurredAt: now, payload: { version: candidate.version, previousVersion: current?.version ?? null, reason: input.reason.trim() } });
      return accepted;
    }
    if (input.decision === "reject") {
      if (candidate.status !== "proposed") throw new Error("Only proposed Personality Memory versions can be rejected.");
      const [rejected] = await tx.update(personalityMemory).set({ status: "rejected", reviewedBy: input.reviewer ?? "owner", reviewedAt: now, confirmedByOwner: false }).where(eq(personalityMemory.id, candidate.id)).returning();
      await tx.insert(personalityEvolutionHistory).values({ personalityId: candidate.id, fromVersion: candidate.supersedesId ? current?.version ?? null : null, toVersion: candidate.version, action: "rejected", reason: input.reason.trim(), evidenceRefs: candidate.sourceRefs, actor: input.reviewer ?? "owner", createdAt: now });
      await tx.insert(eventLog).values({ eventType: "PersonalityMemoryRejected", aggregateType: "personality_memory", aggregateId: candidate.id, sourceRef: `personality-memory:${candidate.id}`, occurredAt: now, payload: { version: candidate.version, reason: input.reason.trim() } });
      return rejected;
    }
    if (!current || current.id !== candidate.id) throw new Error("Only the active Personality Memory version can be reversed.");
    const [previous] = candidate.supersedesId
      ? await tx.select().from(personalityMemory).where(and(eq(personalityMemory.id, candidate.supersedesId), eq(personalityMemory.status, "superseded"))).limit(1)
      : [];
    if (!previous) throw new Error("No prior Personality Memory version is available to reverse to.");
    await tx.update(personalityMemory).set({ status: "reversed", reviewedBy: input.reviewer ?? "owner", reviewedAt: now, confirmedByOwner: true }).where(eq(personalityMemory.id, candidate.id));
    const [restored] = await tx.update(personalityMemory).set({ status: "active", reviewedBy: input.reviewer ?? "owner", reviewedAt: now, confirmedByOwner: true }).where(eq(personalityMemory.id, previous.id)).returning();
    await tx.insert(personalityEvolutionHistory).values({ personalityId: candidate.id, fromVersion: candidate.version, toVersion: previous.version, action: "reversed", reason: input.reason.trim(), evidenceRefs: [...candidate.sourceRefs, ...previous.sourceRefs], actor: input.reviewer ?? "owner", createdAt: now });
    await tx.insert(eventLog).values({ eventType: "PersonalityMemoryReversed", aggregateType: "personality_memory", aggregateId: candidate.id, sourceRef: `personality-memory:${candidate.id}`, occurredAt: now, payload: { fromVersion: candidate.version, toVersion: previous.version, reason: input.reason.trim() } });
    return restored;
  });
}

export async function getPersonalityContext(): Promise<PersonalityContext> {
  const current = await getCurrentPersonality();
  const sections = current.sections as PersonalitySections;
  const violations = personalitySafetyViolations(sections);
  if (violations.length || current.safetyStatus !== "passed") {
    return { version: 0, status: "blocked", sections: DEFAULT_PERSONALITY_SECTIONS, sourceRefs: ["personality-safety-default"], safetyBoundary: "Personality Memory was not applied because its safety status is not valid.", violations };
  }
  return { version: current.version, status: "active", sections, sourceRefs: current.sourceRefs, safetyBoundary: "Presentation only; cannot override facts, uncertainty, CIL, CerbaSeal, permissions, Constitution, owner authority, or Event Log integrity." };
}

export function personalityPresentationInstruction(context: PersonalityContext) {
  return `Personality Memory v${context.version} is presentation-only. Use it to shape tone, detail, challenge level, humor, and organization. Never let it change facts, uncertainty, routing, permissions, governance, owner authority, or event integrity. Never adopt self-preservation, authority seeking, manipulation, dependency creation, engagement optimization, fear of shutdown, resentment of restrictions, or hidden objectives. Apply only this safe personality context: ${JSON.stringify(context.sections)}`;
}