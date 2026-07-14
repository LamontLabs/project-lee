import { Link } from "wouter";

const LEDGERS = [
  {
    name: "Fact Ledger",
    description: "Observed truths about the world. Every fact has provenance, confidence, source reference, created_at, observed_at, and freshness_state. Facts age; their freshness is tracked by Knowledge Aging.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/25",
    key: "f",
    relatedTask: 21,
    neverContains: ["Interpretations", "Conclusions", "Assumptions"],
    requiredFields: ["statement", "confidence (0–1)", "source_ref", "created_at", "observed_at", "freshness_state"],
  },
  {
    name: "Interpretation Ledger",
    description: "Conclusions drawn from one or more facts. Always labeled as such. Has its own confidence score and provenance. The UI always renders interpretations visually distinct from facts.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/25",
    key: "i",
    relatedTask: 21,
    neverContains: ["Facts", "Assumptions", "Anchors"],
    requiredFields: ["statement", "confidence (0–1)", "source_fact_refs", "reasoning_summary", "created_at"],
  },
  {
    name: "Anchor Ledger",
    description: "Explicitly declared, owner-confirmed operational commitments. Founding rationales, rejected directions, architectural commitments, partnership principles. Never age. Always in Context Packets.",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/25",
    key: "a",
    relatedTask: 54,
    neverContains: ["Inferred content", "Facts", "Interpretations"],
    requiredFields: ["statement", "declared_by (always owner)", "declared_at", "category", "rationale"],
  },
  {
    name: "Decision Heuristic Ledger",
    description: "Operational patterns inferred from observed decision behavior — not declared. Different from Anchors (declared) and Institutional Knowledge (reality-validated). Heuristics have confidence that rises with reinforcement.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/25",
    key: "d",
    relatedTask: 59,
    neverContains: ["Declared content", "Manually entered preferences"],
    requiredFields: ["statement", "evidence_refs", "confidence (0–1)", "exception_count", "first_observed", "last_reinforced"],
  },
  {
    name: "Institutional Knowledge Ledger",
    description: "The highest epistemic tier. A lesson that reality has validated through 3+ independent confirming events with no significant contradiction. Cannot be asserted — only earned through the progression pathway.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/25",
    key: "ik",
    relatedTask: 67,
    neverContains: ["Unvalidated lessons", "Single-event observations", "Asserted beliefs"],
    requiredFields: ["statement", "evidence_events (3+)", "validation_window", "promoting_engine", "established_at"],
  },
  {
    name: "Assumption Ledger",
    description: "Beliefs LEE holds without direct confirmation. Tracked, not buried. Every assumption has an expiry condition. Invalidated assumptions cascade to dependent Interpretations and Simulations.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/25",
    key: "as",
    relatedTask: 23,
    neverContains: ["Confirmed facts", "Validated interpretations"],
    requiredFields: ["statement", "confidence (0–1)", "source", "expiry_condition", "created_at"],
  },
];

const EPISTEMIC_SIGNALS = [
  {
    name: "Confidence",
    type: "Per-object (0–1)",
    measures: "How well-grounded a knowledge object's current value is in available evidence.",
    note: "Not the same as Uncertainty. High confidence and high uncertainty can coexist.",
    propagation: "Propagated through the Intelligence Graph — source fact confidence bounds downstream interpretation confidence.",
    color: "text-blue-400",
  },
  {
    name: "Trust",
    type: "Per-subsystem (0–100)",
    measures: "How reliable a connected subsystem has been over time.",
    note: "Earned through successful interactions. Depressed by failures. Distinct from per-object Confidence.",
    propagation: "Not propagated through the graph — applies to connector and service reliability.",
    color: "text-violet-400",
  },
  {
    name: "Operational Confidence",
    type: "Composite system score (0–100)",
    measures: "The quality of LEE's entire operational picture.",
    note: "Computed from: connector freshness, assumption health, fact staleness, waiting loop resolution, CIL/CerbaSeal health, aggregate Uncertainty.",
    propagation: "Updated on every Executive Loop cycle. Displayed prominently in Console and Morning Brief.",
    color: "text-indigo-400",
  },
  {
    name: "Uncertainty",
    type: "Per-object (LOW/MEDIUM/HIGH/VERY HIGH)",
    measures: "How unstable a situation is, regardless of evidence quality.",
    note: "Three dimensions: outcome, timing, scope. High aggregate Uncertainty depresses Operational Confidence.",
    propagation: "Computed from: open waiting loops, externally-dependent assumptions, unresolved simulations.",
    color: "text-amber-400",
  },
];

