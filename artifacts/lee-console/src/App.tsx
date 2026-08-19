import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Command,
  Database,
  FileText,
  Filter,
  Gauge,
  GitBranch,
  Inbox,
  KeyRound,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Network,
  PanelLeftClose,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type ObjectiveStatus = 'active' | 'watch' | 'done';
type ObjectivePriority = 'critical' | 'high' | 'normal';
type KnowledgeKind = 'fact' | 'interpretation' | 'assumption' | 'anchor';
type KnowledgeStatus = 'verified' | 'evolving' | 'needs review';
type HealthStatus = 'operational' | 'degraded' | 'offline';

type Objective = {
  id: string;
  title: string;
  description: string;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  targetDate: string;
  confidence: number;
};
type KnowledgeItem = {
  id: string;
  kind: KnowledgeKind;
  statement: string;
  sourceRef: string;
  confidence: number;
  createdAt: string;
  status: KnowledgeStatus;
};
type LeeEvent = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  sourceRef: string;
};
type HealthItem = {
  name: string;
  status: HealthStatus;
  detail: string;
  lastChecked: string;
};

const OBJECTIVES: Objective[] = [
  { id: 'obj-17', title: 'Make the first operator loop trustworthy', description: 'Ship one complete loop from signal to decision, with a visible trail for every important change.', status: 'active', priority: 'critical', targetDate: '2025-04-18', confidence: 0.78 },
  { id: 'obj-12', title: 'Turn the founder brief into a daily ritual', description: 'A concise morning read that distinguishes what changed, what matters, and what can wait.', status: 'active', priority: 'high', targetDate: '2025-04-25', confidence: 0.64 },
  { id: 'obj-09', title: 'Establish durable source provenance', description: 'Every belief in the console should point back to a source, timestamp, and confidence.', status: 'watch', priority: 'high', targetDate: '2025-05-02', confidence: 0.52 },
  { id: 'obj-04', title: 'Document the operating constitution', description: 'Write down the boundaries that keep the system useful, private, and founder-directed.', status: 'done', priority: 'normal', targetDate: '2025-03-29', confidence: 0.93 },
];

const KNOWLEDGE: KnowledgeItem[] = [
  { id: 'kn-204', kind: 'fact', statement: 'Project LEE is a private operating layer for one founder, not a general-purpose assistant.', sourceRef: 'Founder note · 2025-03-11', confidence: 0.98, createdAt: '2025-04-14T08:42:00', status: 'verified' },
  { id: 'kn-188', kind: 'interpretation', statement: 'The highest leverage is reducing the time between a meaningful signal and a deliberate next action.', sourceRef: 'Reflection · 2025-04-09', confidence: 0.81, createdAt: '2025-04-09T17:18:00', status: 'evolving' },
  { id: 'kn-161', kind: 'assumption', statement: 'A visible confidence score will make uncertainty easier to act on than a hidden model rationale.', sourceRef: 'Working hypothesis · 2025-04-03', confidence: 0.57, createdAt: '2025-04-03T11:07:00', status: 'needs review' },
  { id: 'kn-142', kind: 'anchor', statement: 'Protect founder attention before optimizing for system throughput.', sourceRef: 'Operating constitution · 2025-03-29', confidence: 0.96, createdAt: '2025-03-29T09:24:00', status: 'verified' },
  { id: 'kn-119', kind: 'fact', statement: 'The console remains private-access until an explicit sharing decision is made.', sourceRef: 'Access policy · 2025-03-21', confidence: 0.99, createdAt: '2025-03-21T14:51:00', status: 'verified' },
];

const EVENTS: LeeEvent[] = [
  { id: 'evt-841', eventType: 'objective.progressed', aggregateType: 'objective', aggregateId: 'obj-17', occurredAt: '2025-04-14T09:18:00', sourceRef: 'console / today' },
  { id: 'evt-840', eventType: 'knowledge.ingested', aggregateType: 'knowledge', aggregateId: 'kn-204', occurredAt: '2025-04-14T08:42:00', sourceRef: 'founder note' },
  { id: 'evt-839', eventType: 'health.check_degraded', aggregateType: 'service', aggregateId: 'connector.github', occurredAt: '2025-04-14T07:56:00', sourceRef: 'health monitor' },
  { id: 'evt-838', eventType: 'brief.generated', aggregateType: 'brief', aggregateId: 'brief-0414', occurredAt: '2025-04-14T07:30:00', sourceRef: 'daily opening' },
  { id: 'evt-837', eventType: 'session.opened', aggregateType: 'access', aggregateId: 'session-22', occurredAt: '2025-04-14T07:28:00', sourceRef: 'local console' },
];

const HEALTH: HealthItem[] = [
  { name: 'Foundation API', status: 'operational', detail: 'Read/write surface responding within expected bounds.', lastChecked: '18 sec ago' },
  { name: 'Knowledge index', status: 'operational', detail: '5,812 items indexed · provenance links intact.', lastChecked: '42 sec ago' },
  { name: 'GitHub connector', status: 'degraded', detail: 'Webhook delivery delayed. Last successful pull was 19 minutes ago.', lastChecked: '19 min ago' },
  { name: 'Local session', status: 'operational', detail: 'Encrypted private session · founder access only.', lastChecked: 'now' },
];

