import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db, eventLog, graphEdge, graphNode } from "@workspace/db";
import { Router, type IRouter } from "express";
import {
  REALITY_ENTITY_TYPES,
  REALITY_RELATIONSHIP_TYPES,
  graphRelationshipInputSchema,
  identityResolutionSchema,
  isReviewableState,
  normalizeRelationship,
  resolveIdentity,
  relationshipState,
  serializeGraphEdge,
} from "../lib/reality-graph";

const router: IRouter = Router();
const entityTypes = new Set<string>(REALITY_ENTITY_TYPES);
const edgeTypes = new Set<string>(REALITY_RELATIONSHIP_TYPES);

async function ensureNode(tx: any, objectType: string, objectId: string, label?: string) {
  const [existing] = await tx.select().from(graphNode).where(and(eq(graphNode.objectType, objectType), eq(graphNode.objectId, objectId))).limit(1);
  if (existing) {
    if (label && existing.label !== label) {
      const [updated] = await tx.update(graphNode).set({ label, modifiedAt: new Date(), modifiedBy: "reality-graph" }).where(eq(graphNode.id, existing.id)).returning();
      return { node: updated ?? existing, created: false };
    }
    return { node: existing, created: false };
  }
  const [node] = await tx.insert(graphNode).values({ objectType, objectId, label, createdBy: "reality-graph" }).returning();
  return { node, created: true };
}

function validateEntityType(value: string) {
  const normalized = value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (!entityTypes.has(normalized)) throw new Error(`Unsupported reality entity type: ${value}.`);
  return normalized;
}

function allowCandidates(req: any) {
  return req.query.includeCandidates === "true";
}

function visibleEdge(edge: any, includeCandidates: boolean) {
  const state = relationshipState(edge.metadata);
  return state !== "REJECTED" && (includeCandidates || !isReviewableState(state));
}

async function createRelationship(input: unknown, mode: "direct" | "candidate") {
  const parsed = graphRelationshipInputSchema.parse(input);
  const sourceType = validateEntityType(parsed.sourceType);
  const targetType = validateEntityType(parsed.targetType);
  if (!edgeTypes.has(parsed.edgeType)) throw new Error(`Unsupported relationship type: ${parsed.edgeType}.`);
  const normalized = normalizeRelationship({
    ...parsed,
    sourceType,
    targetType,
    relationshipState: mode === "candidate" && parsed.relationshipState !== "CONTRADICTED" ? undefined : parsed.relationshipState,
    ownerConfirmation: mode === "candidate" ? false : parsed.ownerConfirmation,
  });

  return db.transaction(async (tx) => {
    const source = await ensureNode(tx, normalized.sourceType, normalized.sourceId, parsed.metadata?.sourceLabel as string | undefined);
    const target = await ensureNode(tx, normalized.targetType, normalized.targetId, parsed.metadata?.targetLabel as string | undefined);
    const [created] = await tx.insert(graphEdge).values({
      sourceNodeId: source.node.id,
      targetNodeId: target.node.id,
      edgeType: normalized.edgeType,
      confidence: normalized.confidence,
      weight: normalized.confidence,
      freshnessScore: 1,
      lastConfirmedAt: normalized.relationshipState === "CONFIRMED" || normalized.relationshipState === "OWNER_DECLARED" ? new Date() : null,
      sourceRef: normalized.provenance.sourceRef,
      metadata: normalized.metadata,
    }).onConflictDoNothing({
      target: [graphEdge.sourceNodeId, graphEdge.targetNodeId, graphEdge.edgeType],
    }).returning();

    if (!created) {
      const [existing] = await tx.select().from(graphEdge).where(and(
        eq(graphEdge.sourceNodeId, source.node.id),
        eq(graphEdge.targetNodeId, target.node.id),
        eq(graphEdge.edgeType, normalized.edgeType),
      )).limit(1);
      if (!existing) throw new Error("Relationship deduplication failed.");
      const existingMetadata = (existing.metadata ?? {}) as Record<string, unknown>;
      const existingProvenance = (existingMetadata.provenance ?? {}) as Record<string, unknown>;
      const evidenceRefs = [...new Set([
        ...(Array.isArray(existingProvenance.evidenceRefs) ? existingProvenance.evidenceRefs : []),
        ...normalized.provenance.evidenceRefs,
      ])].slice(0, 100);
      const [merged] = await tx.update(graphEdge).set({
        metadata: { ...existingMetadata, provenance: { ...existingProvenance, evidenceRefs }, lastObservedAt: new Date().toISOString() },
        freshnessScore: 1,
      }).where(eq(graphEdge.id, existing.id)).returning();
      return { edge: merged ?? existing, source: source.node, target: target.node, created: false };
    }

    const events = [
      ...(source.created ? [{ eventType: "GraphNodeAdded", aggregateType: "graph_node", aggregateId: source.node.id, sourceRef: normalized.provenance.sourceRef, occurredAt: new Date(), payload: { objectType: source.node.objectType, objectId: source.node.objectId } }] : []),
      ...(target.created ? [{ eventType: "GraphNodeAdded", aggregateType: "graph_node", aggregateId: target.node.id, sourceRef: normalized.provenance.sourceRef, occurredAt: new Date(), payload: { objectType: target.node.objectType, objectId: target.node.objectId } }] : []),
      { eventType: normalized.relationshipState === "WEAK_CANDIDATE" || normalized.relationshipState === "STRONGLY_INFERRED" ? "GraphRelationshipCandidateCreated" : "GraphEdgeCreated", aggregateType: "graph_edge", aggregateId: created.id, sourceRef: normalized.provenance.sourceRef, occurredAt: new Date(), payload: { edgeType: created.edgeType, sourceNodeId: created.sourceNodeId, targetNodeId: created.targetNodeId, relationshipState: normalized.relationshipState, provenance: normalized.provenance } },
    ];
    await tx.insert(eventLog).values(events);
    return { edge: created, source: source.node, target: target.node, created: true };
  });
}

