import { desc, eq } from "drizzle-orm";
import {
  CreatePersonBody,
  CreatePersonResponse,
  ListPeopleResponse,
  RecordRelationshipInteractionBody,
  RecordRelationshipInteractionParams,
  RecordRelationshipInteractionResponse,
} from "@workspace/api-zod";
import { db, eventLog, person, relationshipInteraction } from "@workspace/db";
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