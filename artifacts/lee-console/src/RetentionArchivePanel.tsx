import { useCallback, useEffect, useState } from "react";
import { Archive, CheckCircle2, Database, FileWarning, RefreshCw, ShieldAlert } from "lucide-react";

type RetentionStatus = {
  archiveCount: number;
  trackedBytes: number;
  byTier: Record<string, number>;
  byIntegrity: Record<string, number>;
  protectedCount: number;
  pendingOwnerDecisions: number;
  pendingDecisions?: Array<{ id: string; action: string; reason: string; archiveManifestId: string }>;
  latestPressure?: { stage: string; pressureScore: number; actionSummary: string } | null;
  health: string;
};

type DryRun = {
  rebuildableCacheEntries: number;
  coldCompressionCandidates: number;
  archiveMoveCandidates: number;
  purgeCandidates: Array<{ id: string; filename: string; bytes: number | null; protected: boolean; reason: string }>;
  protectedExcluded: number;
  pendingDecisionCount: number;
};

const formatBytes = (value: number) => {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

export default function RetentionArchivePanel() {
  const [status, setStatus] = useState<RetentionStatus | null>(null);
  const [dryRun, setDryRun] = useState<DryRun | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/retention/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`Archive health unavailable (${response.status}).`);
    setStatus(await response.json());
    setError("");
  }, []);

  useEffect(() => {
    refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Archive health unavailable."));
  }, [refresh]);

  const assess = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/retention/pressure/assess", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      if (!response.ok) throw new Error(`Pressure assessment unavailable (${response.status}).`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pressure assessment unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const runDryRun = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/retention/gc/dry-run", { cache: "no-store" });
      if (!response.ok) throw new Error(`Cleanup report unavailable (${response.status}).`);
      setDryRun(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cleanup report unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const applyDecision = async (id: string) => {
    if (!window.confirm("Apply this owner retention decision? Purge decisions remove only the archive object, never canonical Brain records.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/retention/decisions/${id}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ownerConfirmed: true, actor: "owner-console" }) });
      if (!response.ok) throw new Error(`Retention decision unavailable (${response.status}).`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retention decision unavailable.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !status) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-accent/30 bg-accent/10 p-5 text-sm text-accent-foreground">{error}</div>;
  if (!status) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading archive health…</div>;
  const pressure = status.latestPressure;
  return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="lee-label text-primary">Retention & archive</p>
        <h3 className="mt-1 text-lg font-semibold">Evidence storage stays explicit</h3>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Original media, derived evidence, semantic entries, and summaries retain separate lineage. PostgreSQL remains the canonical Brain.</p>
      </div>
      <div className="flex gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50" onClick={() => refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Refresh failed."))} disabled={busy}><RefreshCw size={14} />Refresh</button>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" onClick={assess} disabled={busy}><Database size={14} />Assess pressure</button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50" onClick={runDryRun} disabled={busy}><Archive size={14} />Dry-run cleanup</button>
      </div>
    </div>
    {error && <p className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-accent-foreground">{error}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Archived records</p><p className="mt-2 text-2xl font-semibold">{status.archiveCount}</p><p className="mt-1 text-xs text-muted-foreground">{formatBytes(status.trackedBytes)} tracked</p></div>
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Storage health</p><p className="mt-2 text-2xl font-semibold capitalize">{status.health}</p><p className="mt-1 text-xs text-muted-foreground">{status.byIntegrity?.verified ?? 0} verified · {status.byIntegrity?.missing ?? 0} missing</p></div>
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Protected</p><p className="mt-2 text-2xl font-semibold">{status.protectedCount}</p><p className="mt-1 text-xs text-muted-foreground">Never age-demoted automatically</p></div>
      <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Owner decisions</p><p className="mt-2 text-2xl font-semibold">{status.pendingOwnerDecisions}</p><p className="mt-1 text-xs text-muted-foreground">Pending review</p></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">{Object.entries(status.byTier ?? {}).map(([tier, count]) => <span key={tier} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">{tier.replaceAll("_", " ")} · {count}</span>)}</div>
    {pressure && <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.05] p-3 text-xs"><ShieldAlert size={14} className="mt-0.5 shrink-0 text-primary" /><div><strong className="capitalize">{pressure.stage.replaceAll("_", " ")}</strong> · {Math.round(pressure.pressureScore * 100)}% pressure<p className="mt-1 text-muted-foreground">{pressure.actionSummary}</p></div></div>}
    {!!status.pendingDecisions?.length && <div className="mt-5 border-t border-border pt-4"><p className="lee-label text-primary">Pending owner decisions</p><div className="mt-3 space-y-2">{status.pendingDecisions.map((decision) => <div key={decision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3"><div className="flex min-w-0 items-start gap-2"><FileWarning size={14} className="mt-0.5 shrink-0 text-accent" /><div><p className="text-xs font-semibold uppercase">{decision.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{decision.reason}</p></div></div><button className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50" onClick={() => applyDecision(decision.id)} disabled={busy}><CheckCircle2 size={13} />Apply</button></div>)}</div></div>}
    {dryRun && <div className="mt-5 border-t border-border pt-4"><p className="lee-label text-primary">Dry-run report</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><span className="rounded-lg bg-muted/50 p-3 text-xs">Rebuildable indexes <strong className="ml-1">{dryRun.rebuildableCacheEntries}</strong></span><span className="rounded-lg bg-muted/50 p-3 text-xs">Cold compression <strong className="ml-1">{dryRun.coldCompressionCandidates}</strong></span><span className="rounded-lg bg-muted/50 p-3 text-xs">Archive movement <strong className="ml-1">{dryRun.archiveMoveCandidates}</strong></span><span className="rounded-lg bg-muted/50 p-3 text-xs">Protected excluded <strong className="ml-1">{dryRun.protectedExcluded}</strong></span></div>{dryRun.purgeCandidates.length ? <p className="mt-3 text-xs text-muted-foreground">{dryRun.purgeCandidates.length} purge candidate(s) require an owner decision; no changes were applied.</p> : <p className="mt-3 text-xs text-muted-foreground">No purge candidates. Dry-run made no changes.</p>}</div>}
  </div>;
}