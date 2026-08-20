import { desc, eq } from "drizzle-orm";
import { db, bootstrapRun, executionReadiness, factLedger, initiativeItem, universalObject } from "@workspace/db";
import { emitEvent } from "./foundation-events";
export const READINESS_GOALS = ["launch", "pilot", "raise", "handoff"] as const;
export type ReadinessGoal = typeof READINESS_GOALS[number];
const keys = ["architecture","documentation","repository","security","testing"] as const;
const goalDimensions: Record<ReadinessGoal, readonly string[]> = {
  launch: keys,
  pilot: ["architecture", "documentation", "security", "testing"],
  raise: ["documentation", "repository", "security"],
  handoff: ["architecture", "documentation", "repository", "testing"],
};
export function dimensionsForGoal(goal: string) {
  return goalDimensions[goal as ReadinessGoal] ?? keys;
}
export async function computeExecutionReadiness(goal = "general") {
  const projects = await db.select().from(universalObject).where(eq(universalObject.objectType,"project"));
  const runs = await db.select().from(bootstrapRun).where(eq(bootstrapRun.status,"completed"));
  const facts = await db.select().from(factLedger).where(eq(factLedger.status,"active"));
  const output = [];
  for (const project of projects) {
    const run = runs.filter((item) => item.projectId === project.id).sort((a,b) => (b.completedAt?.getTime()??0)-(a.completedAt?.getTime()??0))[0];
    const report: any = run?.report ?? {};
    const count = (value: unknown) => Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : 0;
    const dimensions = keys.map((key) => {
      const sourceRefs = run ? [run.id] : [];
      const evidence = key === "architecture" ? count(report.architectureGraph ?? report.architecture) : key === "documentation" ? count(report.documentation) : key === "repository" ? count(report.repositoryMap ?? report.configuration) : key === "security" ? count(report.securityObservations ?? report.security) : facts.filter((fact) => (fact.relatedProjects ?? []).includes(project.id) && /test|coverage|release/i.test(`${fact.subject} ${fact.predicate} ${fact.object}`)).length;
      const score = Math.min(100, evidence ? 45 + Math.min(45, evidence * 10) : 20);
      return { key, score, explanation: evidence ? `${evidence} evidence item(s) support this dimension.` : "No supporting evidence has been recorded yet.", sourceRefs };
    });
    const relevant = dimensions.filter((dimension) => dimensionsForGoal(goal).includes(dimension.key));
    const overallScore = Math.round(relevant.reduce((s,d)=>s+d.score,0)/Math.max(1,relevant.length));
    const highestGap = [...relevant].sort((a,b)=>a.score-b.score)[0]?.key ?? "documentation";
    const [saved] = await db.insert(executionReadiness).values({ projectId: project.id, goal, overallScore, dimensions: relevant, highestGap }).returning();
    await emitEvent({ eventType:"ExecutionReadinessUpdated", aggregateType:"project", aggregateId: project.id, sourceRef:"execution-readiness", payload:{ goal, overallScore, highestGap } });
    if (overallScore >= 70) await db.insert(initiativeItem).values({ category:"execution_readiness", observation:`${project.name} is now ${overallScore}% ready for ${goal}.`, significance:"LOW", evidenceRefs:[project.id], generatedAt:new Date(), expiresAt:new Date(Date.now()+7*86400000), actionHint:"Review the remaining readiness gap before committing.", dedupeKey:`readiness:${project.id}:${goal}:${overallScore}`, metadata:{ overallScore, highestGap } });
    output.push({ ...saved, project });
  }
  return output;
}
export async function currentExecutionReadiness(goal="general") { const rows=await db.select().from(executionReadiness).where(eq(executionReadiness.goal,goal)).orderBy(desc(executionReadiness.computedAt)).limit(200); const latest=new Map<string,any>(); for(const row of rows) if(!latest.has(row.projectId)) latest.set(row.projectId,row); return latest.size?[...latest.values()]:computeExecutionReadiness(goal); }
export async function readinessHistory(projectId?:string) { return projectId ? db.select().from(executionReadiness).where(eq(executionReadiness.projectId,projectId)).orderBy(desc(executionReadiness.computedAt)).limit(50) : db.select().from(executionReadiness).orderBy(desc(executionReadiness.computedAt)).limit(200); }