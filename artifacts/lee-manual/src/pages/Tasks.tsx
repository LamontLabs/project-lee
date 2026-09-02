import { useState, useMemo } from "react";
import { Link, useParams } from "wouter";
import { TASKS, TASK_MAP, TASKS_BY_LAYER } from "../data/tasks";
import { ARCHITECTURE_LAYERS } from "../data/architecture";
import { VersionBadge, TaskStatusBadge } from "../components/StatusBadge";

const LAYERS_ORDER = [
  "Identity", "Foundations", "Knowledge", "Retrieval", "Intelligence",
  "Coordination", "Operational Context", "Portfolio Intelligence",
  "Connected Lamont Labs Systems", "Provider Layer", "Interfaces and Observability",
];

const VERSION_OPTIONS = ["All", "9.0", "10.0", "11.0", "12.0"];

export function TasksPage() {
  const [search, setSearch] = useState("");
  const [versionFilter, setVersionFilter] = useState("All");
  const [layerFilter, setLayerFilter] = useState("All");
  const [view, setView] = useState<"list" | "layer">("layer");

  const filtered = useMemo(() => {
    return TASKS.filter(t => {
      if (versionFilter !== "All" && t.versionIntroduced !== versionFilter) return false;
      if (layerFilter !== "All" && t.layer !== layerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.purpose.toLowerCase().includes(q) ||
          t.layer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, versionFilter, layerFilter]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-foreground">Task Manual</h1>
          <span className="font-mono text-sm text-muted-foreground">{TASKS.length} tasks</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          All {TASKS.length} tasks across {ARCHITECTURE_LAYERS.length} layers, ordered by layer and dependency. Each task defines a distinct engine, service, or architectural responsibility.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
        />
        <select
          value={versionFilter}
          onChange={e => setVersionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {VERSION_OPTIONS.map(v => <option key={v} value={v}>{v === "All" ? "All versions" : `v${v}`}</option>)}
        </select>
        <select
          value={layerFilter}
          onChange={e => setLayerFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="All">All layers</option>
          {LAYERS_ORDER.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("layer")}
            className={`px-3 py-2 text-xs font-medium transition-colors ${view === "layer" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            By Layer
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 text-xs font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            List
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No tasks match the current filters.
        </div>
      )}

      {view === "list" && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}

      {view === "layer" && filtered.length > 0 && (
        <div className="space-y-8">
          {LAYERS_ORDER.map(layerName => {
            const layerTasks = filtered.filter(t => t.layer === layerName);
            if (layerTasks.length === 0) return null;
            const layerDef = ARCHITECTURE_LAYERS.find(l => l.name === layerName);
            return (
              <div key={layerName}>
                <div className="flex items-center gap-2 mb-3">
                  {layerDef && (
                    <span className="font-mono text-xs text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                      L{layerDef.number}
                    </span>
                  )}
                  <h2 className="text-sm font-semibold text-foreground">{layerName}</h2>
                  <span className="text-xs text-muted-foreground">{layerTasks.length} tasks</span>
                </div>
                <div className="space-y-2">
                  {layerTasks.map(task => <TaskRow key={task.id} task={task} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: (typeof TASKS)[0] }) {
  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-card-border hover:border-border transition-colors group cursor-pointer">
        <span className="font-mono text-sm text-muted-foreground w-8 shrink-0 pt-0.5">
          #{String(task.id).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {task.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.purpose}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <VersionBadge version={task.versionIntroduced} />
          {task.supersededBy && (
            <span className="text-xs text-muted-foreground font-mono">→#{task.supersededBy}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const task = TASK_MAP[Number(taskId)];

  if (!task) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Task #{taskId} not found.</p>
        <Link href="/tasks" className="text-primary hover:underline text-sm mt-2 block">Back to Task Manual</Link>
      </div>
    );
  }

  const layerDef = ARCHITECTURE_LAYERS.find(l => l.name === task.layer);
  const dependsOnTasks = task.dependsOn.map(id => TASK_MAP[id]).filter(Boolean);
  const dependentTasks = task.dependents.map(id => TASK_MAP[id]).filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link href="/tasks" className="hover:text-foreground transition-colors">Task Manual</Link>
          <span>/</span>
          <span className="text-foreground">#{String(task.id).padStart(2, "0")}</span>
        </div>

        <div className="flex items-start gap-3 flex-wrap">
          <span className="font-mono text-2xl font-bold text-muted-foreground/50">
            #{String(task.id).padStart(2, "0")}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {layerDef && (
                <Link href={`/architecture/${layerDef.id}`}>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-card border border-border text-muted-foreground font-mono hover:text-primary transition-colors">
                    <span className="text-primary">L{layerDef.number}</span>
                    <span>{task.layer}</span>
                  </span>
                </Link>
              )}
              <VersionBadge version={task.versionIntroduced} />
              <TaskStatusBadge status={task.status} />
              {task.supersededBy && (
                <span className="text-xs text-muted-foreground font-mono">
                  Superseded by <Link href={`/tasks/${task.supersededBy}`} className="text-primary hover:underline">#{task.supersededBy}</Link>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Purpose</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{task.purpose}</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-2">Description</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Responsibilities</h2>
        <ul className="space-y-2">
          {task.responsibilities.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Outputs</h2>
          <ul className="space-y-1">
            {task.outputs.map((o, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary/60 shrink-0">←</span>
                {o}
              </li>
            ))}
          </ul>
        </div>

        {task.domainEvents.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Domain Events</h2>
            <div className="flex flex-wrap gap-1.5">
              {task.domainEvents.map(e => (
                <span key={e} className="text-xs px-2 py-1 rounded-md bg-card border border-border text-primary font-mono">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Done When</h2>
        <ul className="space-y-2">
          {task.doneWhenList.map((d, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <svg className="w-4 h-4 text-emerald-400/60 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {d}
            </li>
          ))}
        </ul>
      </div>

      {task.outOfScope && task.outOfScope.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Out of Scope</h2>
          <ul className="space-y-2">
            {task.outOfScope.map((o, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <svg className="w-4 h-4 text-red-400/60 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6 pt-2 border-t border-border">
        {dependsOnTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Depends On ({dependsOnTasks.length})</h2>
            <div className="space-y-1.5">
              {dependsOnTasks.map(t => t && (
                <Link key={t.id} href={`/tasks/${t.id}`}>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors group">
                    <span className="font-mono text-xs text-muted-foreground w-7">#{String(t.id).padStart(2, "0")}</span>
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">{t.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {dependentTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Required By ({dependentTasks.length})</h2>
            <div className="space-y-1.5">
              {dependentTasks.map(t => t && (
                <Link key={t.id} href={`/tasks/${t.id}`}>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors group">
                    <span className="font-mono text-xs text-muted-foreground w-7">#{String(t.id).padStart(2, "0")}</span>
                    <span className="text-xs text-foreground group-hover:text-primary transition-colors">{t.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
