import { getGetBootstrapAwarenessQueryKey, useGetBootstrapAwareness } from "@workspace/api-client-react";
import { Activity, ArrowUpRight, CircleAlert, CircleCheck, Eye, Gauge, GitBranch, LockKeyhole, RefreshCw, ShieldCheck, Terminal, Wrench } from "lucide-react";
import { Link } from "wouter";

type AnyRecord = Record<string, any>;
type AwarenessStatus = "healthy" | "partial" | "blocked" | "deferred" | "unverified";

const statusText: Record<AwarenessStatus, string> = {
  healthy: "Healthy",
  partial: "Partial",
  blocked: "Blocked",
  deferred: "Deferred",
  unverified: "Unverified",
};

const statusClass: Record<AwarenessStatus, string> = {
  healthy: "border-primary/25 bg-primary/10 text-primary",
  partial: "border-accent/35 bg-accent/10 text-accent-foreground",
  blocked: "border-destructive/30 bg-destructive/10 text-destructive",
  deferred: "border-border bg-muted text-muted-foreground",
  unverified: "border-border bg-muted text-muted-foreground",
};

function statusOf(value: unknown): AwarenessStatus {
  const normalized = String(value ?? "").toLowerCase() as AwarenessStatus;
  return normalized in statusText ? normalized : "unverified";
}

function StatusBadge({ status }: { status: unknown }) {
  const value = statusOf(status);
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass[value]}`} data-testid={`status-bootstrap-${value}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusText[value]}</span>;
}

function Evidence({ items }: { items: any[] | undefined }) {
  if (!items?.length) return <p className="mt-3 text-[11px] text-muted-foreground">Evidence not recorded.</p>;
  return <div className="mt-3 space-y-1.5">{items.slice(0, 3).map((item, index) => <p key={`${item.source ?? "evidence"}-${index}`} className="text-[11px] leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">{item.source}</span> · {item.detail}{item.observedAt ? ` · ${new Date(item.observedAt).toLocaleString()}` : ""}</p>)}</div>;
}

function Section({ eyebrow, title, detail, children, icon: Icon = Activity }: { eyebrow: string; title: string; detail?: string; children: React.ReactNode; icon?: typeof Activity }) {
  return <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={17} /></span><div><p className="lee-label text-primary">{eyebrow}</p><h3 className="mt-1 text-lg font-semibold">{title}</h3>{detail && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>}</div></div>{children}</section>;
}

function ItemCard({ item }: { item: AnyRecord }) {
  return <div className="rounded-xl border border-border bg-muted/25 p-3.5" data-testid={`card-bootstrap-item-${item.id}`}><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold">{item.label ?? item.title ?? item.id}</p><StatusBadge status={item.status} /></div>{item.detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>}<Evidence items={item.evidence} /></div>;
}

