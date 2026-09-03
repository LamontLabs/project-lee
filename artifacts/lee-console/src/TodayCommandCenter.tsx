import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, CircleAlert, CircleCheck, Clock3, FolderKanban, RefreshCw, ShieldAlert, Sparkles, Users } from "lucide-react";
import { Link } from "wouter";

type Signal = {
  id: string;
  text?: string;
  observation?: string;
  significance?: string;
  evidenceRefs?: string[];
  metadata?: { [key: string]: unknown };
  score?: number;
};

type OperationalContext = {
  generatedAt?: string;
  activePriority?: Signal | null;
  changedItems?: Signal[];
  waitingItems?: Signal[];
  driftingItems?: Signal[];
  blockedItems?: Signal[];
  atRiskItems?: Signal[];
};

type Service = { serviceId?: string; displayName?: string; category?: string; currentHealth?: string; metrics?: Record<string, unknown> };
type Connection = { id: string; displayName: string; status: string; statusLabel?: string; health?: { summary?: string; whatFailed: string | null; remainsAvailable: string; blocked: string | null; recoveryAutomatic: boolean; ownerActionRequired: boolean }; lastError?: string | null };
type Momentum = { projectId: string; classification: string; score: number; direction?: string; contributions?: Array<{ label: string; count: number }> };
type TimeOverview = { waitingLoops?: Array<Record<string, unknown>>; notifications?: Array<Record<string, unknown>>; objects?: Array<{ temporal?: { freshnessState?: string } }> };

