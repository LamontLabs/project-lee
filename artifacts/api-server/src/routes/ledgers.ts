import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, eventLog, factLedger, governanceRequest, interpretationLedger } from "@workspace/db";
import { checkConstitution } from "../lib/constitution";
const router: IRouter = Router();
const FACT_TYPES = ["observed", "extracted", "declared", "verified"];
const INTERPRETATION_TYPES = ["pattern", "prediction", "observation", "opportunity", "strategy", "simulation_result", "inference"];
router.get("/facts", async (_req, res) => res.json(await db.select().from(factLedger).orderBy(desc(factLedger.updatedAt)).limit(500)));
router.get("/interpretations", async (_req, res) => res.json(await db.select().from(interpretationLedger).orderBy(desc(interpretationLedger.updatedAt)).limit(500)));
router.post("/facts", async (req, res): Promise<void> => {
  const input = req.body ?? {};
  if (!input.subject || !input.predicate || !input.object || !FACT_TYPES.includes(input.factType) || !Array.isArray(input.sourceEvidence) || input.sourceEvidence.length < 1) { res.status(400).json({ error: "subject, predicate, object, valid factType, and at least one sourceEvidence reference are required." }); return; }
  const constitutional = await checkConstitution("fact_write", input, "Fact Ledger");
  if (!constitutional.permitted) { res.status(403).json({ error: "Constitution blocked this fact write.", constitutional }); return; }
  const now = new Date();
  const createdBy = typeof input.createdBy === "string" ? input.createdBy : "owner";
  const [item] = await db.insert(factLedger).values({ subject: String(input.subject), predicate: String(input.predicate), object: String(input.object), factType: input.factType, sourceEvidence: input.sourceEvidence, sourceRef: String(input.sourceEvidence[0]), confidence: Number(input.confidence ?? 0.5), propagatedConfidence: input.propagatedConfidence, confidenceLineage: input.confidenceLineage ?? {}, observedAt: input.observedAt ? new Date(input.observedAt) : now, firstSeen: now, lastConfirmed: input.factType === "verified" ? now : null, verifiedAt: input.factType === "verified" ? now : null, verifiable: Boolean(input.verifiable), relatedProjects: input.relatedProjects ?? [], relatedPeople: input.relatedPeople ?? [], createdBy, currentOwner: input.currentOwner ?? createdBy, importedFrom: input.importedFrom, generatedBy: input.generatedBy }).returning();
  await db.insert(eventLog).values({ eventType: "FactCreated", aggregateType: "fact_ledger", aggregateId: item.id, sourceRef: "fact-ledger", occurredAt: now, payload: { factType: item.factType, sourceEvidence: item.sourceEvidence } });
  res.status(201).json(item);
});
router.post("/interpretations", async (req, res): Promise<void> => {
  const input = req.body ?? {};
  if (!input.statement || !INTERPRETATION_TYPES.includes(input.interpretationType) || !Array.isArray(input.inputFacts) || input.inputFacts.length < 1) { res.status(400).json({ error: "statement, valid interpretationType, and at least one inputFacts reference are required." }); return; }
  const facts = await db.select({ id: factLedger.id }).from(factLedger).where(eq(factLedger.status, "active"));
  if (input.inputFacts.some((id: string) => !facts.some((fact) => fact.id === id))) { res.status(400).json({ error: "Every inputFacts reference must point to an active fact." }); return; }
  const constitutional = await checkConstitution("interpretation_write", input, "Interpretation Ledger");
  if (!constitutional.permitted) { res.status(403).json({ error: "Constitution blocked this interpretation write.", constitutional }); return; }
  const now = new Date();
  const generatedBy = input.generatedBy ?? (input.generatedByEngine ? { engineId: input.generatedByEngine, modelId: input.modelId ?? null } : null);
  const createdBy = typeof input.createdBy === "string" ? input.createdBy : generatedBy ? String(input.generatedByEngine ?? "engine") : "owner";
  const [item] = await db.insert(interpretationLedger).values({ statement: String(input.statement), interpretationType: input.interpretationType, inputFacts: input.inputFacts, inputInterpretations: input.inputInterpretations ?? [], basis: input.inputFacts[0], sourceRef: input.sourceRef ?? input.inputFacts[0], confidence: Number(input.confidence ?? 0.5), propagatedConfidence: input.propagatedConfidence, confidenceLineage: input.confidenceLineage ?? {}, generatedByEngine: input.generatedByEngine ?? "founder", validFrom: now, status: "active", canonLevel: "working", needsReview: Boolean(input.needsReview), createdBy, currentOwner: input.currentOwner ?? createdBy, importedFrom: input.importedFrom, generatedBy }).returning();
  await db.insert(eventLog).values({ eventType: "InterpretationCreated", aggregateType: "interpretation_ledger", aggregateId: item.id, sourceRef: "interpretation-ledger", occurredAt: now, payload: { interpretationType: item.interpretationType, inputFacts: item.inputFacts } });
  res.status(201).json(item);
});
router.post("/interpretations/:id/promote", async (req, res): Promise<void> => {
  const [item] = await db.select().from(interpretationLedger).where(eq(interpretationLedger.id, req.params.id)).limit(1);
  if (!item) { res.status(404).json({ error: "Interpretation not found." }); return; }
  const facts = Array.isArray(item.inputFacts) ? item.inputFacts : [];
  if (facts.length < 2) { res.status(409).json({ error: "Promotion to canonical fact requires at least two supporting facts." }); return; }
  const [request] = await db.insert(governanceRequest).values({ leeRequestId: crypto.randomUUID(), actionClass: "interpretation_to_fact", targetSystem: "fact-ledger", status: "HOLD", riskLevel: "MEDIUM", reason: "Owner confirmation required to promote an interpretation into a fact.", requestPayload: { interpretationId: item.id, statement: item.statement, supportingFacts: facts }, evidenceRefs: facts, actor: "founder", expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) }).returning();
  res.status(202).json({ governanceRequest: request, interpretation: item });
});
export default router;