const navItems = [
  { href: '/', label: 'Today', icon: Command },
  { href: '/objectives', label: 'Objectives', icon: Target },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/institutional', label: 'Institutional', icon: Sparkles },
  { href: '/events', label: 'Events', icon: Radio },
  { href: '/reviews', label: 'Reviews', icon: FileText },
  { href: '/health', label: 'System health', icon: Gauge },
];

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function StatusPill({ status }: { status: ObjectiveStatus | KnowledgeStatus | HealthStatus }) {
  const labels: Record<string, string> = { active: 'Active', watch: 'Watch', done: 'Complete', verified: 'Verified', evolving: 'Evolving', 'needs review': 'Needs review', operational: 'Operational', degraded: 'Degraded', offline: 'Offline' };
  return (
    <span data-testid={`status-${status.replace(/\s/g, '-')}`} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium', status === 'active' || status === 'operational' || status === 'verified' ? 'border-primary/25 bg-primary/10 text-primary' : status === 'degraded' || status === 'watch' || status === 'evolving' ? 'border-accent/40 bg-accent/15 text-foreground' : status === 'offline' || status === 'needs review' ? 'border-destructive/25 bg-destructive/10 text-destructive' : 'border-border bg-muted text-muted-foreground')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'active' || status === 'operational' || status === 'verified' ? 'bg-primary' : status === 'degraded' || status === 'watch' || status === 'evolving' ? 'bg-accent' : 'bg-destructive')} />
      {labels[status]}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2" data-testid={`confidence-${Math.round(value * 100)}`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value * 100}%` }} />
      </div>
      <span className="lee-label text-muted-foreground">{Math.round(value * 100)}%</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="lee-label mb-2 text-primary">{eyebrow}</p>
        <h2 className="lee-display text-xl font-bold tracking-tight text-foreground">{title}</h2>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-card-border bg-card/80 p-5 shadow-[0_14px_40px_hsl(205_30%_20%/0.04)] backdrop-blur-sm', className)}>{children}</section>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-6 text-center">
      <Inbox className="mb-3 text-muted-foreground" size={20} strokeWidth={1.5} />
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" data-testid="loading-skeleton">{Array.from({ length: count }).map((_, index) => <div className="h-16 animate-pulse rounded-xl bg-secondary/70" key={index} />)}</div>;
}

function AppShell({ children, onAsk, onLock }: { children: ReactNode; onAsk: () => void; onLock: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const pageTitles: Record<string, string> = { '/': 'Today', '/objectives': 'Objectives', '/knowledge': 'Knowledge', '/institutional': 'Institutional Knowledge', '/events': 'Event history', '/reviews': 'Operational reviews', '/health': 'System health', '/settings': 'Settings' };
  const pageTitle = pageTitles[location] ?? 'Console';
  return (
    <div className="lee-noise min-h-[100dvh] bg-background text-foreground">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-3">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><BrainCircuit size={19} /></span>
            <span><span className="block text-[15px] font-semibold tracking-tight">Lee Console</span><span className="lee-label text-sidebar-foreground/45">Project LEE</span></span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" data-testid="button-close-menu"><PanelLeftClose size={17} /></button>
        </div>
        <div className="mt-9 px-3"><p className="lee-label text-sidebar-foreground/40">Operator view</p></div>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground', active && 'bg-sidebar-accent text-sidebar-foreground shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]')}>
              <Icon size={17} className={cn(active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-primary')} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </Link>;
          })}
        </nav>
        <div className="mt-auto">
          <button onClick={onAsk} className="group mb-4 flex w-full items-center gap-3 rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 px-3 py-3 text-left hover:bg-sidebar-primary/20" data-testid="button-ask-lee-sidebar">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><MessageSquareText size={16} /></span>
            <span><span className="block text-sm font-medium">Ask Lee</span><span className="text-[11px] text-sidebar-foreground/50">Private reasoning surface</span></span>
            <ArrowUpRight size={14} className="ml-auto text-sidebar-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
          <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="link-nav-settings">
            <Settings2 size={17} className="text-sidebar-foreground/45" /><span>Settings</span>
          </Link>
          <div className="mt-4 flex items-center gap-2 border-t border-sidebar-border px-3 pt-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">LM</span>
            <div className="min-w-0"><p className="truncate text-xs font-medium">Lee Morgan</p><p className="truncate text-[10px] text-sidebar-foreground/40">Owner · private</p></div>
            <LockKeyhole size={13} className="ml-auto text-sidebar-primary/70" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-sidebar/40 backdrop-blur-sm md:hidden" data-testid="button-close-menu-overlay" />}
      <div className="min-h-[100dvh] md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-open-menu"><Menu size={19} /></button>
            <div><p className="lee-label text-muted-foreground/75">Operating console / 14 Apr 2025</p><h1 className="mt-0.5 text-lg font-semibold tracking-tight">{pageTitle}</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAccessOpen(true)} className="hidden items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 sm:flex" data-testid="button-private-access"><ShieldCheck size={14} /> Private access <ChevronDown size={13} /></button>
            <button onClick={onAsk} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary" aria-label="Ask Lee" data-testid="button-ask-lee-header"><Command size={16} /></button>
          </div>
        </header>
        <main className="lee-shell-grid min-h-[calc(100dvh-68px)] px-5 py-7 md:px-9 md:py-9">{children}</main>
      </div>
      {accessOpen && <PrivateAccessDialog onClose={() => setAccessOpen(false)} onLock={onLock} />}
    </div>
  );
}

