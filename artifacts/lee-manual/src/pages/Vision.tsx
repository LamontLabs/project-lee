import { Link } from "wouter";
import { META } from "../data/meta";

const WHAT_LEE_IS = [
  "A private, persistent AI operating environment for Lamont Labs.",
  "An always-on operational intelligence layer that accumulates, maintains, and acts on knowledge over time.",
  "A system that knows the owner's projects, relationships, decisions, strategic directions, and institutional knowledge — and maintains that knowledge with provenance.",
  "The operator, not the operator's tool. LEE runs continuously; she does not wait to be queried.",
  "A governance-aware system that never takes consequential action without authorization.",
];

const WHAT_LEE_IS_NOT = [
  "A chatbot. LEE is not a question-answering interface that discards context between sessions.",
  "A productivity tool. LEE is an operating intelligence layer — she is infrastructure, not software.",
  "A data storage system. LEE synthesizes, interprets, and reasons over knowledge — she is not a database.",
  "An autonomous agent. LEE is governed. Every consequential action requires CerbaSeal authorization.",
  "A personal assistant. LEE manages operational intelligence for a multi-project portfolio company.",
];

const FOUNDING_PRINCIPLES_VISION = [
  {
    title: "Continuity above all",
    description: "LEE's primary product is continuity. The ability to pick up any thread, reconstruct any context, and maintain institutional memory across months and years without degradation.",
  },
  {
    title: "Private by architecture",
    description: "Semantic embeddings are computed locally. Internal service namespaces are never exposed. Credentials are never logged. The architecture is private by design, not by policy.",
  },
  {
    title: "Governed, not autonomous",
    description: "CerbaSeal governs every consequential action. LEE is powerful because she is also constrained. Governance is not a limitation — it is what makes her trustworthy.",
  },
  {
    title: "Knowledge with provenance",
    description: "Every fact, interpretation, and assumption carries a traceable chain of evidence. LEE does not present beliefs as facts. She never loses track of where knowledge came from.",
  },
  {
    title: "Epistemic honesty",
    description: "LEE distinguishes Confidence (evidence quality) from Uncertainty (situational instability) and surfaces both. She does not present confident assessments of unstable situations as certainties.",
  },
  {
    title: "Portfolio awareness",
    description: "Lamont Labs is a portfolio, not a list of projects. LEE sees the whole — shared infrastructure, shared relationships, cross-project dependencies, and portfolio-level momentum.",
  },
];

const TWELVE_QUESTIONS = [
  "Who am I?",
  "Why do I exist?",
  "What am I responsible for?",
  "What will I never do?",
  "What must I always protect?",
  "What order do my priorities go in?",
  "What does success look like for me?",
  "When should I interrupt?",
  "When should I stay silent?",
  "When should I escalate?",
  "When should I ask a question?",
  "When should I simply observe?",
];

export function VisionPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Vision and Identity</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          What Project LEE is, why it exists, and the foundational identity that shapes every architectural decision.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">What LEE is</h2>
          <ul className="space-y-2">
            {WHAT_LEE_IS.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">What LEE is not</h2>
          <ul className="space-y-2">
            {WHAT_LEE_IS_NOT.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400/60 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Founding Principles</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FOUNDING_PRINCIPLES_VISION.map(p => (
            <div key={p.title} className="bg-card border border-card-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{p.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Identity: The Twelve Questions</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl leading-relaxed">
          The Identity Engine maintains LEE's versioned Identity Profile, which answers these 12 foundational questions. These questions are answered during installation and can be updated only with owner confirmation. The Identity Engine is consulted before the Constitution on every request.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {TWELVE_QUESTIONS.map((q, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-card-border">
              <span className="font-mono text-xs text-primary w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-muted-foreground">{q}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/tasks/56" className="text-sm text-primary hover:underline">
            Task #56: Identity Engine →
          </Link>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-card border border-card-border">
        <h2 className="text-sm font-semibold text-foreground mb-3">Identity vs. Constitution</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Identity (Layer 0)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Defines what kind of operating partner LEE is. Shapes how she communicates, when she interrupts, when she stays silent, what she prioritizes, and what she never does by character.
            </p>
            <p className="text-xs text-muted-foreground mt-2">Consulted <strong className="text-foreground">first</strong> on every request.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Constitution (Layer 1)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Defines what LEE is allowed to do. 13 ABSOLUTE provisions that govern every engine, every request, and every consequential action. Cannot be disabled or overridden.
            </p>
            <p className="text-xs text-muted-foreground mt-2">Consulted <strong className="text-foreground">after Identity</strong> on every request.</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Critical:</strong> Identity cannot override the Constitution. The Constitution cannot override Identity. They are complementary and sequential — neither supersedes the other. Constitutional Provision #13 enforces this ordering.
          </p>
        </div>
      </div>
    </div>
  );
}
