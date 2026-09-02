import { desc } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateUnderstandingRunBody,
  CreateUnderstandingRunResponse,
  ListUnderstandingRunsResponse,
} from "@workspace/api-zod";
import {
  db,
  eventLog,
  factLedger,
  interpretationLedger,
  provenanceRecord,
  understandingRun,
} from "@workspace/db";
import { extractUnderstanding } from "../lib/understanding";
import { processExperiences } from "../lib/experience";
import { assertFactProvenance } from "../lib/provenance";

const router: IRouter = Router();

router.post("/understanding/runs", async (req, res): Promise<void> => {
  const parsed = CreateUnderstandingRunBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid understanding input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  try {
    await assertFactProvenance([input.sourceRef]);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Understanding source provenance is invalid." });
    return;
  }
  const extraction = extractUnderstanding(input);
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [run] = await tx
      .insert(understandingRun)
      .values({
        sourceType: input.sourceType,
        sourceRef: input.sourceRef,
        sourceReliability: input.sourceReliability,
        rawContent: input.content,
        metadata: input.metadata ?? {},
        status: "completed",
        factCount: extraction.facts.length,
        interpretationCount: extraction.interpretations.length,
        startedAt: now,
        completedAt: now,
      })
      .returning();

    const facts = await tx
      .insert(factLedger)
      .values(
        extraction.facts.map((fact) => ({
          subject: fact.subject,
          predicate: fact.predicate,
          object: fact.object,
          sourceRef: input.sourceRef,
          sourceEvidence: [input.sourceRef],
          confidence: fact.confidence,
          generatedBy: { engineId: "Understanding Pipeline", runType: "source_extraction" },
          observedAt: now,
        })),
      )
      .returning();

    const interpretations = await tx
      .insert(interpretationLedger)
      .values(
        extraction.interpretations.map((interpretation) => ({
          statement: interpretation.statement,
          basis: interpretation.basis,
          sourceRef: input.sourceRef,
          inputFacts: facts.map((fact) => fact.id),
          generatedBy: { engineId: "Understanding Pipeline", runType: "source_interpretation" },
          confidence: interpretation.confidence,
          whyChain: [
            { step_type: "fact_confirmed", statement: "The interpretation was extracted from source-backed facts.", evidence_id: facts[0]?.id ?? input.sourceRef, confidence: interpretation.confidence, engine_name: "Understanding Pipeline" },
            { step_type: "freshness_threshold", statement: "The interpretation is valid from the current understanding run.", evidence_id: input.sourceRef, confidence: input.sourceReliability ?? 0.5, engine_name: "Understanding Pipeline" },
          ],
          validFrom: now,
        })),
      )
      .returning();

    const provenance = await tx
      .insert(provenanceRecord)
      .values([
        ...facts.map((fact, index) => ({
          runId: run.id,
          recordType: "fact",
          recordId: fact.id,
          sourceRef: input.sourceRef,
          excerpt: extraction.facts[index].excerpt,
          confidence: fact.confidence,
        })),
        ...interpretations.map((interpretation, index) => ({
          runId: run.id,
          recordType: "interpretation",
          recordId: interpretation.id,
          sourceRef: input.sourceRef,
          excerpt: extraction.interpretations[index].excerpt,
          confidence: interpretation.confidence,
        })),
      ])
      .returning();

    const provenanceByRecord = new Map(
      provenance.map((record) => [`${record.recordType}:${record.recordId}`, record.id]),
    );

    const [event] = await tx
      .insert(eventLog)
      .values({
        eventType: "UnderstandingPipelineCompleted",
        aggregateType: "understanding_run",
        aggregateId: run.id,
        sourceRef: input.sourceRef,
        occurredAt: now,
        payload: {
          runId: run.id,
          sourceType: input.sourceType,
          factCount: facts.length,
          interpretationCount: interpretations.length,
        },
      })
      .returning();

    return {
      run,
      facts: facts.map((fact) => ({
        id: fact.id,
        subject: fact.subject,
        predicate: fact.predicate,
        object: fact.object,
        sourceRef: fact.sourceRef,
        confidence: fact.confidence,
        provenanceId: provenanceByRecord.get(`fact:${fact.id}`),
      })),
      interpretations: interpretations.map((interpretation) => ({
        id: interpretation.id,
        statement: interpretation.statement,
        basis: interpretation.basis,
        sourceRef: interpretation.sourceRef,
        confidence: interpretation.confidence,
        provenanceId: provenanceByRecord.get(`interpretation:${interpretation.id}`),
      })),
      eventId: event.id,
    };
  });

  const response = CreateUnderstandingRunResponse.parse({
    id: result.run.id,
    sourceType: result.run.sourceType,
    sourceRef: result.run.sourceRef,
    status: result.run.status,
    factCount: result.run.factCount,
    interpretationCount: result.run.interpretationCount,
    startedAt: result.run.startedAt,
    completedAt: result.run.completedAt,
    facts: result.facts,
    interpretations: result.interpretations,
    eventId: result.eventId,
  });
  await processExperiences({ since: new Date(now.getTime() - 60_000) });

  req.log.info(
    {
      runId: result.run.id,
      factCount: result.facts.length,
      interpretationCount: result.interpretations.length,
    },
    "Understanding pipeline completed",
  );
  res.status(201).json(response);
});

router.get("/understanding/runs", async (req, res): Promise<void> => {
  const runs = await db
    .select({
      id: understandingRun.id,
      sourceType: understandingRun.sourceType,
      sourceRef: understandingRun.sourceRef,
      status: understandingRun.status,
      factCount: understandingRun.factCount,
      interpretationCount: understandingRun.interpretationCount,
      startedAt: understandingRun.startedAt,
      completedAt: understandingRun.completedAt,
    })
    .from(understandingRun)
    .orderBy(desc(understandingRun.startedAt))
    .limit(50);

  res.json(ListUnderstandingRunsResponse.parse(runs));
});

export default router;