const humanize = (value: unknown) => String(value ?? "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const signalText = (item: Signal) => item.text ?? item.observation ?? "Operational signal";
const dateTime = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "recently";
const connectionAttentionText = (item: Connection) => `${item.displayName}: ${item.health?.whatFailed ?? item.health?.summary ?? item.statusLabel ?? "needs attention"} Available: ${item.health?.remainsAvailable ?? "local records remain available."} ${item.health?.blocked ? `Blocked: ${item.health.blocked}` : ""} ${item.health?.ownerActionRequired ? "Owner action required." : item.health?.recoveryAutomatic ? "Lee will retry automatically." : ""}`.trim();

function Section({ title, detail, children, tone = "default" }: { title: string; detail: string; children: ReactNode; tone?: "default" | "attention" | "motion" }) {
  return (
    <section className={`rounded-2xl border p-5 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)] ${tone === "attention" ? "border-accent/35 bg-accent/[0.06]" : tone === "motion" ? "border-primary/25 bg-primary/[0.045]" : "border-card-border bg-card/80"}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="lee-label text-primary">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>
        {tone === "attention" ? <ShieldAlert className="text-accent" size={19} /> : tone === "motion" ? <Sparkles className="text-primary" size={19} /> : <CircleCheck className="text-muted-foreground" size={18} />}
      </div>
      {children}
    </section>
  );
}

function SignalRow({ item, emphasis = false }: { item: Signal; emphasis?: boolean }) {
  return (
    <details className="group rounded-xl border border-border bg-muted/35 p-3.5">
      <summary className="flex cursor-pointer list-none items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${emphasis ? "bg-accent" : "bg-primary"}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{signalText(item)}</span>
          <span className="mt-1 block text-[11px] text-muted-foreground">{item.significance ? humanize(item.significance) : "Evidence-backed signal"} · {item.evidenceRefs?.length ?? 0} evidence reference{item.evidenceRefs?.length === 1 ? "" : "s"}</span>
        </span>
        <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        <p>LEE surfaced this because it is part of the current operational context, not because every raw event is shown.</p>
        {item.evidenceRefs?.length ? <p className="mt-2 text-[11px] text-primary">Evidence: {item.evidenceRefs.join(" · ")}</p> : null}
        {item.metadata?.reason ? <p className="mt-2">Reason: {Array.isArray(item.metadata.reason) ? item.metadata.reason.join(" · ") : String(item.metadata.reason)}</p> : null}
      </div>
    </details>
  );
}

export default function TodayCommandCenter({ onRefresh }: { onRefresh?: () => void }) {
  const [context, setContext] = useState<OperationalContext | null>(null);
  const [governance, setGovernance] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [momentum, setMomentum] = useState<Momentum[]>([]);
  const [time, setTime] = useState<TimeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [contextResponse, governanceResponse, servicesResponse, connectionsResponse, momentumResponse, timeResponse] = await Promise.all([
        fetch("/api/internal/operational-intelligence/context", { cache: "no-store" }),
        fetch("/api/governance/requests?status=HOLD", { cache: "no-store" }),
        fetch("/api/internal-services/health", { cache: "no-store" }),
        fetch("/api/connections", { cache: "no-store" }),
        fetch("/api/projects/momentum", { cache: "no-store" }),
        fetch("/api/time/overview", { cache: "no-store" }),
      ]);
      if (contextResponse.ok) setContext(await contextResponse.json());
      if (governanceResponse.ok) setGovernance(await governanceResponse.json());
      if (servicesResponse.ok) setServices(await servicesResponse.json());
      if (connectionsResponse.ok) setConnections(await connectionsResponse.json());
      if (momentumResponse.ok) setMomentum(await momentumResponse.json());
      if (timeResponse.ok) setTime(await timeResponse.json());
    } catch {
      setNotice("Some live signals could not be refreshed. Existing data remains visible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const needsYou = useMemo<Signal[]>(() => [
    ...governance.map((item) => ({ id: item.id, text: item.reason ?? `${humanize(item.actionClass)} approval is waiting.`, significance: item.riskLevel, evidenceRefs: item.evidenceRefs })),
    ...(context?.blockedItems ?? []),
    ...connections.filter((item) => ["needs_reauthorization", "unavailable", "degraded", "incompatible", "pending"].includes(item.status)).map((item) => ({ id: item.id, text: connectionAttentionText(item), significance: "IMPORTANT", evidenceRefs: item.lastError ? [item.lastError] : [] })),
  ].slice(0, 5), [connections, context?.blockedItems, governance]);
  const inMotion = useMemo(() => momentum.filter((item) => !["Dormant", "Stalled"].includes(item.classification)).sort((left, right) => right.score - left.score).slice(0, 5), [momentum]);
  const watching = useMemo<Signal[]>(() => [...(context?.waitingItems ?? []), ...(context?.atRiskItems ?? []), ...(context?.driftingItems ?? [])].slice(0, 7), [context]);
  const meaningfulChanges = context?.changedItems?.length ?? 0;
  const degradedServices = services.filter((item) => item.currentHealth && item.currentHealth !== "healthy");
  const staleCount = time?.objects?.filter((item) => ["stale", "critical"].includes(item.temporal?.freshnessState ?? "")).length ?? 0;

  const refresh = async () => {
    setRefreshing(true);
    setNotice("");
    try {
      await fetch("/api/internal/operational-intelligence/refresh", { method: "POST" });
      await load(false);
      onRefresh?.();
      setNotice("Operational context refreshed and recorded.");
    } catch {
      setNotice("Operational context could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="mx-auto w-full max-w-[1280px]"><div className="mb-8 h-24 animate-pulse rounded-2xl bg-secondary/70" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-72 animate-pulse rounded-2xl bg-secondary/70" /><div className="h-72 animate-pulse rounded-2xl bg-secondary/70" /></div></div>;

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="lee-label text-primary">{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())} · local</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.06] tracking-[-0.05em] md:text-5xl">What deserves<br /><span className="text-primary">your attention.</span></h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">A quiet operational brief built from current evidence, active work, and the owner decisions that can actually move things forward.</p></div>
        <div className="flex items-center gap-2"><span className={`rounded-full border px-3 py-2 text-xs font-semibold ${needsYou.length ? "border-accent/35 bg-accent/10 text-accent-foreground" : "border-primary/25 bg-primary/10 text-primary"}`}>{needsYou.length ? `${needsYou.length} need${needsYou.length === 1 ? "s" : ""} you` : "No owner action detected"}</span><button onClick={() => void refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</button></div>
      </div>
      {notice && <div className="mb-5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">{notice}</div>}

      <section className="mb-5 rounded-2xl border border-primary/25 bg-primary/[0.05] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="lee-label text-primary">LEE summary</p><h3 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight">{meaningfulChanges ? `${meaningfulChanges} meaningful change${meaningfulChanges === 1 ? "" : "s"} are in the current operating picture.` : "No meaningful changes are asking to compete for your attention."}</h3><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{context?.activePriority ? `Priority: ${signalText(context.activePriority)}.` : "The current context is quiet. Use Ask LEE when you want a deeper read across people, projects, or commitments."} {degradedServices.length ? `${degradedServices.length} internal service${degradedServices.length === 1 ? " is" : "s are"} degraded.` : "Internal services have no current degradation signal."}</p></div><div className="text-right"><p className="lee-label text-muted-foreground">Context built</p><p className="mt-1 text-sm font-semibold">{dateTime(context?.generatedAt)}</p></div></div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Needs you" detail="Only owner involvement that can change the next state is shown here." tone="attention">
          {needsYou.length ? <div className="space-y-2">{needsYou.map((item) => <SignalRow key={item.id} item={item} emphasis />)}</div> : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nothing currently requires an owner decision. Held actions, blocked work, and connection failures will appear here.</div>}
          {governance.length > 0 && <Link href="/governance" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Review approvals <ArrowUpRight size={13} /></Link>}
        </Section>
        <Section title="In motion" detail="Meaningful work progressing across registered projects and active operating areas." tone="motion">
          {inMotion.length ? <div className="space-y-2">{inMotion.map((item) => <Link key={item.projectId} href="/projects" className="flex items-center gap-3 rounded-xl border border-border bg-muted/35 p-3.5 hover:border-primary/30 hover:bg-primary/5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><FolderKanban size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.projectId}</span><span className="mt-1 block text-xs text-muted-foreground">{item.classification} · {item.score}/100 · {item.contributions?.slice(0, 2).map((contribution) => contribution.label).join(" · ") || "Current project evidence"}</span></span><span className="text-sm font-semibold text-primary">{item.direction === "up" ? "↑" : item.direction === "down" ? "↓" : "→"}</span></Link>)}</div> : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No active project momentum snapshot is available yet.</div>}
          <Link href="/projects" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Open project work <ArrowUpRight size={13} /></Link>
        </Section>
        <Section title="Watching" detail="Important context that does not need action yet, but can change the next decision.">
          {watching.length ? <div className="space-y-2">{watching.map((item) => <SignalRow key={item.id} item={item} />)}</div> : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No waiting, risk, or aging signals are currently competing for attention.</div>}
          <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-muted/45 p-3"><Clock3 size={15} className="text-primary" /><p className="mt-2 text-lg font-semibold">{time?.waitingLoops?.length ?? context?.waitingItems?.length ?? 0}</p><p className="text-[11px] text-muted-foreground">open waiting loops</p></div><div className="rounded-xl bg-muted/45 p-3"><CircleAlert size={15} className="text-accent" /><p className="mt-2 text-lg font-semibold">{staleCount}</p><p className="text-[11px] text-muted-foreground">aging context items</p></div><div className="rounded-xl bg-muted/45 p-3"><Users size={15} className="text-primary" /><p className="mt-2 text-lg font-semibold">{connections.length}</p><p className="text-[11px] text-muted-foreground">known connections</p></div></div>
        </Section>
        <Section title="Operational read" detail="The supporting signals behind this brief stay available without making the main view noisy.">
          <div className="space-y-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Context categories</span><span className="font-semibold">{[context?.changedItems, context?.waitingItems, context?.atRiskItems, context?.driftingItems].filter((items) => (items?.length ?? 0) > 0).length} active</span></div><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Internal services</span><span className={degradedServices.length ? "font-semibold text-accent-foreground" : "font-semibold text-primary"}>{degradedServices.length ? `${degradedServices.length} need attention` : "Healthy"}</span></div><div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Governance queue</span><span className={governance.length ? "font-semibold text-accent-foreground" : "font-semibold text-primary"}>{governance.length ? `${governance.length} held` : "Clear"}</span></div></div>
          <div className="mt-5 rounded-xl border border-border bg-muted/35 p-4"><p className="text-sm font-semibold">Ask LEE for the why</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ask about a person, project, commitment, or change and the answer can expand into evidence, freshness, assumptions, and confidence.</p><Link href="/ask" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Ask LEE <ArrowUpRight size={13} /></Link></div>
        </Section>
      </div>
    </div>
  );
}