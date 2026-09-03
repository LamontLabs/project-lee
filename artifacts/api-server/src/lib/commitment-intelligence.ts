import { createHash } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  commitment,
  db,
  eventLog,
  normalizedConnectorEvent,
  person,
  relationshipHealthScore,
  relationshipInteraction,
  relationshipPromise,
  relationshipQuestion,
  waitingLoop,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { subscribe, type DomainEventType } from "./domain-events";

export type CommitmentDirection = "owner_owes" | "owed_by_other" | "mutual_waiting" | "task" | "uncertain";
export type CommitmentStatus = "open" | "fulfilled" | "failed" | "expired" | "withdrawn" | "uncertain";

export type CommitmentCandidate = {
  statement: string;
  actorType: string;
  actorId?: string | null;
  actorLabel?: string | null;
  recipientType: string;
  recipientId?: string | null;
  recipientLabel?: string | null;
  direction: CommitmentDirection;
  commitmentType: "promise" | "request" | "task" | "follow_up" | "meeting";
  confidence: number;
  inferred: boolean;
  evidenceRefs: string[];
  sourceRef: string;
  occurredAt: Date;
  dueAt?: Date | null;
  expectedResponseAt?: Date | null;
  lastMeaningfulActivityAt?: Date | null;
  importanceScore?: number;
  projectImpactScore?: number;
  cadenceDays?: number | null;
  personIds?: string[];
  organizationIds?: string[];
  projectIds?: string[];
  contradictionRefs?: string[];
  metadata?: Record<string, unknown>;
};

type Participant = { type: string; id?: string | null; label?: string | null };

const DAY = 86_400_000;
const MINIMUM_CANDIDATE_CONFIDENCE = 0.45;

function text(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function dateValue(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizeParticipant(value: unknown, fallbackType = "unknown"): Participant {
  if (typeof value === "string") return { type: fallbackType, label: text(value) || null };
  if (!value || typeof value !== "object") return { type: fallbackType };
  const record = value as Record<string, unknown>;
  return {
    type: text(record.type ?? record.objectType ?? fallbackType).toLowerCase() || fallbackType,
    id: text(record.id ?? record.personId ?? record.objectId) || null,
    label: text(record.label ?? record.name ?? record.displayName ?? record.email) || null,
  };
}

function directionFor(actor: Participant, recipient: Participant): CommitmentDirection {
  if (actor.type === "owner" && recipient.type !== "owner" && recipient.type !== "unknown") return "owner_owes";
  if (recipient.type === "owner" && actor.type !== "owner" && actor.type !== "unknown") return "owed_by_other";
  if (actor.type !== "unknown" && recipient.type !== "unknown" && actor.type !== "owner" && recipient.type !== "owner") return "mutual_waiting";
  if ((actor.type === "owner" && recipient.type === "unknown") || (recipient.type === "owner" && actor.type === "unknown")) return "task";
  if (actor.type === "unknown" && recipient.type === "unknown") return "task";
  return "uncertain";
}

function fingerprintFor(candidate: Pick<CommitmentCandidate, "statement" | "actorType" | "actorId" | "recipientType" | "recipientId" | "sourceRef">) {
  return createHash("sha256")
    .update(JSON.stringify([
      candidate.statement.toLowerCase().replace(/\s+/g, " ").trim(),
      candidate.actorType,
      candidate.actorId ?? null,
      candidate.recipientType,
      candidate.recipientId ?? null,
      candidate.sourceRef,
    ]))
    .digest("hex");
}

function payloadText(payload: Record<string, unknown>) {
  return [
    text(payload.subject),
    text(payload.snippet),
    text(payload.summary),
    text(payload.title),
    text(payload.description),
    text(payload.body),
    text(payload.statement),
    text(payload.commitment),
    text(payload.reason),
  ].filter(Boolean).join(" ");
}

function contradictionSignal(statement: string) {
  return /\b(?:not|never|no longer|won't|can't|cannot|cancelled|canceled|withdrawn|reversed|failed)\b/i.test(statement);
}

export function commitmentStatementsContradict(left: string, right: string) {
  const words = (value: string) => new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !["will", "shall", "need", "promise", "commit", "agree"].includes(word)));
  const a = words(left);
  const b = words(right);
  const overlap = [...a].filter((word) => b.has(word)).length;
  return overlap >= 2 && contradictionSignal(left) !== contradictionSignal(right);
}

