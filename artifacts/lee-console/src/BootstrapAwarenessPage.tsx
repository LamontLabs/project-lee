import { getGetBootstrapAwarenessQueryKey, useGetBootstrapAwareness } from "@workspace/api-client-react";
import { Activity, ArrowUpRight, CircleAlert, CircleCheck, Eye, Gauge, GitBranch, LockKeyhole, RefreshCw, ShieldCheck, Terminal, Wrench } from "lucide-react";
import { Link } from "wouter";

type AnyRecord = Record<string, any>;
type AwarenessStatus = "healthy" | "partial" | "degraded" | "blocked" | "stale" | "deferred" | "unverified";

const statusText: Record<AwarenessStatus, string> = {
  healthy: "Healthy",
  partial: "Partial",
  degraded: "Degraded",
  blocked: "Blocked",
  stale: "Stale",
  deferred: "Deferred",
  unverified: "Unverified",
};

const statusClass: Record<AwarenessStatus, string> = {
  healthy: "border-primary/25 bg-primary/10 text-primary",
  partial: "border-accent/35 bg-accent/10 text-accent-foreground",
  degraded: "border-accent/35 bg-accent/10 text-accent-foreground",
  blocked: "border-destructive/30 bg-destructive/10 text-destructive",
  stale: "border-accent/35 bg-accent/10 text-accent-foreground",
  deferred: "border-border bg-muted text-muted-foreground",
  unverified: "border-border bg-muted text-muted-foreground",
};

function statusOf(value: unknown): AwarenessStatus {
  const normalized = String(value ?? "").toLowerCase() as AwarenessStatus;
  if (normalized === "degraded") return "degraded";
  if (normalized === "stale") return "stale";
  if (["warning"].includes(normalized)) return "partial";
  if (["unavailable", "unauthorized", "forbidden", "failed"].includes(normalized)) return "blocked";
  return normalized in statusText ? normalized : "unverified";
}

function matrixStatus(value: unknown): AwarenessStatus {
  return value === "verified" ? "healthy" : statusOf(value);
}

function StatusBadge({ status }: { status: unknown }) {
  const value = statusOf(status);
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass[value]}`} data-testid={`status-bootstrap-${value}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusText[value]}</span>;
}

function Evidence({ items }: { items: any[] | undefined }) {
  if (!items?.length) return <p className="mt-3 text-[11px] text-muted-foreground">Evidence not recorded.</p>;
  return <div className="mt-3 space-y-1.5">{items.slice(0, 3).map((item, index) => <p key={`${item.source ?? "evidence"}-${index}`} className="text-[11px] leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">{item.source}</span> · {item.detail}{item.observedAt ? ` · ${new Date(item.observedAt).toLocaleString()}` : ""}{item.refs?.length ? ` · ref ${item.refs.slice(0, 2).join(", ")}` : ""}</p>)}</div>;
}

function Section({ eyebrow, title, detail, children, icon: Icon = Activity }: { eyebrow: string; title: string; detail?: string; children: React.ReactNode; icon?: typeof Activity }) {
  return <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)]"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={17} /></span><div><p className="lee-label text-primary">{eyebrow}</p><h3 className="mt-1 text-lg font-semibold">{title}</h3>{detail && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>}</div></div>{children}</section>;
}

