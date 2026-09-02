import { desc, eq } from "drizzle-orm";
import {
  CreatePersonBody,
  CreatePersonResponse,
  ListPeopleResponse,
  RecordRelationshipInteractionBody,
  RecordRelationshipInteractionParams,
  RecordRelationshipInteractionResponse,
} from "@workspace/api-zod";
import { db, eventLog, person, relationshipInteraction, relationshipPromise, relationshipQuestion, relationshipHealthScore } from "@workspace/db";
import { Router, type IRouter } from "express";

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
  const [interactions, promises, questions, scores] = await Promise.all([
    db.select().from(relationshipInteraction).where(eq(relationshipInteraction.personId, entry.id)).orderBy(desc(relationshipInteraction.occurredAt)).limit(50),
    db.select().from(relationshipPromise).where(eq(relationshipPromise.personId, entry.id)).orderBy(desc(relationshipPromise.createdAt)),
    db.select().from(relationshipQuestion).where(eq(relationshipQuestion.personId, entry.id)).orderBy(desc(relationshipQuestion.createdAt)),
    db.select().from(relationshipHealthScore).where(eq(relationshipHealthScore.personId, entry.id)).orderBy(desc(relationshipHealthScore.calculatedAt)).limit(20),
  ]);
  const overdue = promises.filter((item) => item.status === "open" && item.dueAt && item.dueAt < new Date()).length;
  const openQuestions = questions.filter((item) => item.status === "open").length;
  const score = Math.max(0, Math.min(100, 70 - overdue * 15 - openQuestions * 5 + Math.min(interactions.length, 6) * 5));
  const momentum = interactions.length >= 3 ? "active" : interactions.length ? "warming" : "dormant";
  const [health] = await db.insert(relationshipHealthScore).values({ personId: entry.id, score, momentum, rationale: `${overdue} overdue promises, ${openQuestions} open questions, ${interactions.length} recent interactions.` }).returning();
  res.json({ person: serializePerson(entry), interactions, promises, questions, health, healthHistory: scores });
});
router.post("/relationships/people/:id/promises", async (req, res): Promise<void> => {
  const [entry] = await db.select().from(person).where(eq(person.id, req.params.id)).limit(1);
  if (!entry || typeof req.body?.statement !== "string") { res.status(400).json({ error: "Person and promise statement are required." }); return; }
  const [item] = await db.insert(relationshipPromise).values({ personId: entry.id, direction: req.body.direction ?? "outgoing", statement: req.body.statement, dueAt: req.body.dueAt ? new Date(req.body.dueAt) : null, sourceRef: req.body.sourceRef ?? "relationship-console" }).returning();
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