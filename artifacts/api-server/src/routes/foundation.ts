import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { auditLog, constitutionProvision, constitutionVersion, db, eventLog, impactEdge, impactNode, sourceVault, universalObject } from "@workspace/db";
import { emitEvent } from "../lib/foundation-events";
import { replayFrom } from "../lib/projector";
import { DOMAIN_EVENT_CATALOG, causalChain } from "../lib/domain-events";
import { projectEvent, projectionCheckpoints, rebuildAllProjections } from "../lib/projector";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const filters = [typeof req.query.eventType === "string" ? eq(eventLog.eventType, req.query.eventType) : undefined, typeof req.query.sourceEngine === "string" ? eq(eventLog.sourceRef, req.query.sourceEngine) : undefined].filter(Boolean) as any[];
  const events = await db.select().from(eventLog).where(filters.length ? and(...filters) : undefined).orderBy(desc(eventLog.createdAt)).limit(Number.isFinite(limit) ? limit : 100);
  res.json(events);
});
router.get("/events/catalog", async (_req, res) => res.json(Object.values(DOMAIN_EVENT_CATALOG).map((entry) => ({ eventType: entry.eventType, eventVersion: entry.eventVersion }))));
router.get("/events/:id/causal-chain", async (req, res) => res.json(await causalChain(req.params.id)));

router.post("/objects", async (req, res): Promise<void> => {
  const input = req.body ?? {};
  if (typeof input.name !== "string" || typeof input.objectType !== "string") { res.status(400).json({ error: "objectType and name are required." }); return; }
  const id = input.id ?? crypto.randomUUID();
  const event = await emitEvent({ eventType: "UniversalObjectCreated", aggregateType: "universal_object", aggregateId: id, actor: input.actor, payload: input });
  const createdBy = typeof input.createdBy === "string" ? input.createdBy : "owner";
  await projectEvent(event);
  const [object] = await db.select().from(universalObject).where(eq(universalObject.id, id)).limit(1);
  res.status(201).json(object);
});

router.patch("/objects/:id", async (req, res): Promise<void> => {
  const existing = await db.select().from(universalObject).where(eq(universalObject.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "Object not found." }); return; }
  const event = await emitEvent({ eventType: "UniversalObjectUpdated", aggregateType: "universal_object", aggregateId: req.params.id, actor: req.body?.actor, payload: req.body ?? {} });
  await projectEvent(event);
  const [object] = await db.select().from(universalObject).where(eq(universalObject.id, req.params.id)).limit(1);
  res.json(object);
});

router.get("/objects", async (req, res): Promise<void> => {
  const query = typeof req.query.type === "string" ? eq(universalObject.objectType, req.query.type) : undefined;
  res.json(await db.select().from(universalObject).where(query).orderBy(desc(universalObject.updatedAt)).limit(500));
});

router.post("/sources", async (req, res): Promise<void> => {
  const input = req.body ?? {};
  if (typeof input.originalFilename !== "string" || typeof input.mimeType !== "string" || typeof input.checksum !== "string") { res.status(400).json({ error: "originalFilename, mimeType, and checksum are required." }); return; }
  const createdBy = typeof input.createdBy === "string" ? input.createdBy : "owner";
  const [source] = await db.insert(sourceVault).values({ originalFilename: input.originalFilename, mimeType: input.mimeType, checksum: input.checksum, storagePath: input.storagePath ?? `sources/${input.checksum}`, byteSize: input.byteSize, metadata: input.metadata ?? {}, createdBy, currentOwner: input.currentOwner ?? createdBy, importedFrom: input.importedFrom, generatedBy: input.generatedBy }).returning();
  await emitEvent({ eventType: "SourceVaultRecordCreated", aggregateType: "source_vault", aggregateId: source.id, payload: { sourceId: source.id, checksum: source.checksum } });
  res.status(201).json(source);
});

router.get("/impact/nodes", async (_req, res): Promise<void> => { res.json(await db.select().from(impactNode).orderBy(desc(impactNode.createdAt))); });
router.post("/impact/nodes", async (req, res): Promise<void> => { const input = req.body ?? {}; if (typeof input.nodeType !== "string" || typeof input.label !== "string") { res.status(400).json({ error: "nodeType and label are required." }); return; } const [node] = await db.insert(impactNode).values({ nodeType: input.nodeType, label: input.label, objectId: input.objectId, outcome: input.outcome, sourceRefs: input.sourceRefs ?? [], metadata: input.metadata ?? {} }).returning(); await emitEvent({ eventType: "ImpactNodeCreated", aggregateType: "impact_node", aggregateId: node.id, payload: { nodeId: node.id, nodeType: node.nodeType } }); res.status(201).json(node); });
router.post("/impact/edges", async (req, res): Promise<void> => { const input = req.body ?? {}; if (typeof input.sourceNodeId !== "string" || typeof input.targetNodeId !== "string" || typeof input.edgeType !== "string") { res.status(400).json({ error: "sourceNodeId, targetNodeId, and edgeType are required." }); return; } const [edge] = await db.insert(impactEdge).values({ sourceNodeId: input.sourceNodeId, targetNodeId: input.targetNodeId, edgeType: input.edgeType, strength: input.strength ?? 0.5, lagDays: input.lagDays, evidenceRefs: input.evidenceRefs ?? [], metadata: input.metadata ?? {} }).returning(); await emitEvent({ eventType: "ImpactEdgeCreated", aggregateType: "impact_edge", aggregateId: edge.id, payload: { edgeId: edge.id, edgeType: edge.edgeType } }); res.status(201).json(edge); });

router.get("/projection/checkpoints", async (_req, res) => res.json(await projectionCheckpoints()));
router.post("/projection/replay", async (req, res): Promise<void> => {
  const dryRun = req.body?.dryRun === true;
  const reset = req.body?.reset === true;
  res.json(await rebuildAllProjections({ dryRun, reset }));
});
router.get("/audit", async (_req, res): Promise<void> => { res.json(await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(500)); });
router.get("/constitution/provisions", async (_req, res): Promise<void> => { res.json(await db.select().from(constitutionProvision).where(eq(constitutionProvision.active, true)).orderBy(asc(constitutionProvision.key))); });
router.post("/constitution/provisions", async (req, res): Promise<void> => { const input = req.body ?? {}; if (typeof input.key !== "string" || typeof input.title !== "string" || !["ABSOLUTE", "GOVERNED", "CONFIGURABLE"].includes(input.tier)) { res.status(400).json({ error: "key, title, and a valid tier are required." }); return; } const [provision] = await db.insert(constitutionProvision).values({ key: input.key, title: input.title, tier: input.tier, machineReadableRule: input.machineReadableRule ?? {}, appliesToEngines: input.appliesToEngines ?? [] }).returning(); await emitEvent({ eventType: "ConstitutionProvisionCreated", aggregateType: "constitution_provision", aggregateId: provision.id, payload: { key: provision.key, tier: provision.tier } }); res.status(201).json(provision); });
router.get("/constitution/versions", async (_req, res): Promise<void> => { res.json(await db.select().from(constitutionVersion).orderBy(desc(constitutionVersion.createdAt))); });

export default router;