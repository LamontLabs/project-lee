import { desc, eq } from "drizzle-orm";
import { constitutionProvision, db, observation, opportunity, simulation, strategicObjective } from "@workspace/db";
const FACTORS: Record<string, number> = { extraction: 0.95, belief: 0.94, observation: 0.91, recommendation: 0.94, simulation: 0.93, strategy: 0.95 };
export async function computeConfidence(sources: Array<{ id: string; confidence?: number; propagatedConfidence?: number | null }>, stepType: string, beliefType?: string) {
  const factor = FACTORS[stepType] ?? 0.95; const sourceConfidence = sources.length ? Math.max(...sources.map((item) => item.propagatedConfidence ?? item.confidence ?? 0.5)) : 0.5;
  const evidenceBonus = Math.min(1.08, 1 + Math.max(0, sources.length - 1) * 0.02);
  let propagated = Math.min(1, sourceConfidence * factor * evidenceBonus);
  if (beliefType === "canonical") propagated = Math.max(0.9, propagated);
  if (beliefType === "speculative") propagated = Math.min(0.6, propagated);
  return { propagatedConfidence: Number(propagated.toFixed(4)), confidenceLineage: [{ sourceIds: sources.map((item) => item.id), sourceConfidence, stepType, degradationFactor: factor, resultingConfidence: propagated, evidenceCount: sources.length, timestamp: new Date().toISOString() }] };
}
export async function confidenceStatus() {
  await ensureConfidenceFactors();
  const [observations, opportunities, simulations, strategies] = await Promise.all([db.select().from(observation).orderBy(desc(observation.generatedAt)).limit(100), db.select().from(opportunity).orderBy(desc(opportunity.generatedAt)).limit(100), db.select().from(simulation).orderBy(desc(simulation.createdAt)).limit(100), db.select().from(strategicObjective).orderBy(desc(strategicObjective.updatedAt)).limit(100)]);
  const values = [...observations, ...opportunities, ...simulations, ...strategies].map((item) => item.propagatedConfidence).filter((item): item is number => typeof item === "number");
  return { factors: FACTORS, average: values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)) : null, distribution: { high: values.filter((v) => v >= 0.85).length, medium: values.filter((v) => v >= 0.6 && v < 0.85).length, speculative: values.filter((v) => v < 0.6).length }, counts: { observations: observations.length, opportunities: opportunities.length, simulations: simulations.length, strategies: strategies.length } };
}
export async function confidenceChain(kind: string, id: string) {
  const table = kind === "observation" ? observation : kind === "opportunity" ? opportunity : kind === "simulation" ? simulation : strategicObjective;
  const [item] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!item) return null;
  return { id, kind, propagatedConfidence: item.propagatedConfidence, assignedConfidence: "confidence" in item ? item.confidence : null, confidenceLineage: item.confidenceLineage };
}
export async function ensureConfidenceFactors() {
  for (const [stepType, factor] of Object.entries(FACTORS)) await db.insert(constitutionProvision).values({ key: `confidence.${stepType}`, title: `Confidence degradation · ${stepType}`, tier: "CONFIGURABLE", machineReadableRule: { category: "confidence", ruleText: `Confidence factor for ${stepType}: ×${factor}`, stepType, factor }, appliesToEngines: ["Confidence Propagation Engine"] }).onConflictDoNothing({ target: constitutionProvision.key });
}