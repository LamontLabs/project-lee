import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, FileUp, FolderOpen, Link2, Loader2, Plus, RefreshCw, RotateCcw, ShieldCheck, Trash2, Unplug, X } from "lucide-react";
import type { LocalServiceDiscoveryPayload } from "./DesktopSetupPanel";

type Connection = {
  id: string; displayName: string; targetType: string; method: string; status: string; authStatus: string;
  baseUrl?: string | null; healthEndpoint?: string | null; contractVersion?: string | null;
  permissions: string[]; capabilities: Array<Record<string, unknown>>; dependencies: Array<Record<string, unknown>>;
  credentialConfigured: boolean; grantedScopes?: string[]; lastHealthCheck?: string | null; lastError?: string | null;
};
type SetupStep = { key: string; label: string; status: string; detail?: string; updatedAt: string };
type DiscoveryCandidate = LocalServiceDiscoveryPayload["candidates"][number] & { status: "new" | "existing"; connectionId?: string };
type DiscoveryReport = { candidates: DiscoveryCandidate[]; failures: LocalServiceDiscoveryPayload["failures"]; attempted?: number; completedAt?: string };
type SetupRun = { status: string; steps: SetupStep[]; summary?: { providers?: number; connections?: number; authorized?: number; needsOwner?: number; healthy?: number; failed?: number; discovery?: DiscoveryReport }; lastError?: string | null };
type LocalContract = { id: string; contractId: string; provider: string; displayName: string; description: string; targetType: string; port: number; paths: string[]; enabled: boolean; createdAt: string; updatedAt: string };

const methods = [
  ["oauth", "Sign in / OAuth"], ["api", "API or service"], ["system_contract", "LEE System Contract"],
  ["local", "Local / K6 service"], ["file", "File or folder source"], ["webhook", "Webhook / event source"], ["manual", "Manual fallback"],
];
const permissionCopy: Record<string, string> = { OBSERVE: "Read status, events, metrics, and information", USE: "Call a specialist capability", MANAGE: "Operate approved controls", GOVERNED_MANAGE: "Run consequential actions through approval" };
const statusCopy: Record<string, string> = { connected: "Connected", pending: "Pending", needs_reauthorization: "Needs reauthorization", degraded: "Degraded", unavailable: "Unavailable", incompatible: "Incompatible", disconnected: "Disconnected" };

function tone(status: string) {
  return status === "connected" ? "border-primary/25 bg-primary/10 text-primary" : status === "pending" ? "border-accent/35 bg-accent/10 text-accent-foreground" : "border-destructive/25 bg-destructive/10 text-destructive";
}