function serializeNeighborhood(root: any, nodes: any[], edges: any[], includeCandidates: boolean) {
  const visible = edges.filter((edge) => visibleEdge(edge, includeCandidates)).map(serializeGraphEdge);
  const nodeIds = new Set(visible.flatMap((edge) => [edge.sourceNodeId, edge.targetNodeId]));
  nodeIds.add(root.id);
  return {
    root: { ...root, entityType: root.objectType, entityId: root.objectId },
    entities: nodes.filter((node) => nodeIds.has(node.id)).map((node) => ({ ...node, entityType: node.objectType, entityId: node.objectId })),
    nodes: nodes.filter((node) => nodeIds.has(node.id)),
    relationships: visible,
    edges: visible,
    reviewableCandidates: visible.filter((edge) => isReviewableState(edge.relationshipState)),
  };
}

async function collectNeighborhood(root: any, depth: number, includeCandidates: boolean) {
  let frontier = [root.id];
  const seen = new Set(frontier);
  const collected: any[] = [];
  for (let level = 0; level < depth && frontier.length; level += 1) {
    const next = await db.select().from(graphEdge).where(or(inArray(graphEdge.sourceNodeId, frontier), inArray(graphEdge.targetNodeId, frontier)));
    const visible = next.filter((edge) => visibleEdge(edge, includeCandidates));
    collected.push(...visible.filter((edge) => !collected.some((current) => current.id === edge.id)));
    frontier = [...new Set(visible.flatMap((edge) => [edge.sourceNodeId, edge.targetNodeId]).filter((id) => !seen.has(id)))];
    frontier.forEach((id) => seen.add(id));
  }
  const nodes = seen.size ? await db.select().from(graphNode).where(inArray(graphNode.id, [...seen])) : [];
  return serializeNeighborhood(root, nodes, collected, includeCandidates);
}

router.post("/graph/edges", async (req, res): Promise<void> => {
  try {
    const result = await createRelationship(req.body, "direct");
    res.status(result.created ? 201 : 200).json({ ...serializeGraphEdge(result.edge), sourceType: result.source.objectType, sourceId: result.source.objectId, targetType: result.target.objectType, targetId: result.target.objectId, deduplicated: !result.created });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Graph relationship could not be created." });
  }
});

router.post("/graph/candidates", async (req, res): Promise<void> => {
  try {
    const result = await createRelationship(req.body, "candidate");
    res.status(result.created ? 201 : 200).json({ ...serializeGraphEdge(result.edge), sourceType: result.source.objectType, sourceId: result.source.objectId, targetType: result.target.objectType, targetId: result.target.objectId, deduplicated: !result.created });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Relationship candidate could not be created." });
  }
});