function extractDueDate(value: unknown, sourceText: string) {
  const explicit = dateValue(value);
  if (explicit) return explicit;
  const match = sourceText.match(/\b(?:by|due|before)\s+(\d{4}-\d{2}-\d{2})\b/i);
  return match ? dateValue(`${match[1]}T23:59:59.999Z`) : null;
}

export function classifyCommitmentDirection(actor: Participant, recipient: Participant) {
  return directionFor(actor, recipient);
}

export function extractCommitmentCandidate(input: {
  eventType: string;
  sourceRef: string;
  payload: Record<string, unknown>;
  occurredAt?: Date;
  actor?: Participant;
  recipient?: Participant;
  evidenceRefs?: string[];
}): CommitmentCandidate | null {
  const sourceText = payloadText(input.payload);
  if (!sourceText) return null;
  const explicitPromise = /\b(?:i|we|you|they|he|she)\s+(?:will|shall|promise|commit|agree|plan to|need to|must|send|share|provide|deliver|complete|review|reply|follow up)\b/i.test(sourceText);
  const waitingSignal = /\b(?:waiting for|awaiting|pending|follow[- ]?up|response|reply|status update|next step)\b/i.test(sourceText);
  const ambiguous = /\b(?:maybe|might|possibly|hopefully|could consider)\b/i.test(sourceText);
  if (!explicitPromise && !waitingSignal) return null;

  const actor = input.actor ?? normalizeParticipant(input.payload.actor ?? input.payload.actorRef);
  const recipient = input.recipient ?? normalizeParticipant(input.payload.recipient ?? input.payload.recipientRef);
  const direction = directionFor(actor, recipient);
  const confidence = explicitPromise ? (ambiguous ? 0.58 : 0.82) : waitingSignal ? 0.64 : 0.45;
  const statement = sourceText.slice(0, 700);
  const commitmentType = /\b(?:follow[- ]?up|response|reply|status update)\b/i.test(sourceText)
    ? "follow_up"
    : input.eventType.toLowerCase().includes("meeting") || input.eventType.toLowerCase().includes("calendar")
      ? "meeting"
      : direction === "task" ? "task" : /\b(?:send|provide|request|reply)\b/i.test(sourceText) ? "request" : "promise";
  const payload = input.payload;
  const personIds = [...new Set([
    ...stringList(payload.personIds),
    text(payload.personId),
    actor.type === "person" ? actor.id ?? "" : "",
    recipient.type === "person" ? recipient.id ?? "" : "",
  ].filter(Boolean))];
  const organizationIds = [...new Set([...stringList(payload.organizationIds), text(payload.organizationId)].filter(Boolean))];
  const projectIds = [...new Set([...stringList(payload.projectIds), text(payload.projectId)].filter(Boolean))];
  const now = input.occurredAt ?? new Date();
  const dueAt = extractDueDate(payload.dueAt ?? payload.deadline, sourceText);
  const expectedResponseAt = dateValue(payload.expectedResponseAt ?? payload.nextCheckAt);
  return {
    statement,
    actorType: actor.type,
    actorId: actor.id,
    actorLabel: actor.label,
    recipientType: recipient.type,
    recipientId: recipient.id,
    recipientLabel: recipient.label,
    direction,
    commitmentType,
    confidence,
    inferred: !explicitPromise || ambiguous,
    evidenceRefs: [...new Set([input.sourceRef, ...(input.evidenceRefs ?? [])])].slice(0, 50),
    sourceRef: input.sourceRef,
    occurredAt: now,
    dueAt,
    expectedResponseAt,
    lastMeaningfulActivityAt: now,
    importanceScore: clamp(Number(payload.importanceScore ?? payload.priority ?? 0.5)),
    projectImpactScore: clamp(Number(payload.projectImpactScore ?? payload.impactScore ?? 0.5)),
    cadenceDays: Number.isFinite(Number(payload.cadenceDays)) ? Number(payload.cadenceDays) : null,
    personIds,
    organizationIds,
    projectIds,
    contradictionRefs: stringList(payload.contradictionRefs),
    metadata: {
      eventType: input.eventType,
      explicitPromise,
      waitingSignal,
      ambiguous,
      extraction: "conservative-provider-neutral-v1",
    },
  };
}

