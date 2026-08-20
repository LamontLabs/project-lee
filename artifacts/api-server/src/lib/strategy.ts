import { desc, eq } from "drizzle-orm";
import { db, eventLog, strategicObjective, strategyReview, simulation, reflectionReport, reflectionMetric, factLedger, costRecord, observation, opportunity, waitingLoop, universalObject, strategicAnchor } from "@workspace/db";
import { currentUncertainty } from "./uncertainty";
import { enqueueWork } from "./orchestration";
import { computeConfidence } from "./confidence";
import { WhyChainBuilder } from "./why-chain";
import { recordProvenance } from "./provenance";
import { createOrReference, linkAssumption } from "./assumptions";
import { emitEvent } from "./foundation-events";

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
  if (!question.trim()) throw new Error("A simulation question is required.");
  const [objectives, facts, waiting, projects, anchors] = await Promise.all([listStrategy(), db.select().from(factLedger).limit(12), db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).limit(12), db.select().from(universalObject).where(eq(universalObject.objectType, "project")), db.select().from(strategicAnchor).where(eq(strategicAnchor.active, true))]);
  const evidenceLinks = [...facts.map((item) => item.id), ...waiting.map((item) => item.id)].slice(0, 10);
  const normalized = question.toLowerCase();
  const relatedProjects = projects.filter((project) => normalized.includes(String(project.name ?? "").toLowerCase())).map((project) => ({ projectId: project.id, impact: "Potential sequencing, readiness, or dependency impact requires owner review." }));
  const relevantAnchors = anchors.filter((anchor) => normalized.includes(anchor.anchorType.replaceAll("_", " ")) || normalized.includes(anchor.summary.toLowerCase().split(" ").slice(0, 3).join(" ")));
  const assumption = await createOrReference(`The hypothetical change described by "${question}" is plausible enough to evaluate qualitatively.`, "technical", evidenceLinks.length ? 0.65 : 0.35, evidenceLinks, "Simulation Engine", new Date(Date.now() + 30 * 86400000));
  const uncertainty = await currentUncertainty();
  const assumptions = [{ assumptionId: assumption.id, statement: assumption.statement, confidence: assumption.confidence, uncertaintyLevel: uncertainty.find((item) => item.objectId === assumption.id)?.level ?? "MEDIUM" }, { statement: "This simulation is advisory and does not execute actions.", confidence: 1, uncertaintyLevel: "LOW" }];
  const lineage = await computeConfidence(evidenceLinks.map((id) => ({ id, confidence: 0.65 })), "simulation");
  const whyChain = new WhyChainBuilder().addStep("fact_confirmed", `${facts.length} facts were available to ground this simulation.`, facts.length ? 0.7 : 0.35, "Simulation Engine", facts[0]?.id).addStep("strategy_alignment", `${objectives.length} active strategic objectives were compared.`, objectives.length ? 0.8 : 0.5, "Simulation Engine", objectives[0]?.id).buildNonTrivial();
  const projectedUncertainty = waiting.length >= 2 ? "HIGH" : waiting.length ? "MEDIUM" : "LOW";
  const [item] = await db.insert(simulation).values({ question, simulationType, assumptions, ...lineage, whyChain, reasoningChain: [`Classify the question as ${simulationType}.`, `Compare it against ${objectives.length} active strategic objectives.`, `Check ${waiting.length} open waiting loops for timing risk.`, "Separate likely, possible, and unlikely outcomes before recommending a decision."], stateChanges: [`If true, the hypothetical changes the operating conditions described in the question.`], affectedProjects: relatedProjects, objectiveImpact: objectives.length ? ["At least one active objective may need sequencing review."] : [], anchorStress: relevantAnchors.map((anchor) => `${anchor.anchorType}: ${anchor.summary}`), decisionsToRevisit: ["Review any existing decision whose premise matches the hypothetical."], recommendedActions: ["Validate the named assumptions before taking action.", "Compare this scenario with an alternative before committing."], likelyOutcomes: objectives.length ? [`The decision changes sequencing against at least one active objective. [Uncertainty: ${projectedUncertainty}]`] : [`The immediate effect is bounded to the requested area. [Uncertainty: ${projectedUncertainty}]`], possibleOutcomes: ["A new blocker or opportunity appears after implementation details are clarified. [Uncertainty: HIGH]"], unlikelyOutcomes: ["All downstream effects are materialized immediately without new evidence. [Uncertainty: VERY HIGH]"], risks: waiting.length ? ["Open waiting loops may age while the decision is executed."] : [], opportunities: objectives.length ? ["Align the next action to an existing strategic objective."] : [], recommendedDecision: "Use this as a structured pre-decision review and confirm assumptions before acting.", evidenceLinks }).returning();
  await recordProvenance("simulation", item.id, evidenceLinks, item.propagatedConfidence ?? 0.5);
  await linkAssumption(assumption.id, "simulation", item.id);
  await emitEvent({ eventType: "SimulationCreated", aggregateType: "simulation", aggregateId: item.id, sourceRef: "simulation-engine", payload: { question, simulationType, assumptionIds: [assumption.id], affectedProjectIds: relatedProjects.map((project) => project.projectId) } });
  return item;
}
export async function compareSimulations(ids: string[]) {
  const rows = await db.select().from(simulation);
  return rows.filter((item) => ids.includes(item.id)).map((item) => ({ id: item.id, question: item.question, simulationType: item.simulationType, likelyOutcomes: item.likelyOutcomes, risks: item.risks, affectedProjects: item.affectedProjects, confidence: item.propagatedConfidence, createdAt: item.createdAt }));
}
export async function matchSimulations(eventType: string, payload: Record<string, unknown>) {
  const terms = [eventType, ...Object.values(payload).filter((value): value is string => typeof value === "string")].join(" ").toLowerCase();
  const rows = await db.select().from(simulation).orderBy(desc(simulation.createdAt)).limit(100);
  const matches = rows.filter((item) => item.question.toLowerCase().split(/\W+/).filter((term) => term.length > 4).some((term) => terms.includes(term)));
  for (const item of matches) await emitEvent({ eventType: "SimulationScenarioMatched", aggregateType: "simulation", aggregateId: item.id, sourceRef: "simulation-matcher", payload: { simulationId: item.id, eventType, matchReason: `Event terms matched the stored scenario question.` } });
  return matches;
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