router.post("/graph/identity/resolve", async (req, res): Promise<void> => {
  try {
    const input = identityResolutionSchema.parse(req.body);
    const result = resolveIdentity(input);
    if (result.status === "NO_MATCH") {
      res.json({ ...result, candidate: null, promotion: "not-created" });
      return;
    }
    const relationship = await createRelationship({
      sourceType: input.left.objectType,
      sourceId: input.left.objectId,
      targetType: input.right.objectType,
      targetId: input.right.objectId,
      edgeType: "SAME_AS",
      confidence: result.candidate,
      sourceRef: `provider:identity:${input.left.provider}:${input.left.externalId}`,
      evidenceRefs: [
        `provider:${input.left.provider}:${input.left.externalId}`,
        `provider:${input.right.provider}:${input.right.externalId}`,
      ],
      metadata: { identityResolution: true, matchReasons: result.reasons, matchScore: result.candidate },
    }, "candidate");
    res.status(relationship.created ? 201 : 200).json({ ...result, candidate: serializeGraphEdge(relationship.edge), promotion: "owner-review-required", deduplicated: !relationship.created });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Identity resolution could not be evaluated." });
  }
});

router.get("/graph/candidates", async (req, res) => {
  const edges = (await db.select().from(graphEdge).orderBy(desc(graphEdge.createdAt))).map(serializeGraphEdge).filter((edge) => isReviewableState(edge.relationshipState)).slice(0, 250);
  res.json({ candidates: edges, count: edges.length, reviewRequired: edges.length > 0 });
});

router.post("/graph/edges/:id/promote", async (req, res): Promise<void> => {
  if (req.body?.ownerConfirmation !== true) { res.status(400).json({ error: "Owner confirmation is required to promote a relationship." }); return; }
  const requested = req.body?.relationshipState === "OWNER_DECLARED" ? "OWNER_DECLARED" : "CONFIRMED";
  const [edge] = await db.select().from(graphEdge).where(eq(graphEdge.id, req.params.id)).limit(1);
  if (!edge) { res.status(404).json({ error: "Graph relationship not found." }); return; }
  const existing = (edge.metadata ?? {}) as Record<string, unknown>;
  const [updated] = await db.update(graphEdge).set({
    lastConfirmedAt: new Date(),
    metadata: { ...existing, relationshipState: requested, promotedAt: new Date().toISOString(), promotedBy: "owner", ownerConfirmation: true },
  }).where(eq(graphEdge.id, edge.id)).returning();
  await db.insert(eventLog).values({ eventType: "GraphRelationshipPromoted", aggregateType: "graph_edge", aggregateId: edge.id, sourceRef: typeof req.body?.sourceRef === "string" ? req.body.sourceRef : edge.sourceRef, occurredAt: new Date(), payload: { from: relationshipState(edge.metadata), to: requested, ownerConfirmed: true } });
  res.json(serializeGraphEdge(updated ?? edge));
});

router.post("/graph/edges/:id/reject", async (req, res): Promise<void> => {
  const [edge] = await db.select().from(graphEdge).where(eq(graphEdge.id, req.params.id)).limit(1);
  if (!edge) { res.status(404).json({ error: "Graph relationship not found." }); return; }
  const existing = (edge.metadata ?? {}) as Record<string, unknown>;
  const [updated] = await db.update(graphEdge).set({ metadata: { ...existing, relationshipState: "REJECTED", rejectedAt: new Date().toISOString(), rejectionReason: typeof req.body?.reason === "string" ? req.body.reason : "Owner rejected candidate." } }).where(eq(graphEdge.id, edge.id)).returning();
  await db.insert(eventLog).values({ eventType: "GraphRelationshipRejected", aggregateType: "graph_edge", aggregateId: edge.id, sourceRef: edge.sourceRef, occurredAt: new Date(), payload: { reason: req.body?.reason ?? "Owner rejected candidate." } });
  res.json(serializeGraphEdge(updated ?? edge));
});

router.get("/graph/traverse/:objectType/:objectId", async (req, res): Promise<void> => {
  const [root] = await db.select().from(graphNode).where(and(eq(graphNode.objectType, req.params.objectType), eq(graphNode.objectId, req.params.objectId))).limit(1);
  if (!root) { res.json({ root: { objectType: req.params.objectType, objectId: req.params.objectId }, nodes: [], edges: [] }); return; }
  const depth = Math.max(1, Math.min(5, Number(req.query.depth ?? 1)));
  const neighborhood = await collectNeighborhood(root, depth, allowCandidates(req));
  res.json({ root: neighborhood.root, nodes: neighborhood.nodes, edges: neighborhood.edges, relationships: neighborhood.relationships, reviewableCandidates: neighborhood.reviewableCandidates });
});

