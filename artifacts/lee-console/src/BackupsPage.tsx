import { useCallback, useEffect, useState } from "react";
import { Archive, CheckCircle2, Download, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";

type Preflight = {
  eligible: boolean;
  backupClass: string;
  reason: string;
  brainVersion: string;
  target: string;
  impact: { tableCount: number; totalRecords: number; recordsByTable: Record<string, number>; providerCredentialsIncluded: false };
  verification: { overall: string; canonicalStateHash: string };
  overwritePolicy: string;
  nextStep: string;
};

export default function BackupsPage() {
  const [data, setData] = useState<any>({ backups: [], readinessScore: 0, portability: {} });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const load = useCallback(async () => {
    const response = await fetch("/api/backups/status", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  const create = async () => {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/backups/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ backupClass: "owner_snapshot", reason: "Owner-created recovery point." }) });
    setNotice(response.ok ? "Owner recovery point created. Verify it before using replacement restore." : "Backup creation failed.");
    await load();
    setBusy(false);
  };
  const verify = async (id: string) => {
    const response = await fetch(`/api/backups/${id}/verify`, { method: "POST" });
    const result = await response.json();
    setNotice(result.valid ? "Archive verified: physical schema restore checks passed." : "Archive verification found a mismatch.");
    await load();
  };
  const restoreTest = async (id: string) => {
    const response = await fetch(`/api/backups/${id}/test-restore`, { method: "POST" });
    const result = await response.json();
    setNotice(result.passed ? "Isolated PostgreSQL restore test passed without mutating Lee." : "Restore test failed.");
    await load();
  };
  const showPreflight = async (id: string) => {
    const response = await fetch(`/api/backups/${id}/restore-preflight`, { cache: "no-store" });
    setPreflight(response.ok ? await response.json() : null);
    setNotice(response.ok ? "Replacement restore preflight is ready for owner review." : "Restore preflight failed.");
  };

  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="lee-label text-primary">Continuity</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Backups</h1><p className="mt-2 text-sm text-muted-foreground">Portable Brain snapshots with verification-first restore tests.</p></div>
      <button onClick={() => void create()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Archive size={14} />{busy ? "Creating…" : "Owner snapshot"}</button>
    </div>
    {notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}
    <div className="grid gap-4 md:grid-cols-5">
      <div className="rounded-2xl border border-border bg-card p-5"><p className="lee-label text-muted-foreground">Readiness</p><p className="mt-2 text-3xl font-semibold">{data.readinessScore}%</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="lee-label text-muted-foreground">Last backup</p><p className="mt-2 text-sm font-semibold">{data.latest ? new Date(data.latest.createdAt).toLocaleString() : "Not run"}</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="lee-label text-muted-foreground">Verification</p><p className="mt-2 text-sm font-semibold">{data.latest?.status ?? "Pending"}</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="lee-label text-muted-foreground">Restore test</p><p className="mt-2 text-sm font-semibold">{data.latest?.restoreTestStatus ?? "Not tested"}</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><p className="lee-label text-muted-foreground">Local archive</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold"><HardDrive size={15} />{data.latest ? (data.latest.localFileCopy ? "Available" : "Unavailable") : "Not run"}</p></div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between"><div><p className="lee-label text-primary">Archive history</p><h2 className="mt-2 text-xl font-semibold">{data.backups.length} snapshots</h2></div><button onClick={() => void load()} className="rounded-lg border border-border p-2 text-muted-foreground"><RefreshCw size={15} /></button></div>
        <div className="mt-4 space-y-3">{data.backups.length ? data.backups.map((backup: any) => <div key={backup.id} className="rounded-xl border border-border bg-muted/35 p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{backup.brainVersion}</p><p className="mt-1 text-xs text-muted-foreground">{backup.backupId} · {backup.sizeBytes} bytes</p><p className="mt-1 text-xs text-primary">{backup.manifest?.backup_class ?? "legacy"} · {backup.manifest?.reason ?? "Portable Brain recovery point."}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><HardDrive size={12} />{backup.localFileCopy ? `Local archive: ${backup.localFileName}` : "No local archive copy"}</p></div><span className="lee-label text-primary">{backup.status}</span></div>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void verify(backup.id)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"><ShieldCheck className="mr-1 inline" size={13} />Verify</button><button onClick={() => void restoreTest(backup.id)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"><CheckCircle2 className="mr-1 inline" size={13} />Test restore</button><button onClick={() => void showPreflight(backup.id)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Restore preflight</button><a href={`/api/backups/${backup.id}/download`} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"><Download className="mr-1 inline" size={13} />Download</a></div>
        </div>) : <p className="py-8 text-center text-sm text-muted-foreground">No backups yet. Create the first portable Brain snapshot.</p>}</div>
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5"><p className="lee-label text-primary">Portability checklist</p><div className="mt-4 space-y-3">{Object.entries(data.portability ?? {}).map(([key, value]) => <div key={key} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}</span><CheckCircle2 size={16} className={value ? "text-primary" : "text-muted-foreground"} /></div>)}</div><p className="mt-5 text-xs leading-relaxed text-muted-foreground">Provider tokens are excluded. Existing installations are never overwritten by replacement restore.</p></div>
        {preflight && <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="lee-label text-primary">Owner restore preflight</p><p className="mt-2 text-sm font-semibold">{preflight.eligible ? "Eligible for replacement installation" : "Blocked until archive is repaired"}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{preflight.reason}</p><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><span className="text-muted-foreground">Brain</span><p className="font-semibold">{preflight.brainVersion}</p></div><div><span className="text-muted-foreground">Records</span><p className="font-semibold">{preflight.impact.totalRecords}</p></div><div><span className="text-muted-foreground">Tables</span><p className="font-semibold">{preflight.impact.tableCount}</p></div><div><span className="text-muted-foreground">Credentials</span><p className="font-semibold">Excluded</p></div></div><p className="mt-4 text-xs leading-relaxed text-muted-foreground">{preflight.nextStep}</p><p className="mt-3 border-t border-primary/20 pt-3 text-[11px] text-primary">Owner confirmation is required on the replacement machine. {preflight.overwritePolicy}.</p></div>}
      </div>
    </div>
  </div>;
}