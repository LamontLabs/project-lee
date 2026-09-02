import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, eventLog, factLedger, interpretationLedger } from "@workspace/db";
import { checkConstitution } from "../lib/constitution";
import { assertFactProvenance, assertInterpretationEvidence, recordProvenance } from "../lib/provenance";
const router: IRouter = Router();
const FACT_TYPES = ["observed", "extracted", "declared", "verified"];
const INTERPRETATION_TYPES = ["pattern", "prediction", "observation", "opportunity", "strategy", "simulation_result", "inference"];
router.get("/facts", async (_req, res) => res.json(await db.select().from(factLedger).orderBy(desc(factLedger.updatedAt)).limit(500)));
router.get("/interpretations", async (_req, res) => res.json(await db.select().from(interpretationLedger).orderBy(desc(interpretationLedger.updatedAt)).limit(500)));
router.post("/facts", async (req, res): Promise<void> => {
  const input = req.body ?? {};
  if (["statement", "interpretationType", "inputFacts", "whyChain"].some((key) => key in input)) { res.status(400).json({ error: "Fact writes cannot contain interpretation fields." }); return; }
  if (!input.subject || !input.predicate || !input.object || !FACT_TYPES.includes(input.factType) || !Array.isArray(input.sourceEvidence) || input.sourceEvidence.length < 1) { res.status(400).json({ error: "subject, predicate, object, valid factType, and at least one sourceEvidence reference are required." }); return; }
  if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) { res.status(400).json({ error: "Facts require confidence between 0 and 1." }); return; }
  try { await assertFactProvenance(input.sourceEvidence); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Fact provenance is invalid." }); return; }
  const constitutional = await checkConstitution("fact_write", input, "Fact Ledger");
  if (!constitutional.permitted) { res.status(403).json({ error: "Constitution blocked this fact write.", constitutional }); return; }
  const now = new Date();
  const createdBy = typeof input.createdBy === "string" ? input.createdBy : "owner";
  const [item] = await db.insert(factLedger).values({ subject: String(input.subject), predicate: String(input.predicate), object: String(input.object), factType: input.factType, sourceEvidence: input.sourceEvidence, sourceRef: String(input.sourceEvidence[0]), confidence: input.confidence, propagatedConfidence: input.propagatedConfidence, confidenceLineage: input.confidenceLineage ?? {}, observedAt: input.observedAt ? new Date(input.observedAt) : now, firstSeen: now, lastConfirmed: input.factType === "verified" ? now : null, verifiedAt: input.factType === "verified" ? now : null, verifiable: Boolean(input.verifiable), relatedProjects: input.relatedProjects ?? [], relatedPeople: input.relatedPeople ?? [], createdBy, currentOwner: input.currentOwner ?? createdBy, importedFrom: input.importedFrom, generatedBy: input.generatedBy }).returning();
  await recordProvenance("fact", item.id, input.sourceEvidence, input.confidence);
  await db.insert(eventLog).values({ eventType: "FactCreated", aggregateType: "fact_ledger", aggregateId: item.id, sourceRef: "fact-ledger", occurredAt: now, payload: { factType: item.factType, sourceEvidence: item.sourceEvidence } });
  res.status(201).json(item);
});
router.post("/interpretations", async (req, res): Promise<void> => {
  const input = req.body ?? {};
  if (["subject", "predicate", "object", "factType", "sourceEvidence"].some((key) => key in input)) { res.status(400).json({ error: "Interpretation writes cannot contain Fact Ledger fields." }); return; }
  if (!input.statement || !INTERPRETATION_TYPES.includes(input.interpretationType)) { res.status(400).json({ error: "statement and a valid interpretationType are required." }); return; }
  try { await assertInterpretationEvidence(input); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Interpretation evidence is invalid." }); return; }
  const constitutional = await checkConstitution("interpretation_write", input, "Interpretation Ledger");
  if (!constitutional.permitted) { res.status(403).json({ error: "Constitution blocked this interpretation write.", constitutional }); return; }
  const now = new Date();
  const generatedBy = input.generatedBy as Record<string, unknown>;
  const createdBy = typeof input.createdBy === "string" ? input.createdBy : String(input.generatedByEngine);
  const inputFacts = input.inputFacts ?? [];
  const [item] = await db.insert(interpretationLedger).values({ statement: String(input.statement), interpretationType: input.interpretationType, inputFacts, inputInterpretations: input.inputInterpretations ?? [], basis: input.sourceRef ?? inputFacts[0] ?? input.inputInterpretations[0], sourceRef: input.sourceRef ?? inputFacts[0] ?? input.inputInterpretations[0], confidence: input.confidence, propagatedConfidence: input.propagatedConfidence, confidenceLineage: input.confidenceLineage ?? {}, whyChain: input.whyChain, generatedByEngine: input.generatedByEngine, validFrom: now, status: "active", canonLevel: "working", needsReview: Boolean(input.needsReview), createdBy, currentOwner: input.currentOwner ?? createdBy, importedFrom: input.importedFrom, generatedBy }).returning();
  await recordProvenance("interpretation", item.id, [...new Set([...(input.inputFacts ?? []), ...(input.inputInterpretations ?? [])])], input.confidence);
  await db.insert(eventLog).values({ eventType: "InterpretationCreated", aggregateType: "interpretation_ledger", aggregateId: item.id, sourceRef: "interpretation-ledger", occurredAt: now, payload: { interpretationType: item.interpretationType, inputFacts: item.inputFacts } });
  res.status(201).json(item);
});
router.post("/interpretations/:id/promote", async (req, res): Promise<void> => {
  res.status(409).json({
    error: "Interpretations cannot be promoted into Facts.",
    reason: "Facts and Interpretations are distinct ledgers. Create a separately sourced Fact with valid provenance instead.",
    interpretationId: req.params.id,
  });
});
export default router;