import { and, eq, inArray, or } from "drizzle-orm";
import { db, bootstrapRun, eventLog, graphEdge, graphNode, universalObject } from "@workspace/db";
import { emitEvent } from "./foundation-events";
const SERVICE_TYPES = new Set(["service", "infrastructure", "runtime"]);
async function nodeFor(objectType: string, objectId: string, label: string, metadata: Record<string, unknown> = {}) {
  const existing = await db.select().from(graphNode).where(or(and(eq(graphNode.objectType, objectType), eq(graphNode.objectId, objectId)), eq(graphNode.label, label))).limit(1);
  if (existing[0]) return existing[0];
  const [node] = await db.insert(graphNode).values({ objectType, objectId, label, metadata, createdBy: "portfolio-dependency" }).returning();
  return node;
}
export async function recomputePortfolioDependencyGraph() {
  const [projects, runs] = await Promise.all([db.select().from(universalObject).where(eq(universalObject.objectType, "project")), db.select().from(bootstrapRun).where(eq(bootstrapRun.status, "completed"))]);
  let edgeCount = 0;
  for (const [label, type] of [["CIL", "service"], ["CerbaSeal", "service"], ["Replit", "infrastructure"], ["PostgreSQL", "infrastructure"], ["Node.js runtime", "runtime"]] as const) await nodeFor(type, crypto.randomUUID(), label, { shared: true });
  for (const project of projects) {
    const source = await nodeFor("project", crypto.randomUUID(), project.name, { projectId: project.id });
    const run = runs.filter((item) => item.projectId === project.id || item.projectId === "workspace" || item.projectId === project.name).sort((a,b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];
    const report: any = run?.report ?? {};
    const tech = report.technologyStack ?? {};
    const dependencies = [...(Array.isArray(report.dependencies) ? report.dependencies : []), ...(Array.isArray(tech.dependencies) ? tech.dependencies.map((item: any) => item.name ?? item) : []), ...(Array.isArray(tech.frameworks) ? tech.frameworks : []), ...(Array.isArray(report.infrastructure) ? report.infrastructure : [])].map(String);
    for (const dependency of [...new Set(dependencies)]) {
      const type = /node|postgres|replit|hosting|runtime/i.test(dependency) ? "infrastructure" : "service";
      const target = await nodeFor(type, crypto.randomUUID(), dependency, { discoveredFrom: run?.id, portfolio: true });
      await db.insert(graphEdge).values({ sourceNodeId: source.id, targetNodeId: target.id, edgeType: "DEPENDS_ON_PORTFOLIO", confidence: .8, weight: .7, sourceRef: run?.id ?? "bootstrap", metadata: { dependencyType: type, dependency } }).onConflictDoNothing({ target: [graphEdge.sourceNodeId, graphEdge.targetNodeId, graphEdge.edgeType] });
      edgeCount++;
    }
  }
  const [event] = await db.select().from(eventLog).orderBy((eventLog.occurredAt)).limit(1);
  await emitEvent({ eventType: "PortfolioDependencyGraphUpdated", aggregateType: "portfolio_dependency_graph", aggregateId: "portfolio", sourceRef: "portfolio-dependency", payload: { projectCount: projects.length, edgeCount, lastBootstrapEvent: event?.id } });
  return getPortfolioDependencyGraph();
}
export async function getPortfolioDependencyGraph() {
  const edges = await db.select().from(graphEdge).where(and(eq(graphEdge.edgeType, "DEPENDS_ON_PORTFOLIO"), eq(graphEdge.isHistorical, false)));
  const ids = [...new Set(edges.flatMap((edge) => [edge.sourceNodeId, edge.targetNodeId]))];
  const nodes = ids.length ? await db.select().from(graphNode).where(inArray(graphNode.id, ids)) : [];
  return { nodes, edges, summary: { nodeCount: nodes.length, edgeCount: edges.length, highestFanOut: nodes.map((node) => ({ nodeId: node.id, label: node.label, fanOut: edges.filter((edge) => edge.sourceNodeId === node.id).length })).sort((a,b) => b.fanOut-a.fanOut).slice(0,5) } };
}
export async function dependencyImpact(label: string) {
  const graph = await getPortfolioDependencyGraph();
  const starts = graph.nodes.filter((node) => String(node.label).toLowerCase().includes(label.toLowerCase()));
  const affected: Array<{ node: any; depth: number; chain: string[] }> = [];
  const queue = starts.map((node) => ({ node, depth: 0, chain: [String(node.label)] }));
  while (queue.length) { const current = queue.shift()!; for (const edge of graph.edges.filter((item) => item.targetNodeId === current.node.id)) { const node = graph.nodes.find((item) => item.id === edge.sourceNodeId); if (node && !affected.some((item) => item.node.id === node.id)) { const next = { node, depth: current.depth + 1, chain: [...current.chain, String(node.label)] }; affected.push(next); queue.push(next); } } }
  return { dependency: label, matched: starts, affected: affected.sort((a,b) => a.depth-b.depth) };
}