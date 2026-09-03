import { useCallback, useEffect, useState } from "react";
import { Archive, BrainCircuit, CheckCircle2, CircleAlert, Database, HardDrive, Layers3, Play, RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";

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

type MemoryHealthCheck = {
  id: string;
  label: string;
  result: "PASS" | "WARN" | "FAIL";
  message: string;
  metrics?: Record<string, unknown>;
  evidenceRefs?: string[];
  recoverySteps?: string[];
};

function resultClasses(result: MemoryHealthCheck["result"]) {
  if (result === "FAIL") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (result === "WARN") return "border-accent/30 bg-accent/10 text-accent-foreground";
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

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
  const health = status.health;
  const checks = (health?.checks ?? []) as MemoryHealthCheck[];
  const failedChecks = checks.filter((check) => check.result === "FAIL");
  const warningChecks = checks.filter((check) => check.result === "WARN");
  const passChecks = checks.filter((check) => check.result === "PASS");
  const latestBackupAge = health?.checks?.find((check: MemoryHealthCheck) => check.id === "backup-freshness")?.metrics?.latestAgeHours;
  return <div className="mx-auto mt-5 max-w-[1280px] space-y-5">
    {health && <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert size={19} className={health.overall === "FAIL" ? "text-destructive" : health.overall === "WARN" ? "text-accent-foreground" : "text-emerald-600"} />
          <div>
            <p className="lee-label text-primary">Durability evidence</p>
            <h3 className="mt-1 text-lg font-semibold">Memory Health · {health.overall}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Canonical Brain integrity is reported separately from rebuildable retrieval and projection state. No derived cache is treated as proof of memory.</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${resultClasses(health.overall)}`}>{health.recoveryMode?.replaceAll("_", " ")}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-3"><div className="flex items-center gap-2 text-muted-foreground"><Database size={14} /><p className="lee-label">Canonical Brain</p></div><p className="mt-2 text-lg font-semibold">{health.canonicalBrain?.status}</p><p className="mt-1 text-[11px] text-muted-foreground">{health.canonicalBrain?.eventCount ?? 0} events · {health.canonicalBrain?.canonicalRecords ?? 0} records</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><div className="flex items-center gap-2 text-muted-foreground"><BrainCircuit size={14} /><p className="lee-label">Semantic index</p></div><p className="mt-2 text-lg font-semibold">{health.retrieval?.semanticIndex?.staleCount ?? 0} stale</p><p className="mt-1 text-[11px] text-muted-foreground">{health.retrieval?.semanticIndex?.indexedCount ?? 0} indexed · rebuildable</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><div className="flex items-center gap-2 text-muted-foreground"><Archive size={14} /><p className="lee-label">Latest backup</p></div><p className="mt-2 text-lg font-semibold">{typeof latestBackupAge === "number" ? `${Math.round(latestBackupAge)}h old` : "Missing"}</p><p className="mt-1 text-[11px] text-muted-foreground">Isolated restore required</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><div className="flex items-center gap-2 text-muted-foreground"><HardDrive size={14} /><p className="lee-label">Recovery plan</p></div><p className="mt-2 text-lg font-semibold">{health.recoveryPlan?.length ?? 0} actions</p><p className="mt-1 text-[11px] text-muted-foreground">{failedChecks.length} fail · {warningChecks.length} warn · {passChecks.length} pass</p></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {checks.map((check) => <details key={check.id} className={`rounded-xl border p-3 ${resultClasses(check.result)}`} open={check.result === "FAIL"}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold"><span className="flex items-center gap-2">{check.result === "PASS" ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}{check.label}</span><span className="text-[10px] font-bold uppercase">{check.result}</span></summary>
          <p className="mt-2 text-xs leading-5">{check.message}</p>
          {!!check.evidenceRefs?.length && <p className="mt-2 break-all text-[10px] opacity-75">Evidence: {check.evidenceRefs.slice(0, 4).join(", ")}{check.evidenceRefs.length > 4 ? ` +${check.evidenceRefs.length - 4}` : ""}</p>}
          {!!check.recoverySteps?.length && <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px]">{check.recoverySteps.map((step) => <li key={step}>{step}</li>)}</ul>}
        </details>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
        <RotateCcw size={13} />
        <span>Machine-loss proof: canonical Brain {health.machineLossProof?.backupIncludesCanonicalBrain ? "included" : "not yet backed up"} · credentials excluded · replacement install only · provider reauthorization required on resume.</span>
      </div>
    </div>}
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