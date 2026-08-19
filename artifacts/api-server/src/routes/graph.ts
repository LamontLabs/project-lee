import { and, eq, inArray } from "drizzle-orm";
import {
  CreateGraphEdgeBody,
  CreateGraphEdgeResponse,
  TraverseGraphResponse,
} from "@workspace/api-zod";
import { db, eventLog, graphEdge, graphNode } from "@workspace/db";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const edgeTypes = new Set([
  "SUPPORTS",
  "CONTRADICTS",
  "DERIVED_FROM",
  "RELATES_TO",
  "OWNED_BY",
  "PART_OF",
  "DEPENDS_ON_PORTFOLIO",
]);

async function ensureNode(
  tx: any,
  objectType: string,
  objectId: string,
) {
  const [existing] = await tx
    .select()
    .from(graphNode)
    .where(and(eq(graphNode.objectType, objectType), eq(graphNode.objectId, objectId)))
    .limit(1);
  if (existing) return { node: existing, created: false };
  const [node] = await tx.insert(graphNode).values({ objectType, objectId }).returning();
  return { node, created: true };
}

router.post("/graph/edges", async (req, res): Promise<void> => {
  const parsed = CreateGraphEdgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  if (!edgeTypes.has(input.edgeType)) {
    res.status(400).json({ error: `Unsupported edge type: ${input.edgeType}` });
    return;
  }
  const result = await db.transaction(async (tx) => {
    const source = await ensureNode(tx, input.sourceType, input.sourceId);
    const target = await ensureNode(tx, input.targetType, input.targetId);
    const [edge] = await tx
      .insert(graphEdge)
      .values({
        sourceNodeId: source.node.id,
        targetNodeId: target.node.id,
        edgeType: input.edgeType,
        confidence: input.confidence ?? 0.5,
        sourceRef: input.sourceRef,
        metadata: input.metadata ?? {},
      })
      .onConflictDoNothing({
        target: [graphEdge.sourceNodeId, graphEdge.targetNodeId, graphEdge.edgeType],
      })
      .returning();
    if (!edge) {
      throw new Error("Graph edge already exists.");
    }
    const events = [];
    if (source.created) {
      events.push({
        eventType: "GraphNodeAdded",
        aggregateType: "graph_node",
        aggregateId: source.node.id,
        sourceRef: input.sourceRef,
        occurredAt: new Date(),
        payload: { objectType: input.sourceType, objectId: input.sourceId },
      });
    }
    if (target.created) {
      events.push({
        eventType: "GraphNodeAdded",
        aggregateType: "graph_node",
        aggregateId: target.node.id,
        sourceRef: input.sourceRef,
        occurredAt: new Date(),
        payload: { objectType: input.targetType, objectId: input.targetId },
      });
    }
    events.push(
      {
        eventType: "GraphEdgeCreated",
        aggregateType: "graph_edge",
        aggregateId: edge.id,
        sourceRef: input.sourceRef,
        occurredAt: new Date(),
        payload: { edgeType: edge.edgeType, sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId },
      },
      {
        eventType: "GraphUpdated",
        aggregateType: "graph",
        aggregateId: edge.id,
        sourceRef: input.sourceRef,
        occurredAt: new Date(),
        payload: { edgeId: edge.id },
      },
    );
    const [createdEvents] = await tx.insert(eventLog).values(events).returning();
    return { edge, source: source.node, target: target.node, eventId: createdEvents.id };
  });

  res.status(201).json(CreateGraphEdgeResponse.parse({
    id: result.edge.id,
    sourceType: result.source.objectType,
    sourceId: result.source.objectId,
    targetType: result.target.objectType,
    targetId: result.target.objectId,
    edgeType: result.edge.edgeType,
    confidence: result.edge.confidence,
    sourceRef: result.edge.sourceRef,
    metadata: result.edge.metadata,
    createdAt: result.edge.createdAt,
  }));
});

router.get("/graph/traverse/:objectType/:objectId", async (req, res): Promise<void> => {
  const rawDepth = Array.isArray(req.query.depth) ? req.query.depth[0] : req.query.depth;
  const depthValue = typeof rawDepth === "string" ? Number(rawDepth) : 1;
  const depth = Math.max(1, Math.min(5, depthValue));
  const [root] = await db
    .select()
    .from(graphNode)
    .where(and(eq(graphNode.objectType, req.params.objectType), eq(graphNode.objectId, req.params.objectId)))
    .limit(1);
  if (!root) {
    res.json({ root: { objectType: req.params.objectType, objectId: req.params.objectId }, nodes: [], edges: [] });
    return;
  }

  let frontier = [root.id];
  const seenNodes = new Set(frontier);
  const edges: typeof graphEdge.$inferSelect[] = [];
  for (let level = 0; level < depth && frontier.length > 0; level += 1) {
    const nextEdges = await db
      .select()
      .from(graphEdge)
      .where(inArray(graphEdge.sourceNodeId, frontier));
    edges.push(...nextEdges);
    frontier = nextEdges
      .map((edge) => edge.targetNodeId)
      .filter((nodeId) => !seenNodes.has(nodeId));
    frontier.forEach((nodeId) => seenNodes.add(nodeId));
  }
  const nodes = await db.select().from(graphNode).where(inArray(graphNode.id, [...seenNodes]));
  res.json(TraverseGraphResponse.parse({
    root,
    nodes,
    edges,
  }));
});

export default router;