export async function recordCommitmentCandidate(candidate: CommitmentCandidate) {
  if (candidate.confidence < MINIMUM_CANDIDATE_CONFIDENCE || !candidate.statement.trim()) return null;
  const fingerprint = fingerprintFor(candidate);
  const existing = await db.select().from(commitment).where(eq(commitment.fingerprint, fingerprint)).limit(1);
  const related = await db.select().from(commitment).orderBy(desc(commitment.updatedAt)).limit(300);
  const contradicting = related.find((item) =>
    item.fingerprint !== fingerprint
    && item.status !== "fulfilled"
    && item.actorType === candidate.actorType
    && item.actorId === (candidate.actorId ?? null)
    && item.recipientType === candidate.recipientType
    && item.recipientId === (candidate.recipientId ?? null)
    && commitmentStatementsContradict(item.statement, candidate.statement),
  );
  const now = new Date();
  if (existing[0]) {
    const current = existing[0];
    const contradictionRefs = [...new Set([...(current.contradictionRefs ?? []), ...(candidate.contradictionRefs ?? []), ...(contradicting ? [contradicting.sourceRef] : [])])];
    const [updated] = await db.update(commitment).set({
      evidenceRefs: [...new Set([...(current.evidenceRefs ?? []), ...candidate.evidenceRefs])].slice(0, 100),
      personIds: [...new Set([...(current.personIds ?? []), ...(candidate.personIds ?? [])])],
      organizationIds: [...new Set([...(current.organizationIds ?? []), ...(candidate.organizationIds ?? [])])],
      projectIds: [...new Set([...(current.projectIds ?? []), ...(candidate.projectIds ?? [])])],
      confidence: Math.max(current.confidence, candidate.confidence),
      status: contradictionRefs.length ? "uncertain" : current.status,
      contradictionRefs,
      lastMeaningfulActivityAt: candidate.lastMeaningfulActivityAt ?? current.lastMeaningfulActivityAt,
      dueAt: candidate.dueAt ?? current.dueAt,
      expectedResponseAt: candidate.expectedResponseAt ?? current.expectedResponseAt,
      metadata: { ...current.metadata, ...candidate.metadata },
      updatedAt: now,
    }).where(eq(commitment.id, current.id)).returning();
    return updated ?? current;
  }
  const [created] = await db.insert(commitment).values({
    fingerprint,
    actorType: candidate.actorType,
    actorId: candidate.actorId ?? null,
    actorLabel: candidate.actorLabel ?? null,
    recipientType: candidate.recipientType,
    recipientId: candidate.recipientId ?? null,
    recipientLabel: candidate.recipientLabel ?? null,
    direction: candidate.direction,
    commitmentType: candidate.commitmentType,
    statement: candidate.statement,
    status: candidate.confidence < 0.6 || Boolean(contradicting) ? "uncertain" : "open",
    confidence: candidate.confidence,
    inferred: candidate.inferred,
    evidenceRefs: candidate.evidenceRefs,
    personIds: candidate.personIds ?? [],
    organizationIds: candidate.organizationIds ?? [],
    projectIds: candidate.projectIds ?? [],
    contradictionRefs: [...new Set([...(candidate.contradictionRefs ?? []), ...(contradicting ? [contradicting.sourceRef] : [])])],
    dueAt: candidate.dueAt ?? null,
    expectedResponseAt: candidate.expectedResponseAt ?? null,
    lastMeaningfulActivityAt: candidate.lastMeaningfulActivityAt ?? candidate.occurredAt,
    importanceScore: candidate.importanceScore ?? 0.5,
    projectImpactScore: candidate.projectImpactScore ?? 0.5,
    cadenceDays: candidate.cadenceDays ?? null,
    sourceRef: candidate.sourceRef,
    metadata: candidate.metadata ?? {},
    createdAt: candidate.occurredAt,
    updatedAt: now,
  }).returning();
  if (created && contradicting) {
    await db.update(commitment).set({
      status: "uncertain",
      contradictionRefs: [...new Set([...(contradicting.contradictionRefs ?? []), candidate.sourceRef])],
      updatedAt: now,
    }).where(eq(commitment.id, contradicting.id));
  }
  if (created) {
    await emitEvent({
      eventType: "CommitmentCreated",
      aggregateType: "commitment",
      aggregateId: created.id,
      sourceRef: candidate.sourceRef,
      payload: {
        commitmentId: created.id,
        direction: created.direction,
        confidence: created.confidence,
        inferred: created.inferred,
        evidenceRefs: created.evidenceRefs,
      },
    });
  }
  return created ?? null;
}

