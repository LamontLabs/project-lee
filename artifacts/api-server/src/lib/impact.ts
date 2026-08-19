import { desc, eq } from "drizzle-orm";
import { db, impactEdge, impactNode } from "@workspace/db";
export async function recalculateImpactScores() {
  const nodes = await db.select().from(impactNode); const edges = await db.select().from(impactEdge).where(eq(impactEdge.status, "approved"));
  for (const node of nodes) {
    const seen = new Set<string>(); let frontier = [node.id]; let score = 0; let depth = 0;
    while (frontier.length && depth < 10) {
      const next = edges.filter((edge) => frontier.includes(edge.sourceNodeId)).map((edge) => edge.targetNodeId).filter((id) => !seen.has(id));
      next.forEach((id) => seen.add(id)); depth++;
      score += next.reduce((sum, id) => sum + (nodes.find((item) => item.id === id)?.confidence ?? 0.5) * (depth === 1 ? 3 : depth === 2 ? 2 : 1), 0);
      frontier = next;
    }
    await db.update(impactNode).set({ impactScore: Number(score.toFixed(4)) }).where(eq(impactNode.id, node.id));
  }
}
export async function impactGraph() { return { nodes: await db.select().from(impactNode).orderBy(desc(impactNode.impactScore)), edges: await db.select().from(impactEdge).orderBy(desc(impactEdge.createdAt)) }; }
export async function impactTree(id: string) {
  const nodes = await db.select().from(impactNode); const edges = await db.select().from(impactEdge).where(eq(impactEdge.status, "approved")); const bySource = new Map<string, typeof edges>();
  for (const edge of edges) bySource.set(edge.sourceNodeId, [...(bySource.get(edge.sourceNodeId) ?? []), edge]);
  const walk = (nodeId: string, seen = new Set<string>()): any[] => { if (seen.has(nodeId)) return []; const branch = new Set(seen).add(nodeId); return (bySource.get(nodeId) ?? []).map((edge) => ({ edge, node: nodes.find((item) => item.id === edge.targetNodeId), consequences: walk(edge.targetNodeId, branch) })); };
  return { node: nodes.find((item) => item.id === id) ?? null, consequences: walk(id) };
}