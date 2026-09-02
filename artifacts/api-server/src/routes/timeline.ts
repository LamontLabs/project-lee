import { Router, type IRouter } from "express";
import { db, milestoneMarker } from "@workspace/db";
import { openChangeCursor, queryMeaningfulChanges } from "../lib/change-intelligence";
import { queryTimeline } from "../lib/timeline";
const router: IRouter = Router();
function timelineQuery(req: any) {
  const now = new Date();
  const since = req.query.since === "yesterday"
    ? new Date(now.getTime() - 86400000)
    : req.query.since === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : undefined;
  const minValue = Number(req.query.min_significance ?? 0.5);
  return {
    start: typeof req.query.start === "string" ? new Date(req.query.start) : since,
    end: typeof req.query.end === "string" ? new Date(req.query.end) : undefined,
    min: Number.isFinite(minValue) ? minValue : 0.5,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    scopeType: typeof req.query.scope_type === "string" ? req.query.scope_type : typeof req.query.scope === "string" && req.query.scope !== "lab-wide" ? req.query.scope : undefined,
    scopeId: typeof req.query.scope_id === "string" ? req.query.scope_id : typeof req.query.entity_id === "string" ? req.query.entity_id : undefined,
    scopeKey: typeof req.query.cursor_key === "string" ? req.query.cursor_key : "timeline",
    sinceLastOpen: req.query.since_last_open === "true" || req.query.since === "last_open",
    markOpened: false,
  };
}
router.get("/timeline", async (req, res) => res.json(await queryTimeline(timelineQuery(req))));
router.get("/timeline/changes", async (req, res) => res.json(await queryMeaningfulChanges({ ...timelineQuery(req), min: Number(req.query.min_significance ?? 0) })));
router.post("/timeline/open", async (req, res) => res.status(201).json(await openChangeCursor(typeof req.body?.scopeKey === "string" ? req.body.scopeKey : "timeline")));
router.post("/timeline/milestones", async (req, res): Promise<void> => { if (!req.body?.eventId || !req.body?.label) { res.status(400).json({ error: "eventId and label are required." }); return; } const [item] = await db.insert(milestoneMarker).values({ eventId: req.body.eventId, label: req.body.label }).onConflictDoUpdate({ target: milestoneMarker.eventId, set: { label: req.body.label } }).returning(); res.status(201).json(item); });
router.get("/timeline/export", async (req, res) => { const events = await queryTimeline(timelineQuery(req)); const markdown = `# Lee Operational Timeline\n\n${events.map((event) => `## ${new Date(event.occurredAt).toISOString()} · ${event.timelineType}\n\n${event.eventType} · ${event.classification} · significance ${event.significance}\n\n${event.explanation}\n\n${event.sourceRef ? `Source: ${event.sourceRef}` : "Source: Event Log"}${event.milestone ? `\n\nMilestone: ${event.milestone.label}` : ""}`).join("\n\n")}`; res.type("text/markdown").send(markdown); });
export default router;