export default function ConnectionCenterPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [setup, setSetup] = useState<SetupRun | null>(null);
  const [setupRunning, setSetupRunning] = useState(false);
  const [localContracts, setLocalContracts] = useState<LocalContract[]>([]);
  const [contractForm, setContractForm] = useState({ contractId: "", provider: "", displayName: "", description: "", port: "8080", paths: "/api/contract" });
  const [contractSaving, setContractSaving] = useState(false);
  const desktopLaunch = new URLSearchParams(window.location.search).get("desktop") === "1";
  const selected = connections.find((item) => item.id === selectedId) ?? connections[0] ?? null;
  const load = async () => {
    setLoading(true);
    try { const response = await fetch("/api/connections", { cache: "no-store" }); if (!response.ok) throw new Error("Connection list unavailable."); const data = await response.json(); setConnections(data); setSelectedId((current) => data.some((item: Connection) => item.id === current) ? current : data[0]?.id ?? null); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Connection list unavailable."); }
    finally { setLoading(false); }
  };
  const loadSetup = async () => {
    try { const response = await fetch("/api/desktop-setup", { cache: "no-store" }); if (response.ok) setSetup(await response.json()); } catch { /* the connection inventory remains usable if setup status is unavailable */ }
  };
  const loadLocalContracts = async () => {
    try { const response = await fetch("/api/desktop-setup/local-contracts", { cache: "no-store" }); if (!response.ok) throw new Error("Approved local contracts unavailable."); setLocalContracts(await response.json()); } catch (error) { setNotice(error instanceof Error ? error.message : "Approved local contracts unavailable."); }
  };
  useEffect(() => { void load(); void loadLocalContracts(); }, []);
  useEffect(() => { void loadSetup(); }, []);
  const runSetup = async () => {
    setSetupRunning(true); setNotice("LEE is checking providers, existing connections, and safe defaults…");
    try {
      const discovery = window.leeRuntime ? await window.leeRuntime.discoverLocalServices().catch(() => null) : null;
      const response = await fetch("/api/desktop-setup/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(discovery ? { discovery } : {}) });
      const data = await response.json().catch(() => null);
      if (!response.ok) setNotice(data?.error ?? "Desktop setup could not start."); else { setSetup(data); setNotice(data.status === "complete" ? "LEE setup completed." : "LEE setup completed with owner actions or attention items."); await load(); }
    } catch { setNotice("Desktop setup could not reach the API."); }
    finally { setSetupRunning(false); }
  };
  useEffect(() => { if (desktopLaunch) void runSetup(); }, []);
  const acceptDiscovery = async (candidate: DiscoveryCandidate) => {
    setNotice(`Reviewing ${candidate.displayName}…`);
    const response = await fetch("/api/desktop-setup/discoveries/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(candidate) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(data.error ?? "Local service connection could not be created."); return; }
    setSetup((current) => current ? { ...current, summary: { ...current.summary, discovery: current.summary?.discovery ? { ...current.summary.discovery, candidates: current.summary.discovery.candidates.map((item) => item.discoveryKey === candidate.discoveryKey ? { ...item, status: "existing", connectionId: data.connection?.id } : item) } : current.summary?.discovery } } : current);
    setNotice(data.reused ? `${candidate.displayName} is already connected; LEE reused it.` : `${candidate.displayName} was added as an OBSERVE-only connection.`);
    await load();
  };
  const saveLocalContract = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setContractSaving(true);
    try {
      const response = await fetch("/api/desktop-setup/local-contracts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...contractForm, port: Number(contractForm.port), paths: contractForm.paths.split(/\r?\n/).map((path) => path.trim()).filter(Boolean) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(data.error ?? "Local contract could not be approved."); return; }
      setLocalContracts((current) => [...current, data].sort((left, right) => left.displayName.localeCompare(right.displayName)));
      setContractForm({ contractId: "", provider: "", displayName: "", description: "", port: "8080", paths: "/api/contract" });
      setNotice(`${data.displayName} is now approved for loopback discovery.`);
    } catch { setNotice("Local contract approval could not reach the API."); }
    finally { setContractSaving(false); }
  };
  const toggleLocalContract = async (contract: LocalContract) => {
    const enabled = !contract.enabled;
    const response = await fetch(`/api/desktop-setup/local-contracts/${contract.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(data.error ?? "Local contract could not be updated."); return; }
    setLocalContracts((current) => current.map((item) => item.id === contract.id ? data : item));
    setNotice(enabled ? `${contract.displayName} is approved again.` : `${contract.displayName} was removed from discovery.`);
  };
  const mutate = async (url: string, init?: RequestInit, success?: string) => {
    const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(data.error ?? "Connection change failed."); return; }
    setNotice(success ?? "Connection updated."); await load();
  };
  const togglePermission = (permission: string) => {
    if (!selected) return;
    const next = selected.permissions.includes(permission) ? selected.permissions.filter((item) => item !== permission) : [...selected.permissions, permission];
    if (!next.length || !next.includes("OBSERVE")) { setNotice("OBSERVE is required for every connection."); return; }
    void mutate(`/api/connections/${selected.id}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions: next }) }, "Permissions updated without exposing credentials.");
  };
  const startOAuth = async () => {
    if (!selected || selected.method !== "oauth") return;
    const response = await fetch(`/api/connections/${selected.id}/reauthorize`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setNotice(data.error ?? "Sign-in could not start."); return; }
    if (data.authorizationUrl) { window.location.assign(data.authorizationUrl); return; }
    setNotice("Sign-in could not start.");
  };
  const importFiles = async (event: React.ChangeEvent<HTMLInputElement>, sourceKind: string) => {
    const files = Array.from(event.target.files ?? []);
    if (!selected || selected.method !== "file" || !files.length) return;
    setImporting(true); setNotice(`Uploading ${files.length} approved source${files.length === 1 ? "" : "s"}…`);
    let completed = 0; let failed = 0;
    for (const file of files) {
      try {
        const upload = await fetch("/api/storage/uploads/request-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }) });
        const uploadData = await upload.json();
        if (!upload.ok) throw new Error(uploadData.error ?? "Storage upload failed.");
        const stored = await fetch(uploadData.uploadURL, { method: "PUT", body: file, headers: { "content-type": file.type || "application/octet-stream" } });
        if (!stored.ok) throw new Error("Storage upload failed.");
        const imported = await fetch(`/api/connections/${selected.id}/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, mimeType: file.type || "application/octet-stream", objectPath: uploadData.objectPath, sourceKind, relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name }) });
        if (!imported.ok) throw new Error("Source processing failed.");
        completed += 1;
      } catch { failed += 1; }
    }
    setImporting(false); event.target.value = "";
    setNotice(failed ? `${completed} source${completed === 1 ? "" : "s"} imported; ${failed} failed.` : `${completed} approved source${completed === 1 ? "" : "s"} uploaded and sent to the Understanding Pipeline.`);
  };
  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="lee-label text-primary">Systems / Connections</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Connection Center</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Connect accounts and systems once. LEE discovers what is available, keeps authority narrow, and tells you when something needs attention.</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-refresh-connections"><RefreshCw size={15} /> Refresh</button><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90" data-testid="button-add-connection"><Plus size={15} /> Add connection</button></div>
    </div>
    {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm" data-testid="status-connection-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button></div>}
      {desktopLaunch && <section className="mb-5 rounded-2xl border border-primary/25 bg-primary/10 p-5" data-testid="desktop-welcome">
        <p className="lee-label text-primary">Desktop startup</p><h3 className="mt-2 text-xl font-semibold">Welcome to Project LEE</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">LEE is preparing its private runtime and checking the connections that are safe to discover on this computer. You can keep working while it finishes.</p>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3"><div className="rounded-xl border border-primary/15 bg-background/40 p-3"><p className="font-semibold">1. Private foundation</p><p className="mt-1 text-muted-foreground">Database, migrations, brain, and Event Log stay local.</p></div><div className="rounded-xl border border-primary/15 bg-background/40 p-3"><p className="font-semibold">2. Safe discovery</p><p className="mt-1 text-muted-foreground">Only approved loopback ports and fixed paths are checked.</p></div><div className="rounded-xl border border-primary/15 bg-background/40 p-3"><p className="font-semibold">3. Owner decisions</p><p className="mt-1 text-muted-foreground">Sign-in, secrets, sending, and consequential actions remain yours.</p></div></div>
      </section>}
     <section className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
       <div className="flex flex-wrap items-start justify-between gap-4">
         <div><p className="lee-label text-primary">Automatic setup</p><h3 className="mt-2 text-lg font-semibold">Let LEE prepare the desktop</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">LEE can register providers, reuse existing connections, verify safe access, and link connector defaults. Sign-in, secrets, sending, and consequential actions always stay under your control.</p></div>
         <button onClick={() => void runSetup()} disabled={setupRunning} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-run-desktop-setup">{setupRunning && <Loader2 className="animate-spin" size={15} />} {setupRunning ? "Setting up…" : setup ? "Run setup again" : "Set up LEE"}</button>
       </div>
       {setup && <div className="mt-4"><div className="flex flex-wrap gap-2 text-[11px]"><span className={`rounded-full border px-2.5 py-1 font-semibold ${setup.status === "complete" ? "border-primary/25 bg-primary/10 text-primary" : "border-accent/35 bg-accent/10 text-accent-foreground"}`}>{setup.status === "complete" ? "Ready" : setup.status.replaceAll("_", " ")}</span><span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">{setup.summary?.providers ?? 0} providers</span><span className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">{setup.summary?.healthy ?? 0} health checks passed</span>{Boolean(setup.summary?.needsOwner) && <span className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-accent-foreground">{setup.summary?.needsOwner} owner action{setup.summary?.needsOwner === 1 ? "" : "s"}</span>}</div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{setup.steps.map((item) => <div key={item.key} className="rounded-xl border border-border bg-card/70 p-3"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.status === "complete" ? "bg-primary" : item.status === "needs_owner" ? "bg-accent" : item.status === "failed" ? "bg-destructive" : "bg-muted-foreground"}`} /><p className="text-xs font-semibold">{item.label}</p></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p></div>)}</div>{setup.summary?.discovery && <DiscoveryReview report={setup.summary.discovery} onAccept={(candidate) => void acceptDiscovery(candidate)} />}{setup.lastError && <p className="mt-3 text-xs text-destructive">{setup.lastError}</p>}</div>}
     </section>
      <section className="mb-5 rounded-2xl border border-card-border bg-card/80 p-5 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]" data-testid="local-contract-allowlist">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="lee-label text-primary">Discovery boundary</p><h3 className="mt-2 text-lg font-semibold">Approved local contracts</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">LEE only checks the named ports and fixed paths below on this computer’s loopback address. Adding a contract never grants credentials or write access; every change is recorded for review.</p></div>
          <ShieldCheck className="mt-1 text-primary" size={20} />
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {localContracts.map((contract) => <div key={contract.id} className={`rounded-xl border p-3 ${contract.enabled ? "border-primary/20 bg-primary/5" : "border-border bg-muted/40 opacity-75"}`}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{contract.displayName}</p><p className="mt-1 text-[11px] text-muted-foreground">{contract.provider} · 127.0.0.1:{contract.port} · {contract.paths.length} fixed path{contract.paths.length === 1 ? "" : "s"}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${contract.enabled ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}>{contract.enabled ? "Approved" : "Removed"}</span></div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{contract.description}</p>
            <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">{contract.paths.join(" · ")}</p>
            <button onClick={() => void toggleLocalContract(contract)} className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${contract.enabled ? "border-destructive/25 text-destructive hover:bg-destructive/5" : "border-primary/25 text-primary hover:bg-primary/5"}`} data-testid={`button-toggle-local-contract-${contract.contractId}`}>{contract.enabled ? <Trash2 size={13} /> : <RotateCcw size={13} />}{contract.enabled ? "Remove from discovery" : "Approve again"}</button>
          </div>)}
        </div>
        <form onSubmit={(event) => void saveLocalContract(event)} className="mt-4 rounded-xl border border-dashed border-border p-4" data-testid="form-add-local-contract">
          <div className="flex items-center gap-2"><Plus size={15} className="text-primary" /><p className="text-sm font-semibold">Approve another local specialist</p></div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Use a stable name and fixed loopback contract. Do not enter a URL, hostname, credential, or secret—LEE supplies 127.0.0.1 and keeps authority separate.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input required pattern="[a-z0-9][a-z0-9._-]{1,63}" placeholder="contract-id" value={contractForm.contractId} onChange={(event) => setContractForm({ ...contractForm, contractId: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-xs" data-testid="input-local-contract-id" />
            <input required pattern="[a-z0-9][a-z0-9._-]{1,63}" placeholder="provider-id" value={contractForm.provider} onChange={(event) => setContractForm({ ...contractForm, provider: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-xs" data-testid="input-local-contract-provider" />
            <input required placeholder="Display name" value={contractForm.displayName} onChange={(event) => setContractForm({ ...contractForm, displayName: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-xs" data-testid="input-local-contract-name" />
            <input required type="number" min="1" max="65535" placeholder="Port" value={contractForm.port} onChange={(event) => setContractForm({ ...contractForm, port: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-xs" data-testid="input-local-contract-port" />
            <input required placeholder="Why is this approved?" value={contractForm.description} onChange={(event) => setContractForm({ ...contractForm, description: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-xs sm:col-span-2" data-testid="input-local-contract-description" />
            <textarea required rows={2} placeholder={"/api/contract\n/api/status"} value={contractForm.paths} onChange={(event) => setContractForm({ ...contractForm, paths: event.target.value })} className="rounded-xl border border-input bg-background px-3 py-2 text-xs lg:col-span-2" data-testid="input-local-contract-paths" />
          </div>
          <button disabled={contractSaving} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-save-local-contract">{contractSaving && <Loader2 className="animate-spin" size={14} />} Approve contract</button>
        </form>
      </section>
     {loading ? <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} /> Loading connection inventory…</div> : <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border border-card-border bg-card/80 p-3 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]">
        <div className="flex items-center justify-between px-3 pb-3 pt-2"><p className="lee-label text-muted-foreground">{connections.length} connection{connections.length === 1 ? "" : "s"}</p><ShieldCheck size={16} className="text-primary" /></div>
        {connections.length ? <div className="space-y-1">{connections.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border px-3.5 py-3.5 text-left ${selected?.id === item.id ? "border-primary/30 bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/60"}`} data-testid={`button-select-connection-${item.id}`}><div className="flex items-start gap-3"><span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Link2 size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.displayName}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{item.targetType.replaceAll("_", " ")} · {item.method.replaceAll("_", " ")}</span><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${tone(item.status)}`}>{statusCopy[item.status] ?? item.status}</span></span></div></button>)}</div> : <div className="p-6"><div className="rounded-xl border border-dashed border-border p-6 text-center"><Link2 className="mx-auto mb-3 text-muted-foreground" size={20} /><p className="text-sm font-semibold">No connections yet</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Start with a sign-in or one clear setup flow. LEE will discover the rest.</p></div></div>}
      </section>
       <section className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]">
          {selected ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.targetType.replaceAll("_", " ")} / {selected.method.replaceAll("_", " ")}</p><h3 className="mt-2 text-2xl font-semibold">{selected.displayName}</h3></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone(selected.status)}`}>{statusCopy[selected.status] ?? selected.status}</span></div><p className="mt-3 text-sm text-muted-foreground">{selected.method === "file" ? "Imported source · bytes are held in private Object Storage and processed with provenance." : selected.baseUrl ? `${selected.baseUrl}${selected.healthEndpoint ?? ""}` : "No live endpoint; this source is managed through its connection method."}</p>{selected.method === "oauth" && <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-sm font-semibold">Secure sign-in</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">LEE opens the provider sign-in page. Credentials and granted scopes stay on the server and are never copied to this device.</p><button onClick={() => void startOAuth()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground">{selected.status === "needs_reauthorization" ? <RefreshCw size={14} /> : <Link2 size={14} />} {selected.status === "needs_reauthorization" ? "Sign in again" : "Start sign-in"}</button></div>}{selected.method === "file" && <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><FileUp size={18} className="mt-0.5 text-primary" /><div><p className="text-sm font-semibold">Import approved sources</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Choose files, a folder, repository export, or conversation export. Each item is uploaded privately, then held below canon for review.</p></div></div><div className="mt-4 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground"><FileUp size={14} /> Files / exports<input type="file" multiple className="hidden" disabled={importing} onChange={(event) => void importFiles(event, "file_or_export")} /></label><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/30 px-3.5 py-2.5 text-xs font-semibold text-primary"><FolderOpen size={14} /> Folder<input type="file" multiple className="hidden" disabled={importing} onChange={(event) => void importFiles(event, "folder")} {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}/></label></div>{importing && <p className="mt-3 text-xs text-primary">Uploading and processing selected sources…</p>}</div>}<div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3"><p className="lee-label text-muted-foreground">Authorization</p><p className="mt-2 text-sm font-semibold">{selected.credentialConfigured ? "Stored securely" : "Not configured"}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="lee-label text-muted-foreground">Contract</p><p className="mt-2 text-sm font-semibold">{selected.contractVersion ?? "Discovered during test"}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="lee-label text-muted-foreground">Last check</p><p className="mt-2 text-sm font-semibold">{selected.lastHealthCheck ? new Date(selected.lastHealthCheck).toLocaleString() : "Not tested"}</p></div></div>{selected.lastError && <div className="mt-4 flex gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert size={16} className="mt-0.5 shrink-0" />{selected.lastError}</div>}<div className="mt-7 border-t border-border pt-5"><div className="flex items-center justify-between"><div><p className="lee-label text-muted-foreground">Capability permissions</p><p className="mt-1 text-xs text-muted-foreground">Connectivity and authority are separate. OBSERVE always remains enabled.</p></div><span className="text-xs text-primary">{selected.permissions.length} enabled</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(permissionCopy).map(([permission, description]) => <label key={permission} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/50"><input type="checkbox" checked={selected.permissions.includes(permission)} disabled={permission === "OBSERVE"} onChange={() => togglePermission(permission)} className="mt-1 accent-[hsl(var(--primary))]" /><span><span className="block text-xs font-bold">{permission}</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{description}</span></span></label>)}</div></div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => void mutate(`/api/connections/${selected.id}/test`, { method: "POST", body: "{}" }, "Connection test completed.")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground"><Check size={15} /> Test connection</button><button onClick={() => void startOAuth()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted">{selected.method === "oauth" ? "Sign in" : "Reauthorize"}</button><button onClick={() => void mutate(`/api/connections/${selected.id}`, { method: "DELETE" }, "Connection disconnected safely.")} className="inline-flex items-center gap-2 rounded-xl border border-destructive/25 bg-transparent px-3.5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/5"><Unplug size={15} /> Disconnect</button></div></> : <div className="flex min-h-72 items-center justify-center text-center"><div><ShieldCheck className="mx-auto mb-3 text-primary" size={24} /><p className="text-sm font-semibold">Choose a connection to inspect</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Permissions and diagnostics stay hidden until a system is selected.</p></div></div>}
       </section>
    </div>}
     {open && <AddConnectionDialog onClose={() => setOpen(false)} onCreated={(item) => { setOpen(false); setConnections((current) => [item, ...current]); setSelectedId(item.id); setNotice("Connection created in Pending state. Start sign-in to authorize it."); }} />}
  </div>;
}

