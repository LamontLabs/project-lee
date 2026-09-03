import { useCallback, useEffect, useState } from "react";
import { Cpu, RefreshCw, ShieldAlert } from "lucide-react";

type RuntimeModel = {
  modelKey: string;
  modelType: string;
  status: string;
  freshness: number;
  lastRefreshedAt?: string | null;
  degradedReason?: string | null;
};

type RuntimeSnapshot = {
  status: string;
  lastRefreshAt: string | null;
  nextRefreshAt: string | null;
  staleModels: string[];
  degradedModels: string[];
  cycle: { cycleNumber: number; trigger: string; continuity?: { previousCycleId?: string | null; configChangedSincePrevious?: boolean } } | null;
  summary: { headline?: string; mostImportantAction?: string; operationalState?: string; uncertainty?: string };
  models: RuntimeModel[];
  recoveryMode: string;
};

export default function CognitiveRuntimePanel() {
  const [runtime, setRuntime] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/cognitive-runtime/current", { cache: "no-store" });
    if (!response.ok) throw new Error(`Cognitive runtime unavailable (${response.status}).`);
    setRuntime(await response.json());
    setError("");
  }, []);

  useEffect(() => { load().catch((cause) => setError(cause instanceof Error ? cause.message : "Cognitive runtime unavailable.")); }, [load]);

  const refresh = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/cognitive-runtime/refresh", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trigger: "manual" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.reason ?? result.error ?? `Runtime refresh unavailable (${response.status}).`);
      setRuntime(result);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Runtime refresh unavailable.");
    } finally {
      setBusy(false);
    }
  };

  if (!runtime) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">{error || "Loading cognitive runtime…"}</div>;
  const stale = new Set(runtime.staleModels);
  const degraded = new Set(runtime.degradedModels);
  return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Cpu size={18} /></span>
        <div>
          <p className="lee-label text-primary">Cognitive runtime</p>
          <h3 className="mt-1 text-lg font-semibold">Thirteen models, one bounded state</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{runtime.summary?.headline ?? "No owner-facing runtime summary is available yet."}</p>
        </div>
      </div>
      <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50" onClick={refresh} disabled={busy}><RefreshCw size={14} className={busy ? "animate-spin" : ""} />Refresh runtime</button>
    </div>
    {error && <p className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-accent-foreground">{error}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Current cycle</p><p className="mt-2 text-2xl font-semibold">{runtime.cycle?.cycleNumber ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">{runtime.status} · {runtime.cycle?.trigger ?? "not run"}</p></div>
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Last refresh</p><p className="mt-2 text-sm font-semibold">{runtime.lastRefreshAt ? new Date(runtime.lastRefreshAt).toLocaleString() : "Not yet"}</p><p className="mt-1 text-xs text-muted-foreground">Next {runtime.nextRefreshAt ? new Date(runtime.nextRefreshAt).toLocaleString() : "not scheduled"}</p></div>
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Needs freshness</p><p className="mt-2 text-2xl font-semibold">{runtime.staleModels.length}</p><p className="mt-1 text-xs text-muted-foreground">{runtime.staleModels.join(", ") || "All evidence windows are current"}</p></div>
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Degraded</p><p className="mt-2 text-2xl font-semibold">{runtime.degradedModels.length}</p><p className="mt-1 text-xs text-muted-foreground">{runtime.degradedModels.join(", ") || "No model isolation is active"}</p></div>
    </div>
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.05] p-3 text-xs"><ShieldAlert size={14} className="mt-0.5 shrink-0 text-primary" /><div><strong>Most important owner action:</strong> {runtime.summary?.mostImportantAction ?? "Review current evidence before acting."}<p className="mt-1 text-muted-foreground">{runtime.summary?.uncertainty ?? "Uncertainty remains explicitly bounded."} Operational state: {runtime.summary?.operationalState ?? "unknown"}.</p></div></div>
    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{runtime.models.map((model) => <div key={model.modelKey} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2"><div><p className="text-xs font-semibold capitalize">{model.modelType}</p><p className="text-[11px] text-muted-foreground">{Math.round(model.freshness * 100)}% fresh</p></div><span className={`lee-label ${degraded.has(model.modelKey) ? "text-accent-foreground" : stale.has(model.modelKey) ? "text-muted-foreground" : "text-primary"}`}>{model.status}</span></div>)}</div>
  </div>;
}