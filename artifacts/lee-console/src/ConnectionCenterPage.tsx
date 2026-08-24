import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, Link2, Loader2, Plus, RefreshCw, ShieldCheck, Unplug, X } from "lucide-react";

type Connection = {
  id: string; displayName: string; targetType: string; method: string; status: string; authStatus: string;
  baseUrl?: string | null; healthEndpoint?: string | null; contractVersion?: string | null;
  permissions: string[]; capabilities: Array<Record<string, unknown>>; dependencies: Array<Record<string, unknown>>;
  credentialConfigured: boolean; lastHealthCheck?: string | null; lastError?: string | null;
};

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
  const selected = connections.find((item) => item.id === selectedId) ?? connections[0] ?? null;
  const load = async () => {
    setLoading(true);
    try { const response = await fetch("/api/connections", { cache: "no-store" }); if (!response.ok) throw new Error("Connection list unavailable."); const data = await response.json(); setConnections(data); setSelectedId((current) => data.some((item: Connection) => item.id === current) ? current : data[0]?.id ?? null); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Connection list unavailable."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
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
  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="lee-label text-primary">Systems / Connections</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Connection Center</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Connect accounts and systems once. LEE discovers what is available, keeps authority narrow, and tells you when something needs attention.</p></div>
      <div className="flex gap-2"><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-refresh-connections"><RefreshCw size={15} /> Refresh</button><button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90" data-testid="button-add-connection"><Plus size={15} /> Add connection</button></div>
    </div>
    {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm" data-testid="status-connection-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button></div>}
    {loading ? <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} /> Loading connection inventory…</div> : <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border border-card-border bg-card/80 p-3 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]">
        <div className="flex items-center justify-between px-3 pb-3 pt-2"><p className="lee-label text-muted-foreground">{connections.length} connection{connections.length === 1 ? "" : "s"}</p><ShieldCheck size={16} className="text-primary" /></div>
        {connections.length ? <div className="space-y-1">{connections.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border px-3.5 py-3.5 text-left ${selected?.id === item.id ? "border-primary/30 bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/60"}`} data-testid={`button-select-connection-${item.id}`}><div className="flex items-start gap-3"><span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Link2 size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.displayName}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{item.targetType.replaceAll("_", " ")} · {item.method.replaceAll("_", " ")}</span><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${tone(item.status)}`}>{statusCopy[item.status] ?? item.status}</span></span></div></button>)}</div> : <div className="p-6"><div className="rounded-xl border border-dashed border-border p-6 text-center"><Link2 className="mx-auto mb-3 text-muted-foreground" size={20} /><p className="text-sm font-semibold">No connections yet</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Start with a sign-in or one clear setup flow. LEE will discover the rest.</p></div></div>}
      </section>
      <section className="rounded-2xl border border-card-border bg-card/80 p-6 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]">
        {selected ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.targetType.replaceAll("_", " ")} / {selected.method.replaceAll("_", " ")}</p><h3 className="mt-2 text-2xl font-semibold">{selected.displayName}</h3></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone(selected.status)}`}>{statusCopy[selected.status] ?? selected.status}</span></div><p className="mt-3 text-sm text-muted-foreground">{selected.baseUrl ? `${selected.baseUrl}${selected.healthEndpoint ?? ""}` : "No live endpoint; this source is managed through its connection method."}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3"><p className="lee-label text-muted-foreground">Authorization</p><p className="mt-2 text-sm font-semibold">{selected.credentialConfigured ? "Stored securely" : "Not configured"}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="lee-label text-muted-foreground">Contract</p><p className="mt-2 text-sm font-semibold">{selected.contractVersion ?? "Discovered during test"}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="lee-label text-muted-foreground">Last check</p><p className="mt-2 text-sm font-semibold">{selected.lastHealthCheck ? new Date(selected.lastHealthCheck).toLocaleString() : "Not tested"}</p></div></div>{selected.lastError && <div className="mt-4 flex gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert size={16} className="mt-0.5 shrink-0" />{selected.lastError}</div>}<div className="mt-7 border-t border-border pt-5"><div className="flex items-center justify-between"><div><p className="lee-label text-muted-foreground">Capability permissions</p><p className="mt-1 text-xs text-muted-foreground">Connectivity and authority are separate. OBSERVE always remains enabled.</p></div><span className="text-xs text-primary">{selected.permissions.length} enabled</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{Object.entries(permissionCopy).map(([permission, description]) => <label key={permission} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/50"><input type="checkbox" checked={selected.permissions.includes(permission)} disabled={permission === "OBSERVE"} onChange={() => togglePermission(permission)} className="mt-1 accent-[hsl(var(--primary))]" /><span><span className="block text-xs font-bold">{permission}</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{description}</span></span></label>)}</div></div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => void mutate(`/api/connections/${selected.id}/test`, { method: "POST", body: "{}" }, "Connection test completed.")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground"><Check size={15} /> Test connection</button><button onClick={() => void mutate(`/api/connections/${selected.id}/reauthorize`, { method: "POST", body: "{}" }, "Reauthorization is pending.")} className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted"><RefreshCw size={15} /> Reauthorize</button><button onClick={() => void mutate(`/api/connections/${selected.id}`, { method: "DELETE" }, "Connection disconnected safely.")} className="inline-flex items-center gap-2 rounded-xl border border-destructive/25 px-3.5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/5"><Unplug size={15} /> Disconnect</button></div></> : <div className="flex min-h-72 items-center justify-center text-center"><div><ShieldCheck className="mx-auto mb-3 text-primary" size={24} /><p className="text-sm font-semibold">Choose a connection to inspect</p><p className="mt-1 text-xs text-muted-foreground">Permissions and diagnostics stay hidden until a system is selected.</p></div></div>}
      </section>
    </div>}
    {open && <AddConnectionDialog onClose={() => setOpen(false)} onCreated={(item) => { setOpen(false); setConnections((current) => [item, ...current]); setSelectedId(item.id); setNotice("Connection created in Pending state. Test it to begin health monitoring."); }} />}
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
    const body = { displayName: String(form.get("displayName")), targetType: String(form.get("targetType")), method, baseUrl: String(form.get("baseUrl") || "") || null, healthEndpoint: String(form.get("healthEndpoint") || "") || null, credentialRef: String(form.get("credentialRef") || "") || null, permissions: ["OBSERVE"] };
    const response = await fetch("/api/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Connection setup failed."); else onCreated(data);
    setSaving(false);
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-5 backdrop-blur-sm"><form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl" data-testid="form-add-connection"><div className="flex items-start justify-between"><div><p className="lee-label text-primary">New connection</p><h3 className="mt-2 text-xl font-semibold">Connect something to LEE</h3><p className="mt-1 text-xs text-muted-foreground">Only a secret reference is accepted here. The secret value never enters the UI.</p></div><button type="button" onClick={onClose} aria-label="Close connection dialog" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={17} /></button></div>{error && <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="mt-6 space-y-4"><input name="displayName" required placeholder="Display name, e.g. Project GitHub" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-connection-name" /><div className="grid gap-4 sm:grid-cols-2"><select name="targetType" defaultValue="service" className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option value="account">Account</option><option value="service">Service</option><option value="project">Project</option><option value="local_system">Local system</option><option value="data_source">Data source</option></select><select value={method} onChange={(event) => setMethod(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm" data-testid="select-connection-method">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{needsEndpoint && <><input name="baseUrl" type="url" required placeholder="https://service.example" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /><input name="healthEndpoint" defaultValue="/health" placeholder="/health" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></>}<input name="credentialRef" pattern="[A-Z][A-Z0-9_]{2,159}" placeholder="SECRET_REFERENCE (optional)" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /><div className="rounded-xl border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">LEE starts with OBSERVE-only access. After discovery and a successful test, you can review each capability and request more authority.</div></div><button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-submit-connection">{saving && <Loader2 className="animate-spin" size={15} />} Create pending connection</button></form></div>;
}