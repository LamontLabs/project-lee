import { Link } from "wouter";

const READING_ORDER = [
  {
    step: 1,
    title: "Vision and Identity",
    path: "/vision",
    description: "Understand what LEE is and why she exists. The mission, the identity, and the founding rationale. Read this before anything else — it answers why the architecture is designed the way it is.",
  },
  {
    step: 2,
    title: "Constitution",
    path: "/constitution",
    description: "13 ABSOLUTE provisions. These are non-negotiable. Understanding the Constitution is required to understand any engine, because every engine operates within these constraints.",
  },
  {
    step: 3,
    title: "Architecture Overview",
    path: "/architecture",
    description: "11 layers from Identity (Layer 0) to Interfaces (Layer 9). Read the overview and the 43 architectural principles before drilling into individual layers.",
  },
  {
    step: 4,
    title: "Request Processing Pipeline",
    path: "/",
    description: "On the Overview page, study the 6-step request pipeline: Identity → Constitution → Intent → Context → CIL → CerbaSeal. This sequence is always followed.",
  },
  {
    step: 5,
    title: "Knowledge Architecture (Layer 2)",
    path: "/architecture/layer-2",
    description: "LEE's knowledge architecture is the most complex part. 5 knowledge ledgers. 4 epistemic signals. The knowledge progression pathway. The Intelligence Graph. Why Chains.",
  },
  {
    step: 6,
    title: "Task Manual — Foundations",
    path: "/tasks",
    description: "Start with Tasks #1–#6. These are the foundational tasks that everything else depends on. Understand the dependency graph before reading later tasks.",
  },
  {
    step: 7,
    title: "Connected Lamont Labs Systems (Layer 7)",
    path: "/architecture/layer-7",
    description: "Two external services that LEE calls but does not own. CIL for reasoning reuse. CerbaSeal for governance. Understanding their fail modes is critical.",
  },
  {
    step: 8,
    title: "Glossary",
    path: "/glossary",
    description: "Reference when you encounter unfamiliar terms. Key distinction: Confidence vs. Trust vs. Operational Confidence vs. Uncertainty — these are four distinct epistemic signals.",
  },
];

const KEY_DISTINCTIONS = [
  {
    a: "Fact",
    b: "Interpretation",
    distinction: "Facts are observed. Interpretations are concluded. They are stored in separate ledgers and never mixed. Constitutional Provision #6.",
  },
  {
    a: "Identity",
    b: "Constitution",
    distinction: "Identity defines what kind of partner LEE is. Constitution defines what LEE is allowed to do. Identity is consulted first. Neither overrides the other.",
  },
  {
    a: "Confidence",
    b: "Uncertainty",
    distinction: "Confidence measures evidence quality (per object). Uncertainty measures situational instability (per object). High confidence and high uncertainty can coexist.",
  },
  {
    a: "Strategic Anchor",
    b: "Decision Heuristic",
    distinction: "Anchors are explicitly declared by the owner. Heuristics are inferred from observed decision patterns. Both live in the Knowledge Layer, in separate ledgers.",
  },
  {
    a: "Policy",
    b: "Constitution",
    distinction: "Policies are configurable rules managed by the Policy Engine. Constitutional provisions are absolute and cannot be configured, disabled, or bypassed.",
  },
  {
    a: "Lesson",
    b: "Institutional Knowledge",
    distinction: "A Lesson is a preliminary, unvalidated conclusion. Institutional Knowledge is a Lesson that reality has confirmed 3+ independent times with no contradiction.",
  },
  {
    a: "Operational Confidence",
    b: "Confidence",
    distinction: "Confidence is a per-object score (0–1). Operational Confidence is a composite, time-aware score (0–100) representing the quality of the entire operational picture.",
  },
  {
    a: "CIL",
    b: "CerbaSeal",
    distinction: "CIL is the Reasoning Service (are we reusing thinking?). CerbaSeal is the Governance Service (is this action authorized?). Separate deployments, separate databases.",
  },
];

const COMMON_MISTAKES = [
  "Treating Operational Confidence as a per-object confidence score. It is a composite system-health score.",
  "Believing Identity can override the Constitution, or the Constitution can override Identity. They are complementary and sequential, not competing.",
  "Assuming 'the Constitution' is the same as 'Policies'. Policies are configurable. The Constitution is not.",
  "Writing an engine that references a specific service by name (e.g. calling Gmail directly). All provider calls route through the Provider Abstraction Layer.",
  "Treating 'project status' and 'project momentum' as synonyms. Status is a state. Momentum is a trajectory.",
  "Assuming CerbaSeal fail-open on unavailability. CerbaSeal is fail-CLOSED. Unavailability means HOLD.",
  "Confusing Lessons with Institutional Knowledge. Lessons are unvalidated. IK requires 3+ real-world confirmations.",
  "Forgetting that Strategic Anchors never age. They are explicitly exempt from Knowledge Aging.",
];

export function StartHerePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Start Here</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          If you are new to Project LEE, follow this reading order. The architecture has dependencies — reading in the wrong order creates gaps in understanding that become dangerous when building.
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Recommended Reading Order</h2>
        <div className="space-y-3">
          {READING_ORDER.map(item => (
            <Link key={item.step} href={item.path}>
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-card-border hover:border-border transition-colors group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 font-mono text-sm font-bold text-primary">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Key Distinctions</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These pairs are frequently confused. Understanding the distinction is required before working on any engine.
        </p>
        <div className="space-y-3">
          {KEY_DISTINCTIONS.map(d => (
            <div key={d.a} className="p-4 rounded-xl bg-card border border-card-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-primary font-semibold">{d.a}</span>
                <span className="text-xs text-muted-foreground">vs.</span>
                <span className="font-mono text-xs text-primary font-semibold">{d.b}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{d.distinction}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Common Mistakes</h2>
        <p className="text-sm text-muted-foreground mb-4">Do not make these.</p>
        <ul className="space-y-2">
          {COMMON_MISTAKES.map((m, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <svg className="w-4 h-4 text-red-400/70 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {m}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
        <p className="text-sm text-foreground font-medium mb-1">This is a private internal reference.</p>
        <p className="text-xs text-muted-foreground">
          The Project LEE Manual is not indexed, not public, and not distributed. It exists to ensure the engineering team and operator can build and operate LEE correctly.
        </p>
      </div>
    </div>
  );
}