function PrivateAccessDialog({ onClose, onLock }: { onClose: () => void; onLock: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-5 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl lee-enter" data-testid="dialog-private-access">
      <div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole size={19} /></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close private access" data-testid="button-close-private-access"><X size={17} /></button></div>
      <p className="lee-label mt-6 text-primary">Access boundary</p><h2 className="mt-2 text-xl font-semibold">This console is private by design.</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Only the founder session can inspect or change Project LEE state. No shared workspace, team role, or public link is active.</p>
      <div className="mt-5 rounded-xl border border-border bg-muted/50 p-3.5"><div className="flex items-center gap-3"><CircleCheck className="text-primary" size={17} /><div><p className="text-sm font-medium">Founder session verified</p><p className="text-xs text-muted-foreground">Local session · last verified just now</p></div></div></div>
      <div className="mt-6 flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="button-continue-private">Continue privately</button><button onClick={() => { onLock(); onClose(); }} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted" data-testid="button-lock-console">Lock console</button></div>
    </div>
  </div>;
}

function HomePage({ onAsk }: { onAsk: () => void }) {
  const activeObjectives = OBJECTIVES.filter((objective) => objective.status !== 'done');
  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="lee-enter"><p className="lee-label text-primary">Monday · 08:42 local</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.06] tracking-[-0.05em] md:text-5xl">A clear read on what<br /><span className="text-primary">deserves your attention.</span></h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">LEE is watching the edges of the operation. Here is the signal worth carrying into the day.</p></div>
      <div className="lee-enter lee-enter-delay-1 flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3"><div className="relative grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Activity size={20} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" /></div><div><p className="lee-label text-muted-foreground">System posture</p><p className="mt-1 text-sm font-semibold">Quietly operational</p></div><Link href="/health" className="ml-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary" data-testid="link-home-health"><ArrowUpRight size={16} /></Link></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Panel className="lee-enter lee-enter-delay-1">
        <SectionHeading eyebrow="Focus vector" title="Objectives in motion" detail="The few outcomes that currently shape the day." action={<Link href="/objectives" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5" data-testid="link-view-objectives">View all <ArrowUpRight size={14} /></Link>} />
        <div className="space-y-2.5">{activeObjectives.map((objective) => <Link href="/objectives" key={objective.id} className="group flex items-center gap-4 rounded-xl border border-transparent bg-muted/55 px-4 py-3.5 hover:border-primary/20 hover:bg-primary/5" data-testid={`card-home-objective-${objective.id}`}><span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold', objective.priority === 'critical' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground')}>{objective.priority === 'critical' ? '01' : objective.id.slice(-2)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{objective.title}</p><StatusPill status={objective.status} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{objective.description}</p></div><div className="hidden text-right sm:block"><p className="lee-label text-muted-foreground">Confidence</p><p className="mt-1 text-sm font-semibold">{Math.round(objective.confidence * 100)}%</p></div><ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></Link>)}</div>
      </Panel>
      <Panel className="lee-enter lee-enter-delay-2 relative overflow-hidden border-primary/20 bg-primary/[0.06]"><div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-primary/15" /><div className="absolute -right-3 -top-7 h-24 w-24 rounded-full border border-primary/15" /><div className="relative"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={17} /></span><span className="lee-label text-primary">Lee / ready</span></div><h3 className="mt-9 text-2xl font-semibold tracking-tight">Ask the system<br />what it sees.</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Bring a decision, a loose thread, or a question. The answer stays inside this private session.</p><button onClick={onAsk} className="mt-7 flex w-full items-center justify-between rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background hover:-translate-y-0.5" data-testid="button-ask-lee-home"><span>Open Ask Lee</span><ArrowUpRight size={16} /></button></div></Panel>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <Panel className="lee-enter lee-enter-delay-2"><SectionHeading eyebrow="Latest signal" title="Recent events" action={<Link href="/events" className="text-xs font-semibold text-primary hover:underline" data-testid="link-view-events">Inspect log</Link>} /><div className="space-y-0">{EVENTS.slice(0, 4).map((event, index) => <div className="flex gap-3 border-b border-border/70 py-3.5 last:border-0 last:pb-0 first:pt-0" key={event.id}><div className="relative mt-1.5 flex flex-col items-center"><span className={cn('h-2 w-2 rounded-full', index === 0 ? 'bg-primary' : 'bg-muted-foreground/35')} />{index < 3 && <span className="absolute top-3 h-10 w-px bg-border" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{event.eventType.replace('.', ' / ')}</p><p className="mt-1 text-xs text-muted-foreground">{event.sourceRef} · {formatTime(event.occurredAt)}</p></div><span className="lee-label shrink-0 text-muted-foreground">{event.id}</span></div>)}</div></Panel>
      <Panel className="lee-enter lee-enter-delay-3"><SectionHeading eyebrow="Foundation" title="Health at a glance" action={<Link href="/health" className="text-xs font-semibold text-primary hover:underline" data-testid="link-view-health">Full status</Link>} /><div className="space-y-3">{HEALTH.slice(0, 3).map((item) => <div className="flex items-center gap-3" key={item.name}><span className={cn('h-2 w-2 rounded-full', item.status === 'operational' ? 'bg-primary' : 'bg-accent')} /><span className="flex-1 text-sm">{item.name}</span><span className={cn('text-xs', item.status === 'operational' ? 'text-primary' : 'text-muted-foreground')}>{item.status === 'operational' ? 'Nominal' : 'Attention'}</span></div>)}</div><div className="mt-6 rounded-xl bg-muted/60 p-3.5"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Foundation readiness</span><span className="font-semibold text-primary">86 / 100</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[86%] rounded-full bg-primary" /></div></div></Panel>
    </div>
  </div>;
}

