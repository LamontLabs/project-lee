import { desc, eq } from "drizzle-orm";
import {
  CreatePersonBody,
  CreatePersonResponse,
  ListPeopleResponse,
  RecordRelationshipInteractionBody,
  RecordRelationshipInteractionParams,
  RecordRelationshipInteractionResponse,
} from "@workspace/api-zod";
import { commitment, db, eventLog, person, relationshipInteraction, relationshipPromise, relationshipQuestion, relationshipHealthScore } from "@workspace/db";
import { Router, type IRouter } from "express";
import {
  completeCommitment,
  classifyCommitmentDirection,
  findPerson,
  listCommitments,
  listWaitingIntelligence,
  recordCommitmentCandidate,
  reconstructPerson,
  reconcileWaitingLoops,
} from "../lib/commitment-intelligence";

const router: IRouter = Router();

function cadenceForRoles(roles: string[]): number {
  if (roles.some((role) => ["investor", "pilot_partner", "client"].includes(role.toLowerCase()))) return 14;
  if (roles.some((role) => role.toLowerCase() === "advisor")) return 30;
  return 30;
}

function healthForDate(lastInteractionAt: Date | null): string {
  if (!lastInteractionAt) return "unknown";
  const days = Math.max(0, (Date.now() - lastInteractionAt.getTime()) / 86_400_000);
  if (days <= 14) return "healthy";
  if (days <= 30) return "at_risk";
  return "stale";
}

function serializePerson(entry: typeof person.$inferSelect) {
  return {
    ...entry,
    email: entry.email ?? undefined,
    lastInteractionAt: entry.lastInteractionAt ?? undefined,
  };
}

router.post("/relationships/people", async (req, res): Promise<void> => {
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const roles = input.roles ?? [];
  const cadenceDays = cadenceForRoles(roles);
  const now = new Date();
  const [entry] = await db
    .insert(person)
    .values({
      identityKey: input.identityKey,
      displayName: input.displayName,
      email: input.email,
      roles,
       organizationalRole: typeof req.body?.organizationalRole === "string" ? req.body.organizationalRole : undefined,
      expertise: input.expertise ?? [],
      projects: input.projects ?? [],
      communicationRhythm: input.communicationRhythm ?? "monthly",
      trustScore: input.trustScore ?? 0.5,
      currentState: input.currentState ?? "nominal",
      relationshipHealth: "unknown",
      recommendedCadenceDays: cadenceDays,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: person.identityKey,
      set: {
        displayName: input.displayName,
        email: input.email,
        roles,
         organizationalRole: typeof req.body?.organizationalRole === "string" ? req.body.organizationalRole : undefined,
        expertise: input.expertise ?? [],
        projects: input.projects ?? [],
        communicationRhythm: input.communicationRhythm ?? "monthly",
        trustScore: input.trustScore ?? 0.5,
        currentState: input.currentState ?? "nominal",
        recommendedCadenceDays: cadenceDays,
        metadata: input.metadata ?? {},
        updatedAt: now,
      },
    })
    .returning();
  await db.insert(eventLog).values({
    eventType: "PersonCreated",
    aggregateType: "person",
    aggregateId: entry.id,
    sourceRef: "relationship-engine",
    occurredAt: now,
    payload: { personId: entry.id, identityKey: entry.identityKey, roles: entry.roles },
  });
  res.status(201).json(CreatePersonResponse.parse(serializePerson(entry)));
});

router.get("/relationships/people", async (_req, res): Promise<void> => {
  const people = await db.select().from(person).orderBy(desc(person.updatedAt));
  res.json(ListPeopleResponse.parse(people.map(serializePerson)));
});

router.get("/relationships/people/:id/intelligence", async (req, res): Promise<void> => {
  const [entry] = await db.select().from(person).where(eq(person.id, req.params.id)).limit(1);
  if (!entry) { res.status(404).json({ error: "Person not found." }); return; }
  const reconstruction = await reconstructPerson(entry.id);
  if (!reconstruction) { res.status(404).json({ error: "Person not found." }); return; }
  const [health] = await db.insert(relationshipHealthScore).values({
    personId: entry.id,
    score: reconstruction.health.score,
    momentum: reconstruction.health.momentum,
    rationale: `${reconstruction.health.overdueCommitments} overdue commitments, ${reconstruction.unresolvedQuestions.length} open questions, ${reconstruction.interactions.length} recent interactions.`,
  }).returning();
  res.json({
    ...reconstruction,
    person: serializePerson(entry),
    promises: reconstruction.legacyPromises,
    questions: reconstruction.unresolvedQuestions,
    health: health ?? reconstruction.health,
    healthHistory: reconstruction.healthHistory,
  });
});