export default function BootstrapAwarenessPage() {
  const { data, isLoading, isError, refetch, isFetching } = useGetBootstrapAwareness({ query: { queryKey: getGetBootstrapAwarenessQueryKey(), staleTime: 0 } });
  const model = data as AnyRecord | undefined;
  if (isLoading) return <div className="mx-auto w-full max-w-[1280px]"><div className="mb-5 h-32 animate-pulse rounded-2xl bg-secondary/70" /><div className="grid gap-5 md:grid-cols-2"><div className="h-64 animate-pulse rounded-2xl bg-secondary/70" /><div className="h-64 animate-pulse rounded-2xl bg-secondary/70" /></div></div>;
  if (isError || !model) return <div className="mx-auto max-w-[1280px] rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive" data-testid="status-bootstrap-awareness-error">Bootstrap Awareness is unavailable. The existing system surfaces remain available.</div>;

  const objective = model.objective ?? {};
  const readiness = model.readiness ?? {};
  const delivery = model.delivery ?? {};
  const systems = model.systems ?? {};
  const work = model.work ?? {};
  const bridge = model.projectBridge ?? {};
  const taskItems = model.activeReplitTasks?.items ?? [];
  const readinessStatus = statusOf(readiness.status);
  const blockerItems = readiness.blockers ?? [];

  return <div className="mx-auto w-full max-w-[1280px]" data-testid="page-bootstrap-awareness">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="lee-label text-primary">Bootstrap / self-model</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Bootstrap Awareness Mode</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">LEE’s honest view of who she is now, what she is becoming, and what still blocks the K6 transition. This surface is read-only and evidence-backed.</p></div>
      <button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-refresh-bootstrap-awareness"><RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh self-model</button>
    </div>

    <section className={`mb-5 rounded-2xl border p-5 ${readinessStatus === "healthy" ? "border-primary/25 bg-primary/[0.05]" : readinessStatus === "blocked" ? "border-destructive/30 bg-destructive/[0.06]" : "border-accent/35 bg-accent/[0.06]"}`} data-testid="card-bootstrap-objective">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="lee-label text-primary">Explicit bootstrap objective</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{objective.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{objective.statement}</p></div><StatusBadge status={readiness.status} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Readiness score</p><p className="mt-2 text-2xl font-semibold text-primary">{readiness.score ?? "—"}<span className="text-sm text-muted-foreground"> / 100</span></p></div><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Current version</p><p className="mt-2 truncate text-sm font-semibold">{model.identity?.currentVersion ?? "Unverified"}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{model.identity?.build ?? "Build not linked"}</p></div><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Open blockers</p><p className="mt-2 text-2xl font-semibold text-accent-foreground">{blockerItems.length}</p><p className="mt-1 text-[11px] text-muted-foreground">Evidence-backed gaps</p></div><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Latest movement</p><p className="mt-2 text-sm font-semibold">{readiness.latestChangeMovement?.delta == null ? "Unverified" : `${readiness.latestChangeMovement.delta > 0 ? "+" : ""}${readiness.latestChangeMovement.delta} points`}</p><p className="mt-1 text-[11px] text-muted-foreground">{readiness.latestChangeMovement?.detail ?? "No comparable snapshot"}</p></div></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Section eyebrow="Readiness gap" title="What still prevents desktop readiness?" detail="LEE should prefer a visible unverified state over an optimistic claim." icon={Gauge}>
        <div className="mt-4 space-y-3">{blockerItems.length ? blockerItems.map((item: AnyRecord) => <ItemCard key={item.id} item={item} />) : <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary"><CircleCheck className="mr-2 inline" size={16} />No current blocker was derived, but K6 transfer evidence is still required before calling the objective complete.</div>}</div>
        <Evidence items={readiness.evidence} />
      </Section>
      <Section eyebrow="Next move" title="What should be built next?" detail="Prioritized from current blockers, not from a second task engine." icon={Wrench}>
        <div className="mt-4 space-y-2.5">{(model.next ?? []).length ? (model.next ?? []).map((item: AnyRecord, index: number) => <div key={`${item.action}-${index}`} className="flex gap-3 rounded-xl border border-border bg-muted/25 p-3.5" data-testid={`row-bootstrap-next-${index}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.action}</p><StatusBadge status={item.status} /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.reason}</p></div></div>) : <p className="text-sm text-muted-foreground">No next action was derived.</p>}</div>
      </Section>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Section eyebrow="Live systems" title="Healthy, partial, degraded, or unverified" detail="Existing System Manifest, service registry, desktop setup, and connection projections remain the sources of truth." icon={Activity}>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{(systems.items ?? []).map((item: AnyRecord) => <ItemCard key={item.id} item={item} />)}</div>
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5"><p className="lee-label text-primary">K6 architecture guardrails</p><div className="mt-3 space-y-2">{(systems.targetK6Architecture ?? []).map((item: AnyRecord) => <div key={item.id} className="flex items-start gap-2 text-xs"><StatusBadge status={item.status} /><span className="leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{item.label}:</span> {item.detail}</span></div>)}</div></div>
      </Section>
      <Section eyebrow="Delivery evidence" title="What Replit is changing" detail="Pipeline status is shown only when a build, test, deployment, or packaging signal is actually connected." icon={Terminal}>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{[delivery.build, delivery.tests, delivery.deployment, delivery.packaging].filter(Boolean).map((item: AnyRecord) => <ItemCard key={item.id} item={item} />)}</div>
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5"><p className="lee-label text-primary">Work state</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{[["Completed", work.completed], ["Partial", work.partial], ["Blocked", work.blocked], ["Deferred", work.deferred]].map(([label, values]: any) => <div key={label}><p className="text-xs font-semibold">{label} <span className="text-muted-foreground">· {values?.length ?? 0}</span></p>{values?.slice(0, 3).map((value: string, index: number) => <p key={`${label}-${index}`} className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{value}</p>)}</div>)}</div></div>
      </Section>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <Section eyebrow="Project bridge" title="Self-repository inspection" detail="Read/diagnostic access is explicit. Mutation operations are not included in Bootstrap Awareness." icon={GitBranch}>
        <div className="mt-4 rounded-xl border border-border bg-muted/25 p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Bridge posture</p><StatusBadge status={bridge.status} /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{bridge.selfInspection?.detail ?? "No self-inspection state reported."}</p><Evidence items={bridge.selfInspection?.evidence} /></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{(bridge.localProject?.readOnlyOperations ?? []).map((operation: string) => <span key={operation} className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{operation}</span>)}</div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs"><Link href="/projects" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Open project bridge <ArrowUpRight size={13} /></Link><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Eye size={13} /> OBSERVE only</span></div>
      </Section>
      <Section eyebrow="Replit task awareness" title="Current work registry" detail={model.activeReplitTasks?.detail} icon={RefreshCw}>
        <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">{taskItems.length ? taskItems.slice(0, 12).map((item: AnyRecord) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-3.5 py-3" data-testid={`row-bootstrap-task-${item.id}`}><span className="min-w-0 truncate text-sm">{item.label}</span><StatusBadge status={item.status} /></div>) : <p className="text-sm text-muted-foreground">No task specifications are visible.</p>}</div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Task specifications are not treated as completed work. Live assignment, owner, and agent state remain unverified until the Replit task bridge exposes them.</p>
      </Section>
    </div>

    <section className="mt-5 rounded-2xl border border-border bg-card/80 p-5" data-testid="card-bootstrap-permissions"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole size={17} /></span><div><p className="lee-label text-primary">Permission boundary</p><h3 className="mt-1 text-lg font-semibold">Bootstrap Awareness cannot change LEE</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Self-inspection, diagnostics, comparison, and recommended changes are allowed. High-impact changes remain behind the existing owner confirmation, governance, and CerbaSeal boundaries.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5"><p className="text-xs font-semibold text-primary"><ShieldCheck className="mr-1 inline" size={14} />Allowed</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{(model.permissions?.bootstrapAwareness ?? []).join(" · ")}</p></div><div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5"><p className="text-xs font-semibold text-destructive"><CircleAlert className="mr-1 inline" size={14} />Explicitly denied</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{(model.permissions?.explicitlyDenied ?? []).join(" · ")}</p></div></div></section>
    <p className="mt-4 text-right text-[11px] text-muted-foreground" data-testid="text-bootstrap-awareness-observed">Self-model observed {model.generatedAt ? new Date(model.generatedAt).toLocaleString() : "—"} · {model.inspectionBoundary?.canonicalBrainPreserved ? "canonical Brain preserved" : "canonical Brain preservation unverified"}</p>
  </div>;
}