function ObjectivesPage() {
  const [objectives, setObjectives] = useState(OBJECTIVES);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ObjectiveStatus>('all');
  const [selectedId, setSelectedId] = useState(OBJECTIVES[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => objectives.filter((item) => (filter === 'all' || item.status === filter) && `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [objectives, query, filter]);
  const selected = objectives.find((item) => item.id === selectedId) ?? filtered[0];
  const markDone = () => { if (!selected) return; setObjectives((items) => items.map((item) => item.id === selected.id ? { ...item, status: 'done', confidence: Math.min(1, item.confidence + .08) } : item)); setNotice('Objective marked complete.'); };
  const addObjective = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const item: Objective = { id: `obj-${Date.now().toString().slice(-3)}`, title: String(form.get('title')), description: String(form.get('description')), status: 'active', priority: String(form.get('priority')) as ObjectivePriority, targetDate: String(form.get('targetDate')), confidence: .5 }; setObjectives((items) => [item, ...items]); setSelectedId(item.id); setCreateOpen(false); setNotice('Objective added to the operating view.'); };
  return <div className="mx-auto max-w-[1280px]">
    <SectionHeading eyebrow="Executive layer" title="Objectives" detail="A small, opinionated set of outcomes. The rest is noise." action={<button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:-translate-y-0.5 hover:opacity-90" data-testid="button-add-objective"><Plus size={15} /> Add objective</button>} />
    {notice && <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" data-testid="status-objective-notice"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice" data-testid="button-dismiss-objective-notice"><X size={15} /></button></div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search objectives" className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="input-search-objectives" /></label><label className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | ObjectiveStatus)} className="h-11 w-full appearance-none rounded-xl border border-input bg-card pl-9 pr-10 text-sm outline-none focus:border-primary sm:w-44" data-testid="select-filter-objectives"><option value="all">All statuses</option><option value="active">Active</option><option value="watch">Watch</option><option value="done">Complete</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} /></label></div>
    <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
      <Panel className="p-3"><div className="flex items-center justify-between px-2 pb-3 pt-1"><span className="lee-label text-muted-foreground">{filtered.length} visible</span><span className="lee-label text-muted-foreground">select to inspect</span></div>{filtered.length ? <div className="space-y-1">{filtered.map((item) => <button onClick={() => setSelectedId(item.id)} className={cn('w-full rounded-xl border px-3.5 py-3.5 text-left', selected?.id === item.id ? 'border-primary/35 bg-primary/8' : 'border-transparent hover:border-border hover:bg-muted/60')} key={item.id} data-testid={`button-select-objective-${item.id}`}><div className="flex items-start gap-3"><span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', item.status === 'active' ? 'bg-primary' : item.status === 'watch' ? 'bg-accent' : 'bg-muted-foreground/40')} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</span><span className="mt-3 flex items-center gap-3"><StatusPill status={item.status} /><span className="lee-label text-muted-foreground">{item.priority} priority</span></span></span><ChevronDown size={15} className={cn('mt-1 -rotate-90 text-muted-foreground transition-transform', selected?.id === item.id && 'text-primary')} /></div></button>)}</div> : <EmptyState title="No objectives match" detail="Try another phrase or broaden the status filter." />}</Panel>
      <Panel>{selected ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.id} / objective</p><h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight">{selected.title}</h3></div><StatusPill status={selected.status} /></div><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">{selected.description}</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Priority</p><p className="mt-2 text-sm font-semibold capitalize">{selected.priority}</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Target date</p><p className="mt-2 text-sm font-semibold">{formatDate(selected.targetDate)}</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Confidence</p><p className="mt-2"><ConfidenceBar value={selected.confidence} /></p></div></div><div className="mt-7 border-t border-border pt-5"><p className="lee-label text-muted-foreground">Operator read</p><p className="mt-2 text-sm leading-relaxed">Momentum is present, but the next proof point should be made explicit before expanding the surface area.</p></div><div className="mt-6 flex flex-wrap gap-2"><button onClick={markDone} disabled={selected.status === 'done'} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-mark-objective-complete"><Check size={15} /> {selected.status === 'done' ? 'Completed' : 'Mark complete'}</button><Link href="/knowledge" className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="link-objective-knowledge"><BookOpen size={15} /> Related knowledge</Link></div></> : <EmptyState title="Select an objective" detail="Choose an objective from the list to inspect its evidence and current read." />}</Panel>
    </div>
    {createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-5 backdrop-blur-sm"><form onSubmit={addObjective} className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl lee-enter" data-testid="form-create-objective"><div className="flex items-center justify-between"><div><p className="lee-label text-primary">New outcome</p><h3 className="mt-1 text-xl font-semibold">Add an objective</h3></div><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close add objective" data-testid="button-close-add-objective"><X size={17} /></button></div><div className="mt-6 space-y-4"><input name="title" required placeholder="What needs to become true?" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-objective-title" /><textarea name="description" required placeholder="Describe the outcome and its proof point." className="min-h-24 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-objective-description" /><div className="grid gap-4 sm:grid-cols-2"><select name="priority" defaultValue="normal" className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-objective-priority"><option value="critical">Critical priority</option><option value="high">High priority</option><option value="normal">Normal priority</option></select><input name="targetDate" type="date" required defaultValue="2025-05-15" className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-objective-date" /></div></div><button className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="button-submit-objective">Create objective</button></form></div>}
  </div>;
}

type InstitutionalKnowledgeItem = {
  id: string;
  statement: string;
  confidence: number;
  confidenceTier: string;
  evidenceCount: number;
  status: string;
  ownerReviewed: boolean;
};

function InstitutionalKnowledgePanel() {
  const [items, setItems] = useState<InstitutionalKnowledgeItem[]>([]);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const response = await fetch('/api/institutional/knowledge');
      if (!response.ok) throw new Error(`Institutional Knowledge request failed (${response.status}).`);
      setItems(await response.json() as InstitutionalKnowledgeItem[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load Institutional Knowledge.');
    }
  };
  useEffect(() => { void load(); }, []);
  const review = async (id: string, approved: boolean) => {
    const response = await fetch(`/api/institutional/knowledge/${id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approved }) });
    if (response.ok) await load();
  };
  return <Panel className="mb-5 border-primary/20 bg-primary/[0.04]"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="lee-label text-primary">Reality-tested knowledge</p><h3 className="mt-1 text-lg font-semibold">Institutional</h3><p className="mt-1 text-sm text-muted-foreground">Lessons promoted only after three independent supporting experiences.</p></div><span className="lee-label text-muted-foreground">{items.length} patterns</span></div>{error && <p className="mt-4 text-xs text-destructive">{error}</p>}{items.length === 0 && !error && <p className="mt-5 text-sm text-muted-foreground">No patterns established yet. Process the event history as experiences accumulate.</p>}<div className="mt-4 grid gap-3 lg:grid-cols-2">{items.map((item) => <div key={item.id} className="rounded-xl border border-border bg-card/80 p-4"><div className="flex items-center justify-between gap-3"><span className="lee-label text-primary">{item.confidenceTier} · {item.status.replace('_', ' ')}</span><span className="text-xs text-muted-foreground">{item.evidenceCount} evidence</span></div><p className="mt-3 text-sm font-medium leading-relaxed">{item.statement}</p><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{Math.round(item.confidence * 100)}% confidence</span>{item.status === 'pending_owner_review' && <span className="flex gap-2"><button onClick={() => void review(item.id, true)} className="font-semibold text-primary hover:underline">Approve</button><button onClick={() => void review(item.id, false)} className="font-semibold text-destructive hover:underline">Reject</button></span>}</div></div>)}</div></Panel>;
}