function requestParticipant(value: unknown, fallbackType: string) {
  if (typeof value === "string") return { type: fallbackType, label: value };
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    type: String(record.type ?? record.objectType ?? fallbackType),
    id: typeof record.id === "string" ? record.id : null,
    label: typeof record.label === "string" ? record.label : typeof record.name === "string" ? record.name : null,
  };
}

router.get("/relationships/commitments", async (req, res): Promise<void> => {
  res.json(await listCommitments({
    personId: typeof req.query.person_id === "string" ? req.query.person_id : typeof req.query.personId === "string" ? req.query.personId : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    direction: typeof req.query.direction === "string" ? req.query.direction : undefined,
  }));
});

router.get("/relationships/waiting", async (req, res): Promise<void> => {
  res.json(await listWaitingIntelligence({
    personId: typeof req.query.person_id === "string" ? req.query.person_id : typeof req.query.personId === "string" ? req.query.personId : undefined,
    direction: typeof req.query.direction === "string" ? req.query.direction : undefined,
  }));
});

router.post("/relationships/reconcile", async (_req, res): Promise<void> => {
  res.json({ waitingLoops: await reconcileWaitingLoops() });
});

router.post("/relationships/commitments", async (req, res): Promise<void> => {
  const statement = typeof req.body?.statement === "string" ? req.body.statement.trim() : "";
  if (!statement) { res.status(400).json({ error: "A commitment statement is required." }); return; }
  const actor = requestParticipant(req.body.actor ?? { type: req.body.actorType ?? "owner", id: req.body.actorId, label: req.body.actorLabel ?? "Owner" }, "owner");
  const recipient = requestParticipant(req.body.recipient ?? { type: req.body.recipientType ?? "unknown", id: req.body.recipientId, label: req.body.recipientLabel }, "unknown");
  const evidenceRefs = Array.isArray(req.body?.evidenceRefs) ? req.body.evidenceRefs.map(String).filter(Boolean) : ["owner:relationship-console"];
  const candidate = {
    statement,
    actorType: actor.type,
    actorId: actor.id,
    actorLabel: actor.label,
    recipientType: recipient.type,
    recipientId: recipient.id,
    recipientLabel: recipient.label,
    direction: classifyCommitmentDirection(actor, recipient),
    commitmentType: ["promise", "request", "task", "follow_up", "meeting"].includes(req.body?.commitmentType) ? req.body.commitmentType : "promise",
    confidence: Math.max(0.8, Math.min(1, Number(req.body?.confidence ?? 0.95))),
    inferred: false,
    evidenceRefs,
    sourceRef: typeof req.body?.sourceRef === "string" ? req.body.sourceRef : "owner:relationship-console",
    occurredAt: req.body?.occurredAt ? new Date(req.body.occurredAt) : new Date(),
    dueAt: req.body?.dueAt ? new Date(req.body.dueAt) : null,
    expectedResponseAt: req.body?.expectedResponseAt ? new Date(req.body.expectedResponseAt) : null,
    importanceScore: Number(req.body?.importanceScore ?? 0.5),
    projectImpactScore: Number(req.body?.projectImpactScore ?? 0.5),
    cadenceDays: req.body?.cadenceDays ? Number(req.body.cadenceDays) : null,
    personIds: Array.isArray(req.body?.personIds) ? req.body.personIds.map(String) : [],
    organizationIds: Array.isArray(req.body?.organizationIds) ? req.body.organizationIds.map(String) : [],
    projectIds: Array.isArray(req.body?.projectIds) ? req.body.projectIds.map(String) : [],
    metadata: { createdBy: "owner", ownerDeclared: true },
  } as const;
  if (!Number.isFinite(candidate.occurredAt.getTime())) { res.status(400).json({ error: "occurredAt must be a valid date." }); return; }
  const created = await recordCommitmentCandidate(candidate);
  if (!created) { res.status(400).json({ error: "Commitment could not be recorded." }); return; }
  await reconcileWaitingLoops();
  res.status(201).json(created);
});

router.patch("/relationships/commitments/:id", async (req, res): Promise<void> => {
  const status = req.body?.status;
  if (!["fulfilled", "failed", "expired", "withdrawn"].includes(status)) {
    res.status(400).json({ error: "status must be fulfilled, failed, expired, or withdrawn." });
    return;
  }
  const refs = Array.isArray(req.body?.completionEvidenceRefs) ? req.body.completionEvidenceRefs.map(String).filter(Boolean) : [];
  try {
    const updated = await completeCommitment(req.params.id, status, refs);
    if (!updated) { res.status(404).json({ error: "Commitment not found." }); return; }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Commitment could not be updated." });
  }
});