function participantFromAddress(value: unknown, matchingPeople: Array<typeof person.$inferSelect>): Participant {
  const address = normalizeParticipant(value, "external");
  const email = address.label?.toLowerCase();
  const matched = matchingPeople.find((entry) => entry.email && email?.includes(entry.email.toLowerCase()));
  return matched
    ? { type: "person", id: matched.id, label: matched.displayName }
    : address;
}

async function participantsForNormalizedEvent(event: typeof normalizedConnectorEvent.$inferSelect) {
  const matchingPeople = await db.select().from(person);
  const payload = event.payload ?? {};
  const provider = event.provider.toLowerCase();
  if (provider === "gmail" || provider === "proton") {
    const from = Array.isArray(payload.from) ? payload.from[0] : payload.from;
    const to = Array.isArray(payload.to) ? payload.to[0] : payload.to;
    const incoming = /received/i.test(event.eventType) || /received/i.test(text(payload.normalizedFrom));
    return {
      actor: incoming ? participantFromAddress(from, matchingPeople) : { type: "owner", label: "Owner" },
      recipient: incoming ? { type: "owner", label: "Owner" } : participantFromAddress(to, matchingPeople),
    };
  }
  if (provider === "google_calendar" || provider === "calendar") {
    const organizer = normalizeParticipant(payload.organizer ?? payload.organizerEmail, "external");
    const attendees = Array.isArray(payload.attendees) ? payload.attendees : [];
    return {
      actor: participantFromAddress(organizer, matchingPeople),
      recipient: attendees.length ? participantFromAddress(attendees[0], matchingPeople) : { type: "unknown" },
    };
  }
  return {
    actor: normalizeParticipant(payload.actor ?? payload.actorRef),
    recipient: normalizeParticipant(payload.recipient ?? payload.recipientRef),
  };
}

export async function recordCommitmentsFromNormalizedEvent(event: typeof normalizedConnectorEvent.$inferSelect) {
  const participants = await participantsForNormalizedEvent(event);
  const candidate = extractCommitmentCandidate({
    eventType: event.payload?.normalizedFrom ? text(event.payload.normalizedFrom) : event.eventType,
    sourceRef: event.sourceRef,
    payload: event.payload,
    occurredAt: event.occurredAt,
    actor: participants.actor,
    recipient: participants.recipient,
    evidenceRefs: [event.externalId, event.sourceRef],
  });
  if (!candidate) return null;
  const result = await recordCommitmentCandidate(candidate);
  await reconcileWaitingLoops();
  return result;
}

