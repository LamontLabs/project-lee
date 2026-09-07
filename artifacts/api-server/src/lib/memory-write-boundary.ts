import { emitEvent } from "./foundation-events";
import { getRecoveryMode, type RecoveryMode } from "./recovery-modes";
import type { DomainEventType } from "./domain-events";

const BLOCKED_MODES = new Set<RecoveryMode>(["SAFE_MODE", "RECOVERY_MODE", "MIGRATION_MODE", "READ_ONLY"]);
const FACT_TYPES = new Set(["observed", "extracted", "declared", "verified"]);
const OPERATIONS = new Set(["create", "update", "revision", "status_change", "verification"]);

export type CanonicalMemoryRecord =
  | "fact"
  | "interpretation"
  | "belief"
  | "prediction"
  | "causal_claim"
  | "knowledge_gap"
  | "assumption"
  | "experience"
  | "lesson"
  | "institutional_knowledge"
  | "decision_heuristic"
  | "universal_object"
  | "owner_truth";

export type MemoryWriteOrigin = "source" | "owner" | "engine" | "migration";
export type MemoryWriteOperation = "create" | "update" | "revision" | "status_change" | "verification";

export type MemoryWriteBoundaryInput = {
  recordType: CanonicalMemoryRecord;
  operation: MemoryWriteOperation;
  sourceRef?: unknown;
  sourceRefs?: readonly unknown[];
  epistemicType?: unknown;
  origin: MemoryWriteOrigin;
  sourceDerived?: boolean;
  generatedByEngine?: unknown;
  generatedBy?: unknown;
  currentOwner?: unknown;
  actor?: unknown;
  ownerConfirmed?: boolean;
  mode?: RecoveryMode;
};

export type MemoryWriteEvent = {
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  actor?: string;
  sourceRef?: string;
  causationId?: string;
  correlationId?: string;
  sessionId?: string;
  brainVersion?: string;
};

export type MemoryWriteAudit = {
  recordType: CanonicalMemoryRecord;
  operation: MemoryWriteOperation;
  origin: MemoryWriteOrigin;
  sourceRef: string;
  provenanceRefs: string[];
  actor: string;
  currentOwner: string;
  mode: RecoveryMode;
};

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`MEMORY_WRITE_BLOCKED:${label}_required`);
  return value.trim();
}

function refs(sourceRef: unknown, sourceRefs: readonly unknown[] | undefined) {
  const values = [
    ...(sourceRef === undefined || sourceRef === null ? [] : [sourceRef]),
    ...(sourceRefs ?? []),
  ];
  const normalized = [...new Set(values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim()))];
  return normalized;
}

function metadata(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new Error(`MEMORY_WRITE_BLOCKED:${label}_required`);
  }
}

function modeOrCurrent(mode?: RecoveryMode) {
  return mode ?? getRecoveryMode().mode;
}

/**
 * Shared guard for every canonical-memory insert/update path.
 *
 * This function is intentionally synchronous and side-effect free. Existing
 * async provenance resolvers still verify that the references point to real
 * source/event records; this guard makes omission and category confusion
 * impossible before a database write is attempted.
 */