function KnowledgePage() {
  const [items, setItems] = useState(KNOWLEDGE);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | KnowledgeKind>('all');
  const [selectedId, setSelectedId] = useState(KNOWLEDGE[0].id);
  const [addOpen, setAddOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => items.filter((item) => (kind === 'all' || item.kind === kind) && `${item.statement} ${item.sourceRef}`.toLowerCase().includes(query.toLowerCase())), [items, query, kind]);
  const selected = items.find((item) => item.id === selectedId) ?? filtered[0];
  const refresh = () => { setRefreshing(true); window.setTimeout(() => { setRefreshing(false); setNotice('Evidence index checked · provenance intact.'); }, 800); };
  const addItem = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const item: KnowledgeItem = { id: `kn-${Date.now().toString().slice(-3)}`, kind: String(form.get('kind')) as KnowledgeKind, statement: String(form.get('statement')), sourceRef: String(form.get('sourceRef')), confidence: .5, createdAt: new Date().toISOString(), status: 'evolving' }; setItems((current) => [item, ...current]); setSelectedId(item.id); setAddOpen(false); setNotice('Knowledge item added as evolving evidence.'); };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Memory with receipts" title="Knowledge" detail="Facts, interpretations, assumptions, and anchors — each one carries its origin." action={<div className="flex gap-2"><button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60" data-testid="button-refresh-knowledge"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Checking' : 'Refresh evidence'}</button><button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90" data-testid="button-add-knowledge"><Plus size={15} /> Add item</button></div>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" data-testid="status-knowledge-notice">{notice}</div>}<div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search statements or sources" className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="input-search-knowledge" /></label><select value={kind} onChange={(event) => setKind(event.target.value as 'all' | KnowledgeKind)} className="h-11 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:border-primary" data-testid="select-filter-knowledge"><option value="all">All kinds</option><option value="fact">Facts</option><option value="interpretation">Interpretations</option><option value="assumption">Assumptions</option><option value="anchor">Anchors</option></select></div><div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]"><Panel className="p-3">{filtered.length ? <div className="space-y-1">{filtered.map((item) => <button onClick={() => setSelectedId(item.id)} key={item.id} className={cn('w-full rounded-xl border px-4 py-3.5 text-left', selected?.id === item.id ? 'border-primary/35 bg-primary/8' : 'border-transparent hover:border-border hover:bg-muted/60')} data-testid={`button-select-knowledge-${item.id}`}><div className="flex items-start gap-3"><span className="lee-label mt-1 w-20 shrink-0 text-primary">{item.kind}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-relaxed">{item.statement}</span><span className="mt-2 block text-xs text-muted-foreground">{item.sourceRef}</span></span><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60" /></div></button>)}</div> : <EmptyState title="No evidence found" detail="This view is intentionally quiet. Try a different kind or search phrase." />}</Panel><Panel>{selected ? <><div className="flex items-center justify-between"><span className="lee-label text-primary">{selected.kind} / {selected.id}</span><StatusPill status={selected.status} /></div><p className="mt-6 text-xl font-medium leading-relaxed tracking-tight">{selected.statement}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Source reference</p><p className="mt-2 text-sm font-medium">{selected.sourceRef}</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Captured</p><p className="mt-2 text-sm font-medium">{formatDate(selected.createdAt)}</p></div></div><div className="mt-6 flex items-center justify-between border-t border-border pt-5"><span className="text-xs text-muted-foreground">Confidence signal</span><ConfidenceBar value={selected.confidence} /></div></> : <EmptyState title="Select an item" detail="Choose evidence from the left to inspect its provenance." />}</Panel></div>{addOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-5 backdrop-blur-sm"><form onSubmit={addItem} className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl lee-enter" data-testid="form-create-knowledge"><div className="flex items-center justify-between"><div><p className="lee-label text-primary">Capture evidence</p><h3 className="mt-1 text-xl font-semibold">Add knowledge</h3></div><button type="button" onClick={() => setAddOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-add-knowledge"><X size={17} /></button></div><div className="mt-6 space-y-4"><select name="kind" defaultValue="fact" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-new-knowledge-kind"><option value="fact">Fact</option><option value="interpretation">Interpretation</option><option value="assumption">Assumption</option><option value="anchor">Anchor</option></select><textarea name="statement" required placeholder="What should LEE remember?" className="min-h-28 w-full resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-knowledge-statement" /><input name="sourceRef" required placeholder="Source reference · e.g. founder note" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="input-knowledge-source" /></div><button className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="button-submit-knowledge">Save as evolving</button></form></div>}</div>;
}

function EventsPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => EVENTS.filter((event) => (type === 'all' || event.aggregateType === type) && `${event.eventType} ${event.aggregateId} ${event.sourceRef}`.toLowerCase().includes(query.toLowerCase())), [query, type]);
  const exportLog = () => { setNotice('Append-only log prepared locally · 5 events selected.'); window.setTimeout(() => setNotice(''), 3000); };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Append-only record" title="Event history" detail="A chronological trail of meaningful changes across the operating layer." action={<button onClick={exportLog} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-export-events"><FileText size={14} /> Export log</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" data-testid="status-event-notice">{notice}</div>}<Panel><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event type, source, or aggregate" className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="input-search-events" /></label><select value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-filter-events"><option value="all">All aggregates</option><option value="objective">Objectives</option><option value="knowledge">Knowledge</option><option value="service">Services</option><option value="brief">Briefs</option><option value="access">Access</option></select></div>{filtered.length ? <div className="overflow-x-auto"><div className="min-w-[680px]"><div className="grid grid-cols-[1.3fr_.7fr_.8fr_1fr] gap-4 border-b border-border px-3 pb-3"><span className="lee-label text-muted-foreground">Event</span><span className="lee-label text-muted-foreground">Aggregate</span><span className="lee-label text-muted-foreground">Occurred</span><span className="lee-label text-muted-foreground">Source</span></div>{filtered.map((event) => <div className="group grid grid-cols-[1.3fr_.7fr_.8fr_1fr] items-center gap-4 border-b border-border/70 px-3 py-4 last:border-0 hover:bg-muted/50" key={event.id} data-testid={`row-event-${event.id}`}><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><GitBranch size={14} /></span><div><p className="text-sm font-medium">{event.eventType}</p><p className="lee-label mt-1 text-muted-foreground">{event.id}</p></div></div><div><p className="text-xs font-medium capitalize">{event.aggregateType}</p><p className="lee-label mt-1 text-muted-foreground">{event.aggregateId}</p></div><p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)} · {formatTime(event.occurredAt)}</p><p className="truncate text-xs text-muted-foreground">{event.sourceRef}</p></div>)}</div></div> : <EmptyState title="The log is quiet here" detail="No append-only events match this filter." />}</Panel></div>;
}

function HealthPage() {
  const [items, setItems] = useState(HEALTH);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const runChecks = () => { setChecking(true); setNotice(''); window.setTimeout(() => { setItems((current) => current.map((item) => ({ ...item, lastChecked: 'just now' }))); setChecking(false); setNotice('Checks complete · one connector still needs attention.'); }, 900); };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="System posture" title="Health & readiness" detail="A calm view of whether the foundation can be trusted right now." action={<button onClick={runChecks} disabled={checking} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60" data-testid="button-run-health-checks"><RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> {checking ? 'Running checks' : 'Run checks'}</button>} />{notice && <div className="mb-4 rounded-xl border border-accent/35 bg-accent/15 px-4 py-3 text-sm" data-testid="status-health-notice">{notice}</div>}<div className="grid gap-5 md:grid-cols-3"><Panel className="md:col-span-2"><div className="flex items-start justify-between"><div><p className="lee-label text-primary">Readiness score</p><p className="mt-3 lee-display text-5xl font-bold">86<span className="text-2xl text-muted-foreground">/100</span></p><p className="mt-2 text-sm text-muted-foreground">Safe for daily operation with one degraded edge.</p></div><div className="relative grid h-20 w-20 place-items-center rounded-full border-[7px] border-primary/20"><div className="absolute inset-0 rounded-full border-[7px] border-transparent border-l-primary border-t-primary rotate-[35deg]" /><ShieldCheck className="text-primary" size={24} /></div></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[86%] rounded-full bg-primary" /></div><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>Foundation ready</span><span>1 attention item</span></div></Panel><Panel><p className="lee-label text-primary">Readiness gates</p><div className="mt-5 space-y-4"><div className="flex gap-3"><Database className="shrink-0 text-primary" size={17} /><div><p className="text-sm font-medium">Data integrity</p><p className="mt-1 text-xs text-muted-foreground">Passed · 100%</p></div></div><div className="flex gap-3"><KeyRound className="shrink-0 text-primary" size={17} /><div><p className="text-sm font-medium">Private access</p><p className="mt-1 text-xs text-muted-foreground">Founder session verified</p></div></div><div className="flex gap-3"><Zap className="shrink-0 text-accent" size={17} /><div><p className="text-sm font-medium">Connectors</p><p className="mt-1 text-xs text-muted-foreground">1 degraded edge</p></div></div></div></Panel></div><div className="mt-5"><Panel><div className="mb-4 flex items-center justify-between"><div><p className="lee-label text-primary">Service detail</p><h3 className="mt-1 text-lg font-semibold">Foundation components</h3></div><span className="lee-label text-muted-foreground">{items.length} checks</span></div><div className="divide-y divide-border">{items.map((item) => <div className="flex flex-col gap-3 py-4 first:pt-1 sm:flex-row sm:items-center" key={item.name} data-testid={`row-health-${item.name.toLowerCase().replace(/\s/g, '-')}`}><span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', item.status === 'operational' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-foreground')}>{item.name === 'Local session' ? <LockKeyhole size={16} /> : item.name === 'Knowledge index' ? <Network size={16} /> : item.name === 'GitHub connector' ? <GitBranch size={16} /> : <Server size={16} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.name}</p><StatusPill status={item.status} /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p></div><p className="lee-label shrink-0 text-muted-foreground">Checked {item.lastChecked}</p></div>)}</div></Panel></div></div>;
}