router.get("/relationships/reconstruct", async (req, res): Promise<void> => {
  const query = typeof req.query.person === "string" ? req.query.person : typeof req.query.name === "string" ? req.query.name : typeof req.query.person_id === "string" ? req.query.person_id : "";
  if (!query) { res.status(400).json({ error: "person, name, or person_id is required." }); return; }
  const entry = await findPerson(query);
  if (!entry) { res.status(404).json({ error: "Person not found." }); return; }
  const result = await reconstructPerson(entry.id);
  if (!result) { res.status(404).json({ error: "Person not found." }); return; }
  res.json({ ...result, query, answer: result.status.summary });
});
router.post("/relationships/people/:id/promises", async (req, res): Promise<void> => {
  const [entry] = await db.select().from(person).where(eq(person.id, req.params.id)).limit(1);
  if (!entry || typeof req.body?.statement !== "string") { res.status(400).json({ error: "Person and promise statement are required." }); return; }
  const [item] = await db.insert(relationshipPromise).values({ personId: entry.id, direction: req.body.direction ?? "outgoing", statement: req.body.statement, dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null, sourceRef: req.body.sourceRef ?? "relationship-console" }).returning();
  await recordCommitmentCandidate({
    statement: req.body.statement.trim(),
    actorType: req.body.direction === "incoming" ? "person" : "owner",
    actorId: req.body.direction === "incoming" ? entry.id : null,
    actorLabel: req.body.direction === "incoming" ? entry.displayName : "Owner",
    recipientType: req.body.direction === "incoming" ? "owner" : "person",
    recipientId: req.body.direction === "incoming" ? null : entry.id,
    recipientLabel: req.body.direction === "incoming" ? "Owner" : entry.displayName,
    direction: req.body.direction === "incoming" ? "owed_by_other" : "owner_owes",
    commitmentType: "promise",
    confidence: 0.95,
    inferred: false,
    evidenceRefs: [item.sourceRef],
    sourceRef: item.sourceRef,
    occurredAt: item.createdAt,
    dueAt: item.dueAt,
    personIds: [entry.id],
    metadata: { migratedFrom: "relationship_promise" },
  });
  await reconcileWaitingLoops();
  res.status(201).json(item);
});
router.post("/relationships/people/:id/questions", async (req, res): Promise<void> => {
  const [entry] = await db.select().from(person).where(eq(person.id, req.params.id)).limit(1);
  if (!entry || typeof req.body?.question !== "string") { res.status(400).json({ error: "Person and question are required." }); return; }
  const [item] = await db.insert(relationshipQuestion).values({ personId: entry.id, question: req.body.question, sourceRef: req.body.sourceRef ?? "relationship-console" }).returning();
  res.status(201).json(item);
});

router.post("/relationships/people/:id/interactions", async (req, res): Promise<void> => {
  const params = RecordRelationshipInteractionParams.safeParse(req.params);
  const parsed = RecordRelationshipInteractionBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(person).where(eq(person.id, params.data.id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Person not found." });
    return;
  }
  const input = parsed.data;
  const occurredAt = new Date(input.occurredAt);
  const nextHealth = healthForDate(occurredAt);
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [interaction] = await tx.insert(relationshipInteraction).values({
      personId: existing.id,
      normalizedEventId: input.normalizedEventId,
      provider: input.provider,
      direction: input.direction ?? "unknown",
      summary: input.summary,
      sourceRef: input.sourceRef,
      occurredAt,
      metadata: input.metadata ?? {},
    }).returning();
    const [updatedPerson] = await tx.update(person).set({
      lastInteractionAt: occurredAt,
      relationshipHealth: nextHealth,
      updatedAt: now,
    }).where(eq(person.id, existing.id)).returning();
    const events: Array<{
      eventType: string;
      aggregateType: string;
      aggregateId: string;
      sourceRef: string;
      occurredAt: Date;
      payload: Record<string, unknown>;
    }> = [{
      eventType: "InteractionRecorded",
      aggregateType: "person",
      aggregateId: existing.id,
      sourceRef: input.sourceRef,
      occurredAt: now,
      payload: { personId: existing.id, interactionId: interaction.id, provider: input.provider },
    }];
    if (existing.relationshipHealth !== nextHealth) {
      events.push({
        eventType: "RelationshipHealthChanged",
        aggregateType: "person",
        aggregateId: existing.id,
        sourceRef: "relationship-engine",
        occurredAt: now,
        payload: {
          personId: existing.id,
          previousHealth: existing.relationshipHealth,
          relationshipHealth: nextHealth,
          recommendedCadenceDays: updatedPerson.recommendedCadenceDays,
        },
      });
    }
    const [event] = await tx.insert(eventLog).values(events).returning();
    return { interaction, updatedPerson, eventId: event.id };
  });
  res.status(201).json(RecordRelationshipInteractionResponse.parse({
    person: serializePerson(result.updatedPerson),
    interaction: result.interaction,
    eventId: result.eventId,
  }));
});

export default router;