import { Link, useParams } from "wouter";
import { ARCHITECTURE_LAYERS, ARCHITECTURE_PRINCIPLES, type Layer } from "../data/architecture";
import { TASKS } from "../data/tasks";
import { VersionBadge } from "../components/StatusBadge";

const LAYER_COLOR_MAP: Record<string, string> = {
  violet: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  red: "border-red-500/40 bg-red-500/10 text-red-400",
  blue: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  indigo: "border-indigo-500/40 bg-indigo-500/10 text-indigo-400",
  orange: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  teal: "border-teal-500/40 bg-teal-500/10 text-teal-400",
  purple: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  yellow: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  slate: "border-slate-500/40 bg-slate-500/10 text-slate-400",
};

function LayerCard({ layer }: { layer: Layer }) {
  const colorCls = LAYER_COLOR_MAP[layer.color] ?? LAYER_COLOR_MAP.slate;
  return (
    <Link href={`/architecture/${layer.id}`}>
      <div className="bg-card border border-card-border rounded-xl p-4 hover:border-border transition-all group cursor-pointer">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-10 rounded-lg border flex items-center justify-center shrink-0 font-mono text-sm font-bold ${colorCls}`}>
            {layer.number}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {layer.name}
              </h3>
              <VersionBadge version={layer.versionIntroduced} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{layer.purpose}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{layer.components.length} components</span>
          <span>·</span>
          <span>{layer.relatedTasks.length} tasks</span>
        </div>
      </div>
    </Link>
  );
}

export function ArchitecturePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Architecture Explorer</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          LEE's architecture is organized into 11 layers (0–9, with 6b). Each layer owns a distinct set of responsibilities. No layer bypasses another's API. The request pipeline is always: Identity → Constitution → Intent → Query → Context Economy → CIL → Model Router → CerbaSeal.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">Runtime service plane</p>
          <h2 className="mt-2 text-base font-semibold text-foreground">Consume independent capabilities</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">LEE calls CIL for cognitive routing, CerbaSeal for consequential governance, Gmail and other providers for normalized data, and the Replit AI Bridge to execute the route CIL selected.</p>
        </div>
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Management / control plane</p>
          <h2 className="mt-2 text-base font-semibold text-foreground">Work on registered projects</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The MCP Project Bridge handles scoped inspection, reads, previews, changes, checks, and coordination. It is not an indirect path for using CIL.</p>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">All Layers</h2>
        <div className="space-y-3">
          {ARCHITECTURE_LAYERS.map(layer => (
            <LayerCard key={layer.id} layer={layer} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-1">Architectural Principles</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {ARCHITECTURE_PRINCIPLES.length} principles across all versions. These are the durable rules that hold regardless of which version is current.
        </p>
        <div className="space-y-2">
          {ARCHITECTURE_PRINCIPLES.map(p => (
            <div key={p.number} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
              <span className="font-mono text-xs text-muted-foreground w-6 shrink-0 pt-0.5">
                {String(p.number).padStart(2, "0")}
              </span>
              <p className="text-sm text-muted-foreground flex-1">{p.principle}</p>
              <VersionBadge version={p.version} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LayerDetailPage() {
  const { layerId } = useParams<{ layerId: string }>();
  const layer = ARCHITECTURE_LAYERS.find(l => l.id === layerId);

  if (!layer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Layer not found.</p>
        <Link href="/architecture" className="text-primary hover:underline text-sm mt-2 block">Back to Architecture</Link>
      </div>
    );
  }

  const colorCls = LAYER_COLOR_MAP[layer.color] ?? LAYER_COLOR_MAP.slate;
  const relatedTasks = layer.relatedTasks.map(id => TASKS.find(t => t.id === id)).filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link href="/architecture" className="hover:text-foreground transition-colors">Architecture</Link>
          <span>/</span>
          <span className="text-foreground">Layer {layer.number}</span>
        </div>

        <div className="flex items-start gap-4">
          <div className={`w-14 h-12 rounded-xl border flex items-center justify-center shrink-0 font-mono text-base font-bold ${colorCls}`}>
            {layer.number}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-semibold text-foreground">{layer.name}</h1>
              <VersionBadge version={layer.versionIntroduced} />
            </div>
            <p className="text-sm text-muted-foreground">Layer {layer.number} of 11</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Purpose</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{layer.purpose}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Responsibilities</h2>
          <ul className="space-y-2">
            {layer.responsibilities.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${colorCls.includes("violet") ? "bg-violet-400" : colorCls.includes("red") ? "bg-red-400" : colorCls.includes("blue") ? "bg-blue-400" : colorCls.includes("indigo") ? "bg-indigo-400" : "bg-primary"}`} />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Components</h2>
          <div className="flex flex-wrap gap-1.5">
            {layer.components.map(c => (
              <span key={c} className="text-xs px-2 py-1 rounded-md bg-card border border-border text-muted-foreground font-mono">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Inputs</h2>
          <ul className="space-y-1">
            {layer.inputs.map((input, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground/40 shrink-0">→</span>
                {input}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Outputs</h2>
          <ul className="space-y-1">
            {layer.outputs.map((output, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary/60 shrink-0">←</span>
                {output}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Failure Behavior</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{layer.failureBehavior}</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Security Boundary</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{layer.securityBoundary}</p>
        </div>
      </div>

      {relatedTasks.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Related Tasks</h2>
          <div className="space-y-2">
            {relatedTasks.map(task => task && (
              <Link key={task.id} href={`/tasks/${task.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card-border hover:border-border transition-colors group">
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
                    #{String(task.id).padStart(2, "0")}
                  </span>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors flex-1">
                    {task.title}
                  </span>
                  <VersionBadge version={task.versionIntroduced} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
