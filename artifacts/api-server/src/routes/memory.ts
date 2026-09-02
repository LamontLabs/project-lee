import { createHash } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  ConsolidateMemoryResponse,
  IndexMemoryObjectBody,
  IndexMemoryObjectResponse,
  SearchMemoryQueryParams,
  SearchMemoryResponse,
} from "@workspace/api-zod";
import { db, eventLog, factLedger, memoryConflict, memoryIndex } from "@workspace/db";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

function serializeIndex(entry: typeof memoryIndex.$inferSelect) {
  return {
    ...entry,
    projectId: entry.projectId ?? undefined,
    entityId: entry.entityId ?? undefined,
  };
}

router.post("/memory/index", async (req, res): Promise<void> => {
  const parsed = IndexMemoryObjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const [entry] = await db
    .insert(memoryIndex)
    .values({
      objectType: input.objectType,
      objectId: input.objectId,
      tags: input.tags,
      projectId: input.projectId,
      entityId: input.entityId,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      metadata: input.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [memoryIndex.objectType, memoryIndex.objectId],
      set: {
        tags: input.tags,
        projectId: input.projectId,
        entityId: input.entityId,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
        metadata: input.metadata ?? {},
      },
    })
    .returning();
  res.status(201).json(IndexMemoryObjectResponse.parse(serializeIndex(entry)));
});

router.get("/memory/search", async (req, res): Promise<void> => {
  const parsed = SearchMemoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const query = parsed.data;
  const conditions = [];
  if (query.projectId) conditions.push(eq(memoryIndex.projectId, query.projectId));
  if (query.entityId) conditions.push(eq(memoryIndex.entityId, query.entityId));
  if (query.from) conditions.push(gte(memoryIndex.recordedAt, new Date(query.from)));
  if (query.to) conditions.push(lte(memoryIndex.recordedAt, new Date(query.to)));
  const entries = await db
    .select()
    .from(memoryIndex)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const filtered = query.tag
    ? entries.filter((entry) => entry.tags.includes(query.tag!))
    : entries;
  res.json(SearchMemoryResponse.parse(filtered.map(serializeIndex)));
});

router.post("/memory/consolidate", async (_req, res): Promise<void> => {
  const facts = await db.select().from(factLedger);
  const conflicts: Array<Record<string, unknown>> = [];
  for (let leftIndex = 0; leftIndex < facts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < facts.length; rightIndex += 1) {
      const left = facts[leftIndex];
      const right = facts[rightIndex];
      if (left.subject !== right.subject || left.predicate !== right.predicate || left.object === right.object) continue;
      const [first, second] = [left.id, right.id].sort();
      const conflictKey = createHash("sha256")
        .update(`${first}:${second}`)
        .digest("hex");
      const summary = `Conflicting facts for ${left.subject} ${left.predicate}: "${left.object}" vs "${right.object}".`;
      const [conflict] = await db
        .insert(memoryConflict)
        .values({
          conflictKey,
          leftObjectType: "fact",
          leftObjectId: first,
          rightObjectType: "fact",
          rightObjectId: second,
          summary,
          metadata: {
            subject: left.subject,
            predicate: left.predicate,
            leftConfidence: left.confidence,
            rightConfidence: right.confidence,
          },
        })
        .onConflictDoNothing({ target: memoryConflict.conflictKey })
        .returning();
      conflicts.push({
        id: conflict?.id,
        conflictKey,
        summary,
        status: conflict?.status ?? "open",
        leftObjectId: first,
        rightObjectId: second,
      });
    }
  }
  const [event] = await db
    .insert(eventLog)
    .values({
      eventType: conflicts.length > 0 ? "ConflictDetected" : "MemoryConsolidated",
      aggregateType: "memory",
      aggregateId: "consolidation",
      sourceRef: "memory-architecture",
      occurredAt: new Date(),
      payload: {
        factCount: facts.length,
        conflictCount: conflicts.length,
        conflictKeys: conflicts.map((conflict) => conflict.conflictKey),
      },
    })
    .returning();
  res.json(
    ConsolidateMemoryResponse.parse({
      factCount: facts.length,
      conflictCount: conflicts.length,
      conflicts,
      eventId: event.id,
    }),
  );
});

export default router;