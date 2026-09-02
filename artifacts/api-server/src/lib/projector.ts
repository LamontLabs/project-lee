import { createHash } from "node:crypto";
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import {
  db,
  eventLog,
  leeState,
  projectionCheckpoint,
  projectionEventReceipt,
  stateHistory,
  universalObject,
} from "@workspace/db";

export const PROJECTION_NAMES = ["universal_objects", "operational_state"] as const;
export type ProjectionName = typeof PROJECTION_NAMES[number];
export type ProjectionConflict = { projection: ProjectionName; eventId: string; reason: string };
export type ProjectionResult = {
  projection: ProjectionName;
  processed: number;
  skipped: number;
  conflicts: ProjectionConflict[];
  lastEventId: string | null;
  dryRun: boolean;
};

const projectionForEvent = (eventType: string): ProjectionName | null => {
  if (eventType === "UniversalObjectCreated" || eventType === "UniversalObjectUpdated") return "universal_objects";
  if (eventType === "StateInitialized" || eventType === "StateChanged") return "operational_state";
  return null;
};

const eventHash = (event: typeof eventLog.$inferSelect) =>
  createHash("sha256").update(JSON.stringify({
    id: event.id,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    occurredAt: new Date(event.occurredAt).toISOString(),
  })).digest("hex");

async function checkpointFor(projection: ProjectionName) {
  const [checkpoint] = await db.select().from(projectionCheckpoint).where(eq(projectionCheckpoint.projectionName, projection)).limit(1);
  return checkpoint;
}

async function applyObjectEvent(event: typeof eventLog.$inferSelect, dryRun: boolean): Promise<string | null> {
  const payload = event.payload;
  const [existing] = await db.select().from(universalObject).where(eq(universalObject.id, event.aggregateId)).limit(1);
  if (event.eventType === "UniversalObjectCreated") {
    if (existing) {
      if (existing.name !== String(payload.name ?? existing.name) || existing.objectType !== String(payload.objectType ?? existing.objectType)) {
        return "Create conflicts with an existing object.";
      }
      return null;
    }
    if (!dryRun) {
      await db.insert(universalObject).values({
        id: event.aggregateId,
        objectType: String(payload.objectType),
        name: String(payload.name),
        description: typeof payload.description === "string" ? payload.description : null,
        status: typeof payload.status === "string" ? payload.status : "active",
        sourceRefs: Array.isArray(payload.sourceRefs) ? payload.sourceRefs.filter((value): value is string => typeof value === "string") : [],
        version: event.sequenceNumber,
        createdBy: typeof payload.createdBy === "string" ? payload.createdBy : "owner",
         modifiedBy: typeof payload.modifiedBy === "string" ? payload.modifiedBy : undefined,
        currentOwner: typeof payload.currentOwner === "string" ? payload.currentOwner : "owner",
        importedFrom: payload.importedFrom && typeof payload.importedFrom === "object" ? payload.importedFrom as Record<string, unknown> : undefined,
        generatedBy: payload.generatedBy && typeof payload.generatedBy === "object" ? payload.generatedBy as Record<string, unknown> : undefined,
      });
    }
    return null;
  }
  if (!existing) {
    const [repairedCreate] = await db.select({ payload: eventLog.payload }).from(eventLog).where(and(
      eq(eventLog.eventType, "UniversalObjectCreated"),
      eq(eventLog.aggregateType, event.aggregateType),
      eq(eventLog.aggregateId, event.aggregateId),
    )).limit(1);
    if (repairedCreate?.payload.legacyRepair === true) return null;
    return "Update targets an object that is not present.";
  }
  if (event.sequenceNumber < existing.version) return null;
  if (!dryRun) {
    await db.update(universalObject).set({
      ...(typeof payload.name === "string" ? { name: payload.name } : {}),
      ...(typeof payload.description === "string" ? { description: payload.description } : {}),
      ...(typeof payload.status === "string" ? { status: payload.status } : {}),
      ...(Array.isArray(payload.sourceRefs) ? { sourceRefs: payload.sourceRefs.filter((value): value is string => typeof value === "string") } : {}),
      version: event.sequenceNumber,
      updatedAt: event.occurredAt,
      ...(typeof payload.modifiedBy === "string" ? { modifiedBy: payload.modifiedBy } : {}),
      ...(typeof payload.currentOwner === "string" ? { currentOwner: payload.currentOwner } : {}),
      ...(payload.importedFrom && typeof payload.importedFrom === "object" ? { importedFrom: payload.importedFrom as Record<string, unknown> } : {}),
      ...(payload.generatedBy && typeof payload.generatedBy === "object" ? { generatedBy: payload.generatedBy as Record<string, unknown> } : {}),
    }).where(eq(universalObject.id, event.aggregateId));
  }
  return null;
}