function ItemCard({ item }: { item: AnyRecord }) {
  return <div className="rounded-xl border border-border bg-muted/25 p-3.5" data-testid={`card-bootstrap-item-${item.id}`}><div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold">{item.label ?? item.title ?? item.id}</p><div className="flex flex-wrap items-center justify-end gap-1.5">{item.ownerActionRequired && <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">Owner action</span>}{item.freshness && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.freshness}</span>}<StatusBadge status={item.status} /></div></div>{item.detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>}<Evidence items={item.evidence} /></div>;
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
  const externalReality = model.externalReality ?? {};
  const work = model.work ?? {};
  const bridge = model.projectBridge ?? {};
  const selfInspection = bridge.selfInspection?.result ?? {};
  const taskItems = model.activeReplitTasks?.items ?? [];
  const readinessStatus = statusOf(readiness.status);
  const blockerItems = readiness.blockers ?? [];
  const readinessMatrix = readiness.readinessMatrix ?? [];

  return <div className="mx-auto w-full max-w-[1280px]" data-testid="page-bootstrap-awareness">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="lee-label text-primary">Bootstrap / self-model</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Bootstrap Awareness Mode</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">LEE’s honest view of who she is now, what she is becoming, and what still blocks the K6 transition. This surface is read-only and evidence-backed.</p></div>
      <button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-refresh-bootstrap-awareness"><RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh self-model</button>
    </div>

    <section className={`mb-5 rounded-2xl border p-5 ${readinessStatus === "healthy" ? "border-primary/25 bg-primary/[0.05]" : readinessStatus === "blocked" ? "border-destructive/30 bg-destructive/[0.06]" : "border-accent/35 bg-accent/[0.06]"}`} data-testid="card-bootstrap-objective">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="lee-label text-primary">Explicit bootstrap objective</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{objective.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{objective.statement}</p></div><StatusBadge status={readiness.status} /></div>
       <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Readiness score</p><p className="mt-2 text-2xl font-semibold text-primary">{readiness.score ?? "—"}<span className="text-sm text-muted-foreground"> / 100</span></p></div><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Current version</p><p className="mt-2 truncate text-sm font-semibold">{model.identity?.currentVersion ?? "Unverified"}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{model.identity?.build ?? "Build not linked"}</p></div><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Open blockers</p><p className="mt-2 text-2xl font-semibold text-accent-foreground">{blockerItems.length}</p><p className="mt-1 text-[11px] text-muted-foreground">Evidence-backed gaps</p></div><div className="rounded-xl bg-background/60 p-3"><p className="lee-label text-muted-foreground">Latest movement</p><p className="mt-2 text-sm font-semibold">{readiness.latestChangeMovement?.delta == null ? "Unverified" : `${readiness.latestChangeMovement.delta > 0 ? "+" : ""}${readiness.latestChangeMovement.delta} points`}</p><p className="mt-1 text-[11px] text-muted-foreground">{readiness.latestChangeMovement?.detail ?? "No comparable snapshot"}</p></div></div>
       <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><div><p className="lee-label text-muted-foreground">Objective record</p><p className="mt-1 text-xs font-semibold">{objective.persisted ? `Persisted · ${objective.recordId}` : "Unverified persistence"}</p><p className="mt-1 text-[11px] text-muted-foreground">{objective.currentOwner ?? "Owner unverified"} · {objective.healthStatus ?? "UNVERIFIED"} · {objective.progressNarrative ?? "No objective progress narrative."}</p></div><div className="rounded-xl border border-border bg-background/50 p-3"><p className="lee-label text-muted-foreground">Success metrics</p><p className="mt-1 text-xs font-semibold">{objective.successMetrics?.length ?? 0} owner-defined guardrails</p></div></div>
       <div className="mt-3 rounded-xl border border-border bg-background/40 p-3"><p className="lee-label text-muted-foreground">Objective evidence</p><Evidence items={objective.evidence} /></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Section eyebrow="Readiness gap" title="What still prevents desktop readiness?" detail="LEE should prefer a visible unverified state over an optimistic claim." icon={Gauge}>
        <div className="mt-4 space-y-3">{blockerItems.length ? blockerItems.map((item: AnyRecord) => <ItemCard key={item.id} item={item} />) : <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-primary"><CircleCheck className="mr-2 inline" size={16} />No current blocker was derived, but K6 transfer evidence is still required before calling the objective complete.</div>}</div>
        <Evidence items={readiness.evidence} />
        <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3.5" data-testid="card-k6-readiness-matrix">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="lee-label text-primary">Cross-system proof matrix</p><p className="mt-1 text-xs text-muted-foreground">Every domain needs fresh, source-labeled evidence before K6 readiness can be eligible.</p></div><StatusBadge status={readinessMatrix.length && readinessMatrix.every((item: AnyRecord) => item.status === "verified") ? "healthy" : "blocked"} /></div>
          <div className="mt-3 space-y-2">{readinessMatrix.length ? readinessMatrix.map((item: AnyRecord) => <div key={item.key} className="rounded-lg border border-border bg-background/50 p-2.5" data-testid={`row-k6-matrix-${item.key}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">{item.key}</p><StatusBadge status={matrixStatus(item.status)} /></div><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.evidence?.source ?? "Evidence source unavailable"}{item.evidence?.observedAt ? ` · ${new Date(item.evidence.observedAt).toLocaleString()}` : " · unverified"}{item.evidence?.refs?.length ? ` · ref ${item.evidence.refs.slice(0, 2).join(", ")}` : ""}</p></div>) : <p className="text-xs text-muted-foreground">No cross-system readiness matrix is persisted.</p>}</div>
        </div>
      </Section>
      <Section eyebrow="Next move" title="What should be built next?" detail="Prioritized from current blockers, not from a second task engine." icon={Wrench}>
        <div className="mt-4 space-y-2.5">{(model.next ?? []).length ? (model.next ?? []).map((item: AnyRecord, index: number) => <div key={`${item.action}-${index}`} className="flex gap-3 rounded-xl border border-border bg-muted/25 p-3.5" data-testid={`row-bootstrap-next-${index}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.action}</p><StatusBadge status={item.status} /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.reason}</p></div></div>) : <p className="text-sm text-muted-foreground">No next action was derived.</p>}</div>
      </Section>
    </div>

    <Section eyebrow="Bootstrap answers" title="Six questions LEE can answer now" detail="These answers are derived from the same read-only projection as the readiness cards. Unknown evidence stays visible." icon={CircleAlert}>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="grid-bootstrap-questions">{(model.bootstrapQuestions ?? []).map((item: AnyRecord) => <div key={item.id} className="rounded-xl border border-border bg-muted/25 p-3.5" data-testid={`card-bootstrap-question-${item.id}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{item.question}</p><StatusBadge status={item.status} /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.answer}</p><p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Freshness · {item.freshness ?? "unverified"}</p><Evidence items={item.evidence} /></div>)}</div>
    </Section>

    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Section eyebrow="Live systems" title="Healthy, partial, degraded, or unverified" detail="Existing System Manifest, service registry, desktop setup, and connection projections remain the sources of truth." icon={Activity}>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{(systems.items ?? []).map((item: AnyRecord) => <ItemCard key={item.id} item={item} />)}</div>
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5"><p className="lee-label text-primary">K6 architecture guardrails</p><div className="mt-3 space-y-2">{(systems.targetK6Architecture ?? []).map((item: AnyRecord) => <div key={item.id} className="flex items-start gap-2 text-xs"><StatusBadge status={item.status} /><span className="leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{item.label}:</span> {item.detail}</span></div>)}</div></div>
      </Section>
      <Section eyebrow="Delivery evidence" title="What Replit is changing" detail="Build and release status comes from GitHub Actions; deployment status requires signed evidence from the deployment producer. Missing or stale signals remain unverified." icon={Terminal}>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{[delivery.build, delivery.tests, delivery.deployment, delivery.packaging].filter(Boolean).map((item: AnyRecord) => <ItemCard key={item.id} item={item} />)}</div>
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5"><p className="lee-label text-primary">Work state</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{[["Completed", work.completed], ["Partial", work.partial], ["Blocked", work.blocked], ["Deferred", work.deferred]].map(([label, values]: any) => <div key={label}><p className="text-xs font-semibold">{label} <span className="text-muted-foreground">· {values?.length ?? 0}</span></p>{values?.slice(0, 3).map((value: string, index: number) => <p key={`${label}-${index}`} className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{value}</p>)}</div>)}</div></div>
      </Section>
    </div>

    <Section eyebrow="External reality" title="Provider evidence freshness" detail={externalReality.summary ?? "External provider freshness is unverified until a successful refresh is recorded. Local canonical records remain separate from live provider state."} icon={Activity}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="grid-bootstrap-provider-freshness">{(externalReality.providers ?? []).map((provider: AnyRecord) => <div key={provider.provider} className="rounded-xl border border-border bg-muted/25 p-3.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold">{provider.label ?? provider.provider}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{provider.category ?? "provider"} · {provider.provider}</p></div><StatusBadge status={provider.state === "offline" ? "blocked" : provider.state === "degraded" || provider.state === "stale" ? "degraded" : provider.state === "current" || provider.state === "reconnected" ? "healthy" : "unverified"} /></div><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{provider.freshnessLabel ?? provider.state ?? "unverified"}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Last successful refresh: {provider.lastSuccessfulRefreshAt ? new Date(provider.lastSuccessfulRefreshAt).toLocaleString() : "not recorded"}.</p>{provider.limitations?.length ? <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground">{provider.limitations.slice(0, 3).map((limitation: string) => <p key={limitation}>· {limitation}</p>)}</div> : null}</div>)}</div>
      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5"><p className="lee-label text-primary">Offline continuity</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{(externalReality.expectedLimitations ?? []).join(" ")}</p><div className="mt-3 flex flex-wrap gap-1.5">{(externalReality.localCapabilities ?? []).map((capability: string) => <span key={capability} className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{capability.replaceAll("_", " ")}</span>)}</div></div>
    </Section>

    <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <Section eyebrow="Project bridge" title="Self-repository inspection" detail="Read/diagnostic access is explicit. Mutation operations are not included in Bootstrap Awareness." icon={GitBranch}>
        <div className="mt-4 rounded-xl border border-border bg-muted/25 p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Bridge posture</p><StatusBadge status={bridge.status} /></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{bridge.selfInspection?.detail ?? "No self-inspection state reported."}</p><Evidence items={bridge.selfInspection?.evidence} /></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="grid-bootstrap-bridge-inspection"><div className="rounded-xl border border-border bg-muted/20 p-3"><p className="lee-label text-muted-foreground">Repository</p><p className="mt-1 truncate text-xs font-semibold">{selfInspection.repository?.name ?? "Unverified"}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{selfInspection.repository?.root ?? "Workspace root unavailable"}</p></div><div className="rounded-xl border border-border bg-muted/20 p-3"><p className="lee-label text-muted-foreground">Dependencies</p><p className="mt-1 text-xs font-semibold">{selfInspection.dependencies?.manifests?.length ?? 0} manifest(s) inspected</p><p className="mt-1 text-[11px] text-muted-foreground">{selfInspection.dependencies?.provenance?.source ?? "No provenance"}</p></div><div className="rounded-xl border border-border bg-muted/20 p-3"><p className="lee-label text-muted-foreground">Contract</p><p className="mt-1 text-xs font-semibold">{selfInspection.contract?.matches === true ? "Matches observed contract" : "Unverified"}</p><p className="mt-1 text-[11px] text-muted-foreground">{selfInspection.contract?.provenance?.observedAt ? new Date(selfInspection.contract.provenance.observedAt).toLocaleString() : "No observation time"}</p></div><div className="rounded-xl border border-border bg-muted/20 p-3"><p className="lee-label text-muted-foreground">Build / logs / deployment</p><p className="mt-1 text-xs font-semibold">{statusText[statusOf(selfInspection.build?.status)]} · {selfInspection.logs?.files?.length ?? 0} log path(s)</p><p className="mt-1 text-[11px] text-muted-foreground">{selfInspection.deployment?.status ?? "Deployment unverified"}</p></div></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{(bridge.localProject?.readOnlyOperations ?? []).map((operation: string) => <span key={operation} className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{operation}</span>)}</div>
        <div className="mt-4 space-y-2" data-testid="list-bootstrap-registered-projects">{(bridge.registeredProjects ?? []).map((project: AnyRecord) => <div key={project.id} className="rounded-xl border border-border bg-muted/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">{project.name}</p><p className="truncate text-[10px] text-muted-foreground">{project.id} · {project.endpoint}</p></div><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{project.capabilityLevel ?? "OBSERVE"}</span><StatusBadge status={project.health?.status} /></div></div><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{project.health?.detail ?? "Project health is unverified."} {project.health?.checkedAt ? `Observed ${new Date(project.health.checkedAt).toLocaleString()}.` : "No observation recorded."}</p></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs"><Link href="/projects" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">Open project bridge <ArrowUpRight size={13} /></Link><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Eye size={13} /> OBSERVE only</span></div>
      </Section>
      <Section eyebrow="Replit task awareness" title="Current work registry" detail={model.activeReplitTasks?.detail} icon={RefreshCw}>
        <div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">{taskItems.length ? taskItems.slice(0, 12).map((item: AnyRecord) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-3.5 py-3" data-testid={`row-bootstrap-task-${item.id}`}><span className="min-w-0 truncate text-sm">{item.label}</span><StatusBadge status={item.status} /></div>) : <p className="text-sm text-muted-foreground">No task specifications are visible.</p>}</div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Task specifications are not treated as completed work. Live assignment, owner, and agent state remain unverified until the Replit task bridge exposes them.</p>
      </Section>
    </div>

    <Section eyebrow="Technical debt" title="Known gaps that keep the self-model honest" detail="These are evidence-backed limitations in what LEE can currently prove, not automatic repair instructions." icon={Wrench}>
      <div className="mt-4 space-y-2" data-testid="list-bootstrap-technical-debt">{(model.technicalDebt ?? []).map((item: string, index: number) => <div key={`${item}-${index}`} className="rounded-xl border border-border bg-muted/25 p-3 text-xs leading-relaxed text-muted-foreground">{item}</div>)}</div>
      <Evidence items={model.technicalDebtEvidence} />
    </Section>

    <section className="mt-5 rounded-2xl border border-border bg-card/80 p-5" data-testid="card-bootstrap-permissions"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole size={17} /></span><div><p className="lee-label text-primary">Permission boundary</p><h3 className="mt-1 text-lg font-semibold">Bootstrap Awareness cannot change LEE</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Self-inspection, diagnostics, comparison, and recommended changes are allowed. High-impact changes remain behind the existing owner confirmation, governance, and CerbaSeal boundaries.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5"><p className="text-xs font-semibold text-primary"><ShieldCheck className="mr-1 inline" size={14} />Allowed</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{(model.permissions?.bootstrapAwareness ?? []).join(" · ")}</p></div><div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5"><p className="text-xs font-semibold text-destructive"><CircleAlert className="mr-1 inline" size={14} />Explicitly denied</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{(model.permissions?.explicitlyDenied ?? []).join(" · ")}</p></div></div></section>
    <p className="mt-4 text-right text-[11px] text-muted-foreground" data-testid="text-bootstrap-awareness-observed">Self-model observed {model.generatedAt ? new Date(model.generatedAt).toLocaleString() : "—"} · {model.inspectionBoundary?.canonicalBrainPreserved ? "canonical Brain preserved" : "canonical Brain preservation unverified"}</p>
  </div>;
}