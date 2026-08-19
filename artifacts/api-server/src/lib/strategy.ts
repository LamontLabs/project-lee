import { desc, eq } from "drizzle-orm";
import { db, eventLog, strategicObjective, strategyReview, simulation, reflectionReport, reflectionMetric, factLedger, costRecord, observation, opportunity, waitingLoop } from "@workspace/db";
import { enqueueWork } from "./orchestration";
import { computeConfidence } from "./confidence";

export async function listStrategy() { return db.select().from(strategicObjective).orderBy(desc(strategicObjective.updatedAt)); }
export async function createStrategy(input: { objective: string; horizon?: string; blockers?: string[]; nextAction?: string }) {
  const [item] = await db.insert(strategicObjective).values({ objective: input.objective, horizon: input.horizon ?? "quarter", blockers: input.blockers ?? [], nextAction: input.nextAction }).returning();
  await db.insert(eventLog).values({ eventType: "StrategyObjectiveDeclared", aggregateType: "strategic_objective", aggregateId: item.id, sourceRef: "strategy-engine", occurredAt: new Date(), payload: { objective: item.objective, horizon: item.horizon } });
  return item;
}
export async function reviewStrategy() {
  const objectives = await listStrategy();
  const prompt = "Are these objectives still current? What changed, what is blocked, and what new opportunities should be reviewed?";
  const summary = `${objectives.length} active strategic objectives reviewed; ${objectives.filter((item) => item.blockers.length).length} have recorded blockers.`;
  const [review] = await db.insert(strategyReview).values({ prompt, summary, objectiveIds: objectives.map((item) => item.id) }).returning();
  await db.update(strategicObjective).set({ lastReviewedAt: new Date() });
  return review;
}
export async function runSimulation(question: string, simulationType = "general") {
  const [objectives, facts, waiting] = await Promise.all([listStrategy(), db.select().from(factLedger).limit(12), db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).limit(12)]);
  const evidenceLinks = [...facts.map((item) => item.id), ...waiting.map((item) => item.id)].slice(0, 10);
  const assumptions = [{ statement: "Current ledger records are an adequate basis for this first-pass simulation.", confidence: evidenceLinks.length ? 0.65 : 0.35 }];
  const lineage = await computeConfidence(evidenceLinks.map((id) => ({ id, confidence: 0.65 })), "simulation");
  const [item] = await db.insert(simulation).values({ question, simulationType, assumptions, ...lineage, reasoningChain: [`Classify the question as ${simulationType}.`, `Compare it against ${objectives.length} active strategic objectives.`, `Check ${waiting.length} open waiting loops for timing risk.`, "Separate likely, possible, and unlikely outcomes before recommending a decision."], likelyOutcomes: objectives.length ? ["The decision changes sequencing against at least one active objective."] : ["The immediate effect is bounded to the requested area."], possibleOutcomes: ["A new blocker or opportunity appears after implementation details are clarified."], unlikelyOutcomes: ["All downstream effects are materialized immediately without new evidence."], risks: waiting.length ? ["Open waiting loops may age while the decision is executed."] : [], opportunities: objectives.length ? ["Align the next action to an existing strategic objective."] : [], recommendedDecision: "Use this as a structured pre-decision review and confirm assumptions before acting.", evidenceLinks }).returning();
  return item;
}
export async function generateReflection(period = "current", reportType = "weekly") {
  const [costs, observations, opportunities, waiting] = await Promise.all([db.select().from(costRecord), db.select().from(observation), db.select().from(opportunity), db.select().from(waitingLoop).where(eq(waitingLoop.status, "open"))]);
  const dimensions = { costRecords: costs.length, modelCostUsd: costs.reduce((sum, item) => sum + item.estimatedCostUsd, 0), observations: observations.length, opportunities: opportunities.length, openWaitingLoops: waiting.length };
  const sourceIds = [...costs, ...observations, ...opportunities].slice(0, 20).map((item) => item.id);
  const narrative = `During ${period}, Lee recorded ${observations.length} observations and ${opportunities.length} opportunities while carrying ${waiting.length} open waiting loops. Model cost records total $${Number(dimensions.modelCostUsd).toFixed(4)}.`;
  const [report] = await db.insert(reflectionReport).values({ period, reportType, dimensions, narrative, sourcesUsed: sourceIds }).returning();
  for (const [dimension, value] of Object.entries(dimensions)) if (typeof value === "number") await db.insert(reflectionMetric).values({ dimension, value, period });
  return report;
}
export async function queueStrategyWork() {
  const strategy = await enqueueWork({ engineName: "Strategy Engine", action: "weekly_review", priority: "HIGH", payload: { cadence: "weekly" } });
  const reflection = await enqueueWork({ engineName: "Reflection Engine", action: "generate", priority: "NORMAL", dependencies: [strategy.id], payload: { cadence: "weekly" } });
  return { strategy, reflection };
}