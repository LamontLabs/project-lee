import { and, eq, inArray } from "drizzle-orm";
import { db, eventLog, factLedger, interpretationLedger, provenanceRecord, sourceChunk, sourceVault } from "@workspace/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function existingIds(refs: string[]) {
  const ids = [...new Set(refs)];
  if (ids.some((id) => typeof id !== "string" || !UUID.test(id))) {
    throw new Error("Provenance references must be valid UUIDs.");
  }
  if (!ids.length) return new Set<string>();
  const [sources, chunks, events] = await Promise.all([
    db.select({ id: sourceVault.id }).from(sourceVault).where(inArray(sourceVault.id, ids)),
    db.select({ id: sourceChunk.id }).from(sourceChunk).where(inArray(sourceChunk.id, ids)),
    db.select({ id: eventLog.id }).from(eventLog).where(inArray(eventLog.id, ids)),
  ]);
  const [facts, interpretations] = await Promise.all([
    db.select({ id: factLedger.id }).from(factLedger).where(inArray(factLedger.id, ids)),
    db.select({ id: interpretationLedger.id }).from(interpretationLedger).where(inArray(interpretationLedger.id, ids)),
  ]);
  return new Set([...sources, ...chunks, ...events, ...facts, ...interpretations].map((row) => row.id));
}

export async function assertFactProvenance(sourceEvidence: unknown) {
  if (!Array.isArray(sourceEvidence) || sourceEvidence.length === 0) {
    throw new Error("Facts require at least one sourceEvidence reference.");
  }
  const refs = sourceEvidence.map(String);
  const found = await existingIds(refs);
  const missing = [...new Set(refs)].filter((ref) => !found.has(ref));
  if (missing.length) throw new Error(`Fact provenance references do not resolve: ${missing.join(", ")}`);
  return refs;
}

export async function assertInterpretationEvidence(input: {
  inputFacts?: unknown;
  inputInterpretations?: unknown;
  sourceRef?: unknown;
  generatedBy?: unknown;
  generatedByEngine?: unknown;
  confidence?: unknown;
  whyChain?: unknown;
}) {
  const inputFacts = Array.isArray(input.inputFacts) ? input.inputFacts.map(String) : [];
  const inputInterpretations = Array.isArray(input.inputInterpretations) ? input.inputInterpretations.map(String) : [];
  if (!inputFacts.length && !inputInterpretations.length) throw new Error("Interpretations require at least one evidence reference.");
  const refs = [...new Set([...inputFacts, ...inputInterpretations])];
  if (refs.some((id) => !UUID.test(id))) throw new Error("Interpretation evidence references must be valid UUIDs.");
  const [facts, interpretations] = await Promise.all([
    db.select({ id: factLedger.id }).from(factLedger).where(and(inArray(factLedger.id, refs), eq(factLedger.status, "active"))),
    db.select({ id: interpretationLedger.id }).from(interpretationLedger).where(and(inArray(interpretationLedger.id, refs), eq(interpretationLedger.status, "active"))),
  ]);
  const factIds = new Set(facts.map((row) => row.id));
  const interpretationIds = new Set(interpretations.map((row) => row.id));
  const missingFacts = inputFacts.filter((id) => !factIds.has(id));
  const missingInterpretations = inputInterpretations.filter((id) => !interpretationIds.has(id));
  if (missingFacts.length || missingInterpretations.length) {
    throw new Error(`Interpretation evidence does not resolve: ${[...missingFacts, ...missingInterpretations].join(", ")}`);
  }
  if (!input.generatedBy || typeof input.generatedBy !== "object" || Array.isArray(input.generatedBy) || !Object.keys(input.generatedBy).length) {
    throw new Error("Interpretations require non-empty generated_by metadata.");
  }
  if (typeof input.generatedByEngine !== "string" || !input.generatedByEngine.trim()) {
    throw new Error("Interpretations require generatedByEngine.");
  }
  if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
    throw new Error("Interpretations require confidence between 0 and 1.");
  }
  const whyChain = input.whyChain;
  if (!Array.isArray(whyChain) || whyChain.length < 2 || !whyChain.some((step) => step && typeof step === "object" && ("evidence_id" in step || "evidenceId" in step))) {
    throw new Error("Interpretations require a non-trivial Why Chain with grounded evidence.");
  }
  if (input.sourceRef !== undefined && input.sourceRef !== null && !refs.includes(String(input.sourceRef))) {
    const sourceFound = await existingIds([String(input.sourceRef)]);
    if (!sourceFound.has(String(input.sourceRef))) throw new Error("Interpretation sourceRef does not resolve.");
  }
  return { inputFacts, inputInterpretations, whyChain };
}

export async function recordProvenance(recordType: string, recordId: string, sourceRefs: string[], confidence = 0.5) {
  if (!sourceRefs.length) return [];
  const found = await existingIds(sourceRefs);
  const missing = [...new Set(sourceRefs)].filter((ref) => !found.has(ref));
  if (!sourceRefs.length || missing.length) throw new Error(`Provenance references do not resolve: ${missing.join(", ")}`);
  return db.insert(provenanceRecord).values(sourceRefs.map((sourceRef) => ({ runId: crypto.randomUUID(), recordType, recordId, sourceRef, confidence }))).returning();
}