async function applyStateEvent(event: typeof eventLog.$inferSelect, dryRun: boolean): Promise<string | null> {
  const payload = event.payload;
  const nextState = String(payload.to ?? payload.state ?? "Idle");
  const enteredAt = payload.enteredAt ? new Date(String(payload.enteredAt)) : event.occurredAt;
  const reason = String(payload.reason ?? "Event-sourced state transition");
  const [current] = await db.select().from(leeState).limit(1);
  if (event.eventType === "StateChanged" && current && current.currentState === nextState) return null;
  if (!dryRun) {
    if (!current) {
      await db.insert(leeState).values({ id: event.aggregateId, currentState: nextState, enteredAt, reason, estimatedDurationSeconds: typeof payload.estimatedDurationSeconds === "number" ? payload.estimatedDurationSeconds : undefined, updatedAt: event.occurredAt });
    } else {
      await db.update(stateHistory).set({ exitedAt: enteredAt, durationSeconds: typeof payload.durationSeconds === "number" ? payload.durationSeconds : undefined }).where(and(eq(stateHistory.state, current.currentState), isNull(stateHistory.exitedAt)));
      await db.update(leeState).set({ currentState: nextState, enteredAt, reason, estimatedDurationSeconds: typeof payload.estimatedDurationSeconds === "number" ? payload.estimatedDurationSeconds : undefined, updatedAt: event.occurredAt }).where(eq(leeState.id, current.id));
    }
    await db.insert(stateHistory).values({ state: nextState, enteredAt, reason, triggeringJobId: typeof payload.triggeringJobId === "string" ? payload.triggeringJobId : undefined });
  }
  return null;
}

export async function projectEvent(event: typeof eventLog.$inferSelect, options: { dryRun?: boolean } = {}) {
  const projection = projectionForEvent(event.eventType);
  if (!projection) return { applied: false, conflict: null as string | null };
  const dryRun = options.dryRun ?? false;
  if (!dryRun) {
    const [receipt] = await db.select().from(projectionEventReceipt).where(and(eq(projectionEventReceipt.projectionName, projection), eq(projectionEventReceipt.eventId, event.id))).limit(1);
    if (receipt) return { applied: false, conflict: null };
  }
  const conflict = projection === "universal_objects" ? await applyObjectEvent(event, dryRun) : await applyStateEvent(event, dryRun);
  if (!dryRun && !conflict) {
    await db.insert(projectionEventReceipt).values({ projectionName: projection, eventId: event.id, eventHash: eventHash(event) }).onConflictDoNothing();
  }
  return { applied: !conflict, conflict };
}

export async function rebuildProjection(projection: ProjectionName, options: { dryRun?: boolean; reset?: boolean } = {}): Promise<ProjectionResult> {
  const dryRun = options.dryRun ?? false;
  if (options.reset && !dryRun) {
    if (projection === "universal_objects") await db.delete(universalObject);
    if (projection === "operational_state") {
      await db.delete(stateHistory);
      await db.delete(leeState);
    }
    await db.delete(projectionEventReceipt).where(eq(projectionEventReceipt.projectionName, projection));
    await db.delete(projectionCheckpoint).where(eq(projectionCheckpoint.projectionName, projection));
  }
  const checkpoint = dryRun || options.reset ? null : await checkpointFor(projection);
  const cursor = checkpoint?.lastCreatedAt && checkpoint.lastEventId
    ? or(gt(eventLog.createdAt, checkpoint.lastCreatedAt), and(eq(eventLog.createdAt, checkpoint.lastCreatedAt), gt(eventLog.id, checkpoint.lastEventId)))
    : undefined;
  const events = await db.select().from(eventLog).where(cursor).orderBy(asc(eventLog.createdAt), asc(eventLog.id));
  let processed = 0;
  let skipped = 0;
  let conflictCount = checkpoint?.conflictCount ?? 0;
  let lastEventId = checkpoint?.lastEventId ?? null;
  const conflicts: ProjectionConflict[] = [];
  for (const event of events) {
    if (projectionForEvent(event.eventType) !== projection) continue;
    lastEventId = event.id;
    const result = await projectEvent(event, { dryRun });
    if (result.conflict) {
      conflictCount += 1;
      conflicts.push({ projection, eventId: event.id, reason: result.conflict });
    } else if (result.applied) {
      processed += 1;
    } else {
      skipped += 1;
    }
    if (!dryRun) {
      await db.insert(projectionCheckpoint).values({ projectionName: projection, lastCreatedAt: event.createdAt, lastEventId: event.id, processedCount: (checkpoint?.processedCount ?? 0) + processed, conflictCount, status: conflicts.length ? "conflicted" : "ready", updatedAt: new Date() }).onConflictDoUpdate({ target: projectionCheckpoint.projectionName, set: { lastCreatedAt: event.createdAt, lastEventId: event.id, processedCount: (checkpoint?.processedCount ?? 0) + processed, conflictCount, status: conflicts.length ? "conflicted" : "ready", updatedAt: new Date() } });
    }
  }
  return { projection, processed, skipped, conflicts, lastEventId, dryRun };
}

export async function rebuildAllProjections(options: { dryRun?: boolean; reset?: boolean } = {}) {
  return Promise.all(PROJECTION_NAMES.map((projection) => rebuildProjection(projection, options)));
}

export async function projectionCheckpoints() {
  return db.select().from(projectionCheckpoint).orderBy(asc(projectionCheckpoint.projectionName));
}

export async function replayFrom(eventId?: string) {
  return rebuildAllProjections({ reset: !eventId });
}