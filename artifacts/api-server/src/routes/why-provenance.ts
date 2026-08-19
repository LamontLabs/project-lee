import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { brief, db, observation, opportunity, provenanceRecord, simulation, strategicObjective, universalObject } from "@workspace/db";
const router: IRouter = Router();
const tableFor = (kind: string) => kind === "observation" ? observation : kind === "opportunity" ? opportunity : kind === "simulation" ? simulation : kind === "strategy" ? strategicObjective : kind === "brief" ? brief : universalObject;
router.get("/why-chain/:kind/:id", async (req, res): Promise<void> => {
  const table: any = tableFor(req.params.kind);
  const [item] = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
  if (!item) { res.status(404).json({ error: "Why Chain record not found." }); return; }
  res.json({ kind: req.params.kind, id: item.id, whyChain: item.whyChain ?? [], navigable: true });
});
router.get("/provenance/:kind/:id", async (req, res) => {
  const records = await db.select().from(provenanceRecord).where(eq(provenanceRecord.recordId, req.params.id)).orderBy(desc(provenanceRecord.createdAt));
  if (records.length) { res.json({ kind: req.params.kind, id: req.params.id, records, completeness: "complete" }); return; }
  res.json({ kind: req.params.kind, id: req.params.id, records: [], completeness: "unverified" });
});
router.get("/provenance/completeness", async (_req, res) => {
  const [objects, observations, opportunities, simulations, strategies, briefs] = await Promise.all([db.select({ id: universalObject.id, sourceRefs: universalObject.sourceRefs }).from(universalObject).where(eq(universalObject.status, "active")), db.select({ id: observation.id, refs: observation.supportingEvidence }).from(observation), db.select({ id: opportunity.id, refs: opportunity.supportingEvidence }).from(opportunity), db.select({ id: simulation.id, refs: simulation.evidenceLinks }).from(simulation), db.select({ id: strategicObjective.id, refs: strategicObjective.progressEvidence }).from(strategicObjective), db.select({ id: brief.id, refs: brief.sourcesUsed }).from(brief)]);
  const all = [...objects.map((x) => ({ ...x, refs: x.sourceRefs })), ...observations, ...opportunities, ...simulations, ...strategies, ...briefs];
  const complete = all.filter((item) => Array.isArray(item.refs) && item.refs.length > 0).length;
  res.json({ score: all.length ? Number((complete / all.length).toFixed(4)) : 1, target: 0.95, complete, total: all.length, unverified: all.filter((item) => !Array.isArray(item.refs) || item.refs.length === 0).map((item) => item.id) });
});
export default router;