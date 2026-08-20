import { desc } from "drizzle-orm";
import { db, portfolioState, portfolioStateHistory } from "@workspace/db";
import { currentProjectMomentum } from "./project-momentum";
import { emitEvent } from "./foundation-events";
import { queryEngine } from "./query-engine";

export async function computePortfolioState() {
  const [projectResults, momentum, runResults, opportunityResults, anchorResults, eventResults, peopleResults] = await Promise.all([
    queryEngine.query({ sources: ["universal_objects"], filters: { objectType: "project" }, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Portfolio Intelligence", purpose: "portfolio_computation" }),
    currentProjectMomentum(),
    queryEngine.query({ sources: ["bootstrap_runs"], filters: { status: "completed" }, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Portfolio Intelligence", purpose: "portfolio_computation" }),
    queryEngine.query({ sources: ["opportunities"], filters: { lifecycle: "new" }, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 20, requester: "Portfolio Intelligence", purpose: "portfolio_computation" }),
    queryEngine.query({ sources: ["strategic_anchors"], filters: { active: true }, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Portfolio Intelligence", purpose: "portfolio_computation" }),
    queryEngine.query({ sources: ["events"], filters: { start: new Date(Date.now() - 7 * 86400000) }, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Portfolio Intelligence", purpose: "portfolio_computation" }),
    queryEngine.query({ sources: ["people"], filters: {}, rankingPolicy: "strategy_evaluation", confidenceThreshold: 0, limit: 200, requester: "Portfolio Intelligence", purpose: "portfolio_computation" }),
  ]);
  const projects = projectResults.map((item) => item.object as any);
  const runs = runResults.map((item) => item.object as any);
  const opportunities = opportunityResults.map((item) => item.object as any);
  const anchors = anchorResults.map((item) => item.object as any);
  const events = eventResults.map((item) => item.object as any);
  const people = peopleResults.map((item) => item.object as any);
  const distribution = Object.fromEntries(["Explosive", "Rising", "Stable", "Declining", "Dormant", "Stalled"].map((key) => [key, momentum.filter((item) => item.classification === key).length]));
  const sharedMap = new Map<string, Set<string>>();
  for (const run of runs) {
    const report = run.report as any;
    const rawDependencies = [
      ...(Array.isArray(report?.dependencies) ? report.dependencies : []),
      ...(Array.isArray(report?.technologyStack) ? report.technologyStack : []),
    ];
    for (const dependency of rawDependencies.map(String)) {
      if (!sharedMap.has(dependency)) sharedMap.set(dependency, new Set());
      sharedMap.get(dependency)!.add(run.projectId);
    }
  }
  const sharedDependencies = [...sharedMap.entries()].filter(([, ids]) => ids.size > 1).map(([dependency, ids]) => ({ dependency, projectIds: [...ids] }));
  const activity = new Map<string, number>();
  for (const event of events) {
    const id = String((event.payload as any)?.projectId ?? event.aggregateId ?? "");
    if (projects.some((project) => project.id === id)) activity.set(id, (activity.get(id) ?? 0) + 1);
  }
  const total = [...activity.values()].reduce((sum, value) => sum + value, 0) || projects.length || 1;
  const attentionDistribution = projects.map((project) => ({ projectId: project.id, share: Math.round(((activity.get(project.id) ?? 0) / total) * 100) }));
  const crossProjectPeople = people.map((item) => ({ personId: item.id, name: item.displayName, projectIds: (item.projects ?? []).filter((id: string) => projects.some((project) => project.id === id)) })).filter((item) => item.projectIds.length > 1);
  const alerts = [
    ...sharedDependencies.filter((item) => item.projectIds.length > 1).slice(0, 5).map((item) => ({ type: "shared_dependency", title: `Shared dependency: ${item.dependency}`, detail: `${item.projectIds.length} projects depend on the same observed package or service.`, projectIds: item.projectIds, evidenceRefs: runs.filter((run) => item.projectIds.includes(run.projectId)).map((run) => run.id) })),
    ...opportunities.filter((item) => (item.affectedObjects ?? []).length > 1).slice(0, 5).map((item) => ({ type: "shared_opportunity", title: item.headline, detail: item.actionSuggestion, projectIds: item.affectedObjects, evidenceRefs: item.supportingEvidence })),
  ];
  const momentumScore = projects.length ? Math.round(momentum.reduce((sum, item) => sum + item.score, 0) / Math.max(1, projects.length)) : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(momentumScore * .7 + Math.min(100, anchors.length * 10) * .3)));
  const portfolioAnchors = anchors.filter((anchor) => !anchor.projectId).map((anchor) => ({ id: anchor.id, type: anchor.anchorType, summary: anchor.summary }));
  const [state] = await db.insert(portfolioState).values({ healthScore, projectCount: projects.length, momentumDistribution: distribution, sharedDependencies, attentionDistribution, crossProjectPeople, alerts, portfolioAnchors }).returning();
  await db.insert(portfolioStateHistory).values({ stateId: state.id, healthScore, snapshot: { projectCount: projects.length, momentumDistribution: distribution, sharedDependencies, attentionDistribution, crossProjectPeople, alerts, portfolioAnchors } });
  await emitEvent({ eventType: "PortfolioStateUpdated", aggregateType: "portfolio", aggregateId: state.id, sourceRef: "portfolio-intelligence", payload: { healthScore, projectCount: projects.length, alertCount: alerts.length } });
  for (const alert of alerts) await emitEvent({ eventType: alert.type === "shared_opportunity" ? "PortfolioOpportunityDetected" : "PortfolioRiskDetected", aggregateType: "portfolio", aggregateId: state.id, sourceRef: "portfolio-intelligence", payload: alert });
  return { ...state, projects };
}
export async function currentPortfolioState() { const [state] = await db.select().from(portfolioState).orderBy(desc(portfolioState.computedAt)).limit(1); return state ?? computePortfolioState(); }
export async function portfolioHistory() { return db.select().from(portfolioStateHistory).orderBy(desc(portfolioStateHistory.computedAt)).limit(30); }