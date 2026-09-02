import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  db,
  eventLog,
  experienceRecord,
  graphEdge,
  graphNode,
  institutionalKnowledgeLedger,
  lessonRecord,
  provenanceRecord,
} from "@workspace/db";
import { queryEngine } from "./query-engine";

const SIGNIFICANT_EVENT = /fail|error|reject|degrad|complete|resolved|success|outcome|review|govern|decision|health/i;
const EVIDENCE_THRESHOLD = 3;
const EVIDENCE_WINDOW_DAYS = 180;

function normalizePattern(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function patternKey(event: typeof eventLog.$inferSelect) {
  const payload = event.payload as Record<string, unknown>;
  return normalizePattern(typeof payload.patternKey === "string" ? payload.patternKey : event.eventType);
}

function outcomeFor(event: typeof eventLog.$inferSelect) {
  const payload = event.payload as Record<string, unknown>;
  if (payload.outcome === "contradiction" || payload.outcome === "exception" || payload.outcome === "failure") return "contradiction";
  return /fail|error|reject|degrad/i.test(event.eventType) ? "contradiction" : "support";
}

function statementFor(event: typeof eventLog.$inferSelect) {
  const payload = event.payload as Record<string, unknown>;
  return typeof payload.patternStatement === "string"
    ? payload.patternStatement
    : `Operational behavior observed repeatedly: ${event.eventType} events occur in the ${event.aggregateType} domain.`;
}

export async function processExperiences(options: { since?: Date } = {}) {
  const since = options.since ?? new Date(Date.now() - EVIDENCE_WINDOW_DAYS * 86_400_000);
  const events = await db.select().from(eventLog)
    .where(gte(eventLog.occurredAt, since))
    .orderBy(desc(eventLog.occurredAt))
    .limit(1000);
  const significant = events.filter((event) => SIGNIFICANT_EVENT.test(event.eventType));
  if (significant.length === 0) return { experiences: [], lessons: [], institutionalKnowledge: [] };

  const result = await db.transaction(async (tx) => {
    const experiences = await tx.insert(experienceRecord).values(significant.map((event) => ({
      sourceEventId: event.id,
      significanceClassification: outcomeFor(event) === "contradiction" ? "contradiction" : "validated_outcome",
      observation: `${event.eventType} on ${event.aggregateType}:${event.aggregateId}`,
      domain: event.aggregateType,
      metadata: { eventType: event.eventType, sourceRef: event.sourceRef, patternKey: patternKey(event), outcome: outcomeFor(event), aggregateId: event.aggregateId },
    }))).onConflictDoNothing({ target: experienceRecord.sourceEventId }).returning();

    const lessons = experiences.length > 0
      ? await tx.insert(lessonRecord).values(experiences.map((experience) => {
        const event = significant.find((candidate) => candidate.id === experience.sourceEventId)!;
        return {
          statement: statementFor(event),
           patternKey: patternKey(event),
          experienceRefs: [experience.id],
          confidence: 0.55,
          status: "draft",
          extractedBy: "reflection",
        };
      })).returning()
      : [];
    if (experiences.length > 0) {
      await tx.insert(provenanceRecord).values(experiences.map((experience) => ({
        runId: experience.sourceEventId,
        recordType: "experience",
        recordId: experience.id,
        sourceRef: experience.sourceEventId,
        excerpt: experience.observation,
        confidence: 0.7,
      })));
      await tx.insert(eventLog).values([
        ...experiences.map((experience) => ({
          eventType: "ExperienceRecorded",
          aggregateType: "experience",
          aggregateId: experience.id,
          sourceRef: experience.sourceEventId,
          occurredAt: new Date(),
          payload: { experienceId: experience.id, sourceEventId: experience.sourceEventId, classification: experience.significanceClassification },
        })),
        ...lessons.map((lesson) => ({
          eventType: "LessonExtracted",
          aggregateType: "lesson",
          aggregateId: lesson.id,
          sourceRef: "experience-engine",
          occurredAt: new Date(),
          payload: { lessonId: lesson.id, patternKey: lesson.patternKey, experienceRefs: lesson.experienceRefs },
        })),
      ]);
    }

    const allLessons = await tx.select().from(lessonRecord);
    const allExperiences = await tx.select().from(experienceRecord);
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const groups = new Map<string, typeof allLessons>();
    const patterns: { patternKey: string; lessonIds: string[]; status: "confirmed" | "needs_review" }[] = [];
    for (const lesson of allLessons) {
      const group = groups.get(lesson.patternKey) ?? [];
      groups.set(lesson.patternKey, [...group, lesson]);
    }
    const promoted: (typeof institutionalKnowledgeLedger.$inferSelect)[] = [];
    for (const [key, group] of groups) {
      const evidenceRefs = [...new Set(group.flatMap((lesson) => lesson.experienceRefs))];
      const groupExperiences = allExperiences.filter((experience) => evidenceRefs.includes(experience.id));
      const groupEvents = groupExperiences.map((experience) => eventsById.get(experience.sourceEventId)).filter(Boolean) as (typeof eventLog.$inferSelect)[];
      const supportingExperiences = groupExperiences.filter((experience) => experience.significanceClassification === "validated_outcome");
      const supportingAggregateIds = new Set(supportingExperiences.map((experience) => {
        const metadata = experience.metadata as Record<string, unknown>;
        return String(metadata.aggregateId ?? experience.sourceEventId);
      }));
      const supportingEvidenceRefs = supportingExperiences.filter((experience) => {
        const metadata = experience.metadata as Record<string, unknown>;
        return metadata.outcome === "support" || metadata.outcome === undefined;
      }).map((experience) => experience.id);
      const contradictionCount = groupExperiences.filter((experience) => experience.significanceClassification === "contradiction").length;
      if (contradictionCount > 0) {
        await tx.update(lessonRecord).set({ status: "pattern_needs_review", updatedAt: new Date() })
          .where(inArray(lessonRecord.id, group.map((lesson) => lesson.id)));
        const existing = await tx.select().from(institutionalKnowledgeLedger).where(eq(institutionalKnowledgeLedger.statement, group[0].statement)).limit(1);
        if (existing[0]) {
          await tx.update(institutionalKnowledgeLedger).set({ status: "needs_review", exceptionCount: existing[0].exceptionCount + contradictionCount, updatedAt: new Date() }).where(eq(institutionalKnowledgeLedger.id, existing[0].id));
        }
        await tx.insert(eventLog).values({
          eventType: "PatternReviewRequired",
          aggregateType: "lesson_pattern",
          aggregateId: group[0].id,
          sourceRef: "experience-engine",
          occurredAt: new Date(),
          payload: { patternKey: key, contradictionCount, evidenceRefs },
        });
        patterns.push({ patternKey: key, lessonIds: group.map((lesson) => lesson.id), status: "needs_review" });
        continue;
      }
      if (supportingEvidenceRefs.length < EVIDENCE_THRESHOLD || supportingAggregateIds.size < EVIDENCE_THRESHOLD) continue;
      const first = group[0];
      const confidence = Math.min(0.95, 0.75 + (supportingEvidenceRefs.length - EVIDENCE_THRESHOLD) * 0.05);
      const confidenceTier = confidence >= 0.85 ? "HIGH" : "MEDIUM";
      const status = confidenceTier === "HIGH" ? "pending_owner_review" : "established";
      const existing = await tx.select().from(institutionalKnowledgeLedger)
        .where(eq(institutionalKnowledgeLedger.statement, first.statement)).limit(1);
      let item: typeof institutionalKnowledgeLedger.$inferSelect;
      if (existing[0]) {
        const [updated] = await tx.update(institutionalKnowledgeLedger).set({
          evidenceCount: supportingEvidenceRefs.length,
          evidenceRefs: supportingEvidenceRefs,
          confidence,
          confidenceTier,
          status,
          lastReinforced: new Date(),
          updatedAt: new Date(),
        }).where(eq(institutionalKnowledgeLedger.id, existing[0].id)).returning();
        item = updated;
        await tx.insert(eventLog).values({
          eventType: "InstitutionalKnowledgeRevised",
          aggregateType: "institutional_knowledge",
          aggregateId: item.id,
          sourceRef: "experience-engine",
          occurredAt: new Date(),
          payload: { knowledgeId: item.id, revisionType: "reinforcement", evidenceCount: supportingEvidenceRefs.length, exceptionOrReinforcement: "reinforcement" },
        });
      } else {
        const dates = groupEvents.map((event) => event.occurredAt).sort((a, b) => a.getTime() - b.getTime());
        [item] = await tx.insert(institutionalKnowledgeLedger).values({
          statement: first.statement,
          evidenceCount: supportingEvidenceRefs.length,
          evidenceRefs: supportingEvidenceRefs,
          sourceRef: "experience-engine",
          confidence,
          confidenceTier,
          evidenceWindowStart: dates[0] ?? new Date(),
          evidenceWindowEnd: dates.at(-1) ?? new Date(),
          firstEstablished: new Date(),
          lastReinforced: dates.at(-1) ?? new Date(),
          ownerReviewed: false,
          status,
        }).returning();
        await tx.insert(eventLog).values({
          eventType: "InstitutionalKnowledgeEstablished",
          aggregateType: "institutional_knowledge",
          aggregateId: item.id,
          sourceRef: "experience-engine",
          occurredAt: new Date(),
          payload: { knowledgeId: item.id, statement: item.statement, evidenceCount: supportingEvidenceRefs.length, confidence },
        });
      }
      await tx.insert(eventLog).values({
        eventType: "PatternFormed",
        aggregateType: "lesson_pattern",
        aggregateId: first.id,
        sourceRef: "experience-engine",
        occurredAt: new Date(),
        payload: { patternKey: key, evidenceRefs: supportingEvidenceRefs, independentOutcomeCount: supportingAggregateIds.size, confidence },
      });
      patterns.push({ patternKey: key, lessonIds: group.map((lesson) => lesson.id), status: "confirmed" });
      await tx.update(lessonRecord).set({ status: "pattern_confirmed", confidence, updatedAt: new Date() })
        .where(inArray(lessonRecord.id, group.map((lesson) => lesson.id)));
      await tx.insert(graphNode).values({
        objectType: "institutional_knowledge",
        objectId: item.id,
        label: item.statement,
        metadata: { confidence, evidenceCount: evidenceRefs.length, status },
      }).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
      const [knowledgeNode] = await tx.select().from(graphNode).where(and(
        eq(graphNode.objectType, "institutional_knowledge"),
        eq(graphNode.objectId, item.id),
      )).limit(1);
      const sourceNodes = await tx.insert(graphNode).values(supportingEvidenceRefs.map((ref) => ({
        objectType: "experience",
        objectId: ref,
        metadata: { knowledgeId: item.id },
      }))).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
      const existingSourceNodes = sourceNodes.length > 0 ? sourceNodes : await tx.select().from(graphNode).where(and(
        eq(graphNode.objectType, "experience"),
        inArray(graphNode.objectId, supportingEvidenceRefs),
      ));
      if (knowledgeNode && existingSourceNodes.length > 0) {
        await tx.insert(graphEdge).values(existingSourceNodes.flatMap((sourceNode) => [
          {
            sourceNodeId: sourceNode.id,
            targetNodeId: knowledgeNode.id,
            edgeType: "SUPPORTS",
            confidence,
            sourceRef: item.id,
            metadata: { evidenceType: "independent_experience" },
          },
          {
            sourceNodeId: knowledgeNode.id,
            targetNodeId: sourceNode.id,
            edgeType: "RELATES_TO",
            confidence,
            sourceRef: item.id,
            metadata: { evidenceType: "supporting_experience" },
          },
        ])).onConflictDoNothing({ target: [graphEdge.sourceNodeId, graphEdge.targetNodeId, graphEdge.edgeType] });
      }
      promoted.push(item);
    }
    return { experiences, lessons, patterns, institutionalKnowledge: promoted };
  });
  return result;
}

export async function listInstitutionalKnowledge() {
  const results = await queryEngine.query({
    sources: ["institutional_knowledge"],
    filters: {},
    rankingPolicy: "strategy_evaluation",
    confidenceThreshold: 0,
    limit: 200,
    requester: "Experience Engine",
    purpose: "institutional_retrieval",
  });
  return results
    .map((result) => result.object as typeof institutionalKnowledgeLedger.$inferSelect)
    .sort((left, right) => (right.lastReinforced?.getTime() ?? 0) - (left.lastReinforced?.getTime() ?? 0));
}

export async function reviewInstitutionalKnowledge(id: string, approved: boolean) {
  const [item] = await db.update(institutionalKnowledgeLedger).set({
    ownerReviewed: approved,
    status: approved ? "established" : "rejected",
    updatedAt: new Date(),
  }).where(eq(institutionalKnowledgeLedger.id, id)).returning();
  if (!item) return null;
  await db.insert(eventLog).values({
    eventType: "InstitutionalKnowledgeRevised",
    aggregateType: "institutional_knowledge",
    aggregateId: item.id,
    sourceRef: "owner-review",
    occurredAt: new Date(),
    payload: { knowledgeId: item.id, revisionType: approved ? "owner_approved" : "owner_rejected" },
  });
  return item;
}

export async function transitionInstitutionalKnowledge(id: string, action: "defer" | "reject" | "invalidate" | "supersede", replacementId?: string) {
  const status = action === "defer" ? "deferred" : action === "reject" ? "rejected" : action === "invalidate" ? "invalidated" : "superseded";
  const current = await db.select().from(institutionalKnowledgeLedger).where(eq(institutionalKnowledgeLedger.id, id)).limit(1);
  if (!current[0]) return null;
  const evidenceRefs = replacementId ? [...new Set([...current[0].evidenceRefs, replacementId])] : current[0].evidenceRefs;
  const [item] = await db.update(institutionalKnowledgeLedger).set({ status, evidenceRefs, sourceRef: replacementId ? `superseded-by:${replacementId}` : current[0].sourceRef, updatedAt: new Date() }).where(eq(institutionalKnowledgeLedger.id, id)).returning();
  await db.insert(eventLog).values({
    eventType: action === "defer" ? "InstitutionalKnowledgeDeferred" : action === "reject" ? "InstitutionalKnowledgeRejected" : action === "invalidate" ? "InstitutionalKnowledgeInvalidated" : "InstitutionalKnowledgeSuperseded",
    aggregateType: "institutional_knowledge",
    aggregateId: id,
    sourceRef: "owner-review",
    occurredAt: new Date(),
    payload: { knowledgeId: id, action, replacementId },
  });
  return item;
}

function overlapScore(query: string, statement: string) {
  const terms = new Set(query.toLowerCase().split(/\W+/).filter((term) => term.length > 3));
  const matches = statement.toLowerCase().split(/\W+/).filter((term) => terms.has(term));
  return terms.size === 0 ? 0 : matches.length / terms.size;
}

export async function findInstitutionalResemblance(query: string) {
  const items = await listInstitutionalKnowledge();
  return items
    .filter((item) => item.status === "established" && item.evidenceCount >= EVIDENCE_THRESHOLD)
    .map((item) => ({ ...item, resemblanceScore: overlapScore(query, item.statement) }))
    .filter((item) => item.resemblanceScore > 0)
    .sort((left, right) => right.resemblanceScore - left.resemblanceScore);
}

export async function getInstitutionalPriors(domain?: string) {
  const items = await listInstitutionalKnowledge();
  return items
    .filter((item) => item.status === "established")
    .map((item) => ({
      knowledgeId: item.id,
      statement: item.statement,
      priorWeight: item.confidence * Math.min(1, item.evidenceCount / 10),
      evidenceCount: item.evidenceCount,
      domain: domain ?? "general",
    }));
}