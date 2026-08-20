import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, eventLog, experienceRecord, institutionalKnowledgeLedger, lessonRecord, provenanceRecord } from "@workspace/db";
import { processExperiences, transitionInstitutionalKnowledge } from "../src/lib/experience";

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function outcome(patternKey: string, outcomeType: "support" | "contradiction", aggregateId = randomUUID()) {
  const [event] = await db.insert(eventLog).values({
    eventType: "PatternOutcomeCompleted",
    aggregateType: "controlled_lifecycle",
    aggregateId,
    sourceRef: `controlled:${patternKey}`,
    occurredAt: new Date(),
    payload: {
      patternKey,
      patternStatement: `Controlled pattern ${patternKey} is repeatedly evidenced.`,
      outcome: outcomeType,
    },
  }).returning();
  return event;
}

test("institutional knowledge requires independent repeated evidence and preserves lifecycle evidence", async () => {
  const patternKey = `lifecycle-${randomUUID()}`;
  const first = await outcome(patternKey, "support");
  const one = await processExperiences({ since: new Date(Date.now() - 60_000) });
  assert.equal(one.institutionalKnowledge.some((item) => item.statement.includes(patternKey)), false);

  const second = await outcome(patternKey, "support");
  const two = await processExperiences({ since: new Date(Date.now() - 60_000) });
  assert.equal(two.institutionalKnowledge.some((item) => item.statement.includes(patternKey)), false);

  const third = await outcome(patternKey, "support");
  const three = await processExperiences({ since: new Date(Date.now() - 60_000) });
  const knowledge = three.institutionalKnowledge.find((item) => item.statement.includes(patternKey));
  assert.ok(knowledge);
  assert.equal(knowledge.evidenceCount, 3);
  assert.equal(new Set(knowledge.evidenceRefs).size, 3);
  assert.equal(three.patterns.some((pattern) => pattern.patternKey === normalized(patternKey) && pattern.status === "confirmed"), true);

  const experiences = await db.select().from(experienceRecord).where(inArray(experienceRecord.sourceEventId, [first.id, second.id, third.id]));
  const lessons = await db.select().from(lessonRecord).where(eq(lessonRecord.patternKey, normalized(patternKey)));
  const provenance = await db.select().from(provenanceRecord).where(inArray(provenanceRecord.recordId, experiences.map((item) => item.id)));
  assert.equal(experiences.length, 3);
  assert.equal(lessons.length, 3);
  assert.equal(provenance.length, 3);
  assert.ok(provenance.every((item) => item.sourceRef.length > 0));

  const reloaded = await processExperiences({ since: new Date(Date.now() - 60_000) });
  assert.ok(reloaded.institutionalKnowledge.some((item) => item.id === knowledge.id));
  const deferred = await transitionInstitutionalKnowledge(knowledge.id, "defer");
  assert.equal(deferred?.status, "deferred");
  const rejected = await transitionInstitutionalKnowledge(knowledge.id, "reject");
  assert.equal(rejected?.status, "rejected");
  const invalidated = await transitionInstitutionalKnowledge(knowledge.id, "invalidate");
  assert.equal(invalidated?.status, "invalidated");
  const superseded = await transitionInstitutionalKnowledge(knowledge.id, "supersede", randomUUID());
  assert.equal(superseded?.status, "superseded");
  assert.ok(superseded?.sourceRef.startsWith("superseded-by:"));

  const contradictionKey = `contradiction-${randomUUID()}`;
  await outcome(contradictionKey, "support");
  await outcome(contradictionKey, "support");
  await outcome(contradictionKey, "contradiction");
  const contradicted = await processExperiences({ since: new Date(Date.now() - 60_000) });
  assert.equal(contradicted.institutionalKnowledge.some((item) => item.statement.includes(contradictionKey)), false);
  assert.equal(contradicted.patterns.some((pattern) => pattern.patternKey === normalized(contradictionKey) && pattern.status === "needs_review"), true);
  const contradictionLessons = await db.select().from(lessonRecord).where(eq(lessonRecord.patternKey, normalized(contradictionKey)));
  assert.ok(contradictionLessons.every((lesson) => lesson.status === "pattern_needs_review"));

  const lifecycleEvents = await db.select().from(eventLog).where(and(
    inArray(eventLog.eventType, ["PatternFormed", "PatternReviewRequired", "InstitutionalKnowledgeEstablished", "InstitutionalKnowledgeDeferred", "InstitutionalKnowledgeRejected", "InstitutionalKnowledgeInvalidated", "InstitutionalKnowledgeSuperseded"]),
    eq(eventLog.aggregateType, "institutional_knowledge"),
  ));
  assert.ok(lifecycleEvents.some((event) => event.eventType === "InstitutionalKnowledgeEstablished"));
  assert.ok(lifecycleEvents.some((event) => event.eventType === "InstitutionalKnowledgeDeferred"));
  assert.ok(lifecycleEvents.some((event) => event.eventType === "InstitutionalKnowledgeSuperseded"));
});