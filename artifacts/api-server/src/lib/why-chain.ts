export type WhyStepType = "waiting_loop_exceeded" | "relationship_importance" | "historical_pattern" | "decision_precedence" | "freshness_threshold" | "cost_signal" | "constitution_provision" | "fact_confirmed" | "interpretation_promoted" | "strategy_alignment" | "assumption_validated";
export type WhyStep = { step_type: WhyStepType; statement: string; evidence_id?: string; confidence: number; engine_name: string };
export class WhyChainBuilder {
  private readonly steps: WhyStep[] = [];
  addStep(step_type: WhyStepType, statement: string, confidence: number, engine_name: string, evidence_id?: string) {
    this.steps.push({ step_type, statement, confidence: Math.max(0, Math.min(1, confidence)), engine_name, ...(evidence_id ? { evidence_id } : {}) });
    return this;
  }
  build() { return this.steps; }
  buildNonTrivial() { if (this.steps.length < 2 || !this.steps.some((step) => step.evidence_id)) throw new Error("Non-trivial Why Chain requires at least two steps and one grounded evidence step."); return this.build(); }
}
export const provenanceState = (sourceRefs: unknown) => Array.isArray(sourceRefs) && sourceRefs.length > 0 ? "complete" : "unverified";