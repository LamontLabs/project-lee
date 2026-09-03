import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import {
  beliefState,
  causalClaim,
  db,
  eventLog,
  factLedger,
  interpretationLedger,
  knowledgeGap,
  predictionRecord,
  sourceVault,
} from "@workspace/db";
import { collectPortableBackup, verifyPortableBackup } from "../src/lib/backup-restore";
import {
  getEpistemicHistory,
  recordBeliefState,
  recordCausalClaim,
  recordKnowledgeGap,
  recordPrediction,
  resolvePrediction,
  reviseBeliefState,
  investigateKnowledgeGap,
} from "../src/lib/epistemic-history";

async function evidence(label: string) {
  const sourceRef = `epistemic-history-${label}-${randomUUID()}`;
  const [source] = await db.insert(sourceVault).values({
    originalFilename: `${label}.txt`,
    mimeType: "text/plain",
    checksum: randomUUID(),
    storagePath: `test://${sourceRef}`,
    rawContent: `Evidence for ${label}`,
    processingStatus: "completed",
  }).returning();
  const [fact] = await db.insert(factLedger).values({
    subject: label,
    predicate: "has evidence",
    object: "confirmed",
    sourceRef: source.id,
    sourceEvidence: [source.id],
    factType: "observed",
    confidence: 0.8,
    observedAt: new Date(),
  }).returning();
  return { source, fact };
}