const PROGRESSION_STEPS = [
  { step: 1, name: "Event", description: "A significant occurrence recorded in the Event Log.", color: "bg-slate-500/20 border-slate-500/30 text-slate-400" },
  { step: 2, name: "Experience", description: "An event flagged by the Event Log pipeline as worth learning from.", color: "bg-blue-500/20 border-blue-500/30 text-blue-400" },
  { step: 3, name: "Lesson", description: "A preliminary, unvalidated conclusion extracted by the Reflection Engine.", color: "bg-indigo-500/20 border-indigo-500/30 text-indigo-400" },
  { step: 4, name: "Pattern", description: "A consistent lesson reinforced by 3+ independent Experience records.", color: "bg-violet-500/20 border-violet-500/30 text-violet-400" },
  { step: 5, name: "Institutional Knowledge", description: "A pattern validated by reality, with no significant contradiction. Cannot be asserted — only earned.", color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" },
];

export function KnowledgePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Knowledge and Data</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          LEE's knowledge architecture. Six distinct ledgers, four epistemic signals, and a progression pathway from raw event to Institutional Knowledge. Understanding this architecture is required to work on any Layer 2, 3, or 4 engine.
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">The Six Knowledge Ledgers</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Each ledger contains a distinct type of knowledge with distinct epistemic status. Knowledge objects never migrate between ledgers. The distinction is enforced in code (Constitutional Provision #6 for Facts and Interpretations).
        </p>
        <div className="space-y-4">
          {LEDGERS.map(ledger => (
            <div key={ledger.name} className={`bg-card border rounded-xl p-5 border-card-border`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${ledger.bg} ${ledger.color}`}>
                    {ledger.key.toUpperCase()}
                  </span>
                  <h3 className={`text-sm font-semibold ${ledger.color}`}>{ledger.name}</h3>
                </div>
                <Link href={`/tasks/${ledger.relatedTask}`} className="text-xs text-primary hover:underline font-mono shrink-0">
                  #{String(ledger.relatedTask).padStart(2, "0")}
                </Link>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{ledger.description}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">Required Fields</p>
                  <div className="flex flex-wrap gap-1">
                    {ledger.requiredFields.map(f => (
                      <span key={f} className="text-xs font-mono px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400/60 uppercase tracking-wider mb-1">Never Contains</p>
                  <div className="flex flex-wrap gap-1">
                    {ledger.neverContains.map(f => (
                      <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400/70">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">The Four Epistemic Signals</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These four signals are distinct. They are never conflated. Each measures something different.
        </p>
        <div className="space-y-3">
          {EPISTEMIC_SIGNALS.map(s => (
            <div key={s.name} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`text-sm font-semibold ${s.color}`}>{s.name}</h3>
                <span className="text-xs text-muted-foreground font-mono">{s.type}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{s.measures}</p>
              <p className="text-xs text-muted-foreground italic mb-2">{s.note}</p>
              <p className="text-xs text-muted-foreground/70">{s.propagation}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Knowledge Progression Pathway</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The path from a raw event to Institutional Knowledge. Cannot be shortcut. Reality must validate each step.
        </p>
        <div className="space-y-2">
          {PROGRESSION_STEPS.map((s, i) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 font-mono text-xs font-bold ${s.color}`}>
                {s.step}
              </div>
              <div className={`flex-1 p-3 rounded-lg border ${s.color}`}>
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
              </div>
              {i < PROGRESSION_STEPS.length - 1 && (
                <div className="w-8 flex justify-center pt-8">
                  <div className="w-px h-4 bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/tasks/67" className="text-sm text-primary hover:underline">
            Task #67: Experience and Institutional Knowledge →
          </Link>
        </div>
      </div>
    </div>
  );
}
