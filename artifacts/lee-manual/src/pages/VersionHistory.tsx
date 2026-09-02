import { META } from "../data/meta";
import { TASKS } from "../data/tasks";
import { VersionBadge } from "../components/StatusBadge";
import { Link } from "wouter";

const VERSION_DETAILS: Record<string, {
  headline: string;
  added: string[];
  principlesAdded: string[];
  provisionAdded?: string;
  constitutionalChange?: string;
  color: string;
}> = {
  "9.0": {
    headline: "The foundational architecture. LEE exists.",
    color: "border-slate-500/40",
    added: [
      "Constitution (11 provisions → expanded to 12 in v10.0 → 13 in v11.0)",
      "Event Log (append-only, enforced at DB level)",
      "Fact Ledger + Interpretation Ledger (permanently separate)",
      "Intelligence Graph",
      "Query Engine (universal access layer)",
      "Semantic Index (local embeddings only)",
      "Understanding Pipeline",
      "Curiosity Engine, Strategy Engine, Reflection Engine, Explanation Engine",
      "Orchestration Engine + Scheduler Calendar",
      "Governance Engine → CerbaSeal",
      "Provider Abstraction Layer + Connector Engine",
      "Project Bootstrap Engine",
      "Connected Lamont Labs Systems Layer (CIL + CerbaSeal clients)",
      "Brief Engine, Console, Android App",
      "Brain Versioning + Backup & Migration",
      "Assumption Ledger, Decision Impact Graph, Why Chain",
      "Domain Events catalog, Engine Lifecycle, Recovery Modes",
      "Self-Test Framework, System Manifest",
      "Cost Engine (Task #8 — extended by System Economics in v12.0)",
    ],
    principlesAdded: [
      "Continuity is the primary product.",
      "Event sourcing is the truth store.",
      "Constitution above everything.",
      "Facts and Interpretations are permanently separated.",
      "The Query Engine is the universal access layer.",
      "Intent is a first-class object.",
      "Context competes for space.",
      "Intelligence is independent of presentation.",
      "Resource-aware scheduling.",
      "Brain Versioning preserves continuity across changes.",
      "Confidence flows; Trust is earned.",
      "The Why Chain is always present.",
      "Assumptions are tracked, not buried.",
      "Domain Events are typed contracts.",
      "Engine lifecycle is explicit.",
      "LEE can describe herself.",
      "World State is maintained continuously.",
      "Operational Memory tracks how LEE has been used.",
      "LEE initiates — she does not only respond.",
      "Continuous prioritization, not on-demand queries.",
      "Providers are replaceable — adapters, not dependencies.",
      "Bootstrap from evidence, not declarations.",
    ],
  },
  "10.0": {
    headline: "LEE becomes a continuous operator. The Executive Loop. Portfolio awareness.",
    color: "border-blue-500/40",
    added: [
      "Executive Loop (8-phase operational heartbeat)",
      "Operational Confidence (composite system-health score)",
      "Project Momentum Engine (Explosive/Rising/Stable/Declining/Dormant/Stalled)",
      "Opportunity Engine (cross-project reuse and strategic alignment)",
      "Operational Capacity Awareness (Full/Standard/Constrained/Low)",
      "Strategic Anchors + Long-Term Memory (Anchor Ledger)",
      "Portfolio Intelligence Engine",
    ],
    principlesAdded: [
      "LEE never stops running. The Executive Loop is the operational heartbeat.",
      "LEE knows how much to trust herself. Operational Confidence is composite and time-aware.",
      "Projects have direction, not just status. Project Momentum is a trajectory.",
      "LEE looks for leverage. The Opportunity Engine finds cross-project reuse and strategic alignment.",
      "Capacity shapes presentation, not content.",
      "Some knowledge does not decay. Strategic Anchors are intentionally durable.",
      "Lamont Labs is a portfolio, not a list.",
    ],
    constitutionalChange: "Provision #12 added: Strategic Anchors are never silently contradicted.",
    provisionAdded: "12",
  },
  "11.0": {
    headline: "Identity becomes Layer 0. Objectives, memory, simulation, and the Time Machine.",
    color: "border-indigo-500/40",
    added: [
      "Identity Engine (Layer 0 — consulted before everything else)",
      "Executive Objectives Engine (operational goals spanning projects, people, time)",
      "Organizational Memory (Lamont Labs as a first-class entity)",
      "Decision Memory (heuristics inferred from observed patterns)",
      "Simulation Engine (what-if scenarios with stored assumptions)",
      "Time Machine (Event Log re-projection to any past moment)",
      "Uncertainty Tracking (distinct from Confidence; three dimensions)",
      "Resource Allocation Engine (calculated, not declared)",
      "Execution Readiness (multi-dimensional readiness per project)",
      "Portfolio Dependency Graph (directional, blast-radius aware)",
    ],
    principlesAdded: [
      "Identity is the center. Everything asks Identity before Constitution.",
      "Objectives are operational, not project-bound.",
      "Organizations exist independently of their projects.",
      "Decision patterns are observable.",
      "The future can be simulated.",
      "History can be reconstructed.",
      "Confidence and uncertainty are distinct signals.",
      "Attention is a limited resource that must be allocated.",
      "Projects have readiness, not just status.",
      "Dependencies define blast radius.",
    ],
    constitutionalChange: "Provision #13 added: Identity is consulted before Constitution on every request.",
    provisionAdded: "13",
  },
  "12.0": {
    headline: "Self-improvement. Institutional knowledge. System economics. LEE learns from herself.",
    color: "border-primary/40",
    added: [
      "Operational Review Engine (weekly/monthly/quarterly/annual reviews — permanent)",
      "Experience and Institutional Knowledge (new knowledge tier: Event → Experience → Lesson → Pattern → IK)",
      "Operational Self-Improvement (6 effectiveness categories, transparent, reversible)",
      "System Economics (supersedes Cost Engine — unified cost and value accounting)",
    ],
    principlesAdded: [
      "New capabilities must earn their own engine.",
      "History is not enough. Experience, Lesson, Pattern, and Institutional Knowledge are distinct knowledge types.",
      "LEE must learn from herself. Operational Self-Improvement adapts behaviors transparently, conservatively, and reversibly.",
      "Every operation has an economic cost. System Economics provides unified accounting.",
    ],
  },
};

