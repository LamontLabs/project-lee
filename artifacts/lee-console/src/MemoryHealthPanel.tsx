import { useCallback, useEffect, useState } from "react";
import { Archive, BrainCircuit, CircleAlert, Layers3, Play, RefreshCw } from "lucide-react";

type ConsolidationPhase = {
  phase: string;
  status: string;
  resultSummary?: Record<string, unknown>;
  skippedReason?: string | null;
  failureReason?: string | null;
};

type ConsolidationRun = {
  run: {
    id: string;
    status: string;
    currentPhase: string;
    failurePhase?: string | null;
    failureReason?: string | null;
    skippedWork?: Array<Record<string, unknown>>;
    nextScheduledAt?: string | null;
    completedAt?: string | null;
  };
  phases: ConsolidationPhase[];
};

export default function MemoryHealthPanel() {
  const [status, setStatus] = useState<any>(null);
  const [consolidation, setConsolidation] = useState<ConsolidationRun | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [healthResponse, runsResponse] = await Promise.all([
      fetch("/api/memory-architecture/status", { cache: "no-store" }),
      fetch("/api/memory/consolidation/runs?limit=1", { cache: "no-store" }),
    ]);
    if (!healthResponse.ok) throw new Error(`Memory health unavailable (${healthResponse.status}).`);
    if (!runsResponse.ok) throw new Error(`Consolidation history unavailable (${runsResponse.status}).`);
    const health = await healthResponse.json();
    const runs = await runsResponse.json();
    setStatus(health);
    setConsolidation(runs[0] ?? null);
    setError("");
  }, []);

  useEffect(() => {
    refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Memory health unavailable."));
  }, [refresh]);

  const start = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/memory/consolidation/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      if (!response.ok) throw new Error(`Unable to start consolidation (${response.status}).`);
      const result = await response.json();
      setConsolidation(result);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start consolidation.");
    } finally {
      setBusy(false);
    }
  };

  const resume = async () => {
    if (!consolidation) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/memory/consolidation/runs/${consolidation.run.id}/resume`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      if (!response.ok) throw new Error(`Unable to resume consolidation (${response.status}).`);
      setConsolidation(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to resume consolidation.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !status) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-accent/30 bg-accent/10 p-5 text-sm text-accent-foreground">{error}</div>;
  if (!status) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading memory health…</div>;

  const run = consolidation?.run;
  const canResume = run && ["failed", "paused"].includes(run.status);
  return <div className="mx-auto mt-5 max-w-[1280px] space-y-5">
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <BrainCircuit size={18} className="text-primary" />
        <div><p className="lee-label text-primary">Memory health</p><h3 className="mt-1 text-lg font-semibold">Tier distribution & compression</h3></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Working memory</p><p className="mt-2 text-2xl font-semibold">{status.distribution?.working ?? 0}</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Dormant</p><p className="mt-2 text-2xl font-semibold">{status.dormantCount}</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Stage 2 coverage</p><p className="mt-2 text-2xl font-semibold">{Math.round(status.stage2Coverage * 100)}%</p></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{Object.entries(status.distribution ?? {}).map(([tier, count]) => <span key={tier} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"><Layers3 size={12} />{tier} {String(count)}</span>)}</div>
      <p className="mt-4 text-xs text-muted-foreground"><Archive className="mr-1 inline" size={13} />{status.consolidationBacklog} historical objects await Stage 2 consolidation.</p>
    </div>
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="lee-label text-primary">Auditable consolidation</p><h3 className="mt-1 text-lg font-semibold">Low-priority memory maintenance</h3><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Every phase records its inputs, evidence, skips, failures, and checkpoint so a restart never requires rewriting history.</p></div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50" onClick={() => refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Refresh failed."))} disabled={busy}><RefreshCw size={14} />Refresh</button>
          {canResume ? <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" onClick={resume} disabled={busy}><Play size={14} />Resume run</button> : <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" onClick={start} disabled={busy}><Play size={14} />Run now</button>}
        </div>
      </div>
      {error && <p className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-accent-foreground">{error}</p>}
      {run ? <div className="mt-5">
        <div className="flex flex-wrap items-center gap-3 text-sm"><span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold uppercase">{run.status}</span><span className="text-muted-foreground">Current phase: <strong className="text-foreground">{run.currentPhase.replaceAll("_", " ")}</strong></span>{run.nextScheduledAt && <span className="text-xs text-muted-foreground">Next scheduled: {new Date(run.nextScheduledAt).toLocaleString()}</span>}</div>
        {run.failureReason && <div className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><CircleAlert size={14} className="mt-0.5 shrink-0" />{run.failurePhase ? `${run.failurePhase}: ` : ""}{run.failureReason}</div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{consolidation?.phases.map((phase) => <div key={phase.phase} className="rounded-xl border border-border bg-muted/30 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold capitalize">{phase.phase.replaceAll("_", " ")}</p><span className="text-[10px] uppercase text-muted-foreground">{phase.status}</span></div>{phase.failureReason && <p className="mt-2 text-[11px] text-destructive">{phase.failureReason}</p>}{phase.skippedReason && <p className="mt-2 text-[11px] text-muted-foreground">{phase.skippedReason}</p>}</div>)}</div>
        {!!run.skippedWork?.length && <p className="mt-3 text-xs text-muted-foreground">{run.skippedWork.length} phase result(s) were explicitly skipped and retained for review.</p>}
      </div> : <p className="mt-5 text-sm text-muted-foreground">No consolidation run has been recorded yet.</p>}
    </div>
  </div>;
}