router.get("/graph/reconstruct/:objectType/:objectId", async (req, res): Promise<void> => {
  const [root] = await db.select().from(graphNode).where(and(eq(graphNode.objectType, req.params.objectType), eq(graphNode.objectId, req.params.objectId))).limit(1);
  if (!root) { res.status(404).json({ error: "Graph entity not found.", objectType: req.params.objectType, objectId: req.params.objectId }); return; }
  const depth = Math.max(1, Math.min(5, Number(req.query.depth ?? 3)));
  const result = await collectNeighborhood(root, depth, allowCandidates(req));
  res.json({ ...result, reconstruction: { depth, includesCandidates: allowCandidates(req), confirmedOnlyByDefault: true, provenanceRequired: true } });
});

router.get("/graph/map", async (req, res) => {
  const nodeType = typeof req.query.nodeType === "string" ? req.query.nodeType : undefined;
  const includeCandidates = allowCandidates(req);
  const nodes = await db.select().from(graphNode).orderBy(desc(graphNode.importanceScore)).limit(250);
  const filtered = nodeType ? nodes.filter((node) => node.objectType === nodeType) : nodes;
  const ids = new Set(filtered.map((node) => node.id));
  const edges = (await db.select().from(graphEdge).where(eq(graphEdge.isHistorical, false))).filter((edge) => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId) && visibleEdge(edge, includeCandidates)).slice(0, 500).map(serializeGraphEdge);
  res.json({ nodes: filtered, edges, filters: { nodeTypes: [...new Set(nodes.map((node) => node.objectType))], edgeTypes: [...new Set(edges.map((edge) => edge.edgeType))], relationshipStates: ["CONFIRMED", "OWNER_DECLARED", "STRONGLY_INFERRED", "WEAK_CANDIDATE", "CONTRADICTED", "REJECTED"], includesCandidates: includeCandidates } });
});

router.get("/graph/orphans", async (_req, res) => {
  const nodes = await db.select().from(graphNode);
  const edges = await db.select().from(graphEdge);
  const connected = new Set(edges.filter((edge) => relationshipState(edge.metadata) !== "REJECTED").flatMap((edge) => [edge.sourceNodeId, edge.targetNodeId]));
  res.json(nodes.filter((node) => !connected.has(node.id)));
});

router.get("/graph/related/:nodeId", async (req, res) => {
  const edgeTypes = typeof req.query.edgeTypes === "string" ? req.query.edgeTypes.split(",") : undefined;
  const includeCandidates = allowCandidates(req);
  const edges = (await db.select().from(graphEdge).where(or(eq(graphEdge.sourceNodeId, req.params.nodeId), eq(graphEdge.targetNodeId, req.params.nodeId))))
    .filter((edge) => (!edgeTypes || edgeTypes.includes(edge.edgeType)) && visibleEdge(edge, includeCandidates)).slice(0, 100).map(serializeGraphEdge);
  const ids = [...new Set(edges.flatMap((edge) => [edge.sourceNodeId, edge.targetNodeId]))];
  res.json({ edges, relationships: edges, nodes: ids.length ? await db.select().from(graphNode).where(inArray(graphNode.id, ids)) : [] });
});

router.get("/graph/most-connected/:objectType", async (req, res) => {
  const nodes = await db.select().from(graphNode).where(eq(graphNode.objectType, req.params.objectType));
  const edges = (await db.select().from(graphEdge)).filter((edge) => visibleEdge(edge, allowCandidates(req)));
  const counts = new Map<string, number>();
  for (const edge of edges) { counts.set(edge.sourceNodeId, (counts.get(edge.sourceNodeId) ?? 0) + 1); counts.set(edge.targetNodeId, (counts.get(edge.targetNodeId) ?? 0) + 1); }
  res.json(nodes.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)).slice(0, Number(req.query.limit ?? 20)).map((node) => ({ ...node, connectionCount: counts.get(node.id) ?? 0 })));
});

router.post("/graph/rebuild", async (_req, res) => {
  const events = await db.select().from(eventLog).where(sql`${eventLog.eventType} in ('GraphNodeAdded', 'GraphEdgeCreated', 'GraphRelationshipCandidateCreated', 'GraphRelationshipPromoted', 'GraphRelationshipRejected')`);
  res.json({ replayableEvents: events.length, rebuilt: false, message: "Event replay preflight complete; live graph was not mutated.", candidateEvents: events.filter((event) => event.eventType === "GraphRelationshipCandidateCreated").length });
});

export default router;