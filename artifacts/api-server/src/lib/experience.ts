import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  db,
  eventLog,
  experienceRecord,
  graphEdge,
  graphNode,
  institutionalKnowledgeLedger,
  lessonRecord,
} from "@workspace/db";
import { queryEngine } from "./query-engine";

const SIGNIFICANT_EVENT = /fail|error|reject|degrad|complete|resolved|success|outcome|review|govern|decision|health/i;
const EVIDENCE_THRESHOLD = 3;
const EVIDENCE_WINDOW_DAYS = 180;

function patternKey(eventType: string) {
  return eventType.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function statementFor(event: typeof eventLog.$inferSelect) {
  return `Operational behavior observed repeatedly: ${event.eventType} events occur in the ${event.aggregateType} domain.`;
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
      significanceClassification: /fail|error|reject|degrad/i.test(event.eventType) ? "regression" : "validated_outcome",
      observation: `${event.eventType} on ${event.aggregateType}:${event.aggregateId}`,
      domain: event.aggregateType,
      metadata: { eventType: event.eventType, sourceRef: event.sourceRef },
    }))).onConflictDoNothing({ target: experienceRecord.sourceEventId }).returning();

    const lessons = experiences.length > 0
      ? await tx.insert(lessonRecord).values(experiences.map((experience) => {
        const event = significant.find((candidate) => candidate.id === experience.sourceEventId)!;
        return {
          statement: statementFor(event),
          patternKey: patternKey(event.eventType),
          experienceRefs: [experience.id],
          confidence: 0.55,
          status: "draft",
          extractedBy: "reflection",
        };
      })).returning()
      : [];

    const allLessons = await tx.select().from(lessonRecord);
    const allExperiences = await tx.select().from(experienceRecord);
    const groups = new Map<string, typeof allLessons>();
    for (const lesson of allLessons) {
      const group = groups.get(lesson.patternKey) ?? [];
      groups.set(lesson.patternKey, [...group, lesson]);
    }
    const promoted: (typeof institutionalKnowledgeLedger.$inferSelect)[] = [];
    for (const [key, group] of groups) {
      const evidenceRefs = [...new Set(group.flatMap((lesson) => lesson.experienceRefs))];
      if (evidenceRefs.length < EVIDENCE_THRESHOLD) continue;
      const groupEventIds = new Set(allExperiences
        .filter((experience) => evidenceRefs.includes(experience.id))
        .map((experience) => experience.sourceEventId));
      const groupEvents = events.filter((event) => groupEventIds.has(event.id));
      const first = group[0];
      const confidence = Math.min(0.95, 0.75 + (evidenceRefs.length - EVIDENCE_THRESHOLD) * 0.05);
      const confidenceTier = confidence >= 0.85 ? "HIGH" : "MEDIUM";
      const status = confidenceTier === "HIGH" ? "pending_owner_review" : "established";
      const existing = await tx.select().from(institutionalKnowledgeLedger)
        .where(eq(institutionalKnowledgeLedger.statement, first.statement)).limit(1);
      let item: typeof institutionalKnowledgeLedger.$inferSelect;
      if (existing[0]) {
        const [updated] = await tx.update(institutionalKnowledgeLedger).set({
          evidenceCount: evidenceRefs.length,
          evidenceRefs,
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
          payload: { knowledgeId: item.id, revisionType: "reinforcement", evidenceCount: evidenceRefs.length, exceptionOrReinforcement: "reinforcement" },
        });
      } else {
        const dates = groupEvents.map((event) => event.occurredAt).sort((a, b) => a.getTime() - b.getTime());
        [item] = await tx.insert(institutionalKnowledgeLedger).values({
          statement: first.statement,
          evidenceCount: evidenceRefs.length,
          evidenceRefs,
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
          payload: { knowledgeId: item.id, statement: item.statement, evidenceCount: evidenceRefs.length, confidence },
        });
      }
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
      const sourceNodes = await tx.insert(graphNode).values(evidenceRefs.map((ref) => ({
        objectType: "experience",
        objectId: ref,
        metadata: { knowledgeId: item.id },
      }))).onConflictDoNothing({ target: [graphNode.objectType, graphNode.objectId] }).returning();
      const existingSourceNodes = sourceNodes.length > 0 ? sourceNodes : await tx.select().from(graphNode).where(and(
        eq(graphNode.objectType, "experience"),
        inArray(graphNode.objectId, evidenceRefs),
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
    return { experiences, lessons, institutionalKnowledge: promoted };
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