export function assertCanonicalMemoryWrite(input: MemoryWriteBoundaryInput): MemoryWriteAudit {
  if (!OPERATIONS.has(input.operation)) throw new Error(`MEMORY_WRITE_BLOCKED:invalid_operation`);
  const mode = modeOrCurrent(input.mode);
  if (BLOCKED_MODES.has(mode)) throw new Error(`MEMORY_WRITE_BLOCKED:${mode}`);

  const sourceRef = text(input.sourceRef, "source_ref");
  const provenanceRefs = refs(input.sourceRef, input.sourceRefs);
  if (provenanceRefs.length === 0) throw new Error("MEMORY_WRITE_BLOCKED:provenance_required");

  const currentOwner = text(input.currentOwner, "current_owner");
  const actor = text(input.actor ?? input.currentOwner, "actor");
  if (input.operation === "verification" && input.origin !== "owner") {
    throw new Error("MEMORY_WRITE_BLOCKED:verification_requires_owner_origin");
  }
  if (input.operation !== "verification" && input.origin === "migration" && actor !== "migration") {
    throw new Error("MEMORY_WRITE_BLOCKED:migration_actor_mismatch");
  }

  if (input.recordType === "fact") {
    const factType = text(input.epistemicType, "fact_type");
    if (!FACT_TYPES.has(factType)) throw new Error("MEMORY_WRITE_BLOCKED:invalid_fact_type");
    if (input.origin === "engine" && !(factType === "extracted" && input.sourceDerived === true)) {
      throw new Error("MEMORY_WRITE_BLOCKED:model_output_cannot_be_fact");
    }
    if (input.sourceDerived === true && factType !== "extracted") {
      throw new Error("MEMORY_WRITE_BLOCKED:source_derived_fact_must_be_extracted");
    }
  }

  if (input.recordType === "interpretation" || input.recordType === "belief" || input.recordType === "prediction" || input.recordType === "causal_claim") {
    if (!provenanceRefs.length) throw new Error("MEMORY_WRITE_BLOCKED:evidence_required");
    if (input.origin === "engine" || input.origin === "migration") {
      text(input.generatedByEngine, "generated_by_engine");
      metadata(input.generatedBy, "generated_by");
    }
  }

  if (input.recordType === "owner_truth") {
    if (input.origin !== "owner" || input.ownerConfirmed !== true || actor !== currentOwner) {
      throw new Error("MEMORY_WRITE_BLOCKED:owner_truth_requires_explicit_owner_confirmation");
    }
  }

  if (input.origin === "engine") {
    text(input.generatedByEngine, "generated_by_engine");
    metadata(input.generatedBy, "generated_by");
  }

  if (input.operation === "status_change" && input.recordType === "fact" && input.epistemicType === "inferred") {
    throw new Error("MEMORY_WRITE_BLOCKED:inferred_fact_status");
  }

  return {
    recordType: input.recordType,
    operation: input.operation,
    origin: input.origin,
    sourceRef,
    provenanceRefs,
    actor,
    currentOwner,
    mode,
  };
}

/**
 * Event Log is part of a canonical memory write's audit trail. Callers use
 * this after the row write (or with a transaction-compatible writer through
 * emitEvent directly) so every emitted event is catalog-validated.
 */
export async function appendCanonicalMemoryEvent(
  input: MemoryWriteBoundaryInput & { event: MemoryWriteEvent },
) {
  const audit = assertCanonicalMemoryWrite(input);
  return emitEvent({
    ...input.event,
    actor: input.event.actor ?? audit.actor,
    sourceRef: input.event.sourceRef ?? audit.sourceRef,
  });
}

export type DerivedMemoryWriteInput = {
  projection: string;
  rebuildable: boolean;
  sourceRefs?: readonly unknown[];
  mode?: RecoveryMode;
};

/**
 * Derived memory is useful state, never canonical truth. It must explicitly
 * declare that it can be discarded and rebuilt, and it remains write-blocked
 * in the same protected modes as canonical memory.
 */
export function assertDerivedMemoryWrite(input: DerivedMemoryWriteInput) {
  const mode = modeOrCurrent(input.mode);
  if (BLOCKED_MODES.has(mode)) throw new Error(`DERIVED_MEMORY_WRITE_BLOCKED:${mode}`);
  if (typeof input.projection !== "string" || !input.projection.trim()) {
    throw new Error("DERIVED_MEMORY_WRITE_BLOCKED:projection_required");
  }
  if (input.rebuildable !== true) throw new Error("DERIVED_MEMORY_WRITE_BLOCKED:rebuildable_required");
  const sourceRefs = refs(undefined, input.sourceRefs);
  return { projection: input.projection.trim(), rebuildable: true, sourceRefs, mode };
}