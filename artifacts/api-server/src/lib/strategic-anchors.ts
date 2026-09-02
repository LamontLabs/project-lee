import { desc, eq, and } from "drizzle-orm";
import { db, strategicAnchor } from "@workspace/db";
import { emitEvent } from "./foundation-events";

const TYPES = new Set(["founding_rationale", "rejected_direction", "architectural_commitment"]);
export async function listAnchors(includeRetired = false) {
  return db.select().from(strategicAnchor).where(includeRetired ? undefined : eq(strategicAnchor.active, true)).orderBy(desc(strategicAnchor.createdAt));
}
export async function createAnchor(input: any) {
  if (!TYPES.has(input.anchorType) || !input.summary || !input.fullContext) throw new Error("anchorType, summary, and fullContext are required");
  const whyChain = [{ step: "owner_declaration", conclusion: input.summary, sourceRefs: input.sourceRefs ?? [], confidence: 1 }];
  const [anchor] = await db.insert(strategicAnchor).values({ anchorType: input.anchorType, summary: input.summary, fullContext: input.fullContext, projectId: input.projectId || null, sourceRefs: input.sourceRefs ?? [], whyChain }).returning();
  await emitEvent({ eventType: "AnchorCreated", aggregateType: "strategic_anchor", aggregateId: anchor.id, sourceRef: "anchor-ledger", payload: { anchorType: anchor.anchorType, projectId: anchor.projectId, sourceRefs: anchor.sourceRefs } });
  return anchor;
}
export async function retireAnchor(id: string) {
  const [anchor] = await db.update(strategicAnchor).set({ active: false, retiredAt: new Date() }).where(and(eq(strategicAnchor.id, id), eq(strategicAnchor.active, true))).returning();
  if (anchor) await emitEvent({ eventType: "AnchorRetired", aggregateType: "strategic_anchor", aggregateId: id, sourceRef: "anchor-ledger", payload: { anchorId: id } });
  return anchor;
}
export function anchorContradictions(text: string, anchors: Awaited<ReturnType<typeof listAnchors>>) {
  const normalized = text.toLowerCase();
  return anchors.filter((anchor) => anchor.active && (anchor.anchorType === "rejected_direction" ? anchor.summary.toLowerCase().split(/\W+/).filter((word) => word.length > 4).some((word) => normalized.includes(word)) : false)).map((anchor) => ({ anchorId: anchor.id, summary: anchor.summary, explanation: `This direction resembles a rejected direction: ${anchor.fullContext}`, sourceRefs: anchor.sourceRefs }));
}