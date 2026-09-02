import { Link } from "wouter";
import { META } from "../data/meta";
import { TASKS } from "../data/tasks";

const STAT_CARDS = [
  { label: "Architecture Version", value: `v${META.version}`, sub: META.versionDate, color: "text-primary" },
  { label: "Total Tasks", value: String(META.taskCount), sub: "planned", color: "text-blue-400" },
  { label: "Architecture Layers", value: String(META.layerCount), sub: "Layers 0–9", color: "text-indigo-400" },
  { label: "Constitutional Provisions", value: String(META.constitutionalProvisions), sub: "all ABSOLUTE", color: "text-red-400" },
  { label: "Principles", value: String(META.principleCount), sub: "architectural", color: "text-violet-400" },
  { label: "Knowledge Ledgers", value: String(META.knowledgeLedgers), sub: "distinct types", color: "text-emerald-400" },
  { label: "Capability Levels", value: String(META.capabilityLevels), sub: "defined", color: "text-amber-400" },
  { label: "Epistemic Signals", value: String(META.epistemicSignals), sub: "Confidence, Trust, OC, Uncertainty", color: "text-cyan-400" },
];

const LAYERS = [
  { num: "0", name: "Identity", color: "bg-violet-500/20 border-violet-500/30 text-violet-400", path: "/architecture/layer-0" },
  { num: "1", name: "Foundations", color: "bg-red-500/20 border-red-500/30 text-red-400", path: "/architecture/layer-1" },
  { num: "2", name: "Knowledge", color: "bg-blue-500/20 border-blue-500/30 text-blue-400", path: "/architecture/layer-2" },
  { num: "3", name: "Retrieval", color: "bg-cyan-500/20 border-cyan-500/30 text-cyan-400", path: "/architecture/layer-3" },
  { num: "4", name: "Intelligence", color: "bg-indigo-500/20 border-indigo-500/30 text-indigo-400", path: "/architecture/layer-4" },
  { num: "5", name: "Coordination", color: "bg-orange-500/20 border-orange-500/30 text-orange-400", path: "/architecture/layer-5" },
  { num: "6", name: "Operational Context", color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400", path: "/architecture/layer-6" },
  { num: "6b", name: "Portfolio Intelligence", color: "bg-teal-500/20 border-teal-500/30 text-teal-400", path: "/architecture/layer-6b" },
  { num: "7", name: "Connected Lamont Labs Systems", color: "bg-purple-500/20 border-purple-500/30 text-purple-400", path: "/architecture/layer-7" },
  { num: "8", name: "Provider Layer", color: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400", path: "/architecture/layer-8" },
  { num: "9", name: "Interfaces and Observability", color: "bg-slate-500/20 border-slate-500/30 text-slate-400", path: "/architecture/layer-9" },
];

const REQUEST_PIPELINE = [
  { step: 1, name: "Identity", detail: "Who am I? How do I operate? When should I speak?", color: "border-violet-500/40 bg-violet-500/10 text-violet-400" },
  { step: 2, name: "Constitution", detail: "What am I allowed to do?", color: "border-red-500/40 bg-red-500/10 text-red-400" },
  { step: 3, name: "Intent", detail: "What is being asked?", color: "border-blue-500/40 bg-blue-500/10 text-blue-400" },
  { step: 4, name: "Context Economy", detail: "What is relevant, given a fixed budget?", color: "border-indigo-500/40 bg-indigo-500/10 text-indigo-400" },
  { step: 5, name: "CIL", detail: "Do we have reusable reasoning?", color: "border-purple-500/40 bg-purple-500/10 text-purple-400" },
  { step: 6, name: "CerbaSeal", detail: "Is this action authorized? (consequential only)", color: "border-orange-500/40 bg-orange-500/10 text-orange-400" },
];

const VERSION_TASKS = {
  "9.0": TASKS.filter(t => t.versionIntroduced === "9.0").length,
  "10.0": TASKS.filter(t => t.versionIntroduced === "10.0").length,
  "11.0": TASKS.filter(t => t.versionIntroduced === "11.0").length,
  "12.0": TASKS.filter(t => t.versionIntroduced === "12.0").length,
};

export function HomePage() {
  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="font-mono text-sm font-bold text-primary">L</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">Project LEE Manual</h1>
              <span className="version-badge">v{META.version}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Learning Environment Engine — Private, persistent AI operating environment for Lamont Labs.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          This is the authoritative reference for LEE's architecture at v{META.version}.
          {" "}It contains the Engineering Reference, Architecture Explorer, Constitutional provisions, and Operator Handbook for all {META.taskCount} tasks across {META.layerCount} architectural layers.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/start-here" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Start Here
          </Link>
          <Link href="/constitution" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-accent transition-colors">
            Constitution
          </Link>
          <Link href="/architecture" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-accent transition-colors">
            Architecture
          </Link>
          <Link href="/tasks" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground hover:bg-accent transition-colors">
            All 69 Tasks
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Architecture at a Glance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="bg-card border border-card-border rounded-xl p-4">
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-foreground font-medium mt-1">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Request Processing Pipeline</h2>
        <p className="text-sm text-muted-foreground mb-4">Every request — human or machine — follows this sequence. Steps 5 and 6 are conditional.</p>
        <div className="space-y-2">
          {REQUEST_PIPELINE.map((step, i) => (
            <div key={step.step} className="flex items-start gap-3">
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <div className={`w-6 h-6 rounded font-mono text-xs font-bold flex items-center justify-center border ${step.color}`}>
                  {step.step}
                </div>
                {i < REQUEST_PIPELINE.length - 1 && (
                  <div className="w-px h-5 bg-border ml-2.5 mt-1 hidden sm:block" style={{ position: "absolute", marginTop: "24px" }} />
                )}
              </div>
              <div className={`flex-1 px-3 py-2.5 rounded-lg border ${step.color}`}>
                <p className="text-sm font-medium text-foreground">{step.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Architecture Layers</h2>
          <Link href="/architecture" className="text-xs text-primary hover:underline">Explore all</Link>
        </div>
        <div className="space-y-2">
          {LAYERS.map(layer => (
            <Link
              key={layer.num}
              href={layer.path}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border hover:border-border transition-colors group"
            >
              <div className={`w-10 h-8 rounded border flex items-center justify-center shrink-0 font-mono text-xs font-bold ${layer.color}`}>
                {layer.num}
              </div>
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{layer.name}</span>
              <svg className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Version History</h2>
          <Link href="/version-history" className="text-xs text-primary hover:underline">Full history</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["9.0", "10.0", "11.0", "12.0"] as const).map(v => (
            <Link
              key={v}
              href="/version-history"
              className={`bg-card border rounded-xl p-4 transition-colors hover:border-border ${v === META.version ? "border-primary/40" : "border-card-border"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-foreground">v{v}</span>
                {v === META.version && <span className="text-xs text-primary font-medium">Current</span>}
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{VERSION_TASKS[v]}</p>
              <p className="text-xs text-muted-foreground mt-1">tasks added</p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">External Services</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {META.systems.map(sys => (
            <div key={sys.name} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-foreground">{sys.name}</span>
                <span className="text-xs text-muted-foreground">{sys.role}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{sys.description}</p>
              {sys.endpoint && (
                <p className="mt-2 text-xs font-mono text-primary/70 truncate">{sys.endpoint}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