export async function recordCommitmentsFromEvent(event: typeof eventLog.$inferSelect) {
  const candidate = extractCommitmentCandidate({
    eventType: event.eventType,
    sourceRef: event.sourceRef ?? `event:${event.id}`,
    payload: event.payload,
    occurredAt: event.occurredAt,
    actor: normalizeParticipant(event.payload.actor ?? event.payload.actorRef, event.actor === "owner" ? "owner" : "unknown"),
    recipient: normalizeParticipant(event.payload.recipient ?? event.payload.recipientRef),
    evidenceRefs: [event.id, event.sourceRef ?? `event:${event.id}`],
  });
  if (!candidate) return null;
  const result = await recordCommitmentCandidate(candidate);
  await reconcileWaitingLoops();
  return result;
}

function waitingScore(item: typeof commitment.$inferSelect, now = new Date()) {
  const activity = item.lastMeaningfulActivityAt ?? item.createdAt;
  const elapsedDays = Math.max(0, (now.getTime() - activity.getTime()) / DAY);
  const cadence = item.cadenceDays ?? 14;
  const elapsedFactor = clamp(elapsedDays / Math.max(cadence, 1));
  const deadlineFactor = item.dueAt
    ? item.dueAt <= now ? 1 : clamp(1 - (item.dueAt.getTime() - now.getTime()) / (cadence * DAY))
    : 0;
  const expectedFactor = item.expectedResponseAt && item.expectedResponseAt <= now ? 1 : 0;
  const score = 100 * (
    item.importanceScore * 0.25
    + item.projectImpactScore * 0.2
    + item.confidence * 0.15
    + elapsedFactor * 0.2
    + deadlineFactor * 0.1
    + expectedFactor * 0.1
  );
  return { score: Math.round(score), elapsedDays: Math.floor(elapsedDays), cadenceDays: cadence, deadlineFactor, expectedFactor };
}

export function shouldSurfaceWaiting(item: typeof commitment.$inferSelect, now = new Date()) {
  if (item.status !== "open" && item.status !== "uncertain") return false;
  if (item.direction === "task" && !item.dueAt && !item.expectedResponseAt) return false;
  const score = waitingScore(item, now);
  return score.score >= 48 || score.deadlineFactor > 0 || score.expectedFactor > 0 || score.elapsedDays >= score.cadenceDays * 2;
}