test("historical belief state, predictions, causal claims, and knowledge gaps remain distinct and portable", async () => {
  const firstEvidence = await evidence("first");
  const secondEvidence = await evidence("revision");
  const [interpretation] = await db.insert(interpretationLedger).values({
    statement: "The first evidence supports a cautious conclusion.",
    basis: firstEvidence.source.id,
    sourceRef: firstEvidence.source.id,
    inputFacts: [firstEvidence.fact.id],
    generatedByEngine: "epistemic-history-test",
    generatedBy: { test: true },
    confidence: 0.68,
    whyChain: [{ evidence_id: firstEvidence.fact.id }, { statement: "cautious conclusion" }],
    validFrom: new Date(),
  }).returning();

  const initial = await recordBeliefState({
    beliefKey: `controlled-belief-${randomUUID()}`,
    conclusion: "The first conclusion is plausible.",
    interpretationId: interpretation.id,
    evidenceRefs: [firstEvidence.source.id, firstEvidence.fact.id],
    sourceRef: firstEvidence.source.id,
    confidence: 0.68,
    generatedByEngine: "epistemic-history-test",
    generatedBy: { test: true },
  });
  const revised = await reviseBeliefState(initial.id, {
    revisedConclusion: "The later evidence changes the conclusion.",
    evidenceRefs: [secondEvidence.source.id, secondEvidence.fact.id],
    sourceRef: secondEvidence.source.id,
    confidence: 0.42,
    generatedByEngine: "epistemic-history-test",
    generatedBy: { test: true, revision: true },
    contradictionState: "open",
    contradictionRefs: [firstEvidence.fact.id],
    revisionReason: "Later evidence contradicted the earlier interpretation.",
  });
  assert.ok(revised);
  const beliefRows = await db.select().from(beliefState).where(inArray(beliefState.id, [initial.id, revised!.id]));
  assert.equal(beliefRows.find((row) => row.id === initial.id)?.state, "superseded");
  assert.equal(beliefRows.find((row) => row.id === revised!.id)?.priorBeliefId, initial.id);
  assert.equal(beliefRows.find((row) => row.id === revised!.id)?.priorInterpretationId, interpretation.id);
  assert.equal(beliefRows.find((row) => row.id === revised!.id)?.contradictionState, "open");
  assert.equal(beliefRows.find((row) => row.id === revised!.id)?.conclusion, "The later evidence changes the conclusion.");
  assert.equal((await db.select().from(factLedger).where(eq(factLedger.object, "The later evidence changes the conclusion."))).length, 0);

  const prediction = await recordPrediction({
    statement: "The revised conclusion will be reviewed.",
    horizon: "within one quarter",
    supportingEvidenceRefs: [secondEvidence.source.id, secondEvidence.fact.id],
    reasoning: "The new evidence creates a reviewable forecast.",
    confidenceLower: 0.35,
    confidenceUpper: 0.7,
    interpretationId: interpretation.id,
    beliefId: revised!.id,
    sourceRef: secondEvidence.source.id,
    generatedByEngine: "epistemic-history-test",
    generatedBy: { test: true },
  });
  const resolved = await resolvePrediction(prediction.id, {
    eventualOutcome: "Review completed",
    accuracyResult: "accurate",
    derivedLesson: "Evidence-backed forecasts should retain their outcome.",
  });
  assert.equal(resolved?.status, "resolved");
  assert.equal(resolved?.accuracyResult, "accurate");
  assert.equal(resolved?.derivedLesson, "Evidence-backed forecasts should retain their outcome.");

  const causal = await recordCausalClaim({
    claim: "The review improved confidence.",
    cause: "Evidence review",
    effect: "Confidence changed",
    evidenceRefs: [secondEvidence.source.id, secondEvidence.fact.id],
    confidence: 0.61,
    sourceRef: secondEvidence.source.id,
    explicitness: "inferred",
    alternatives: [{ statement: "The change may reflect unrelated timing." }],
    interpretationId: interpretation.id,
    generatedByEngine: "epistemic-history-test",
    generatedBy: { test: true },
  });
  assert.equal(causal.relationshipType, "causal");
  assert.equal(causal.explicitness, "inferred");
  assert.equal(causal.alternatives.length, 1);

  const gap = await recordKnowledgeGap({
    question: "Which evidence would distinguish the alternatives?",
    importance: 0.9,
    reason: "The current causal claim remains qualified.",
    objectiveId: randomUUID(),
    possibleEvidenceSources: ["future review", "owner correction"],
    affectedObjectRefs: [revised!.id],
    sourceRef: "epistemic-history-test",
    createdByEngine: "epistemic-history-test",
  });
  const investigated = await investigateKnowledgeGap(gap.id, { status: "investigating", nextAllowedAction: "request_owner_input" });
  assert.equal(investigated?.status, "investigating");
  assert.equal(investigated?.nextAllowedAction, "request_owner_input");

  const reloaded = await getEpistemicHistory();
  assert.ok(reloaded.beliefs.some((row) => row.id === initial.id));
  assert.ok(reloaded.beliefs.some((row) => row.id === revised!.id));
  assert.ok(reloaded.predictions.some((row) => row.id === prediction.id && row.accuracyResult === "accurate"));
  assert.ok(reloaded.causalClaims.some((row) => row.id === causal.id));
  assert.ok(reloaded.knowledgeGaps.some((row) => row.id === gap.id));

  const backup = await collectPortableBackup({ backupClass: "known_good", reason: "Epistemic history lifecycle test" });
  assert.ok((backup.payload.beliefState ?? []).some((row: any) => row.id === initial.id));
  assert.ok((backup.payload.predictionRecord ?? []).some((row: any) => row.id === prediction.id));
  const verification = await verifyPortableBackup(backup.manifest, backup.payload as any);
  assert.notEqual(verification.overall, "FAIL");

  const ids = [firstEvidence.source.id, secondEvidence.source.id];
  await db.delete(knowledgeGap).where(eq(knowledgeGap.id, gap.id));
  await db.delete(causalClaim).where(eq(causalClaim.id, causal.id));
  await db.delete(predictionRecord).where(eq(predictionRecord.id, prediction.id));
  await db.delete(beliefState).where(inArray(beliefState.id, [initial.id, revised!.id]));
  await db.delete(interpretationLedger).where(eq(interpretationLedger.id, interpretation.id));
  await db.delete(factLedger).where(inArray(factLedger.id, [firstEvidence.fact.id, secondEvidence.fact.id]));
  await db.delete(sourceVault).where(inArray(sourceVault.id, ids));
});