function SettingsPage({ onLock }: { onLock: () => void }) {
  const [notifications, setNotifications] = useState(true);
  const [briefs, setBriefs] = useState(true);
  const [notice, setNotice] = useState('');
  return <div className="mx-auto max-w-[960px]"><SectionHeading eyebrow="Boundaries & preferences" title="Settings" detail="The quiet controls behind a private operating console." /><div className="space-y-5"><Panel><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck size={23} /></div><div className="flex-1"><p className="lee-label text-primary">Private access</p><h3 className="mt-1 text-lg font-semibold">Founder session is active</h3><p className="mt-1 text-sm text-muted-foreground">This console has no invited members and no public share surface.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Verified</span></div></Panel><Panel><div className="flex items-center gap-3"><Settings2 className="text-primary" size={18} /><div><p className="lee-label text-primary">Session preferences</p><h3 className="mt-1 text-lg font-semibold">How Lee should meet you</h3></div></div><div className="mt-5 divide-y divide-border"><SettingToggle title="Opening brief" detail="Prepare the daily signal when the console opens." value={briefs} onChange={() => setBriefs(!briefs)} testId="toggle-opening-brief" /><SettingToggle title="Quiet system notices" detail="Show meaningful state changes without interrupting the work surface." value={notifications} onChange={() => setNotifications(!notifications)} testId="toggle-system-notices" /></div></Panel><Panel><div className="flex items-center gap-3"><Clock3 className="text-primary" size={18} /><div><p className="lee-label text-primary">Current session</p><h3 className="mt-1 text-lg font-semibold">Local session-22</h3></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Started</p><p className="mt-2 text-sm font-semibold">Today, 07:28</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Location</p><p className="mt-2 text-sm font-semibold">Founder device</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Access</p><p className="mt-2 text-sm font-semibold">Full console</p></div></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setNotice('Other sessions revoked. This device remains active.')} className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-revoke-sessions">Revoke other sessions</button><button onClick={onLock} className="rounded-xl border border-destructive/30 px-3.5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10" data-testid="button-lock-console-settings">Lock console</button></div>{notice && <p className="mt-4 text-xs text-primary" data-testid="status-settings-notice">{notice}</p>}</Panel></div></div>;
}

type OperationalReview = {
  id: string;
  cadence: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  summaryNarrative: string;
  sections: Record<string, { narrative?: string; sourceRefs?: string[]; [key: string]: unknown }>;
  sourceRefs: string[];
  keyThemes: string[];
  generatedAt: string;
};