export async function reconcileWaitingLoops() {
  const [commitments, existingLoops, people] = await Promise.all([
    db.select().from(commitment).where(and(eq(commitment.status, "open"), gte(commitment.confidence, 0.6))),
    db.select().from(waitingLoop),
    db.select().from(person),
  ]);
  const cadenceByPerson = new Map(people.map((entry) => [entry.id, entry.recommendedCadenceDays]));
  const now = new Date();
  const results = [];
  for (const item of commitments) {
    const cadenceDays = item.cadenceDays ?? item.personIds.map((personId) => cadenceByPerson.get(personId)).find((value): value is number => Number.isFinite(value)) ?? null;
    const scoredItem = cadenceDays ? { ...item, cadenceDays } : item;
    if (!shouldSurfaceWaiting(scoredItem, now)) continue;
    const metrics = waitingScore(scoredItem, now);
    const dedupeKey = `commitment:${item.id}`;
    const existing = existingLoops.find((loop) => loop.commitmentId === item.id || loop.metadata?.dedupeKey === dedupeKey);
    const nextCheckAt = item.dueAt ?? item.expectedResponseAt ?? new Date(now.getTime() + metrics.cadenceDays * DAY);
    const values = {
      commitmentId: item.id,
      subject: item.statement,
      owner: item.direction === "owner_owes" ? item.actorLabel ?? "Owner" : item.recipientLabel ?? "Owner",
      direction: item.direction,
      actorType: item.actorType,
      actorId: item.actorId ?? null,
      recipientType: item.recipientType,
      recipientId: item.recipientId ?? null,
      personId: item.personIds?.[0] ?? item.actorId ?? item.recipientId ?? null,
      organizationId: item.organizationIds?.[0] ?? null,
      projectId: item.projectIds?.[0] ?? null,
      status: "open",
      waitingSince: item.lastMeaningfulActivityAt ?? item.createdAt,
      nextCheckAt,
      expectedResponseAt: scoredItem.expectedResponseAt ?? null,
      lastMeaningfulActivityAt: scoredItem.lastMeaningfulActivityAt ?? scoredItem.createdAt,
      importanceScore: scoredItem.importanceScore,
      projectImpactScore: scoredItem.projectImpactScore,
      confidence: scoredItem.confidence,
      cadenceDays: metrics.cadenceDays,
      sourceRefs: scoredItem.evidenceRefs,
      completionEvidenceRefs: scoredItem.completionEvidenceRefs,
      metadata: {
        dedupeKey,
        waitingScore: metrics.score,
        elapsedDays: metrics.elapsedDays,
        deadlineFactor: metrics.deadlineFactor,
        expectedFactor: metrics.expectedFactor,
        directionLabel: item.direction,
        noAutomaticFollowUp: true,
      },
      updatedAt: now,
    };
    if (existing) {
      const [updated] = await db.update(waitingLoop).set(values).where(eq(waitingLoop.id, existing.id)).returning();
      if (updated) results.push(updated);
    } else {
      const [created] = await db.insert(waitingLoop).values(values).returning();
      if (created) {
        results.push(created);
        await emitEvent({
          eventType: "WaitingLoopCreated",
          aggregateType: "waiting_loop",
          aggregateId: created.id,
          sourceRef: item.sourceRef,
          payload: { commitmentId: item.id, direction: scoredItem.direction, score: metrics.score, evidenceRefs: scoredItem.evidenceRefs },
        });
      }
    }
  }
  return results;
}

