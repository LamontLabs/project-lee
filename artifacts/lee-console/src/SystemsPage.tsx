import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, CircleAlert, CircleCheck, Database, ExternalLink, FolderKanban, Gauge, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type LayerStatus = "healthy" | "attention" | "blocked" | "unknown";
type Service = { serviceId?: string; displayName?: string; category?: string; currentHealth?: string; baseUrl?: string | null; capabilities?: string[]; metrics?: Record<string, unknown> };
type Connection = { id: string; displayName: string; targetType?: string; status: string; statusLabel?: string; permissions?: string[]; health?: { whatFailed: string | null; remainsAvailable: string; blocked: string | null; recoveryAutomatic: boolean; ownerActionRequired: boolean }; lastHealthCheck?: string | null; lastError?: string | null };
type Layer = { key: string; label: string; description: string; status: LayerStatus; detail: string; items: string[]; href?: string };

const statusLabel: Record<LayerStatus, string> = { healthy: "Healthy", attention: "Attention", blocked: "Blocked", unknown: "Unknown" };
const statusClass: Record<LayerStatus, string> = { healthy: "border-primary/25 bg-primary/10 text-primary", attention: "border-accent/35 bg-accent/10 text-accent-foreground", blocked: "border-destructive/30 bg-destructive/10 text-destructive", unknown: "border-border bg-muted text-muted-foreground" };
const humanize = (value: unknown) => String(value ?? "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function isHealthy(value: unknown) { return ["healthy", "connected", "complete", "ok", "available", "operational"].includes(String(value ?? "").toLowerCase()); }
function isBad(value: unknown) { return ["unavailable", "offline", "failed", "degraded", "needs_reauthorization", "blocked"].includes(String(value ?? "").toLowerCase()); }
function connectionWarning(item: Connection) {
  const health = item.health;
  if (!health && !item.lastError) return `${item.displayName}: ${item.statusLabel ?? humanize(item.status)}.`;
  return `${item.displayName}: ${health?.whatFailed ?? item.lastError ?? "status needs attention"} Available: ${health?.remainsAvailable ?? "local records remain available."} ${health?.blocked ? `Blocked: ${health.blocked}` : ""} ${health?.recoveryAutomatic ? "Recovery: automatic retry." : health?.ownerActionRequired ? "Recovery: owner action required." : ""}`.trim();
}
function LayerCard({ layer }: { layer: Layer }) {
  return <section className="rounded-2xl border border-card-border bg-card/80 p-5 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]"><div className="flex items-start justify-between gap-3"><div><p className="lee-label text-primary">{layer.label}</p><h3 className="mt-1 text-lg font-semibold">{layer.description}</h3></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass[layer.status]}`}>{statusLabel[layer.status]}</span></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{layer.detail}</p>{layer.items.length ? <ul className="mt-4 space-y-2">{layer.items.map((item) => <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground"><CircleCheck size={14} className="mt-0.5 shrink-0 text-primary" />{item}</li>)}</ul> : null}{layer.href && <Link href={layer.href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Inspect <ArrowUpRight size={13} /></Link>}</section>;
}

export default function SystemsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [setup, setSetup] = useState<any>(null);
  const [contract, setContract] = useState<any>(null);
  const [operationalConfidence, setOperationalConfidence] = useState<any>(null);
  const [coreChecks, setCoreChecks] = useState({ api: false, events: false, brain: false, contract: false });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch("/api/internal-services/health", { cache: "no-store" }),
        fetch("/api/connections", { cache: "no-store" }),
        fetch("/api/mcp-projects", { cache: "no-store" }),
        fetch("/api/desktop-setup", { cache: "no-store" }),
        fetch("/api/contract", { cache: "no-store" }),
        fetch("/api/operational-confidence", { cache: "no-store" }),
        fetch("/api/healthz", { cache: "no-store" }),
        fetch("/api/events?limit=1", { cache: "no-store" }),
        fetch("/api/brain-versions", { cache: "no-store" }),
      ]);
      const [serviceResponse, connectionResponse, projectResponse, setupResponse, contractResponse, confidenceResponse, apiResponse, eventsResponse, brainResponse] = responses;
      if (serviceResponse.ok) setServices(await serviceResponse.json());
      if (connectionResponse.ok) setConnections(await connectionResponse.json());
      if (projectResponse.ok) setProjects((await projectResponse.json()).projects ?? []);
      if (setupResponse.ok) setSetup(await setupResponse.json());
      if (contractResponse.ok) setContract(await contractResponse.json());
      if (confidenceResponse.ok) setOperationalConfidence(await confidenceResponse.json());
      setCoreChecks({ api: apiResponse.ok, events: eventsResponse.ok, brain: brainResponse.ok, contract: contractResponse.ok });
    } catch {
      setNotice("Some system status sources are unavailable. LEE is showing the evidence that could be verified.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const refresh = async () => { setRefreshing(true); setNotice(""); try { await fetch("/api/internal-services/health/check", { method: "POST" }); await fetch("/api/internal/operational-confidence/recompute", { method: "POST" }); await load(); setNotice("System health and operational confidence recomputed."); } catch { setNotice("System health could not be recomputed."); } finally { setRefreshing(false); } };
  const cil = services.find((item) => item.serviceId === "cil");
  const cerbaseal = services.find((item) => item.serviceId === "cerbaseal");
  const reasoningHealthy = Boolean(cil && isHealthy(cil.currentHealth)) && services.some((item) => item.category === "reasoning" && item.serviceId !== "cil" && isHealthy(item.currentHealth));
  const optionalConnectionProblems = connections.filter((item) => isBad(item.status));
  const setupProblems = setup?.steps?.filter((item: any) => ["failed", "needs_owner"].includes(item.status)) ?? [];
  const overallBlocked = !Object.values(coreChecks).every(Boolean);
  const overallAttention = !overallBlocked && (optionalConnectionProblems.length > 0 || setupProblems.length > 0 || !reasoningHealthy || !isHealthy(cerbaseal?.currentHealth));
  const overallStatus: LayerStatus = overallBlocked ? "blocked" : overallAttention ? "attention" : "healthy";
  const layers = useMemo<Layer[]>(() => [
    { key: "core", label: "Core", description: "Canonical foundation", status: Object.values(coreChecks).every(Boolean) ? "healthy" : "blocked", detail: Object.values(coreChecks).every(Boolean) ? "The API, Event Log, Brain endpoint, and system contract all responded." : "LEE cannot report the Core ready until every canonical check succeeds.", items: [`API server: ${coreChecks.api ? "responding" : "unavailable"}`, `Event Log: ${coreChecks.events ? "reachable" : "unavailable"}`, `Brain versions: ${coreChecks.brain ? "reachable" : "unavailable"}`, `System contract: ${coreChecks.contract ? "reachable" : "unavailable"}`], href: "/health" },
    { key: "intelligence", label: "Intelligence", description: "CIL and approved execution routes", status: reasoningHealthy ? "healthy" : cil?.currentHealth === "degraded" ? "attention" : "blocked", detail: reasoningHealthy ? "CIL is available and at least one approved execution bridge is healthy." : "CIL remains the mandatory reasoning authority; LEE does not silently choose a replacement route.", items: [`CIL: ${cil?.currentHealth ?? "not registered"}`, `Approved execution routes: ${services.filter((item) => item.category === "reasoning" && item.serviceId !== "cil" && isHealthy(item.currentHealth)).length}`, "Model inventory remains diagnostic visibility only"], href: "/settings/internal-services" },
    { key: "governance", label: "Governance", description: "CerbaSeal release boundary", status: isHealthy(cerbaseal?.currentHealth) ? "healthy" : "blocked", detail: isHealthy(cerbaseal?.currentHealth) ? "CerbaSeal is available for governed evaluation." : "Consequential actions remain held because governance availability is not verified.", items: [`CerbaSeal: ${cerbaseal?.currentHealth ?? "not registered"}`, "HOLD, REJECT, unavailable, and replayed decisions fail closed"], href: "/governance" },
     { key: "connections", label: "Connections", description: "External provider access", status: optionalConnectionProblems.length ? "attention" : "healthy", detail: optionalConnectionProblems.length ? `${optionalConnectionProblems.length} optional connection${optionalConnectionProblems.length === 1 ? " needs" : "s need"} attention. The canonical Brain remains separately reported. ${optionalConnectionProblems.slice(0, 2).map(connectionWarning).join(" ")}` : connections.length ? "Configured providers have no current degraded status. Connectivity and authority remain separate." : "No optional providers are configured yet.", items: connections.slice(0, 5).map((item) => `${item.displayName}: ${item.statusLabel ?? humanize(item.status)} · ${item.permissions?.join(", ") ?? "OBSERVE"}`), href: "/connections" },
    { key: "projects", label: "Project operations", description: "Registered project bridge", status: projects.length ? "healthy" : "unknown", detail: projects.length ? "Project registrations are explicit; read access does not grant modification authority." : "No project bridge registrations are currently visible.", items: projects.slice(0, 5).map((item) => `${item.name}: ${item.capabilities?.join(", ") ?? "capabilities not reported"}`), href: "/projects" },
    { key: "desktop", label: "Desktop", description: "Local runtime supervisor", status: setupProblems.length ? "attention" : setup?.status === "complete" ? "healthy" : setup ? "attention" : "unknown", detail: setup?.status === "complete" ? "The latest desktop setup run completed." : setup ? "The latest setup run has owner actions or failed checks." : "No desktop setup run is recorded in this session.", items: setup?.steps?.slice(0, 5).map((item: any) => `${item.label}: ${humanize(item.status)}`) ?? [], href: "/connections?desktop=1" },
  ], [connections, coreChecks, cil, cerbaseal, projects, reasoningHealthy, services, setup, setupProblems.length, optionalConnectionProblems.length]);

  if (loading) return <div className="mx-auto w-full max-w-[1280px]"><div className="mb-6 h-20 animate-pulse rounded-2xl bg-secondary/70" /><div className="grid gap-5 md:grid-cols-2"><div className="h-56 animate-pulse rounded-2xl bg-secondary/70" /><div className="h-56 animate-pulse rounded-2xl bg-secondary/70" /></div></div>;
  return <div className="mx-auto w-full max-w-[1280px]">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="lee-label text-primary">Systems / operational posture</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Systems</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">One honest view of what is healthy, what is blocked, and what remains available when an optional system needs attention.</p></div><button onClick={() => void refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Recompute health</button></div>
    {notice && <div className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-foreground" role="status">{notice}</div>}
    <section className={`mb-5 rounded-2xl border p-5 ${overallStatus === "healthy" ? "border-primary/25 bg-primary/[0.05]" : overallStatus === "attention" ? "border-accent/35 bg-accent/[0.06]" : "border-destructive/30 bg-destructive/[0.06]"}`}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${overallStatus === "healthy" ? "bg-primary/15 text-primary" : overallStatus === "attention" ? "bg-accent/20 text-accent-foreground" : "bg-destructive/15 text-destructive"}`}>{overallStatus === "healthy" ? <CircleCheck size={22} /> : <CircleAlert size={22} />}</span><div><p className="lee-label text-primary">LEE status</p><h3 className="mt-1 text-xl font-semibold">{overallStatus === "healthy" ? "LEE READY" : overallStatus === "attention" ? "LEE DEGRADED" : "LEE CORE BLOCKED"}</h3></div></div><div className="text-right"><p className="lee-label text-muted-foreground">Operational confidence</p><p className="mt-1 text-2xl font-semibold text-primary">{operationalConfidence?.score ?? "—"}<span className="text-sm text-muted-foreground"> / 100</span></p></div></div><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{overallStatus === "healthy" ? "Core, Intelligence, Governance, Connections, Project Operations, and Desktop have no blocking status." : overallStatus === "attention" ? `${optionalConnectionProblems.length ? `${optionalConnectionProblems.length} optional connection${optionalConnectionProblems.length === 1 ? " is" : "s are"} degraded. ` : ""}${setupProblems.length ? `${setupProblems.length} desktop setup item${setupProblems.length === 1 ? " needs" : " need"} attention. ` : ""}Core remains separately verified.` : "Canonical Core checks are incomplete. LEE must remain explicit about degraded persistence rather than hiding it behind optional system health."}</p>{operationalConfidence?.explanation && <p className="mt-2 text-xs text-muted-foreground">{operationalConfidence.explanation}</p>}</section>
    <div className="grid gap-5 md:grid-cols-2">{layers.map((layer) => <LayerCard key={layer.key} layer={layer} />)}</div>
    <details className="mt-5 rounded-2xl border border-border bg-card/70 p-5"><summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold"><Gauge size={17} className="text-primary" /> Advanced diagnostics <span className="ml-auto text-xs font-normal text-muted-foreground">contracts, service metrics, and verification detail</span></summary><div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="rounded-xl bg-muted/40 p-4"><p className="lee-label text-muted-foreground">System contract</p><p className="mt-2 text-sm font-semibold">{contract?.contractVersion ?? "Unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{contract?.health?.state ?? "No contract health reported."}</p></div><div className="rounded-xl bg-muted/40 p-4"><p className="lee-label text-muted-foreground">Internal services</p><p className="mt-2 text-sm font-semibold">{services.length} registered</p><p className="mt-1 text-xs text-muted-foreground">{services.filter((item) => isHealthy(item.currentHealth)).length} healthy · {services.filter((item) => isBad(item.currentHealth)).length} attention</p></div><div className="rounded-xl bg-muted/40 p-4"><p className="lee-label text-muted-foreground">Connection authorities</p><p className="mt-2 text-sm font-semibold">{connections.reduce((count, item) => count + (item.permissions?.length ?? 0), 0)} permission grants</p><p className="mt-1 text-xs text-muted-foreground">Connectivity never implies mutation authority.</p></div></div><pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-muted p-4 text-[11px] leading-relaxed text-muted-foreground">{JSON.stringify({ contract, services, connections: connections.map(({ id, displayName, status, permissions, lastHealthCheck }) => ({ id, displayName, status, permissions, lastHealthCheck })) }, null, 2)}</pre></details>
    <div className="mt-5 flex flex-wrap gap-3 text-xs"><Link href="/connections" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Connection Center <ExternalLink size={13} /></Link><Link href="/settings/internal-services" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Internal services <Server size={13} /></Link><Link href="/projects" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Project operations <FolderKanban size={13} /></Link><Link href="/health" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Full diagnostics <Activity size={13} /></Link><Database size={14} className="ml-auto text-muted-foreground" /></div>
  </div>;
}