function DiscoveryReview({ report, onAccept }: { report: DiscoveryReport; onAccept: (candidate: DiscoveryCandidate) => void }) {
  if (!report.candidates.length && !report.failures.length) return null;
  return <div className="mt-4 rounded-xl border border-primary/20 bg-background/50 p-4" data-testid="local-service-discovery">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-primary" size={16} /><div><p className="text-sm font-semibold">Local services found</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">These approved loopback contracts were checked on this computer. Review a candidate before LEE creates a connection.</p></div></div>
     {report.candidates.length > 0 && <div className="mt-3 space-y-2">{report.candidates.map((candidate) => <div key={candidate.discoveryKey} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-semibold">{candidate.displayName}</p><p className="mt-1 text-[11px] text-muted-foreground">{candidate.provider} provider-neutral contract · {candidate.baseUrl}{candidate.healthEndpoint}</p></div>{candidate.status === "existing" ? <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">Already connected</span> : <button onClick={() => onAccept(candidate)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground" data-testid={`button-review-local-service-${candidate.contractId}`}><Check size={13} /> Review and connect</button>}</div>)}</div>}
    {report.failures.length > 0 && <div className="mt-3 rounded-lg border border-accent/25 bg-accent/5 p-3"><p className="text-xs font-semibold text-accent-foreground">Allowlisted checks needing attention</p><ul className="mt-1.5 space-y-1">{report.failures.map((failure) => <li key={`${failure.contractId}-${failure.endpoint}`} className="text-[11px] leading-relaxed text-muted-foreground">{failure.displayName}: {failure.reason}.</li>)}</ul></div>}
  </div>;
}

function AddConnectionDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (item: Connection) => void }) {
  const [method, setMethod] = useState("oauth");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsEndpoint = useMemo(() => !["oauth", "file"].includes(method), [method]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { displayName: String(form.get("displayName")), targetType: String(form.get("targetType")), method, baseUrl: String(form.get("baseUrl") || "") || null, healthEndpoint: String(form.get("healthEndpoint") || "") || null, credentialRef: String(form.get("credentialRef") || "") || null, permissions: ["OBSERVE"], configuration: method === "oauth" ? { oauthProvider: String(form.get("oauthProvider") || "") } : undefined };
    const response = await fetch("/api/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Connection setup failed."); else onCreated(data);
    setSaving(false);
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-5 backdrop-blur-sm"><form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl" data-testid="form-add-connection"><div className="flex items-start justify-between"><div><p className="lee-label text-primary">New connection</p><h3 className="mt-2 text-xl font-semibold">Connect something to LEE</h3><p className="mt-1 text-xs text-muted-foreground">Only a secret reference is accepted here. The secret value never enters the UI.</p></div><button type="button" onClick={onClose} aria-label="Close connection dialog" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={17} /></button></div>{error && <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="mt-6 space-y-4"><input name="displayName" required placeholder="Display name, e.g. Project GitHub" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-connection-name" /><div className="grid gap-4 sm:grid-cols-2"><select name="targetType" defaultValue="service" className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="account">Account</option><option value="service">Service</option><option value="project">Project</option><option value="local_system">Local system</option><option value="data_source">Data source</option></select><select value={method} onChange={(event) => setMethod(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm" data-testid="select-connection-method">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{method === "oauth" && <select name="oauthProvider" defaultValue="github" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" aria-label="OAuth provider"><option value="github">GitHub</option><option value="google_drive">Google Drive</option><option value="google_calendar">Google Calendar</option><option value="gmail">Gmail</option></select>}{needsEndpoint && <><input name="baseUrl" type="url" required placeholder="https://service.example" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /><input name="healthEndpoint" defaultValue="/health" placeholder="/health" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></>}<input name="credentialRef" pattern="[A-Z][A-Z0-9_]{2,159}" placeholder="SECRET_REFERENCE (optional)" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /><div className="rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">LEE starts with OBSERVE-only access. After discovery and a successful test, you can review each capability and request more authority.</div></div><button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-submit-connection">{saving && <Loader2 className="animate-spin" size={15} />} Create pending connection</button></form></div>;
}