export function VersionHistoryPage() {
  const tasksByVersion: Record<string, typeof TASKS> = {
    "9.0": TASKS.filter(t => t.versionIntroduced === "9.0"),
    "10.0": TASKS.filter(t => t.versionIntroduced === "10.0"),
    "11.0": TASKS.filter(t => t.versionIntroduced === "11.0"),
    "12.0": TASKS.filter(t => t.versionIntroduced === "12.0"),
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Version History</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          LEE's architecture evolved from v9.0 (foundational) through v12.0 (current). Each version added distinct capabilities. The architecture is cumulative — no version discards what came before.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(["9.0", "10.0", "11.0", "12.0"] as const).map(v => (
          <div key={v} className={`bg-card border rounded-xl p-4 ${v === META.version ? "border-primary/40" : "border-card-border"}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <VersionBadge version={v} />
              {v === META.version && <span className="text-xs text-primary font-medium">Current</span>}
            </div>
            <p className="text-2xl font-bold font-mono text-primary">{tasksByVersion[v].length}</p>
            <p className="text-xs text-muted-foreground">tasks</p>
            <p className="text-xs text-muted-foreground mt-1">{META.versionHistory.find(h => h.version === v)?.principles} principles</p>
          </div>
        ))}
      </div>

      <div className="space-y-10">
        {(["12.0", "11.0", "10.0", "9.0"] as const).map(v => {
          const details = VERSION_DETAILS[v];
          return (
            <div key={v}>
              <div className={`border-l-2 pl-5 ${details.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <VersionBadge version={v} />
                  {v === META.version && <span className="text-xs text-primary font-medium">Current</span>}
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{details.headline}</h2>
                <p className="text-xs text-muted-foreground mb-4 font-mono">
                  {tasksByVersion[v].length} tasks · {details.principlesAdded.length} new principles
                  {details.provisionAdded ? ` · Provision #${details.provisionAdded} added` : ""}
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Added in {v}</h3>
                    <ul className="space-y-1">
                      {details.added.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary/60 shrink-0 mt-0.5">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {details.constitutionalChange && (
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <p className="text-xs font-semibold text-red-400 mb-1">Constitutional Change</p>
                      <p className="text-xs text-muted-foreground">{details.constitutionalChange}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">New Principles</h3>
                    <ul className="space-y-1">
                      {details.principlesAdded.map((p, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-muted-foreground/40 shrink-0 font-mono">P</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tasks ({tasksByVersion[v].length})</h3>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {tasksByVersion[v].map(task => (
                        <Link key={task.id} href={`/tasks/${task.id}`}>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-card-border hover:border-border transition-colors group">
                            <span className="font-mono text-xs text-muted-foreground w-7 shrink-0">#{String(task.id).padStart(2, "0")}</span>
                            <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">{task.title}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
