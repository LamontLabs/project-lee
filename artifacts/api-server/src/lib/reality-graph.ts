import { z } from "zod";

export const REALITY_ENTITY_TYPES = [
  "person", "organization", "project", "initiative", "message", "meeting",
  "document", "repository", "decision", "assumption", "evidence", "commitment",
  "waiting_loop", "risk", "system", "action", "deployment", "fact", "interpretation",
  "source", "event", "universal_object",
] as const;
export type RealityEntityType = typeof REALITY_ENTITY_TYPES[number];

export const RELATIONSHIP_STATES = [
  "CONFIRMED", "OWNER_DECLARED", "STRONGLY_INFERRED", "WEAK_CANDIDATE", "CONTRADICTED", "REJECTED",
] as const;
export type RelationshipState = typeof RELATIONSHIP_STATES[number];

export const REALITY_RELATIONSHIP_TYPES = [
  "SUPPORTS", "CONTRADICTS", "DERIVED_FROM", "RELATES_TO", "OWNED_BY", "PART_OF",
  "DEPENDS_ON_PORTFOLIO", "INVOLVES", "PRODUCED", "REFERENCES", "DEPENDS_ON",
  "TRACKS", "SPAWNED_FROM", "INFORMS", "SUPERSEDES", "PARTICIPATES_IN", "SENT",
  "ATTENDED", "AUTHORED", "STORED_IN", "IMPLEMENTS", "DECIDED_BY", "EVIDENCE_FOR",
  "FULFILLS", "BLOCKED_BY", "DEPLOYED_TO", "MENTIONS", "INCLUDES", "OCCURRED_IN",
  "ASSIGNED_TO", "SAME_AS",
] as const;
export type RealityRelationshipType = typeof REALITY_RELATIONSHIP_TYPES[number];

export const graphRelationshipInputSchema = z.object({
  sourceType: z.string().min(1).max(64),
  sourceId: z.string().uuid(),
  targetType: z.string().min(1).max(64),
  targetId: z.string().uuid(),
  edgeType: z.string().min(1).max(64).transform((value) => value.toUpperCase()),
  confidence: z.number().min(0).max(1).optional(),
  sourceRef: z.string().min(1).max(500),
  evidenceRefs: z.array(z.string().min(1).max(500)).max(100).optional(),
  relationshipState: z.enum(RELATIONSHIP_STATES).optional(),
  ownerConfirmation: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type GraphRelationshipInput = z.infer<typeof graphRelationshipInputSchema>;
export const identityEntitySchema = z.object({
  objectType: z.string().min(1).max(64),
  objectId: z.string().uuid(),
  provider: z.string().min(1).max(80),
  externalId: z.string().min(1).max(500),
  label: z.string().min(1).max(500).optional(),
  email: z.string().email().optional(),
});
export const identityResolutionSchema = z.object({
  left: identityEntitySchema,
  right: identityEntitySchema,
});
export type GraphProvenance = {
  sourceRef: string;
  evidenceRefs: string[];
  recordedAt: string;
  sourceKind: "event" | "provider" | "owner" | "derived" | "unknown";
};

export function resolveIdentity(input: z.infer<typeof identityResolutionSchema>) {
  const left = input.left;
  const right = input.right;
  const reasons: string[] = [];
  let score = 0;
  if (left.email && right.email && left.email.trim().toLowerCase() === right.email.trim().toLowerCase()) {
    score += 0.72;
    reasons.push("exact normalized email");
  }
  if (left.label && right.label && left.label.trim().toLowerCase() === right.label.trim().toLowerCase()) {
    score += 0.2;
    reasons.push("exact normalized display name");
  }
  if (left.provider === right.provider && left.externalId === right.externalId) {
    score += 0.95;
    reasons.push("same provider identity");
  }
  const candidate = Math.min(1, score);
  return {
    candidate,
    status: candidate >= 0.75 ? "REVIEW_REQUIRED" as const : "NO_MATCH" as const,
    reasons,
    requiresOwnerConfirmation: true,
  };
}

export function normalizeEntityType(value: string): string {
  const normalized = value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if ((REALITY_ENTITY_TYPES as readonly string[]).includes(normalized)) return normalized;
  return normalized;
}

function sourceKind(sourceRef: string, metadata: Record<string, unknown>) {
  if (metadata.sourceKind === "owner" || sourceRef.startsWith("owner:")) return "owner" as const;
  if (sourceRef.startsWith("event:")) return "event" as const;
  if (sourceRef.startsWith("provider:") || sourceRef.startsWith("gmail:") || sourceRef.startsWith("github:") || sourceRef.startsWith("drive:") || sourceRef.startsWith("calendar:")) return "provider" as const;
  if (sourceRef.startsWith("derived:")) return "derived" as const;
  return "unknown" as const;
}

export function normalizeRelationship(input: GraphRelationshipInput) {
  const metadata = input.metadata ?? {};
  const confidence = input.confidence ?? 0.5;
  const requestedState = input.relationshipState;
  if ((requestedState === "CONFIRMED" || requestedState === "OWNER_DECLARED") && !input.ownerConfirmation) {
    throw new Error("Owner confirmation is required before a relationship can become canonical.");
  }
  const relationshipState: RelationshipState = requestedState
    ?? (confidence >= 0.8 ? "STRONGLY_INFERRED" : "WEAK_CANDIDATE");
  const provenance: GraphProvenance = {
    sourceRef: input.sourceRef,
    evidenceRefs: [...new Set([input.sourceRef, ...(input.evidenceRefs ?? [])])],
    recordedAt: new Date().toISOString(),
    sourceKind: sourceKind(input.sourceRef, metadata),
  };
  const dedupeKey = [
    normalizeEntityType(input.sourceType),
    input.sourceId,
    input.edgeType,
    normalizeEntityType(input.targetType),
    input.targetId,
  ].join(":");
  return {
    sourceType: normalizeEntityType(input.sourceType),
    sourceId: input.sourceId,
    targetType: normalizeEntityType(input.targetType),
    targetId: input.targetId,
    edgeType: input.edgeType as RealityRelationshipType,
    confidence,
    relationshipState,
    dedupeKey,
    provenance,
    metadata: { ...metadata, relationshipState, dedupeKey, provenance },
  };
}

export function relationshipState(metadata: unknown): RelationshipState {
  const candidate = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>).relationshipState
    : undefined;
  return typeof candidate === "string" && (RELATIONSHIP_STATES as readonly string[]).includes(candidate)
    ? candidate as RelationshipState
    : "CONFIRMED";
}

export function isReviewableState(state: RelationshipState) {
  return state === "WEAK_CANDIDATE" || state === "STRONGLY_INFERRED" || state === "CONTRADICTED";
}

export function serializeGraphEdge(edge: any) {
  return {
    ...edge,
    relationshipState: relationshipState(edge.metadata),
    provenance: edge.metadata?.provenance ?? { sourceRef: edge.sourceRef, evidenceRefs: [edge.sourceRef] },
    dedupeKey: edge.metadata?.dedupeKey ?? null,
  };
}