function ReviewsPage() {
  const [reviews, setReviews] = useState<OperationalReview[]>([]);
  const [selected, setSelected] = useState<OperationalReview | null>(null);
  const [cadence, setCadence] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reviews${cadence === 'all' ? '' : `?cadence=${cadence}`}`);
      if (!response.ok) throw new Error(`Reviews request failed (${response.status}).`);
      const data = await response.json() as OperationalReview[];
      setReviews(data);
      if (selected) {
        const refreshed = data.find((review) => review.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load operational reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReviews(); }, [cadence]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    setNotice('');
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (cadence === 'annual' ? 365 : cadence === 'quarterly' ? 90 : cadence === 'monthly' ? 30 : 7));
    try {
      const response = await fetch('/api/reviews/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cadence: cadence === 'all' ? 'weekly' : cadence, periodStart: start.toISOString(), periodEnd: end.toISOString() }),
      });
      if (!response.ok) throw new Error(`Review generation failed (${response.status}).`);
      const review = await response.json() as OperationalReview;
      setSelected(review);
      setNotice('Review generated and stored permanently.');
      await loadReviews();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate an operational review.');
    } finally {
      setGenerating(false);
    }
  };

  return <div className="mx-auto max-w-[1280px]">
    <SectionHeading eyebrow="Institutional history" title="Operational reviews" detail="Permanent retrospectives grounded in events, objectives, and assumptions." action={<div className="flex gap-2"><select value={cadence} onChange={(event) => setCadence(event.target.value)} className="rounded-xl border border-input bg-card px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary" aria-label="Filter reviews by cadence"><option value="all">All cadences</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select><button onClick={() => void generate()} disabled={generating} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" data-testid="button-generate-review"><Sparkles size={14} /> {generating ? 'Generating…' : 'Generate review'}</button></div>} />
    {notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">{notice}</div>}
    {error && <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}<button onClick={() => void loadReviews()} className="ml-3 font-semibold underline">Retry</button></div>}
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <Panel>
        <div className="mb-4 flex items-center justify-between"><div><p className="lee-label text-primary">Archive</p><h3 className="mt-1 text-lg font-semibold">Review history</h3></div><span className="lee-label text-muted-foreground">{reviews.length} stored</span></div>
        {loading ? <SkeletonRows /> : reviews.length === 0 ? <EmptyState title="No reviews yet" detail="Generate the first retrospective to begin LEE's institutional history." /> : <div className="space-y-2">{reviews.map((review) => <button key={review.id} onClick={() => setSelected(review)} className={cn('w-full rounded-xl border px-4 py-3 text-left transition-colors', selected?.id === review.id ? 'border-primary/35 bg-primary/10' : 'border-transparent bg-muted/55 hover:border-primary/20')}><div className="flex items-center justify-between gap-3"><span className="lee-label text-primary">{review.cadence}</span><span className="text-[11px] text-muted-foreground">{formatDate(review.generatedAt)}</span></div><p className="mt-2 text-sm font-semibold">{review.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{review.summaryNarrative}</p></button>)}</div>}
      </Panel>
      <Panel>
        {!selected ? <EmptyState title="Select a review" detail="Choose a retrospective from the archive to inspect its narrative and evidence sections." /> : <div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.cadence} · {formatDate(selected.periodStart)} — {formatDate(selected.periodEnd)}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{selected.title}</h3></div><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><CircleCheck size={13} /> Stored</span></div><div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.06] p-4"><p className="lee-label text-primary">Summary narrative</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{selected.summaryNarrative}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(selected.sections).map(([key, section]) => <div key={key} className="rounded-xl bg-muted/55 p-4"><p className="lee-label text-muted-foreground">{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}</p>{section.narrative && <p className="mt-2 text-sm leading-relaxed">{section.narrative}</p>}<p className="mt-2 text-xs text-muted-foreground">{section.sourceRefs?.length ?? 0} source references</p></div>)}</div><div className="mt-5 border-t border-border pt-4"><p className="lee-label text-muted-foreground">Key themes</p><div className="mt-2 flex flex-wrap gap-2">{selected.keyThemes.map((theme) => <span key={theme} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{theme}</span>)}</div><p className="mt-4 text-xs text-muted-foreground">{selected.sourceRefs.length} event/objective references indexed in the Intelligence Graph.</p></div></div>}
      </Panel>
    </div>
  </div>;
}

function SettingToggle({ title, detail, value, onChange, testId }: { title: string; detail: string; value: boolean; onChange: () => void; testId: string }) {
  return <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><button onClick={onChange} role="switch" aria-checked={value} className={cn('relative h-6 w-11 shrink-0 rounded-full', value ? 'bg-primary' : 'bg-secondary')} data-testid={testId}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm', value ? 'left-6' : 'left-1')} /></button></div>;
}

function AskDialog({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (question.trim()) setSubmitted(true); };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-5 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl border border-card-border bg-card p-6 shadow-2xl lee-enter" role="dialog" aria-modal="true" data-testid="dialog-ask-lee"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><BrainCircuit size={19} /></span><div><p className="lee-label text-primary">Private reasoning surface</p><h2 className="mt-1 text-xl font-semibold">Ask Lee</h2></div></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-ask-lee"><X size={17} /></button></div>{submitted ? <div className="mt-7 rounded-xl border border-primary/25 bg-primary/10 p-5"><div className="flex items-center gap-2 text-primary"><CircleCheck size={17} /><p className="text-sm font-semibold">Question held for the private session.</p></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">LEE will ground the response in current objectives, evidence, and system state. This first pass keeps the interaction local.</p><button onClick={() => { setSubmitted(false); setQuestion(''); }} className="mt-4 text-xs font-semibold text-primary hover:underline" data-testid="button-ask-another">Ask another question</button></div> : <form onSubmit={submit}><p className="mt-6 text-sm leading-relaxed text-muted-foreground">What deserves a sharper read right now?</p><textarea autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about an objective, a signal, or a decision..." className="mt-4 min-h-32 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="textarea-ask-lee" /><div className="mt-4 flex items-center justify-between"><span className="lee-label text-muted-foreground">Private · founder context only</span><button type="submit" disabled={!question.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-submit-ask-lee">Send to Lee <ArrowUpRight size={14} /></button></div></form>}</div></div>;
}

function LockedScreen({ onUnlock }: { onUnlock: () => void }) {
  return <div className="lee-noise grid min-h-[100dvh] place-items-center bg-sidebar p-5 text-sidebar-foreground"><div className="max-w-md text-center lee-enter"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><LockKeyhole size={25} /></span><p className="lee-label mt-7 text-sidebar-primary">Console locked</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Private state is protected.</h1><p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/60">The founder session is still here. Unlock locally to return to the operating view.</p><button onClick={onUnlock} className="mt-7 rounded-xl bg-sidebar-primary px-5 py-3 text-sm font-semibold text-sidebar-primary-foreground hover:opacity-90" data-testid="button-unlock-console">Unlock local session</button></div></div>;
}

function Router({ onAsk, onLock }: { onAsk: () => void; onLock: () => void }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><Switch><Route path="/" component={() => <HomePage onAsk={onAsk} />} /><Route path="/objectives" component={ObjectivesPage} /><Route path="/knowledge" component={KnowledgePage} /><Route path="/institutional" component={() => <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Knowledge layer" title="Institutional Knowledge" detail="Operational patterns reality has reinforced across independent experiences." /><InstitutionalKnowledgePanel /></div>} /><Route path="/events" component={EventsPage} /><Route path="/reviews" component={ReviewsPage} /><Route path="/health" component={HealthPage} /><Route path="/settings" component={() => <SettingsPage onLock={onLock} />} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  const [askOpen, setAskOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>{locked ? <LockedScreen onUnlock={() => setLocked(false)} /> : <Router onAsk={() => setAskOpen(true)} onLock={() => setLocked(true)} />}{askOpen && !locked && <AskDialog onClose={() => setAskOpen(false)} />}</WouterRouter></TooltipProvider><Toaster /></QueryClientProvider>;
}

export default App;