export async function completeCommitment(id: string, status: Exclude<CommitmentStatus, "open" | "uncertain">, completionEvidenceRefs: string[]) {
  if (status === "fulfilled" && completionEvidenceRefs.length === 0) throw new Error("Completion evidence is required before fulfilling a commitment.");
  const [updated] = await db.update(commitment).set({
    status,
    completionEvidenceRefs: [...new Set(completionEvidenceRefs)].slice(0, 100),
    completedAt: status === "fulfilled" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(commitment.id, id)).returning();
  if (!updated) return null;
  const loops = await db.select().from(waitingLoop).where(eq(waitingLoop.commitmentId, id));
  for (const loop of loops) {
    await db.update(waitingLoop).set({
      status: status === "fulfilled" || status === "withdrawn" || status === "expired" ? "resolved" : "open",
      completionEvidenceRefs,
      updatedAt: new Date(),
    }).where(eq(waitingLoop.id, loop.id));
  }
  await emitEvent({
    eventType: status === "fulfilled" ? "CommitmentCompleted" : "CommitmentUpdated",
    aggregateType: "commitment",
    aggregateId: id,
    sourceRef: updated.sourceRef,
    payload: { commitmentId: id, status, completionEvidenceRefs, evidenceRefs: updated.evidenceRefs },
  });
  if (status === "fulfilled") {
    for (const loop of loops) {
      await emitEvent({
        eventType: "WaitingLoopResolved",
        aggregateType: "waiting_loop",
        aggregateId: loop.id,
        sourceRef: updated.sourceRef,
        payload: { waitingLoopId: loop.id, commitmentId: id, completionEvidenceRefs },
      });
    }
  }
  return updated;
}

function matchesPerson(value: unknown, entry: typeof person.$inferSelect) {
  const haystack = JSON.stringify(value ?? {}).toLowerCase();
  const email = entry.email?.toLowerCase();
  const name = entry.displayName.toLowerCase();
  return haystack.includes(entry.id.toLowerCase()) || Boolean(email && haystack.includes(email)) || haystack.includes(name);
}

export async function reconstructPerson(personId: string) {
  const [entry] = await db.select().from(person).where(eq(person.id, personId)).limit(1);
  if (!entry) return null;
  const [interactions, promises, questions, scores, commitments, loops, providerEvents, allEvents] = await Promise.all([
    db.select().from(relationshipInteraction).where(eq(relationshipInteraction.personId, personId)).orderBy(desc(relationshipInteraction.occurredAt)).limit(100),
    db.select().from(relationshipPromise).where(eq(relationshipPromise.personId, personId)).orderBy(desc(relationshipPromise.createdAt)),
    db.select().from(relationshipQuestion).where(eq(relationshipQuestion.personId, personId)).orderBy(desc(relationshipQuestion.createdAt)),
    db.select().from(relationshipHealthScore).where(eq(relationshipHealthScore.personId, personId)).orderBy(desc(relationshipHealthScore.calculatedAt)).limit(20),
    db.select().from(commitment).orderBy(desc(commitment.updatedAt)).limit(500),
    db.select().from(waitingLoop).where(eq(waitingLoop.personId, personId)).orderBy(desc(waitingLoop.updatedAt)),
    db.select().from(normalizedConnectorEvent).orderBy(desc(normalizedConnectorEvent.occurredAt)).limit(500),
    db.select().from(eventLog).orderBy(desc(eventLog.occurredAt)).limit(1000),
  ]);
  const personCommitments = commitments.filter((item) => item.personIds.includes(personId) || item.actorId === personId || item.recipientId === personId);
  const personLoops = [...loops, ...await db.select().from(waitingLoop).where(eq(waitingLoop.recipientId, personId))].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
  const relatedProviderEvents = providerEvents.filter((event) => matchesPerson(event.payload, entry));
  const relatedEvents = allEvents.filter((event) => matchesPerson(event.payload, entry));
  const importantMessages = relatedProviderEvents.filter((event) => ["gmail", "proton"].includes(event.provider) && /received|sent|thread/i.test(`${event.eventType} ${JSON.stringify(event.payload)}`));
  const documents = relatedProviderEvents.filter((event) => ["google_drive", "drive"].includes(event.provider) || /document|file/i.test(event.eventType));
  const meetings = relatedProviderEvents.filter((event) => ["google_calendar", "calendar"].includes(event.provider) || /meeting|calendar/i.test(event.eventType));
  const decisions = relatedEvents.filter((event) => /decision|recommendation|governance/i.test(event.eventType));
  const openCommitments = personCommitments.filter((item) => item.status === "open" || item.status === "uncertain");
  const openWaiting = personLoops.filter((item) => item.status === "open");
  const overdue = openCommitments.filter((item) => item.dueAt && item.dueAt < new Date()).length;
  const healthScore = Math.max(0, Math.min(100, 70 - overdue * 15 - openWaiting.length * 5 + Math.min(interactions.length, 6) * 5));
  const organizations = [...new Set([
    text(entry.metadata?.organizationName),
    text(entry.metadata?.organization),
    ...personCommitments.flatMap((item) => item.organizationIds),
  ].filter(Boolean))];
  const projects = [...new Set([
    ...(entry.projects ?? []),
    ...personCommitments.flatMap((item) => item.projectIds),
    ...relatedEvents.flatMap((event) => [text(event.payload.projectId), ...stringList(event.payload.projectIds)]),
  ].filter(Boolean))];
  const evidence = [...new Set([
    ...interactions.map((item) => item.sourceRef),
    ...questions.map((item) => item.sourceRef),
    ...personCommitments.flatMap((item) => [...item.evidenceRefs, item.sourceRef]),
    ...importantMessages.map((item) => item.sourceRef),
    ...documents.map((item) => item.sourceRef),
    ...meetings.map((item) => item.sourceRef),
  ])].slice(0, 200);
  const lastActivity = [entry.lastInteractionAt, ...interactions.map((item) => item.occurredAt), ...personCommitments.map((item) => item.lastMeaningfulActivityAt)].filter((item): item is Date => item instanceof Date).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const cadenceDays = entry.recommendedCadenceDays;
  const cadenceState = !lastActivity ? "unknown" : (Date.now() - lastActivity.getTime()) / DAY <= cadenceDays ? "within cadence" : "past recommended cadence";
  return {
    person: { ...entry, organizationIds: organizations, projectIds: projects },
    identity: { displayName: entry.displayName, email: entry.email, roles: entry.roles, organizationalRole: entry.organizationalRole, organizations, projects },
    interactions,
    importantMessages,
    documents,
    meetings,
    commitments: personCommitments,
    legacyPromises: promises,
    unresolvedQuestions: questions.filter((item) => item.status === "open"),
    waitingLoops: personLoops,
    decisions,
    cadence: { recommendedDays: cadenceDays, lastMeaningfulActivityAt: lastActivity, state: cadenceState },
    health: { score: healthScore, relationshipHealth: entry.relationshipHealth, momentum: interactions.length >= 3 ? "active" : interactions.length ? "warming" : "dormant", overdueCommitments: overdue },
    status: {
      summary: `${entry.displayName} has ${openCommitments.length} open commitment${openCommitments.length === 1 ? "" : "s"}, ${openWaiting.length} waiting loop${openWaiting.length === 1 ? "" : "s"}, and is ${cadenceState}.`,
      directionCounts: {
        ownerOwes: personCommitments.filter((item) => item.direction === "owner_owes").length,
        owedByOther: personCommitments.filter((item) => item.direction === "owed_by_other").length,
        mutualWaiting: personCommitments.filter((item) => item.direction === "mutual_waiting").length,
        tasks: personCommitments.filter((item) => item.direction === "task").length,
        uncertain: personCommitments.filter((item) => item.direction === "uncertain" || item.status === "uncertain").length,
      },
    },
    evidence,
    provenance: { source: "relationship-ledger", graphPreserved: true, generatedAt: new Date().toISOString() },
    healthHistory: scores,
  };
}

export async function findPerson(nameOrId: string) {
  const value = nameOrId.trim().toLowerCase();
  const people = await db.select().from(person);
  return people.find((entry) => entry.id === nameOrId || entry.displayName.toLowerCase() === value || entry.email?.toLowerCase() === value)
    ?? people.find((entry) => entry.displayName.toLowerCase().includes(value))
    ?? null;
}

export async function listCommitments(filters: { personId?: string; status?: string; direction?: string } = {}) {
  const rows = await db.select().from(commitment).orderBy(desc(commitment.updatedAt)).limit(500);
  return rows.filter((item) =>
    (!filters.personId || item.personIds.includes(filters.personId) || item.actorId === filters.personId || item.recipientId === filters.personId)
    && (!filters.status || item.status === filters.status)
    && (!filters.direction || item.direction === filters.direction),
  );
}

export async function listWaitingIntelligence(filters: { personId?: string; direction?: string } = {}) {
  const rows = await db.select().from(waitingLoop).orderBy(desc(waitingLoop.updatedAt)).limit(500);
  return rows.filter((item) => (!filters.personId || item.personId === filters.personId || item.actorId === filters.personId || item.recipientId === filters.personId) && (!filters.direction || item.direction === filters.direction));
}

export function registerCommitmentIntelligence() {
  const eventTypes = [
    "EmailReceived", "ThreadUpdated", "EmailSentDetected", "DocumentCreated", "DocumentUpdated",
    "FileCreated", "FileUpdated", "CommitPushed", "PRMerged", "BuildFailed",
    "CalendarEventCreated", "CalendarEventUpdated", "MeetingWithPersonDetected",
    "SourceVaultRecordCreated", "InteractionRecorded",
  ] as const;
  return eventTypes.map((eventType) => subscribe(eventType as DomainEventType, (event) => {
    void recordCommitmentsFromEvent(event).catch(() => undefined);
  }));
}