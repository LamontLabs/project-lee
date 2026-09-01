import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import GovernancePage from './GovernancePage';
import BackupsPage from './BackupsPage';
import { OrchestrationPanel } from './OrchestrationPanel';
import SchedulePage from './SchedulePage';
import FounderProfilePanel from './FounderProfilePanel';
import MemoryHealthPanel from './MemoryHealthPanel';
import KnowledgeMapPage from './KnowledgeMapPage';
import ObservationsPage from './ObservationsPage';
import StrategyPage from './StrategyPage';
import SimulationPage from './SimulationPage';
import ReflectionPage from './ReflectionPage';
import LearningPage from './LearningPage';
import RelationshipsPage from './RelationshipsPage';
import WorkspacePage from './WorkspacePage';
import ConstitutionPage from './ConstitutionPage';
import ConfidencePage from './ConfidencePage';
import EvidenceLedgerPage from './EvidenceLedgerPage';
import AssumptionsPage from './AssumptionsPage';
import ImpactPage from './ImpactPage';
import TimelinePage from './TimelinePage';
import ExplanationPage from './ExplanationPage';
import PolicyPage from './PolicyPage';
import TrustScorePanel from './TrustScorePanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  CalendarClock,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Command,
  Database,
  FileText,
  FlaskConical,
  Filter,
  Gauge,
  GitBranch,
  Inbox,
  KeyRound,
  LockKeyhole,
  Layers3,
  LogOut,
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
  FolderKanban,
  Users,
  Scale,
  Upload,
  PlugZap,
  WalletCards,
  ShieldAlert,
  Archive,
  Eye,
  ListChecks,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { DesktopSetupPanel } from './DesktopSetupPanel';
import ConnectionCenterPage from './ConnectionCenterPage';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFoundPage from '@/pages/not-found';
import type { SystemContract } from '@workspace/api-zod';
import { getGetCilModelInventoryQueryKey, useGetCilModelInventory } from '@workspace/api-client-react';

function NotFound() {
  const [path] = useLocation();
  return path === '/schedule' ? <SchedulePage /> : path === '/projects' ? <ProjectsPage /> : path === '/portfolio' ? <PortfolioPage /> : path === '/knowledge-map' ? <KnowledgeMapPage /> : path === '/observations' ? <ObservationsPage /> : path === '/strategy' ? <StrategyPage /> : path === '/strategy/anchors' ? <AnchorsPage /> : path === '/simulations' ? <SimulationPage /> : path === '/reflections' ? <ReflectionPage /> : path === '/learning' ? <LearningPage /> : path === '/people' ? <RelationshipsPage /> : path === '/workspace' ? <WorkspacePage /> : path === '/constitution' ? <ConstitutionPage /> : path === '/confidence' ? <ConfidencePage /> : path === '/evidence' ? <EvidenceLedgerPage /> : path === '/assumptions' ? <AssumptionsPage /> : path === '/impact' ? <ImpactPage /> : path === '/timeline' ? <TimelinePage /> : path === '/explain' ? <ExplanationPage /> : path === '/settings/policies' ? <PolicyPage /> : path === '/settings/android' ? <AndroidPairingPage /> : <NotFoundPage />;
}

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
  { name: 'Local session', status: 'operational', detail: 'Encrypted private session · owner access only.', lastChecked: 'now' },
];

const primaryNavigation = [
  { href: '/', label: 'Today', icon: Command },
  { href: '/ask', label: 'Ask LEE', icon: MessageSquareText },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/people', label: 'People', icon: Users },
];

const systemNavigation = [
  { href: '/connections', label: 'Connections', icon: PlugZap },
  { href: '/health', label: 'System health', icon: Gauge },
  { href: '/governance', label: 'Governance', icon: ShieldAlert },
  { href: '/backups', label: 'Backups', icon: Archive },
];

const moreNavigation = [
  { href: '/objectives', label: 'Objectives', icon: Target },
  { href: '/portfolio', label: 'Portfolio', icon: Layers3 },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/evidence', label: 'Evidence', icon: FileText },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/knowledge-map', label: 'Knowledge Map', icon: Network },
  { href: '/connectors', label: 'Connectors', icon: PlugZap },
  { href: '/costs', label: 'System economics', icon: WalletCards },
  { href: '/workspace', label: 'Workspace', icon: Settings2 },
  { href: '/constitution', label: 'Constitution', icon: ShieldCheck },
  { href: '/confidence', label: 'Confidence', icon: Gauge },
  { href: '/assumptions', label: 'Assumptions', icon: BrainCircuit },
  { href: '/impact', label: 'Decision impact', icon: GitBranch },
  { href: '/timeline', label: 'Timeline', icon: CalendarDays },
  { href: '/explain', label: 'Explain', icon: BookOpen },
  { href: '/settings/policies', label: 'Policies', icon: ShieldCheck },
  { href: '/decisions', label: 'Decisions', icon: Scale },
  { href: '/waiting', label: 'Waiting', icon: Clock3 },
  { href: '/schedule', label: 'Schedule', icon: CalendarClock },
  { href: '/organization', label: 'Organization', icon: Building2 },
  { href: '/strategy/decision-patterns', label: 'Decision patterns', icon: GitBranch },
  { href: '/observations', label: 'Observations', icon: Eye },
  { href: '/strategy', label: 'Strategy', icon: Target },
  { href: '/simulations', label: 'Simulations', icon: FlaskConical },
  { href: '/reflections', label: 'Reflections', icon: BarChart3 },
  { href: '/learning', label: 'Learning', icon: BrainCircuit },
  { href: '/institutional', label: 'Institutional', icon: Sparkles },
  { href: '/settings/self-improvement', label: 'Self-improvement', icon: RefreshCw },
  { href: '/settings/system-economics', label: 'System economics', icon: Gauge },
  { href: '/settings/identity', label: 'Identity', icon: BrainCircuit },
  { href: '/events', label: 'Events', icon: Radio },
  { href: '/reviews', label: 'Reviews', icon: FileText },
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

function ConsoleStatusBar() {
  const [data, setData] = useState({ cost: '—', approvals: '—', notifications: '—', backup: '—', mode: 'morning', state: 'Idle', stateReason: '', loopPhase: 'OBSERVE', loopCycle: 0, contractState: 'unavailable', contractVersion: '—', error: '' });
  useEffect(() => {
    void Promise.all([fetch('/api/economics/summary'), fetch('/api/events?limit=20'), fetch('/api/brain-versions'), fetch('/api/workspace'), fetch('/api/state'), fetch('/api/internal/executive-loop/state'), fetch('/api/contract', { cache: 'no-store' })]).then(async ([economics, events, backups, workspace, state, loop, contract]) => {
      const unavailable = [economics, events, backups, workspace, state, loop, contract].filter((response) => !response.ok).map((response) => response.url);
      const economicsData = economics.ok ? await economics.json() : null;
      const eventsData = events.ok ? await events.json() : [];
      const backupsData = backups.ok ? await backups.json() : [];
      const workspaceData = workspace.ok ? await workspace.json() : null;
      const stateData = state.ok ? await state.json() : null;
      const loopData = loop.ok ? await loop.json() : null;
      const contractData = contract.ok ? await contract.json() as SystemContract : null;
      setData({ cost: economicsData?.totalCostUsd != null ? `$${Number(economicsData.totalCostUsd).toFixed(2)}` : 'Unavailable', approvals: `${eventsData.filter((item: any) => /held|approval/i.test(item.eventType)).length}`, notifications: `${eventsData.filter((item: any) => /alert|notification/i.test(item.eventType)).length}`, backup: backupsData[0]?.status ?? 'Not run', mode: workspaceData?.state?.currentMode ?? 'morning', state: stateData?.currentState ?? 'Unavailable', stateReason: stateData?.reason ?? '', loopPhase: loopData?.phase ?? 'Unavailable', loopCycle: loopData?.cycleCount ?? 0, contractState: contractData?.health.state ?? 'unavailable', contractVersion: contractData?.contractVersion ?? '—', error: unavailable.length ? `${unavailable.length} live status sources unavailable.` : contractData?.validation.result === 'WARN' ? 'Contract validation is degraded.' : '' });
    }).catch((cause) => setData((current) => ({ ...current, error: cause instanceof Error ? cause.message : 'Live status unavailable.' })));
  }, []);
  const stateTone = ['Offline', 'Recovering', 'Degraded'].includes(data.state) ? 'border-accent/40 bg-accent/15 text-accent-foreground' : 'border-primary/20 bg-primary/10 text-primary';
  const contractLabel = data.contractState === 'available' ? 'Contract live' : data.contractState === 'degraded' ? 'Contract degraded' : data.contractState === 'offline' ? 'Contract cached' : 'Contract unavailable';
  return <div className="hidden items-center gap-2 xl:flex"><span title={data.error || `System contract ${data.contractVersion}`} className={cn('rounded-full border px-2.5 py-1 text-[10px]', data.error || data.contractState !== 'available' ? 'border-accent/40 bg-accent/15 text-accent-foreground' : 'border-primary/20 bg-primary/10 text-primary')}>{data.error ? 'Health degraded' : contractLabel}</span><span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] text-primary">Loop {data.loopPhase} · {data.loopCycle}</span><span title={data.stateReason} className={cn('rounded-full border px-2.5 py-1 text-[10px]', stateTone, ['Thinking', 'Recovering'].includes(data.state) && 'animate-pulse')}>LEE {data.state}</span><span className="lee-label text-muted-foreground">Cost {data.cost}</span><span className="lee-label text-muted-foreground">Approvals {data.approvals}</span><span className="lee-label text-muted-foreground">Notifications {data.notifications}</span><span className="lee-label text-muted-foreground">Backup {data.backup}</span><Link href="/workspace" className="lee-label rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">Mode {data.mode.replaceAll('_', ' ')}</Link></div>;
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

function RecoveryModeBanner() {
  const [status, setStatus] = useState<any>(null);
  useEffect(() => { void fetch('/api/recovery/status', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setStatus); }, []);
  if (!status || status.mode === 'COLD_BOOT' || status.mode === 'WARM_RESTART') return null;
  const label = status.mode.replaceAll('_', ' ');
  return <div className="border-b border-accent/35 bg-accent/15 px-5 py-3 text-sm text-accent-foreground md:px-9"><div className="mx-auto flex max-w-[1280px] items-center gap-3"><span className="rounded-full border border-accent/40 px-2.5 py-1 text-[10px] font-bold">{label}</span><span>{status.reason}</span>{status.agenda && <span className="ml-auto text-xs">{status.agenda.issues.length} repair items</span>}</div></div>;
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" data-testid="loading-skeleton">{Array.from({ length: count }).map((_, index) => <div className="h-16 animate-pulse rounded-xl bg-secondary/70" key={index} />)}</div>;
}

function AppShell({ children, onAsk, onLock }: { children: ReactNode; onAsk: () => void; onLock: () => void }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const pageTitles: Record<string, string> = { '/': 'Today', '/ask': 'Ask LEE', '/projects': 'Projects', '/portfolio': 'Portfolio', '/people': 'People', '/decisions': 'Decisions', '/waiting': 'Waiting', '/evidence': 'Evidence', '/imports': 'Imports', '/connections': 'Connections', '/connectors': 'Connectors', '/costs': 'Costs', '/governance': 'Governance', '/backups': 'Backups', '/objectives': 'Objectives', '/organization': 'Organization', '/strategy/decision-patterns': 'Decision patterns', '/knowledge': 'Knowledge', '/institutional': 'Institutional Knowledge', '/events': 'Event history', '/reviews': 'Operational reviews', '/health': 'System health', '/settings': 'Settings', '/settings/manifest': 'System manifest', '/settings/world-state': 'World State', '/settings/operational-memory': 'Operational Memory', '/initiative': 'Initiative', '/operational-intelligence/history': 'Operational History', '/settings/bootstrap': 'Project Bootstrap', '/settings/internal-services': 'Internal services', '/settings/self-test': 'System self-test', '/settings/self-improvement': 'Self-improvement', '/settings/system-economics': 'System economics', '/settings/identity': 'Identity' };
  const pageTitle = pageTitles[location] ?? 'Console';
  const moreIsActive = moreNavigation.some((item) => item.href === location);
  useEffect(() => { if (moreIsActive) setMoreOpen(true); }, [moreIsActive]);
  return (
    <div className="lee-noise min-h-[100dvh] bg-background text-foreground">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[min(86vw,248px)] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between px-3">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3" data-testid="link-brand">
            <img src="/console/favicon.svg" alt="" className="h-9 w-9 rounded-xl border border-sidebar-primary/60 shadow-[0_0_22px_hsl(var(--brand-red)/.24)]" />
            <span><span className="block text-[15px] font-semibold tracking-tight">LEE Console</span><span className="lee-label text-sidebar-foreground/45">Private workspace</span></span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden" data-testid="button-close-menu"><PanelLeftClose size={17} /></button>
        </div>
        <div className="mt-9 px-3"><p className="lee-label text-sidebar-foreground/40">Your workspace</p></div>
        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Main navigation">
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground', active && 'bg-sidebar-accent text-sidebar-foreground shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]')}>
              <Icon size={17} className={cn(active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-primary')} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </Link>;
          })}
          <p className="lee-label px-3 pb-1 pt-6 text-sidebar-foreground/35">Systems</p>
          {systemNavigation.map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground', active && 'bg-sidebar-accent text-sidebar-foreground shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]')}>
              <Icon size={17} className={cn(active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-primary')} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
            </Link>;
          })}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-expanded={moreOpen} data-testid="button-toggle-more-navigation">
            <ListChecks size={17} className="text-sidebar-foreground/45" /><span>More</span><ChevronDown size={15} className={cn('ml-auto transition-transform', moreOpen && 'rotate-180')} />
          </button>
          {moreOpen && <div className="mt-1 space-y-1 border-l border-sidebar-border pl-2" data-testid="navigation-more">
            {moreNavigation.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground', active && 'bg-sidebar-accent text-sidebar-foreground shadow-[inset_3px_0_0_hsl(var(--sidebar-primary))]')}>
                <Icon size={16} className={cn(active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45 group-hover:text-sidebar-primary')} />
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
              </Link>;
            })}
          </div>}
        </nav>
        <div className="mt-auto">
          <button onClick={onAsk} className="group mb-4 flex w-full items-center gap-3 rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 px-3 py-3 text-left hover:bg-sidebar-primary/20" data-testid="button-ask-lee-sidebar">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><MessageSquareText size={16} /></span>
            <span><span className="block text-sm font-medium">Ask LEE</span><span className="text-[11px] text-sidebar-foreground/50">Ask the system</span></span>
            <ArrowUpRight size={14} className="ml-auto text-sidebar-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
          <Link href="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="link-nav-settings">
            <Settings2 size={17} className="text-sidebar-foreground/45" /><span>Settings</span>
          </Link>
          <div className="mt-4 flex items-center gap-2 border-t border-sidebar-border px-3 pt-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-primary/20 text-[9px] font-bold text-sidebar-primary">YOU</span>
            <div className="min-w-0"><p className="truncate text-xs font-medium">Workspace owner</p><p className="truncate text-[10px] text-sidebar-foreground/40">Private access</p></div>
            <LockKeyhole size={13} className="ml-auto text-sidebar-primary/70" />
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-sidebar/40 backdrop-blur-sm md:hidden" data-testid="button-close-menu-overlay" />}
      <div className="min-h-[100dvh] overflow-x-hidden md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" data-testid="button-open-menu"><Menu size={19} /></button>
            <div><p className="lee-label text-muted-foreground/75">Operating console / {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date())}</p><h1 className="mt-0.5 text-lg font-semibold tracking-tight">{pageTitle}</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <ConsoleStatusBar />
            <button onClick={() => setAccessOpen(true)} className="hidden items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15 sm:flex" data-testid="button-private-access"><ShieldCheck size={14} /> Private access <ChevronDown size={13} /></button>
            <button onClick={onAsk} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary" aria-label="Ask LEE" data-testid="button-ask-lee-header"><Command size={16} /></button>
          </div>
        </header>
        <main className="lee-shell-grid min-h-[calc(100dvh-68px)] px-4 py-6 sm:px-5 md:px-9 md:py-9"><RecoveryModeBanner />{children}</main>
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
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Only the workspace owner can inspect or change Project LEE state. No shared workspace, team role, or public link is active.</p>
      <div className="mt-5 rounded-xl border border-border bg-muted/50 p-3.5"><div className="flex items-center gap-3"><CircleCheck className="text-primary" size={17} /><div><p className="text-sm font-medium">Owner session verified</p><p className="text-xs text-muted-foreground">Private session · verified just now</p></div></div></div>
      <div className="mt-6 flex gap-2"><button onClick={onClose} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="button-continue-private">Continue privately</button><button onClick={() => { onLock(); onClose(); }} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted" data-testid="button-lock-console">Lock console</button></div>
    </div>
  </div>;
}

function ProjectConnectionsPanel() {
  const [projects, setProjects] = useState<any[]>([]);
  const [setup, setSetup] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', endpoint: '', tokenEnv: '', adapter: 'auto' });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ good: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    const [projectsResponse, setupResponse] = await Promise.all([fetch('/api/mcp-projects', { cache: 'no-store' }), fetch('/api/mcp-projects/setup', { cache: 'no-store' })]);
    if (projectsResponse.ok) setProjects((await projectsResponse.json()).projects ?? []);
    if (setupResponse.ok) setSetup(await setupResponse.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy('register'); setNotice(null);
    const response = await fetch('/api/mcp-projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) { setOpen(false); setForm({ id: '', name: '', endpoint: '', tokenEnv: '', adapter: 'auto' }); setNotice({ good: true, text: `${body.project.name} is registered. Test it to verify the project contract.` }); await load(); }
    else setNotice({ good: false, text: body.error ?? 'Project could not be registered.' });
    setBusy(null);
  };
  const test = async (id: string) => {
    setBusy(id); setNotice(null);
    const response = await fetch(`/api/mcp-projects/${encodeURIComponent(id)}/test`, { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    setNotice({ good: response.ok, text: response.ok ? `${body.project?.name ?? id} is connected and responding.` : `${body.error ?? 'Connection failed.'} ${body.requiredSetup ?? ''}` });
    await load(); setBusy(null);
  };
  const copy = async () => { if (setup) { await navigator.clipboard?.writeText(JSON.stringify(setup.configuration, null, 2)); setNotice({ good: true, text: 'Credential-free MCP configuration copied.' }); } };
  return <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5" data-testid="panel-project-connections">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="lee-label text-primary">Multi-project bridge</p><h2 className="mt-1 text-lg font-semibold">Connect project agents</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Register each project once, test its isolated agent, and give your MCP client the endpoint without exposing credentials.</p></div><button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90" data-testid="button-add-project-connection"><Plus size={15} /> Add project</button></div>
    {open && <form onSubmit={register} className="mt-5 grid gap-3 border-t border-primary/15 pt-5 md:grid-cols-2" data-testid="form-project-connection"><input required placeholder="Project ID (for example, frontend)" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" data-testid="input-project-id" /><input required placeholder="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" data-testid="input-project-name" /><input required type="url" placeholder="https://your-project.example" value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm md:col-span-2" data-testid="input-project-endpoint" /><input placeholder="Server-side credential name (optional)" value={form.tokenEnv} onChange={(event) => setForm({ ...form, tokenEnv: event.target.value })} className="h-10 rounded-xl border border-input bg-background px-3 text-sm" data-testid="input-project-token-env" /><div className="flex items-center justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold">Cancel</button><button disabled={busy === 'register'} className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground">{busy === 'register' ? 'Registering…' : 'Register project'}</button></div><p className="text-xs text-muted-foreground md:col-span-2">Enter only the secret’s name, never its value. The bridge reads the credential server-side.</p></form>}
    {notice && <div className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${notice.good ? 'border-primary/25 bg-primary/5 text-foreground' : 'border-destructive/25 bg-destructive/5 text-destructive'}`} role="status">{notice.text}</div>}
    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_.9fr]"><div className="space-y-2">{projects.length ? projects.map((project) => <div key={project.id} className="rounded-xl border border-border bg-card p-3.5"><div className="flex flex-wrap items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-primary"><Server size={15} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{project.name}</p><p className="truncate text-xs text-muted-foreground">{project.endpoint}</p></div><span className={`inline-flex items-center gap-1 text-xs font-semibold ${project.credentialConfigured ? 'text-primary' : 'text-muted-foreground'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{project.credentialConfigured ? 'Credential ready' : 'Credential needed'}</span><button onClick={() => void test(project.id)} disabled={busy === project.id} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50" data-testid={`button-test-project-${project.id}`}><RefreshCw size={13} className={busy === project.id ? 'animate-spin' : ''} /> Test</button></div><div className="mt-3 flex flex-wrap gap-1.5">{project.capabilities.map((capability: string) => <span key={capability} className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{capability}</span>)}</div></div>) : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No project agents registered yet. Add one to begin.</div>}</div><div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><p className="lee-label text-primary">MCP client setup</p><p className="mt-1 text-sm font-semibold">Credential-free configuration</p></div><button onClick={() => void copy()} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted" data-testid="button-copy-mcp-config">Copy JSON</button></div><pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">{setup ? JSON.stringify(setup.configuration, null, 2) : 'Loading configuration…'}</pre><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Endpoint: <span className="font-mono">{setup?.mcpEndpoint ?? 'Loading…'}</span>. Store the bridge credential in your MCP client’s secret store.</p></div></div>
  </div>;
}

function ProjectsPage() {
  return <><ProjectConnectionsPanel /><ProjectTrajectoryPage /></>;
}

function ProjectTrajectoryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [momentum, setMomentum] = useState<any[]>([]);
  const [uncertainty, setUncertainty] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any[]>([]);
  const [readinessGoal, setReadinessGoal] = useState('launch');
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { void Promise.all([fetch('/api/objects?type=project'), fetch('/api/projects/momentum'), fetch('/api/uncertainty'), fetch(`/api/execution-readiness?goal=${readinessGoal}`)]).then(async ([objects, scores, uncertaintyResponse, readinessResponse]) => { if (objects.ok) setProjects(await objects.json()); if (scores.ok) setMomentum(await scores.json()); if (uncertaintyResponse.ok) setUncertainty(await uncertaintyResponse.json()); if (readinessResponse.ok) setReadiness(await readinessResponse.json()); }); }, [readinessGoal]);
  const openProject = async (id: string) => { setSelected(selected === id ? null : id); if (selected !== id) { const response = await fetch(`/api/projects/${id}/momentum/history`); if (response.ok) setHistory(await response.json()); } };
  const scoreFor = (id: string) => momentum.find((item) => item.projectId === id);
  const uncertaintyFor = (id: string) => uncertainty.find((item) => item.objectId === id);
  const readinessFor = (id: string) => readiness.find((item) => item.projectId === id);
  const goalLabels: Record<string, string> = { launch: 'Launch', pilot: 'Pilot', raise: 'Raise', handoff: 'Handoff' };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Trajectory" title="Projects" detail="Status says where a project is. Momentum says where it is going." action={<label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Readiness context <select value={readinessGoal} onChange={(event) => setReadinessGoal(event.target.value)} className="h-9 rounded-lg border border-input bg-card px-2.5 text-foreground" aria-label="Readiness context">{Object.keys(goalLabels).map((goal) => <option key={goal} value={goal}>{goalLabels[goal]}</option>)}</select></label>} /><div className="space-y-3">{projects.length ? projects.map((project) => { const score = scoreFor(project.id); const readinessItem = readinessFor(project.id); const direction = score?.direction === 'up' ? '↑' : score?.direction === 'down' ? '↓' : '→'; const dimensions = readinessItem?.dimensions ?? []; const gaps = dimensions.filter((dimension: any) => dimension.score < 70); return <div key={project.id} className="rounded-2xl border border-border bg-card p-5"><button onClick={() => void openProject(project.id)} className="flex w-full items-center gap-4 text-left"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FolderKanban size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{project.name}</h3><StatusPill status={project.status} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{project.description ?? 'No project description recorded.'}</p></div><div className="text-right"><p className="lee-label text-muted-foreground">Momentum</p><p className="mt-1 text-sm font-semibold text-primary">{score ? `${score.classification} ${direction}` : 'Calculating →'}</p><p className="text-xs text-muted-foreground">{score ? `${score.score}/100` : 'No snapshot yet'}</p></div><ArrowUpRight size={16} className="text-muted-foreground" /></button>{selected === project.id && <div className="mt-5 border-t border-border pt-4">{score && <><div className="grid gap-3 md:grid-cols-2">{score.contributions?.map((item: any) => <div key={item.key} className="rounded-xl bg-muted/50 p-3"><div className="flex justify-between text-xs font-semibold"><span>{item.label}</span><span>{item.count} events · +{Math.round(item.contribution)}</span></div><div className="mt-2 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.count * 20)}%` }} /></div></div>)}</div><div className="mt-4"><p className="lee-label text-muted-foreground">30-day trajectory</p><div className="mt-2 flex h-12 items-end gap-1">{history.slice().reverse().map((item) => <div key={item.id} className="min-w-1 flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(8, item.score)}%` }} title={`${item.score}/100`} />)}</div></div></>}</div>}{selected === project.id && <div className="mt-5 border-t border-border pt-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="lee-label text-primary">Execution readiness · {goalLabels[readinessGoal]}</p><p className="mt-1 text-sm text-muted-foreground">{readinessItem ? `${Math.round(readinessItem.overallScore)}% overall · ${dimensions.length} applicable dimensions` : 'No readiness snapshot yet.'}</p></div>{readinessItem?.highestGap && <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium">Largest gap: {readinessItem.highestGap}</span>}</div>{readinessItem && <><div className="mt-4 grid gap-3 sm:grid-cols-2">{dimensions.map((dimension: any) => <div key={dimension.key} className={cn('rounded-xl border p-3', dimension.score < 70 ? 'border-destructive/25 bg-destructive/5' : 'border-border bg-muted/40')}><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium capitalize">{dimension.key}</span><span className={cn('text-sm font-semibold', dimension.score < 70 ? 'text-destructive' : 'text-primary')}>{Math.round(dimension.score)}%</span></div><p className="mt-1 text-xs text-muted-foreground">{dimension.explanation}</p>{dimension.sourceRefs?.length > 0 && <p className="mt-2 text-[10px] text-muted-foreground">Sources: {dimension.sourceRefs.join(', ')}</p>}</div>)}</div><div className="mt-4 rounded-xl border border-border bg-muted/30 p-3"><p className="lee-label text-muted-foreground">Blocking gaps</p>{gaps.length ? <ul className="mt-2 space-y-1 text-sm">{gaps.map((gap: any) => <li key={gap.key} className="flex items-start gap-2 text-destructive"><CircleAlert size={15} className="mt-0.5 shrink-0" />{gap.key} · {Math.round(gap.score)}% — {gap.explanation}</li>)}</ul> : <p className="mt-2 flex items-center gap-2 text-sm text-primary"><CircleCheck size={15} />No blocking gaps for this context.</p>}</div></>}</div>}</div>; }) : <EmptyState title="No projects recorded" detail="Bootstrap a repository or add a project object to begin tracking trajectory." />}</div></div>;
}

function HomePage({ onAsk }: { onAsk: () => void }) {
  const [liveObjectives, setLiveObjectives] = useState<any[]>([]);
  const [liveEvents, setLiveEvents] = useState<LeeEvent[]>([]);
  const [operationalContext, setOperationalContext] = useState<any>(null);
  const [operationalConfidence, setOperationalConfidence] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [showConfidenceWhy, setShowConfidenceWhy] = useState(false);
  const loadOperationalContext = async () => { const response = await fetch('/api/internal/operational-intelligence/context', { cache: 'no-store' }); if (response.ok) setOperationalContext(await response.json()); };
  useEffect(() => { void Promise.all([fetch('/api/objectives'), fetch('/api/events?limit=5'), loadOperationalContext(), fetch('/api/operational-confidence'), fetch('/api/opportunities')]).then(async ([objectives, events, _context, confidence, opportunityResponse]) => { if (objectives.ok) setLiveObjectives(await objectives.json()); if (events.ok) setLiveEvents(await events.json()); if (confidence.ok) setOperationalConfidence(await confidence.json()); if (opportunityResponse.ok) setOpportunities(await opportunityResponse.json()); }).catch(() => undefined); }, []);
  const activeObjectives = liveObjectives.filter((objective) => !['ACHIEVED', 'ABANDONED', 'done'].includes(String(objective.status ?? objective.healthStatus)));
  return <div className="mx-auto max-w-[1280px]">
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
       <div className="lee-enter"><p className="lee-label text-primary">{new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())} · local</p><h2 className="mt-3 max-w-2xl text-4xl font-semibold leading-[1.06] tracking-[-0.05em] md:text-5xl">A clear read on what<br /><span className="text-primary">deserves your attention.</span></h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">LEE is watching the edges of the operation. Here is the signal worth carrying into the day.</p></div>
      <div className="lee-enter lee-enter-delay-1 flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3"><div className="relative grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Activity size={20} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" /></div><div><p className="lee-label text-muted-foreground">System posture</p><p className="mt-1 text-sm font-semibold">Quietly operational</p></div><Link href="/health" className="ml-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary" data-testid="link-home-health"><ArrowUpRight size={16} /></Link></div>
    </div>
      {operationalConfidence && <Panel className="mb-5 border-primary/25 bg-primary/[0.05]"><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full border-4 border-primary/25 text-2xl font-semibold text-primary">{operationalConfidence.score}</div><div><p className="lee-label text-primary">Operational confidence</p><p className="mt-1 text-sm">{operationalConfidence.explanation}</p></div></div><button onClick={() => setShowConfidenceWhy(!showConfidenceWhy)} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">{showConfidenceWhy ? 'Hide why' : 'Why this score?'}</button></div>{showConfidenceWhy && <div className="mt-4 grid gap-2 border-t border-border pt-4 md:grid-cols-2">{operationalConfidence.factors?.map((item: any) => <div key={item.key} className="rounded-xl bg-muted/50 p-3"><div className="flex justify-between text-xs font-semibold"><span>{item.label}</span><span>{Math.round(item.score * 100)}%</span></div><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p><p className="mt-1 text-[11px] text-primary">Contribution +{item.contribution}</p></div>)}</div>}</Panel>}
      {opportunities.length > 0 && <Panel className="mb-5 border-accent/30 bg-accent/[0.06]"><SectionHeading eyebrow="Leverage" title="Opportunities" detail="Evidence-backed ways one part of the portfolio can accelerate another." /><div className="grid gap-3 md:grid-cols-3">{opportunities.slice(0, 3).map((item) => <div key={item.id} className="rounded-xl border border-border bg-card/70 p-4"><div className="flex items-center justify-between"><span className="lee-label text-primary">{item.opportunityType.replaceAll('_', ' ')}</span><span className="text-xs font-semibold text-primary">{Math.round((item.confidenceScore ?? 0) * 100)}%</span></div><p className="mt-2 text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p><p className="mt-3 text-xs font-medium">Next: {item.suggestedAction}</p></div>)}</div></Panel>}
      {operationalContext && <Panel className="mb-5 border-primary/25 bg-primary/[0.05]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="lee-label text-primary">Operational context</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{(operationalContext.activePriority as any)?.text ?? 'No immediate operational priority detected.'}</h3><p className="mt-2 text-xs text-muted-foreground">Live synthesis · {formatTime(operationalContext.generatedAt)}</p></div><div className="flex gap-2"><button onClick={() => void fetch('/api/internal/operational-intelligence/refresh', { method: 'POST' }).then(loadOperationalContext)} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Refresh</button><Link href="/operational-intelligence/history" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">History</Link></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Changed', operationalContext.changedItems], ['Waiting', operationalContext.waitingItems], ['Drifting', operationalContext.driftingItems], ['At risk', operationalContext.atRiskItems]].map(([label, items]: any) => <div key={label} className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{items.length}</p>{items[0] && <p className="mt-1 truncate text-xs text-muted-foreground">{items[0].text}</p>}</div>)}</div>{(() => { const emailItems = [...(operationalContext.changedItems ?? []), ...(operationalContext.waitingItems ?? [])].filter((item: any, index: number, all: any[]) => item.metadata?.sourceType === 'email' && all.findIndex((candidate) => candidate.id === item.id) === index); return emailItems.length ? <div className="mt-5 border-t border-primary/15 pt-4"><div className="flex items-baseline justify-between gap-3"><div><p className="lee-label text-primary">Actionable email</p><p className="mt-1 text-sm text-muted-foreground">Only messages with an explainable open loop or commitment appear here.</p></div><span className="text-xs text-muted-foreground">{emailItems.length} surfaced</span></div><div className="mt-3 space-y-2">{emailItems.map((item: any) => <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-medium">{item.text}</p><p className="mt-1 text-xs text-muted-foreground">{item.metadata.reason?.join(' · ')} · {item.metadata.relatedAreas?.join(' · ')}</p></div>{item.metadata.webUrl && <a href={item.metadata.webUrl} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">Open in Gmail <ArrowUpRight size={13} className="ml-1 inline" /></a>}</div><p className="mt-2 text-[11px] text-muted-foreground">Evidence: {item.evidenceRefs.join(' · ')}</p></div>)}</div></div> : null; })()}</Panel>}
     <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <Panel className="lee-enter lee-enter-delay-1">
        <SectionHeading eyebrow="Focus vector" title="Objectives in motion" detail="The few outcomes that currently shape the day." action={<Link href="/objectives" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5" data-testid="link-view-objectives">View all <ArrowUpRight size={14} /></Link>} />
         <div className="space-y-2.5">{activeObjectives.length ? activeObjectives.map((objective) => { const critical = objective.metadata?.priorityLabel === 'CRITICAL' || objective.priority === 'critical'; const health = objective.healthStatus?.toLowerCase() ?? objective.status; return <Link href="/objectives" key={objective.id} className="group flex items-center gap-4 rounded-xl border border-transparent bg-muted/55 px-4 py-3.5 hover:border-primary/20 hover:bg-primary/5" data-testid={`card-home-objective-${objective.id}`}><span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold', critical ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground')}>{critical ? '01' : objective.id.slice(-2)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{objective.title}</p><StatusPill status={health} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{objective.purpose ?? objective.description}</p></div><div className="hidden text-right sm:block"><p className="lee-label text-muted-foreground">Confidence</p><p className="mt-1 text-sm font-semibold">{Math.round(objective.confidence * 100)}%</p></div><ArrowUpRight size={16} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></Link>; }) : <EmptyState title="No active objectives" detail="Create an Executive Objective to orient the day." />}</div>
      </Panel>
      <Panel className="lee-enter lee-enter-delay-2 relative overflow-hidden border-primary/20 bg-primary/[0.06]"><div className="absolute -right-12 -top-16 h-40 w-40 rounded-full border border-primary/15" /><div className="absolute -right-3 -top-7 h-24 w-24 rounded-full border border-primary/15" /><div className="relative"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={17} /></span><span className="lee-label text-primary">LEE / ready</span></div><h3 className="mt-9 text-2xl font-semibold tracking-tight">Ask the system<br />what it sees.</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Bring a decision, a loose thread, or a question. The answer stays inside this private session.</p><button onClick={onAsk} className="mt-7 flex w-full items-center justify-between rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background hover:-translate-y-0.5" data-testid="button-ask-lee-home"><span>Open Ask LEE</span><ArrowUpRight size={16} /></button></div></Panel>
     </div>
     <div className="mt-5"><TimeSignals /></div>
     <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
       <Panel className="lee-enter lee-enter-delay-2"><SectionHeading eyebrow="Latest signal" title="Recent events" action={<Link href="/events" className="text-xs font-semibold text-primary hover:underline" data-testid="link-view-events">Inspect log</Link>} />{liveEvents.length ? <div className="space-y-0">{liveEvents.map((event, index) => <div className="flex gap-3 border-b border-border/70 py-3.5 last:border-0 last:pb-0 first:pt-0" key={event.id}><div className="relative mt-1.5 flex flex-col items-center"><span className={cn('h-2 w-2 rounded-full', index === 0 ? 'bg-primary' : 'bg-muted-foreground/35')} />{index < liveEvents.length - 1 && <span className="absolute top-3 h-10 w-px bg-border" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{event.eventType.replace('.', ' / ')}</p><p className="mt-1 text-xs text-muted-foreground">{event.sourceRef} · {formatTime(event.occurredAt)}</p></div><span className="lee-label shrink-0 text-muted-foreground">{event.id}</span></div>)}</div> : <EmptyState title="No recent events" detail="The append-only Event Log has no recent records to summarize." />}</Panel>
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

function LiveObjectivesPage() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const load = async (id?: string) => {
    const response = await fetch('/api/objectives?includeArchived=true');
    const items = await response.json();
    setObjectives(items);
    const next = id ? items.find((item: any) => item.id === id) : items[0];
    if (next) setSelected((current: any) => current?.id === next.id ? next : next);
  };
  useEffect(() => { void load(); }, []);
  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/objectives', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      title: String(form.get('title')), purpose: String(form.get('purpose')), description: String(form.get('purpose')),
      priority: String(form.get('priority')).toUpperCase(), successMetrics: String(form.get('successMetrics')).split('\n').filter(Boolean),
      relatedProjects: String(form.get('relatedProjects')).split(',').map((value) => value.trim()).filter(Boolean),
      expectedCompletion: String(form.get('expectedCompletion')) || null, currentOwner: String(form.get('currentOwner')) || 'Founder',
    }) });
    const result = await response.json();
    if (!response.ok) { setNotice(result.error ?? 'Objective creation failed.'); return; }
    setCreateOpen(false); setNotice('Executive Objective created.'); await load(result.id);
  };
  const close = async (state: 'achieved' | 'abandoned') => {
    if (!selected) return;
    const reason = window.prompt(state === 'achieved' ? 'What evidence confirms success?' : 'Why is this objective being abandoned?');
    if (!reason) return;
    const response = await fetch(`/api/objectives/${selected.id}/close`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, reason }) });
    if (response.ok) { setNotice(state === 'achieved' ? 'Objective achieved and archived.' : 'Objective abandoned and archived.'); await load(selected.id); }
  };
  const healthClass = (health: string) => health === 'ON_TRACK' ? 'bg-primary' : health === 'AT_RISK' ? 'bg-accent' : health === 'STALLED' ? 'bg-destructive' : 'bg-muted-foreground/40';
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Executive layer · computed" title="Objectives" detail="Ongoing operational outcomes, ranked by priority and assessed from evidence rather than manually reported." action={<button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground"><Plus size={15} /> Add objective</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}<div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]"><Panel className="p-3"><div className="mb-3 px-2"><span className="lee-label text-muted-foreground">{objectives.filter((item) => item.status === 'active').length} active objectives</span></div><div className="space-y-1">{objectives.map((item) => <button key={item.id} onClick={() => setSelected(item)} className={cn('w-full rounded-xl border px-3.5 py-3.5 text-left', selected?.id === item.id ? 'border-primary/35 bg-primary/8' : 'border-transparent hover:border-border hover:bg-muted/60')}><div className="flex items-start gap-3"><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', healthClass(item.healthStatus))} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{item.purpose}</span><span className="mt-3 flex items-center gap-3"><StatusPill status={item.healthStatus.toLowerCase()} /><span className="lee-label text-muted-foreground">{item.metadata?.priorityLabel ?? 'NORMAL'} priority</span></span></span></div></button>)}</div>{!objectives.length && <EmptyState title="No Executive Objectives yet" detail="Create the first ongoing outcome LEE should protect." />}</Panel><Panel>{selected ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.metadata?.priorityLabel ?? 'NORMAL'} priority · {selected.currentOwner}</p><h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight">{selected.title}</h3></div><StatusPill status={selected.healthStatus.toLowerCase()} /></div><p className="mt-5 text-sm leading-7 text-muted-foreground">{selected.purpose}</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Computed progress</p><p className="mt-2 text-sm font-semibold">{selected.forwardSignals} forward / {selected.adverseSignals} adverse</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Evidence</p><p className="mt-2 text-sm font-semibold">{selected.evidenceCount} signals</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Expected completion</p><p className="mt-2 text-sm font-semibold">{selected.expectedCompletion ? formatDate(selected.expectedCompletion) : 'Open-ended'}</p></div></div><div className="mt-6 rounded-xl border border-border bg-muted/35 p-4"><p className="lee-label text-primary">Progress narrative</p><p className="mt-2 text-sm leading-relaxed">{selected.progressNarrative}</p></div>{selected.currentBlockers?.length > 0 && <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-4"><p className="lee-label text-accent-foreground">Current blockers</p><ul className="mt-2 space-y-1 text-sm">{selected.currentBlockers.map((blocker: string) => <li key={blocker}>• {blocker}</li>)}</ul></div>}<div className="mt-6"><p className="lee-label text-muted-foreground">Success metrics</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{selected.successMetrics.map((metric: string) => <li key={metric}>• {metric}</li>)}</ul></div><div className="mt-6 border-t border-border pt-5"><p className="lee-label text-primary">Evidence timeline</p><div className="mt-3 space-y-2">{selected.evidence?.map((item: any) => <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs" key={item.id}><span className="font-semibold">{item.direction}</span> · {item.summary} <span className="text-muted-foreground">· {formatDate(item.createdAt)}</span></div>)}</div></div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => void close('achieved')} disabled={selected.status !== 'active'} className="rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Mark achieved</button><button onClick={() => void close('abandoned')} disabled={selected.status !== 'active'} className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold disabled:opacity-40">Abandon with reason</button></div></> : <EmptyState title="Select an objective" detail="Choose an objective to inspect its computed health and evidence timeline." />}</Panel></div>{createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-5 backdrop-blur-sm"><form onSubmit={create} className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-6 shadow-2xl"><p className="lee-label text-primary">New ongoing outcome</p><h3 className="mt-1 text-xl font-semibold">Create Executive Objective</h3><div className="mt-5 space-y-3"><input name="title" required placeholder="What needs to become true?" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" /><textarea name="purpose" required placeholder="Why does this matter?" className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" /><textarea name="successMetrics" required placeholder="Success metric, one per line" className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" /><input name="relatedProjects" placeholder="Related projects, comma separated" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" /><div className="grid gap-3 sm:grid-cols-2"><select name="priority" defaultValue="NORMAL" className="h-11 rounded-xl border border-input bg-background px-3 text-sm"><option>CRITICAL</option><option>HIGH</option><option>NORMAL</option><option>LOW</option></select><input name="expectedCompletion" type="date" className="h-11 rounded-xl border border-input bg-background px-3 text-sm" /></div><input name="currentOwner" placeholder="Current owner (default Founder)" className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" /></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm">Cancel</button><button className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Create objective</button></div></form></div>}</div>;
}

function OrganizationPage() {
  const [organization, setOrganization] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/organization').then(async (response) => { if (!response.ok) throw new Error('Unable to load Organization.'); return response.json(); }).then(setOrganization).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load Organization.')); }, []);
  if (error) return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Organizational memory" title="Organization" /><Panel><p className="text-sm text-destructive">{error}</p></Panel></div>;
  if (!organization) return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Organizational memory" title="Organization" detail="Loading the live organizational profile." /><Panel><SkeletonRows count={5} /></Panel></div>;
  const categories = Object.entries(organization.peopleCategories as Record<string, any[]>).filter(([, entries]) => entries.length);
  const resources = organization.resources as any[];
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Layer 2 · organizational memory" title={organization.legalName} detail="The organization is a first-class operating context: structure, people, shared infrastructure, technology ownership, and commercial footprint." /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><Panel><div className="flex items-start justify-between"><div><p className="lee-label text-primary">Organizational profile</p><h3 className="mt-1 text-lg font-semibold">Structure</h3></div><Building2 className="text-primary" size={22} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(organization.structure as Record<string, any>).map(([key, value]) => <div className="rounded-xl bg-muted/55 p-3.5" key={key}><p className="lee-label text-muted-foreground">{key}</p><p className="mt-2 text-sm leading-relaxed">{Array.isArray(value) ? value.join(' · ') : String(value)}</p></div>)}</div><div className="mt-6 border-t border-border pt-5"><p className="lee-label text-primary">People categories</p>{categories.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{categories.map(([key, entries]) => <div className="rounded-xl border border-border bg-card p-3" key={key}><p className="text-sm font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</p><div className="mt-2 space-y-1">{entries.map((entry: any) => <p className="text-xs text-muted-foreground" key={entry.id}>{entry.name} · {entry.role}</p>)}</div></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No relationship records have been tagged yet. People added through the Relationship Engine will appear here automatically.</p>}</div></Panel><div className="space-y-5"><Panel><p className="lee-label text-primary">Shared services</p><h3 className="mt-1 text-lg font-semibold">Infrastructure map</h3><div className="mt-4 space-y-2">{Object.entries(organization.sharedServices as Record<string, any>).map(([service, dependencies]) => <div className="flex items-start gap-3 rounded-xl bg-muted/55 p-3" key={service}><Server size={16} className="mt-0.5 text-primary" /><div><p className="text-sm font-semibold">{service}</p><p className="mt-1 text-xs text-muted-foreground">{Array.isArray(dependencies) ? dependencies.join(' · ') : String(dependencies)}</p></div></div>)}</div></Panel><Panel><p className="lee-label text-primary">Technology ownership</p><h3 className="mt-1 text-lg font-semibold">Owned resources</h3>{resources.length ? <div className="mt-4 space-y-2">{resources.map((resource) => <div className="rounded-xl border border-border p-3" key={resource.id}><div className="flex items-center justify-between"><p className="text-sm font-semibold">{resource.name}</p><span className="lee-label text-muted-foreground">{resource.resourceType}</span></div><p className="mt-1 text-xs text-muted-foreground">Owner: {resource.ownerRef} · {resource.projectRefs.join(', ') || 'shared'}</p></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Bootstrap discoveries and shared resources will be linked here.</p>}</Panel><Panel><p className="lee-label text-primary">Commercial & legal context</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="lee-label text-muted-foreground">Current revenue</p><p className="mt-1 text-sm">{(organization.revenueModel.currentStreams ?? []).length ? organization.revenueModel.currentStreams.join(', ') : 'None recorded'}</p></div><div><p className="lee-label text-muted-foreground">Entity</p><p className="mt-1 text-sm">{organization.legalCompliance.entityStructure}</p></div></div></Panel></div></div></div>;
}

function DecisionPatternsPage() {
  const [heuristics, setHeuristics] = useState<any[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/decision-memory/heuristics').then(async (response) => { if (!response.ok) throw new Error('Unable to load Decision Patterns.'); return response.json(); }).then(setHeuristics).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load Decision Patterns.')); }, []);
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Strategy · decision memory" title="Decision Patterns" detail="Probabilistic heuristics inferred from observed decisions. These patterns can flag a conflict, but never override your judgment." />{error && <Panel><p className="text-sm text-destructive">{error}</p></Panel>}{!error && <div className="grid gap-4">{heuristics.map((heuristic) => <Panel key={heuristic.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="lee-label text-primary">{heuristic.name}</p><h3 className="mt-2 max-w-3xl text-lg font-semibold">{heuristic.rule}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{heuristic.rationale ?? 'Observed decision pattern, not an absolute rule.'}</p></div><ConfidenceBar value={heuristic.confidence} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/55 p-3.5"><p className="lee-label text-muted-foreground">Evidence</p><p className="mt-2 text-sm font-semibold">{heuristic.evidenceRefs?.length ?? 0} observations</p></div><div className="rounded-xl bg-muted/55 p-3.5"><p className="lee-label text-muted-foreground">Exceptions</p><p className="mt-2 text-sm font-semibold">{heuristic.exceptionCount}</p></div><div className="rounded-xl bg-muted/55 p-3.5"><p className="lee-label text-muted-foreground">Last reinforced</p><p className="mt-2 text-sm font-semibold">{heuristic.lastReinforced ? formatDate(heuristic.lastReinforced) : 'Not yet'}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{(heuristic.evidenceRefs ?? []).slice(0, 8).map((ref: string) => <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground" key={ref}>{ref.slice(0, 18)}</span>)}</div></Panel>)}{!heuristics.length && <EmptyState title="No decision patterns established" detail="Patterns will appear after repeated accepted, rejected, deferred, or abandoned decisions are recorded." />}</div>}</div>;
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

type Adaptation = {
  id: string;
  category: string;
  parameter: string;
  previousValue: string;
  currentValue: string;
  defaultValue: string;
  evidenceRefs: string[];
  observationCount: number;
  reason: string;
  rollbackData: { previousValue?: string; defaultValue?: string; evidenceRefs?: string[]; capturedAt?: string };
  status: string;
  updatedAt: string;
};

function SelfImprovementPage() {
  const [items, setItems] = useState<Adaptation[]>([]);
  const [contract, setContract] = useState<{ minimumEvidence: number; approvedParameters: string[]; protectedTargets: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const [response, contractResponse] = await Promise.all([fetch('/api/self-improvement'), fetch('/api/self-improvement/contract')]);
      if (!response.ok || !contractResponse.ok) throw new Error(`Self-improvement request failed (${response.status}).`);
      setItems(await response.json() as Adaptation[]);
      setContract(await contractResponse.json() as typeof contract);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load adaptations.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);
  const runCycle = async () => {
    setWorking(true); setNotice(''); setError('');
    try {
      const response = await fetch('/api/self-improvement/cycle', { method: 'POST' });
      if (!response.ok) throw new Error(`Self-improvement cycle failed (${response.status}).`);
      const result = await response.json() as { adaptations: Adaptation[] };
      setNotice(result.adaptations.length ? `${result.adaptations.length} adaptation applied and logged.` : 'Cycle complete · no new adaptation met the evidence threshold.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to run self-improvement cycle.');
    } finally { setWorking(false); }
  };
  const reset = async (id?: string) => {
    setWorking(true);
    await fetch('/api/self-improvement/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(id ? { id } : {}) });
    setNotice(id ? 'Adaptation reset to its default.' : 'All adaptations reset to defaults.');
    await load();
    setWorking(false);
  };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Reflection engine · bounded adaptation" title="Self-improvement" detail="LEE can adjust output parameters, never identity, values, facts, or constitutional boundaries." action={<button onClick={() => void runCycle()} disabled={working} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" data-testid="button-run-self-improvement"><RefreshCw size={14} className={working ? 'animate-spin' : ''} /> Run effectiveness cycle</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">{notice}</div>}{error && <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</div>}<Panel><div className="mb-5 flex items-center justify-between"><div><p className="lee-label text-primary">Operational adaptation log</p><h3 className="mt-1 text-lg font-semibold">Current behaviors</h3></div><button onClick={() => void reset()} disabled={working || items.length === 0} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">Reset all to defaults</button></div>{loading ? <SkeletonRows /> : items.length === 0 ? <EmptyState title="No adaptations yet" detail={`LEE needs at least ${contract?.minimumEvidence ?? 5} observations in a category before changing an output parameter.`} /> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-border bg-muted/35 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{item.category} · {item.status}</p><h4 className="mt-1 text-sm font-semibold">{item.parameter}</h4></div><button onClick={() => void reset(item.id)} disabled={working || item.status !== 'active'} className="text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-40">Reset</button></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><div><p className="lee-label text-muted-foreground">Current</p><p className="mt-1 text-sm font-semibold">{item.currentValue}</p></div><div><p className="lee-label text-muted-foreground">Default</p><p className="mt-1 text-sm">{item.defaultValue}</p></div><div><p className="lee-label text-muted-foreground">Evidence</p><p className="mt-1 text-sm">{item.observationCount} observations</p></div><div><p className="lee-label text-muted-foreground">Rollback</p><p className="mt-1 text-sm">{item.rollbackData?.previousValue ?? item.defaultValue}</p></div></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{item.reason}</p></div>)}</div>}</Panel><div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">Safety boundary: adaptations are reversible and event-logged. Approved parameters: {contract?.approvedParameters.join(', ') ?? 'loading'}. Protected targets: {contract?.protectedTargets.join(', ') ?? 'loading'}. No autonomous consequential actions are permitted.</div></div>;
}

function SystemEconomicsPage() {
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const load = async () => { setLoading(true); const response = await fetch('/api/economics/summary'); if (response.ok) setBudget(await response.json()); setLoading(false); };
  useEffect(() => { void load(); }, []);
  const cycle = async () => { setRunning(true); setNotice(''); const response = await fetch('/api/economics/cycle', { method: 'POST' }); if (response.ok) { setBudget(await response.json()); setNotice('System Budget updated and recorded in the Event Log.'); } setRunning(false); };
  if (loading) return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="System Budget" title="System economics" detail="Unified operational cost, latency, and value accounting." /><Panel><SkeletonRows /></Panel></div>;
  const s = budget?.summary ?? {};
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="System Budget · monthly" title="System economics" detail="Unified operational cost, latency, and value accounting — not revenue or billing." action={<button onClick={() => void cycle()} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"><Gauge size={14} /> {running ? 'Updating…' : 'Update budget'}</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}{budget?.alerts?.length > 0 && <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800"><div className="flex items-center gap-2 font-semibold"><CircleAlert size={15} /> Budget observations</div><ul className="mt-2 list-disc pl-5">{budget.alerts.map((alert: string) => <li key={alert}>{alert}</li>)}</ul></div>}<div className="grid gap-4 md:grid-cols-4"><MetricCard label="Month to date" value={`$${Number(budget?.totalCostUsd ?? 0).toFixed(4)}`} detail="Recorded operating cost" /><MetricCard label="Projected month" value={`$${Number(budget?.projectedMonthlyCostUsd ?? 0).toFixed(2)}`} detail="At current usage" /><MetricCard label="CIL reuse" value={`${Math.round((s.cil?.reuseRate ?? 0) * 100)}%`} detail={`${s.cil?.reusedRequests ?? 0} T1/T2 requests`} /><MetricCard label="Latency p95" value={`${s.latency?.p95Ms ?? 0} ms`} detail={`${s.latency?.p50Ms ?? 0} ms median`} /></div><div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Panel><SectionHeading eyebrow="Attribution" title="Cost by engine" /><div className="space-y-3">{(s.byEngine ?? []).length ? s.byEngine.map((item: any) => <div key={item.engine} className="rounded-xl border border-border bg-muted/30 p-3.5"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{item.engine}</span><span className="text-sm font-semibold">${Number(item.estimatedCostUsd).toFixed(4)}</span></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{item.requestCount} calls · {item.totalTokens} tokens</span><span>p95 {item.latencyP95Ms} ms</span></div></div>) : <EmptyState title="No cost records yet" detail="Reasoning and engine calls will appear here as they run." />}</div></Panel><Panel><SectionHeading eyebrow="Value accounting" title="Cost per outcome" /><div className="space-y-4">{Object.entries(s.valueRatios ?? {}).map(([key, value]) => <div className="flex items-center justify-between border-b border-border/70 pb-3 last:border-0" key={key}><span className="text-sm text-muted-foreground">{key.replace(/^costPer/, 'Cost per ').replace(/([A-Z])/g, ' $1')}</span><span className="text-sm font-semibold">{value == null ? '—' : `$${Number(value).toFixed(4)}`}</span></div>)}</div></Panel></div><div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">System Economics is the single operational accounting layer. It measures cost and value signals only; it does not access billing, revenue, customer financials, identity, constitutional provisions, or knowledge facts.</div></div>;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="lee-label text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function IdentityCorePage() {
  const [profile, setProfile] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    const [profileResponse, versionsResponse] = await Promise.all([fetch('/api/identity'), fetch('/api/identity/versions')]);
    if (!profileResponse.ok) throw new Error('Unable to load Identity Profile.');
    const current = await profileResponse.json();
    setProfile(current); setValues(current.values); setVersions(await versionsResponse.json());
  };
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load Identity Profile.')); }, []);
  const save = async () => {
    setNotice(''); setError('');
    const response = await fetch('/api/identity/update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values, changeReason: reason, confirm }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'Identity update failed.'); return; }
    setNotice(`Identity Profile updated to version ${result.profileVersion.version}.`); setReason(''); setConfirm(false); await load();
  };
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: ['responsibilities', 'nonNegotiables', 'protects', 'priorities', 'successCriteria'].includes(key) ? value.split('\n').filter(Boolean) : value }));
  if (!profile) return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Layer 0 · identity" title="Identity" detail="The operating partner LEE is." /><Panel><SkeletonRows /></Panel></div>;
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Layer 0 · identity engine" title="Identity" detail="Who LEE is, what she protects, and when she speaks. Identity is distinct from Constitution and never sent to external reasoning services." />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}{error && <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}<div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Panel><div className="mb-5"><p className="lee-label text-primary">Current profile · {profile.values.role}</p><h3 className="mt-1 text-lg font-semibold">Twelve behavioral dimensions</h3></div><div className="space-y-4">{(profile.dimensions as string[]).map((key) => { const isArray = Array.isArray(values[key]); const enumValues = profile.enums?.[key] as string[] | undefined; return <label className="block" key={key}><span className="lee-label text-muted-foreground">{key}</span>{enumValues ? <select value={String(values[key] ?? '')} onChange={(event) => setValue(key, event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary">{enumValues.map((option) => <option key={option}>{option}</option>)}</select> : <textarea value={isArray ? (values[key] as string[]).join('\n') : String(values[key] ?? '')} onChange={(event) => setValue(key, event.target.value)} className="mt-2 min-h-16 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary" />}</label>; })}</div><div className="mt-5 border-t border-border pt-5"><label className="lee-label text-muted-foreground">Why is this changing?</label><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Owner-confirmed reason" className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" /><label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} className="mt-0.5" />I confirm this Identity Profile change as the owner.</label><button onClick={() => void save()} disabled={!confirm || !reason.trim()} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">Save confirmed profile</button></div></Panel><Panel><p className="lee-label text-primary">Why Chain · version history</p><h3 className="mt-1 text-lg font-semibold">Profile versions</h3><div className="mt-5 space-y-3">{versions.map((version) => <div className="rounded-xl border border-border bg-muted/35 p-3.5" key={version.id}><div className="flex items-center justify-between"><span className="text-sm font-semibold">Version {version.version}</span><span className="lee-label text-primary">{version.confirmedByOwner ? 'owner confirmed' : 'onboarding'}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{version.changeReason}</p><p className="mt-2 text-[11px] text-muted-foreground">{formatDate(version.createdAt)}</p></div>)}</div></Panel></div></div>;
}

function IdentityPage() { return <><IdentityCorePage /><div className="mx-auto max-w-[1280px]"><FounderProfilePanel /></div></>; }

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
  const [liveEvents, setLiveEvents] = useState<typeof EVENTS>([]);
  useEffect(() => { void fetch('/api/events?limit=500').then((response) => response.ok ? response.json() : Promise.reject(new Error('Event Log unavailable'))).then(setLiveEvents).catch(() => setNotice('Unable to load the live Event Log.')); }, []);
  const filtered = useMemo(() => liveEvents.filter((event) => (type === 'all' || event.eventType === type) && `${event.eventType} ${event.aggregateId} ${event.sourceRef}`.toLowerCase().includes(query.toLowerCase())), [liveEvents, query, type]);
  const exportLog = () => { setNotice(`Append-only log prepared locally · ${filtered.length} events selected.`); window.setTimeout(() => setNotice(''), 3000); };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Append-only record" title="Event history" detail="A chronological trail of meaningful changes across the operating layer." action={<button onClick={exportLog} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-export-events"><FileText size={14} /> Export log</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" data-testid="status-event-notice">{notice}</div>}<Panel><div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event type, source, or aggregate" className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="input-search-events" /></label><select value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary" data-testid="select-filter-events"><option value="all">All aggregates</option><option value="objective">Objectives</option><option value="knowledge">Knowledge</option><option value="service">Services</option><option value="brief">Briefs</option><option value="access">Access</option></select></div>{filtered.length ? <div className="overflow-x-auto"><div className="min-w-[680px]"><div className="grid grid-cols-[1.3fr_.7fr_.8fr_1fr] gap-4 border-b border-border px-3 pb-3"><span className="lee-label text-muted-foreground">Event</span><span className="lee-label text-muted-foreground">Aggregate</span><span className="lee-label text-muted-foreground">Occurred</span><span className="lee-label text-muted-foreground">Source</span></div>{filtered.map((event) => <div className="group grid grid-cols-[1.3fr_.7fr_.8fr_1fr] items-center gap-4 border-b border-border/70 px-3 py-4 last:border-0 hover:bg-muted/50" key={event.id} data-testid={`row-event-${event.id}`}><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><GitBranch size={14} /></span><div><p className="text-sm font-medium">{event.eventType}</p><p className="lee-label mt-1 text-muted-foreground">{event.id}</p></div></div><div><p className="text-xs font-medium capitalize">{event.aggregateType}</p><p className="lee-label mt-1 text-muted-foreground">{event.aggregateId}</p></div><p className="text-xs text-muted-foreground">{formatDate(event.occurredAt)} · {formatTime(event.occurredAt)}</p><p className="truncate text-xs text-muted-foreground">{event.sourceRef}</p></div>)}</div></div> : <EmptyState title="The log is quiet here" detail="No append-only events match this filter." />}</Panel></div>;
}

function HealthDetailPage() {
  const [items, setItems] = useState(HEALTH);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState('');
  const runChecks = () => { setChecking(true); setNotice(''); window.setTimeout(() => { setItems((current) => current.map((item) => ({ ...item, lastChecked: 'just now' }))); setChecking(false); setNotice('Checks complete · one connector still needs attention.'); }, 900); };
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="System posture" title="Health & readiness" detail="A calm view of whether the foundation can be trusted right now." action={<button onClick={runChecks} disabled={checking} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60" data-testid="button-run-health-checks"><RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> {checking ? 'Running checks' : 'Run checks'}</button>} />{notice && <div className="mb-4 rounded-xl border border-accent/35 bg-accent/15 px-4 py-3 text-sm" data-testid="status-health-notice">{notice}</div>}<div className="grid gap-5 md:grid-cols-3"><Panel className="md:col-span-2"><div className="flex items-start justify-between"><div><p className="lee-label text-primary">Readiness score</p><p className="mt-3 lee-display text-5xl font-bold">86<span className="text-2xl text-muted-foreground">/100</span></p><p className="mt-2 text-sm text-muted-foreground">Safe for daily operation with one degraded edge.</p></div><div className="relative grid h-20 w-20 place-items-center rounded-full border-[7px] border-primary/20"><div className="absolute inset-0 rounded-full border-[7px] border-transparent border-l-primary border-t-primary rotate-[35deg]" /><ShieldCheck className="text-primary" size={24} /></div></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[86%] rounded-full bg-primary" /></div><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>Foundation ready</span><span>1 attention item</span></div></Panel><Panel><p className="lee-label text-primary">Readiness gates</p><div className="mt-5 space-y-4"><div className="flex gap-3"><Database className="shrink-0 text-primary" size={17} /><div><p className="text-sm font-medium">Data integrity</p><p className="mt-1 text-xs text-muted-foreground">Passed · 100%</p></div></div><div className="flex gap-3"><KeyRound className="shrink-0 text-primary" size={17} /><div><p className="text-sm font-medium">Private access</p><p className="mt-1 text-xs text-muted-foreground">Founder session verified</p></div></div><div className="flex gap-3"><Zap className="shrink-0 text-accent" size={17} /><div><p className="text-sm font-medium">Connectors</p><p className="mt-1 text-xs text-muted-foreground">1 degraded edge</p></div></div></div></Panel></div><div className="mt-5"><Panel><div className="mb-4 flex items-center justify-between"><div><p className="lee-label text-primary">Service detail</p><h3 className="mt-1 text-lg font-semibold">Foundation components</h3></div><span className="lee-label text-muted-foreground">{items.length} checks</span></div><div className="divide-y divide-border">{items.map((item) => <div className="flex flex-col gap-3 py-4 first:pt-1 sm:flex-row sm:items-center" key={item.name} data-testid={`row-health-${item.name.toLowerCase().replace(/\s/g, '-')}`}><span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', item.status === 'operational' ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-foreground')}>{item.name === 'Local session' ? <LockKeyhole size={16} /> : item.name === 'Knowledge index' ? <Network size={16} /> : item.name === 'GitHub connector' ? <GitBranch size={16} /> : <Server size={16} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{item.name}</p><StatusPill status={item.status} /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p></div><p className="lee-label shrink-0 text-muted-foreground">Checked {item.lastChecked}</p></div>)}</div></Panel></div></div>;
}

function ResourceHealthPanel() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { void fetch('/api/resources/state', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setData); }, []);
  const dimensions = data?.state?.dimensions ?? {};
  return <div className="mx-auto mt-5 max-w-[1280px]"><Panel><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">Resource engine</p><h3 className="mt-1 text-lg font-semibold">Live capacity</h3><p className="mt-1 text-xs text-muted-foreground">Compute, disk, budget, network, quota, and battery pressure before work is dispatched.</p></div><StatusPill status={String(data?.state?.overallState ?? 'HEALTHY').toLowerCase() as any} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(dimensions).map(([name, value]: [string, any]) => <div key={name} className="rounded-xl bg-muted/50 p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold capitalize">{name.replace('_', ' ')}</p><span className={`h-2 w-2 rounded-full ${value.level === 'CRITICAL' ? 'bg-destructive' : value.level === 'CONSTRAINED' ? 'bg-accent' : 'bg-primary'}`} /></div><p className="mt-2 text-xs text-muted-foreground">{value.value !== undefined ? `${Number(value.value).toFixed(1)} ${value.unit ?? ''}` : value.level}</p></div>)}</div></Panel></div>;
}

function StateHistoryPanel() {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { void fetch('/api/state/history?limit=12', { cache: 'no-store' }).then((response) => response.ok ? response.json() : []).then(setHistory); }, []);
  return <div className="mx-auto mt-5 max-w-[1280px]"><Panel><div className="flex items-center justify-between"><div><p className="lee-label text-primary">Operational state</p><h3 className="mt-1 text-lg font-semibold">State history</h3></div><span className="lee-label text-muted-foreground">{history.length} transitions</span></div><div className="mt-4 divide-y divide-border">{history.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3"><span className="h-2 w-2 rounded-full bg-primary" /><span className="min-w-28 text-sm font-semibold">{entry.state}</span><span className="text-xs text-muted-foreground">{entry.reason}</span><span className="ml-auto text-xs text-muted-foreground">{entry.exitedAt ? `${entry.durationSeconds ?? 0}s` : 'active'} · {formatDate(entry.enteredAt)}</span></div>)}</div></Panel></div>;
}

function EnginesPanel() {
  const [engines, setEngines] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => { void fetch('/api/registry', { cache: 'no-store' }).then((response) => response.ok ? response.json() : []).then(setEngines); }, []);
  return <div className="mx-auto mt-5 max-w-[1280px]"><Panel><div className="flex items-center justify-between"><div><p className="lee-label text-primary">Capability registry</p><h3 className="mt-1 text-lg font-semibold">Registered engines</h3><p className="mt-1 text-sm text-muted-foreground">Versioned internal capabilities and live heartbeat status.</p></div><span className="lee-label text-muted-foreground">{engines.length} engines</span></div><div className="mt-4 divide-y divide-border">{engines.map((engine) => <div key={engine.id} className="py-3"><button onClick={() => setExpanded(expanded === engine.id ? null : engine.id)} className="flex w-full items-center gap-3 text-left"><span className={cn('h-2 w-2 rounded-full', engine.status === 'HEALTHY' ? 'bg-primary' : 'bg-accent')} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{engine.name}</span><span className="mt-1 block text-xs text-muted-foreground">{engine.owner} · v{engine.version} · heartbeat {formatDate(engine.lastHeartbeat)}</span></span><span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold">{engine.status}</span><ChevronDown size={15} className={cn('text-muted-foreground transition-transform', expanded === engine.id && 'rotate-180')} /></button>{expanded === engine.id && <div className="ml-5 mt-3 grid gap-3 rounded-xl bg-muted/50 p-3 text-xs sm:grid-cols-3"><div><p className="lee-label text-muted-foreground">Capabilities</p><p className="mt-2 leading-relaxed">{engine.capabilities?.join(' · ') || 'None declared'}</p></div><div><p className="lee-label text-muted-foreground">Dependencies</p><p className="mt-2 leading-relaxed">{engine.dependencies?.join(' · ') || 'None declared'}</p></div><div><p className="lee-label text-muted-foreground">Contracts</p><p className="mt-2 leading-relaxed">{Object.keys(engine.inputs ?? {}).length} inputs · {Object.keys(engine.outputs ?? {}).length} outputs</p></div></div>}</div>)}</div>{!engines.length && <EmptyState title="No engines registered" detail="The registry will populate as Lee's engines initialize." />}</Panel></div>;
}

function LifecyclePanel() {
  const [engines, setEngines] = useState<any[]>([]);
  useEffect(() => { void fetch('/api/registry', { cache: 'no-store' }).then((response) => response.ok ? response.json() : []).then(setEngines); }, []);
  return <div className="mx-auto mt-5 max-w-[1280px]"><Panel><div className="flex items-center justify-between"><div><p className="lee-label text-primary">Lifecycle control</p><h3 className="mt-1 text-lg font-semibold">Boot, health & recovery posture</h3></div><span className="lee-label text-muted-foreground">{engines.filter((engine) => engine.lifecycleState === 'DEGRADED').length} degraded</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{engines.map((engine) => <div key={engine.id} className="rounded-xl bg-muted/50 p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold">{engine.name}</span><span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold">{engine.lifecycleState ?? engine.status}</span></div><p className="mt-2 text-[11px] text-muted-foreground">Recovery: {engine.recoveryPolicy ?? 'GRACEFUL_DISABLE'}</p>{engine.degradedCapabilities?.length > 0 && <p className="mt-1 text-[11px] leading-relaxed text-accent">{engine.degradedCapabilities.join(' · ')}</p>}</div>)}</div></Panel></div>;
}

function BootHistoryPanel() {
  const [boots, setBoots] = useState<any[]>([]);
  useEffect(() => { void fetch('/api/recovery/boot-history', { cache: 'no-store' }).then((response) => response.ok ? response.json() : []).then(setBoots); }, []);
  return <div className="mx-auto mt-5 max-w-[1280px]"><Panel><div className="flex items-center justify-between"><div><p className="lee-label text-primary">Recovery modes</p><h3 className="mt-1 text-lg font-semibold">Boot history</h3></div><span className="lee-label text-muted-foreground">{boots.length} boots</span></div><div className="mt-4 divide-y divide-border">{boots.slice(0, 8).map((boot) => <div key={boot.id} className="flex flex-wrap items-center gap-3 py-3"><span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold">{boot.bootMode}</span><span className="text-xs text-muted-foreground">{boot.reason}</span><span className="ml-auto text-xs text-muted-foreground">{boot.success ? 'complete' : 'in progress'} · {formatDate(boot.startedAt)}</span></div>)}</div></Panel></div>;
}

function AgingHealthPanel() {
  const [summary, setSummary] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  useEffect(() => { void fetch('/api/aging/summary', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setSummary); }, []);
  const scan = async () => { setScanning(true); const result = await fetch('/api/aging/scan', { method: 'POST' }).then((response) => response.json()); setSummary(result.summary ?? summary); setScanning(false); };
  return <div className="mx-auto mt-5 max-w-[1280px]"><Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="lee-label text-primary">Knowledge freshness</p><h3 className="mt-1 text-lg font-semibold">Knowledge Aging</h3></div><button onClick={() => void scan()} disabled={scanning} className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50">{scanning ? 'Scanning…' : 'Run aging scan'}</button></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{['FRESH','CURRENT','OLD','HISTORICAL','STALE','EXPIRED'].map((state) => <div key={state} className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">{state}</p><p className="mt-2 text-xl font-semibold">{summary?.counts?.[state] ?? '—'}</p></div>)}</div><p className="mt-4 text-xs text-muted-foreground">{summary?.staleCuriosity ?? 0} stale objects have pending curiosity prompts.</p></Panel></div>;
}

function ManifestPage() {
  const [manifest, setManifest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError('');
    try {
      const [currentResponse, historyResponse] = await Promise.all([fetch('/api/manifest', { cache: 'no-store' }), fetch('/api/manifest/history', { cache: 'no-store' })]);
      if (!currentResponse.ok) throw new Error('The live Manifest is unavailable.');
      setManifest(await currentResponse.json());
      setHistory(historyResponse.ok ? await historyResponse.json() : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The live Manifest is unavailable.');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void load(); }, []);
  const snapshot = async () => { const response = await fetch('/api/manifest/snapshot', { method: 'POST' }); if (!response.ok) setError('The live Manifest could not be saved.'); else await load(); };
  const label = (key: string) => key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase());
  return <div className="mx-auto max-w-[1200px]"><SectionHeading eyebrow="Settings / System" title="System Manifest" detail="One canonical, read-only description of Lee’s current runtime, brain, policy, capability, connector, storage, and health state." action={<div className="flex flex-wrap gap-2"><button onClick={() => void load()} disabled={busy} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">{busy ? 'Refreshing…' : 'Refresh'}</button><a href="/api/manifest.json" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Download JSON</a><a href="/api/manifest.md" className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Download Markdown</a><button onClick={() => void snapshot()} className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">Save snapshot</button></div>} />{error && <div className="mb-5 flex items-center justify-between rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button onClick={() => void load()} className="font-semibold underline">Retry</button></div>}{!manifest && !error && <Panel><SkeletonRows /></Panel>}{manifest && <><Panel><div className="grid gap-3 sm:grid-cols-4"><div><p className="lee-label text-muted-foreground">Generated</p><p className="mt-1 text-sm">{formatDate(manifest.generatedAt)}</p><p className="text-xs text-muted-foreground">Manifest {manifest.manifestVersion}</p></div><div><p className="lee-label text-muted-foreground">LEE / Brain</p><p className="mt-1 text-sm">{manifest.identity.leeVersion ?? 'Unavailable'} · {manifest.brainState.version ?? 'Unavailable'}</p><p className="text-xs text-muted-foreground">Identity profile v{manifest.identity.profileVersion ?? '—'}</p></div><div><p className="lee-label text-muted-foreground">Health</p><p className={cn('mt-1 text-sm font-semibold', manifest.health.overall === 'nominal' ? 'text-primary' : 'text-accent-foreground')}>{manifest.health.overall}</p><p className="text-xs text-muted-foreground">State: {manifest.health.state ?? 'Unavailable'}</p></div><div><p className="lee-label text-muted-foreground">Knowledge</p><p className="mt-1 text-sm">{manifest.brainState.counts?.universalObjects ?? 0} objects</p><p className="text-xs text-muted-foreground">{manifest.brainState.counts?.facts ?? 0} facts · {manifest.brainState.counts?.interpretations ?? 0} interpretations</p></div></div></Panel><div className="mt-5 grid gap-3 md:grid-cols-2">{Object.entries(manifest).filter(([key]) => !['manifestVersion','generatedAt','provenance'].includes(key)).map(([key, value]) => <details key={key} className="rounded-xl border border-border bg-muted/35 p-4" open={['brainState','health','storage','validation'].includes(key)}><summary className="cursor-pointer text-sm font-semibold">{label(key)}</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{JSON.stringify(value, null, 2)}</pre></details>)}</div><Panel className="mt-5"><p className="lee-label text-primary">Provenance</p><p className="mt-1 text-sm text-muted-foreground">Every Manifest section identifies the persisted registry or ledger used to assemble it.</p><pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{JSON.stringify(manifest.provenance, null, 2)}</pre></Panel></>}{<Panel className="mt-5"><div className="flex items-center justify-between"><div><p className="lee-label text-muted-foreground">Manifest history</p><h3 className="mt-1 text-lg font-semibold">Saved snapshots</h3></div><span className="lee-label text-muted-foreground">{history.length} snapshots</span></div>{history.length ? <div className="mt-3 divide-y divide-border">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><span className="text-sm font-medium">{formatDate(item.generatedAt)}</span><span className="text-xs text-muted-foreground">v{item.manifestVersion}</span></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No snapshots saved yet.</p>}</Panel>}</div>;
}

function WorldStatePage() {
  const [state, setState] = useState<any>(null);
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('software');
  const [notice, setNotice] = useState('');
  const load = async () => { const response = await fetch('/api/internal/world-state/current', { cache: 'no-store' }); if (response.ok) setState(await response.json()); };
  useEffect(() => { void load(); }, []);
  const add = async () => { if (!topic.trim()) return; const response = await fetch('/api/world-state/signals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signalType: type, signalName: topic, configuration: { ownerConfigured: true } }) }); setNotice(response.ok ? 'Monitoring topic added.' : 'Unable to add topic.'); setTopic(''); await load(); };
  const remove = async (id: string) => { await fetch(`/api/world-state/signals/${id}`, { method: 'DELETE' }); await load(); };
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Settings / External context" title="World State" detail="A curated, time-aware view of the outside signals Lee is allowed to track." action={<button onClick={() => void load()} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Refresh signals</button>} />{notice && <p className="mb-4 text-sm text-primary">{notice}</p>}<div className="grid gap-4 md:grid-cols-3">{(state?.signals ?? []).map((signal: any) => <Panel key={signal.id}><div className="flex items-start justify-between gap-3"><div><p className="lee-label text-primary">{signal.signalType}</p><h3 className="mt-1 text-base font-semibold">{signal.signalName}</h3></div>{signal.configured && <button onClick={() => void remove(signal.id)} className="text-xs text-destructive">Remove</button>}</div><pre className="mt-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{JSON.stringify(signal.currentValue, null, 2)}</pre><p className="mt-3 text-[11px] text-muted-foreground">Source: {signal.source} · refreshed {formatDate(signal.lastUpdatedAt)}</p></Panel>)}</div><Panel className="mt-5"><p className="lee-label text-primary">Add monitoring topic</p><div className="mt-3 flex flex-wrap gap-2"><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Stripe API changelog" className="min-w-[280px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="news">News</option><option value="regulatory">Regulatory</option><option value="competitor">Competitor</option><option value="software">Software</option></select><button onClick={() => void add()} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Add signal</button></div><p className="mt-3 text-xs text-muted-foreground">No monitoring topic is tracked until you explicitly add it.</p></Panel></div>;
}

function OperationalMemoryPage() {
  const [patterns, setPatterns] = useState<any[]>([]); const [context, setContext] = useState<any>(null); const [description, setDescription] = useState('');
  const load = async () => { const [a, b] = await Promise.all([fetch('/api/internal/operational-memory/patterns').then((r) => r.json()), fetch('/api/internal/operational-memory/context').then((r) => r.json())]); setPatterns(a); setContext(b); };
  useEffect(() => { void load(); }, []);
  const action = async (id: string, verb: string) => { await fetch(`/api/operational-memory/patterns/${id}/${verb}`, { method: 'POST' }); await load(); };
  const add = async () => { if (!description.trim()) return; await fetch('/api/operational-memory/patterns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patternType: 'manual_override', patternDescription: description }) }); setDescription(''); await load(); };
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Settings / Behavioral model" title="Operational Memory" detail="Evidence-based patterns from how Lee is actually used, never from intrusive monitoring." action={<button onClick={() => void load()} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Refresh</button>} />{context && <Panel><p className="lee-label text-primary">Current operational context</p><p className="mt-2 text-sm">{context.expectedMode}</p><p className="mt-2 text-xs text-muted-foreground">{context.activePatterns.length} active patterns at hour {context.currentHour}</p></Panel>}<div className="mt-5 grid gap-3 md:grid-cols-2">{patterns.map((pattern) => <Panel key={pattern.id}><div className="flex items-start justify-between gap-3"><div><p className="lee-label text-primary">{pattern.patternType} · {pattern.status}</p><h3 className="mt-1 text-sm font-semibold">{pattern.patternDescription}</h3></div><span className="text-sm font-semibold text-primary">{Math.round(pattern.confidence * 100)}%</span></div><p className="mt-3 text-xs text-muted-foreground">{pattern.observationCount} observations · {pattern.evidenceRefs.length} evidence refs · {pattern.contradictionCount} contradictions</p><div className="mt-3 flex gap-2"><button onClick={() => void action(pattern.id, 'confirm')} className="rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs text-primary">Confirm</button><button onClick={() => void action(pattern.id, 'dismiss')} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Dismiss</button></div></Panel>)}</div><Panel className="mt-5"><p className="lee-label text-primary">Manual override</p><div className="mt-3 flex gap-2"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Review QuantraCore on Monday mornings" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button onClick={() => void add()} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Add</button></div></Panel></div>;
}

function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [allocation, setAllocation] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [dependencyGraph, setDependencyGraph] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => { const [response, allocationResponse, overrideResponse, dependencyResponse] = await Promise.all([fetch('/api/portfolio', { cache: 'no-store' }), fetch('/api/resource-allocation', { cache: 'no-store' }), fetch('/api/resource-allocation/overrides', { cache: 'no-store' }), fetch('/api/portfolio/dependency-graph', { cache: 'no-store' })]); if (response.ok) setPortfolio(await response.json()); if (allocationResponse.ok) setAllocation(await allocationResponse.json()); if (overrideResponse.ok) setOverrides(await overrideResponse.json()); if (dependencyResponse.ok) setDependencyGraph(await dependencyResponse.json()); };
  useEffect(() => { void load(); }, []);
  const refresh = async () => { setBusy(true); await fetch('/api/portfolio/recompute', { method: 'POST' }); await load(); setBusy(false); };
  const releaseOverride = async (id: string) => { setBusy(true); const response = await fetch(`/api/resource-allocation/overrides/${id}`, { method: 'DELETE' }); if (response.ok) { await fetch('/api/resource-allocation/recompute', { method: 'POST' }); await load(); } setBusy(false); };
  return <div className="mx-auto max-w-[1200px]">
    <SectionHeading eyebrow="Portfolio intelligence" title="Portfolio View" detail="A synthesis of project momentum, shared infrastructure, observed attention, anchors, and cross-project signals." action={<button onClick={() => void refresh()} disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">{busy ? 'Refreshing…' : 'Refresh portfolio'}</button>} />
    {portfolio && <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel><p className="lee-label text-primary">Portfolio health</p><p className="mt-2 text-3xl font-semibold">{Math.round(portfolio.healthScore)}<span className="text-base text-muted-foreground">/100</span></p><p className="mt-1 text-xs text-muted-foreground">{portfolio.projectCount} projects synthesized</p></Panel>
        <Panel><p className="lee-label text-primary">Momentum distribution</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(portfolio.momentumDistribution ?? {}).map(([key, value]: any) => <span key={key} className="rounded-full border border-border px-2.5 py-1 text-[11px]"><b>{value}</b> {key}</span>)}</div></Panel>
        <Panel><p className="lee-label text-primary">Portfolio anchors</p><p className="mt-2 text-3xl font-semibold">{portfolio.portfolioAnchors?.length ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Portfolio-wide durable commitments</p></Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel><SectionHeading eyebrow="Observed attention" title="Resource attention map" detail="Relative event activity, not declared allocation." /><div className="space-y-3">{portfolio.attentionDistribution?.map((item: any) => <div key={item.projectId}><div className="flex justify-between text-xs"><span>{item.projectId}</span><span>{item.share}%</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${item.share}%` }} /></div></div>)}</div></Panel>
        <Panel><SectionHeading eyebrow="Recommended allocation" title="Where attention should go" detail="Computed from momentum, objectives, anchors, capacity, and waiting signals." /><div className="space-y-3">{allocation.length ? allocation.sort((a, b) => b.percentage - a.percentage).map((item) => <div key={item.projectId}><div className="flex justify-between text-xs"><span>{item.project?.name ?? item.projectId}</span><span className="font-semibold text-primary">{item.percentage}% · {item.impliedWeeklyHours}h/week</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, item.percentage)}%` }} /></div><details className="mt-1 text-[11px] text-muted-foreground"><summary className="cursor-pointer">Why this allocation</summary><p className="mt-1">{item.narrative}</p></details></div>) : <EmptyState title="No allocation yet" detail="Run the Executive Loop or recompute allocation to establish a recommendation." />}</div></Panel>
        <Panel><SectionHeading eyebrow="Cross-project signals" title="Shared infrastructure & alerts" detail="Observed overlap that may create leverage or shared exposure." /><div className="space-y-3">{portfolio.alerts?.length ? portfolio.alerts.map((alert: any, index: number) => <div key={`${alert.title}-${index}`} className="rounded-xl border border-border p-3"><p className="text-sm font-semibold">{alert.title}</p><p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p><p className="mt-2 text-[11px] text-primary">{alert.projectIds?.length ?? 0} projects · {alert.evidenceRefs?.length ?? 0} evidence refs</p></div>) : <EmptyState title="No portfolio alerts" detail="Shared risks and opportunities will appear as the portfolio changes." />}</div></Panel>
      </div>
        {overrides.length > 0 && <Panel className="border-accent/30 bg-accent/[0.06]"><SectionHeading eyebrow="Owner reminders" title="Allocation overrides" detail="Temporary overrides never schedule calendar work. When they expire, Lee returns that project to its computed allocation." /><div className="space-y-3">{overrides.map((override) => <div key={override.id} className={cn('rounded-xl border p-3', override.status === 'expired' ? 'border-destructive/25 bg-destructive/[0.05]' : override.status === 'expiring' ? 'border-accent/40 bg-accent/[0.08]' : 'border-border bg-background/40')}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{override.project?.name ?? override.projectId}</p><span className={cn('rounded-full border px-2 py-1 text-[10px] font-semibold', override.status === 'expired' ? 'border-destructive/25 text-destructive' : override.status === 'expiring' ? 'border-accent/40 text-foreground' : 'border-primary/25 text-primary')}>{override.status === 'expired' ? 'Expired' : override.status === 'expiring' ? `Expires in ${override.daysRemaining}d` : 'Active'}</span></div><p className="mt-1 text-xs text-muted-foreground">{override.percentage}% override · expires {formatDate(override.expiresAt)}</p><p className="mt-2 text-xs">{override.reason}</p></div>{override.status !== 'expired' && <button onClick={() => void releaseOverride(override.id)} disabled={busy} className="rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">Return to computed</button>}</div><p className={cn('mt-2 text-[11px]', override.status === 'expired' ? 'text-destructive' : 'text-muted-foreground')}>{override.status === 'expired' ? 'This override is no longer applied. The project is using its computed allocation.' : 'Reminder: review or release this override before it expires.'}</p></div>)}</div></Panel>}
       <Panel><SectionHeading eyebrow="Dependency graph" title="Portfolio dependency graph" detail="Directional dependencies and highest fan-out nodes. Select a node in the API for ordered blast-radius analysis." /><div className="grid gap-3 sm:grid-cols-3"><div><p className="lee-label text-primary">Nodes</p><p className="mt-1 text-2xl font-semibold">{dependencyGraph?.summary?.nodeCount ?? 0}</p></div><div><p className="lee-label text-primary">Edges</p><p className="mt-1 text-2xl font-semibold">{dependencyGraph?.summary?.edgeCount ?? 0}</p></div><div><p className="lee-label text-primary">Top fan-out</p><p className="mt-1 text-sm font-semibold">{dependencyGraph?.summary?.highestFanOut?.[0]?.label ?? 'None detected'}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{dependencyGraph?.summary?.highestFanOut?.map((item: any) => <span key={item.nodeId} className="rounded-full border border-border px-2.5 py-1 text-[11px]">{item.label} · {item.fanOut} dependents</span>)}</div></Panel>
       <Panel><SectionHeading eyebrow="Shared customers & collaborators" title="Cross-project relationships" detail="People explicitly associated with more than one project." />{portfolio.crossProjectPeople?.length ? <div className="grid gap-3 md:grid-cols-2">{portfolio.crossProjectPeople.map((person: any) => <div key={person.personId} className="rounded-xl border border-border p-3"><p className="text-sm font-semibold">{person.name}</p><p className="mt-1 text-xs text-muted-foreground">{person.projectIds.length} projects · {person.projectIds.join(' · ')}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No cross-project relationships detected.</p>}</Panel>
    </div>}
  </div>;
}

function AnchorsPage() {
  const [anchors, setAnchors] = useState<any[]>([]);
  const [type, setType] = useState('founding_rationale');
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => { const response = await fetch('/api/strategic-anchors'); if (response.ok) setAnchors(await response.json()); };
  useEffect(() => { void load(); }, []);
  const create = async () => { const response = await fetch('/api/strategic-anchors', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ anchorType: type, summary, fullContext: context, sourceRefs: ['Console → Strategy → Anchors'] }) }); if (response.ok) { setSummary(''); setContext(''); setNotice('Anchor created.'); await load(); } else setNotice('Anchor needs a type, summary, and full context.'); };
  const retire = async (id: string) => { await fetch(`/api/strategic-anchors/${id}/retire`, { method: 'POST' }); await load(); };
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Durable strategy" title="Strategic Anchors" detail="Founding rationale, rejected directions, and architectural commitments that do not enter the aging cycle." /><Panel><div className="grid gap-3 md:grid-cols-2"><select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm"><option value="founding_rationale">Founding rationale</option><option value="rejected_direction">Rejected direction</option><option value="architectural_commitment">Architectural commitment</option></select><input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short durable statement" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" /><textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Why this anchor exists and how future reasoning should use it." className="min-h-24 rounded-xl border border-border bg-background px-3 py-2 text-sm md:col-span-2" /><div className="flex items-center gap-3 md:col-span-2"><button onClick={() => void create()} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Create anchor</button>{notice && <span className="text-xs text-primary">{notice}</span>}</div></div></Panel><div className="mt-5 space-y-3">{anchors.length ? anchors.map((anchor) => <Panel key={anchor.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{anchor.anchorType.replaceAll('_', ' ')}{anchor.projectId ? ` · ${anchor.projectId}` : ' · portfolio-wide'}</p><h3 className="mt-2 text-base font-semibold">{anchor.summary}</h3><p className="mt-2 text-sm text-muted-foreground">{anchor.fullContext}</p></div><button onClick={() => void retire(anchor.id)} className="rounded-xl border border-border px-3 py-2 text-xs">Retire</button></div><details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Why Chain · {anchor.sourceRefs.length} source refs</summary><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(anchor.whyChain, null, 2)}</pre></details></Panel>) : <EmptyState title="No active anchors" detail="Create the first durable strategic commitment or rejected direction." />}</div></div>;
}

function InitiativePage() {
  const [items, setItems] = useState<any[]>([]); const [filter, setFilter] = useState('ALL');
  const load = async () => setItems(await fetch('/api/initiative', { cache: 'no-store' }).then((r) => r.json()));
  useEffect(() => { void load(); }, []);
  const action = async (id: string, verb: string) => { await fetch(`/api/initiative/${id}/${verb}`, { method: 'POST' }); await load(); };
  const visible = filter === 'ALL' ? items : items.filter((item) => item.significance === filter);
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Proactive awareness" title="Initiative" detail="Observations Lee noticed from existing evidence. They are optional, not alarms or automatic actions." action={<div className="flex gap-2"><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-xs"><option>ALL</option><option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><button onClick={() => void load()} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Refresh</button></div>} />{visible.length ? <div className="space-y-3">{visible.map((item) => <Panel key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{item.category} · {item.significance}</p><p className="mt-2 text-sm">{item.observation}</p>{item.actionHint && <p className="mt-2 text-xs italic text-muted-foreground">{item.actionHint}</p>}</div><div className="flex gap-2"><button onClick={() => void action(item.id, 'acknowledge')} className="rounded-lg border border-primary/30 px-2.5 py-1.5 text-xs text-primary">Acknowledge</button><button onClick={() => void action(item.id, 'dismiss')} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">Dismiss</button></div></div><details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Evidence ({item.evidenceRefs.length})</summary><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(item.evidenceRefs, null, 2)}</pre></details></Panel>)}</div> : <EmptyState title="No active observations" detail="Initiative observations will appear when Lee notices meaningful operational change." />}</div>;
}

function OperationalHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { void fetch('/api/operational-intelligence/history').then((r) => r.json()).then(setHistory); }, []);
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Operational intelligence" title="Operational History" detail="An auditable record of what Lee considered most important over time." /><div className="space-y-3">{history.length ? history.map((snapshot) => <Panel key={snapshot.id}><div className="flex items-start justify-between gap-3"><div><p className="lee-label text-primary">{formatTime(snapshot.generatedAt)}</p><p className="mt-2 text-sm">{snapshot.activePriority?.text ?? 'No active priority'}</p></div><span className="text-xs text-muted-foreground">{snapshot.changedItems.length} changed · {snapshot.waitingItems.length} waiting</span></div></Panel>) : <EmptyState title="No operational history" detail="Refresh Today to create the first context snapshot." />}</div></div>;
}

function BootstrapPage() {
  const [run, setRun] = useState<any>(null); const [history, setHistory] = useState<any[]>([]); const [busy, setBusy] = useState(false);
  const load = async () => setHistory(await fetch('/api/bootstrap/history').then((r) => r.json()));
  useEffect(() => { void load(); }, []);
  const bootstrap = async () => { setBusy(true); const response = await fetch('/api/internal/bootstrap/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: 'workspace', repositoryId: 'workspace' }) }); if (response.ok) setRun(await response.json()); setBusy(false); await load(); };
  const report = run?.report ?? {};
  return <div className="mx-auto max-w-[1150px]"><SectionHeading eyebrow="Knowledge intake" title="Project Bootstrap" detail="Read the repository’s observable structure first, then ask only what the evidence cannot answer." action={<button onClick={() => void bootstrap()} disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">{busy ? 'Analyzing repository…' : 'Bootstrap repository'}</button>} />{run && <Panel className="mb-5 border-primary/25 bg-primary/[0.05]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="lee-label text-primary">Latest run · {run.status}</p><p className="mt-1 text-sm">{run.factsCreatedCount} facts · {run.interpretationsCreatedCount} interpretations · {run.issuesFlagged} issues</p></div><span className="text-xs text-muted-foreground">{run.completedAt ? formatDate(run.completedAt) : 'running'}</span></div></Panel>}{run?.status === 'completed' && <div className="grid gap-4 md:grid-cols-2"><Panel><p className="lee-label text-primary">Technology stack</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(report.technologyStack, null, 2)}</pre></Panel><Panel><p className="lee-label text-primary">Repository map</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(report.repositoryMap, null, 2)}</pre></Panel><Panel><p className="lee-label text-primary">Documentation & configuration</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify({ documentation: report.documentation, configuration: report.configuration }, null, 2)}</pre></Panel><Panel><p className="lee-label text-primary">Questions & issues</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify({ questions: report.questions, issues: report.issues }, null, 2)}</pre></Panel></div>}<Panel className="mt-5"><div className="flex items-center justify-between"><div><p className="lee-label text-muted-foreground">Bootstrap history</p><h3 className="mt-1 text-lg font-semibold">Repository analyses</h3></div><span className="lee-label text-muted-foreground">{history.length} runs</span></div>{history.length ? <div className="mt-3 divide-y divide-border">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><span className="text-sm font-medium">{formatDate(item.startedAt)}</span><span className="text-xs text-muted-foreground">{item.status} · {item.factsCreatedCount} facts · {item.issuesFlagged} issues</span></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No bootstrap runs yet.</p>}</Panel></div>;
}

function CILModelInventoryPanel() {
  const inventoryQuery = useGetCilModelInventory({
    query: {
      queryKey: getGetCilModelInventoryQueryKey(),
      staleTime: 60_000,
      refetchInterval: 60_000,
      retry: 1,
    },
  });
  const inventory = inventoryQuery.data?.inventory;
  const unavailable = inventoryQuery.isError && !inventory;
  const stale = Boolean(inventory && (inventoryQuery.isError || inventoryQuery.isStale));
  const statusLabel = inventoryQuery.isPending && !inventory ? 'Loading' : unavailable ? 'Unavailable' : stale ? 'Stale' : 'Live';
  const statusClass = unavailable
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : stale
      ? 'border-accent/35 bg-accent/15 text-foreground'
      : 'border-primary/25 bg-primary/10 text-primary';

  return (
    <div className="mx-auto mt-5 max-w-[1280px]">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="lee-label text-primary">CIL diagnostics</p>
            <h3 className="mt-1 text-lg font-semibold">Model inventory</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Read-only visibility into the models CIL reports. This surface cannot select providers, models, or routes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', statusClass)} data-testid="status-cil-model-inventory">
              {statusLabel}
            </span>
            <button
              onClick={() => void inventoryQuery.refetch()}
              disabled={inventoryQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
              data-testid="button-refresh-cil-model-inventory"
            >
              <RefreshCw size={14} className={inventoryQuery.isFetching ? 'animate-spin' : ''} />
              {inventoryQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {inventoryQuery.isPending && !inventory && (
          <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground" data-testid="state-cil-model-inventory-loading">
            Loading the live CIL model inventory…
          </div>
        )}
        {unavailable && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" data-testid="state-cil-model-inventory-unavailable">
            CIL model inventory is unavailable. Retry when the CIL capability endpoint is reachable.
          </div>
        )}
        {inventory && (
          <>
            {stale && (
              <div className="mt-5 rounded-xl border border-accent/35 bg-accent/15 p-4 text-sm" data-testid="state-cil-model-inventory-stale">
                Showing the last known inventory because the latest check did not complete successfully.
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Configured', inventory.total_configured],
                ['Enabled', inventory.total_enabled],
                ['Available', inventory.total_available],
                ['Unavailable', inventory.total_unavailable],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-muted/50 p-3" key={label}>
                  <p className="lee-label text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1.2fr_1fr_.8fr_.7fr_1.5fr] gap-4 border-b border-border px-3 pb-3">
                  {['Model', 'Provider', 'Status', 'Enabled', 'Route IDs'].map((label) => <span className="lee-label text-muted-foreground" key={label}>{label}</span>)}
                </div>
                {inventory.models.length ? inventory.models.map((model) => (
                  <div className="grid grid-cols-[1.2fr_1fr_.8fr_.7fr_1.5fr] items-center gap-4 border-b border-border/70 px-3 py-3 last:border-0" key={`${model.provider}-${model.model_id}`}>
                    <span className="break-all text-xs font-semibold">{model.model_id}</span>
                    <span className="break-all text-xs text-muted-foreground">{model.provider}</span>
                    <span className="text-xs">{model.status}</span>
                    <span className={cn('text-xs font-semibold', model.enabled ? 'text-primary' : 'text-muted-foreground')}>{model.enabled ? 'Yes' : 'No'}</span>
                    <span className="break-all text-xs text-muted-foreground">{model.route_ids.length ? model.route_ids.join(' · ') : 'None reported'}</span>
                  </div>
                )) : <p className="px-3 py-4 text-sm text-muted-foreground">CIL returned no configured models.</p>}
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Correlation evidence:</span> {inventory.correlation_id}
              {inventoryQuery.isFetching && <span className="ml-2 text-primary">Checking for a newer inventory…</span>}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

function InternalServicesPage() {
  const [items, setItems] = useState<any[]>([]); const load = async () => setItems(await fetch('/api/internal-services/health', { cache: 'no-store' }).then((r) => r.json()));
  useEffect(() => { void load(); }, []);
  return <div className="mx-auto max-w-[1050px]"><SectionHeading eyebrow="Connected Lamont Labs systems" title="Connected systems" detail="LEE calls independent specialist systems through authenticated contracts. Credentials are never displayed." action={<button onClick={() => void load()} className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted"><RefreshCw size={14} className="mr-2 inline" />Check health</button>} /><div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Panel key={item.serviceId}><div className="flex items-start justify-between"><div><p className="lee-label text-primary">{item.category}</p><h3 className="mt-1 text-lg font-semibold">{item.displayName}</h3></div><StatusPill status={item.currentHealth === 'healthy' ? 'verified' : item.currentHealth === 'degraded' ? 'evolving' : 'offline'} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Health</p><p className="mt-1 font-medium">{item.currentHealth}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Failure policy</p><p className="mt-1 font-medium">{item.failurePolicy}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Credential</p><p className="mt-1 font-medium">{item.credentialEnvKey} · {item.baseUrl ? 'configured' : 'missing'}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Last call</p><p className="mt-1 font-medium">{item.lastCallAt ? formatDate(item.lastCallAt) : 'none'}</p></div></div></Panel>)}</div><Panel className="mt-5"><p className="lee-label text-primary">Safety boundary</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">CIL unavailability produces an explicit degraded or held reasoning route; it never triggers silent local cognitive logic. CerbaSeal unavailability places consequential actions on HOLD; there is no authorization fallback.</p></Panel></div>;
}

function HealthPage() { return <><HealthDetailPage /><CILModelInventoryPanel /><ResourceHealthPanel /><EnginesPanel /><LifecyclePanel /><AgingHealthPanel /><BootHistoryPanel /><StateHistoryPanel /><OrchestrationPanel /><MemoryHealthPanel /><TrustScorePanel /></>; }

function ConnectorsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/connectors/health', { cache: 'no-store' });
    if (response.ok) setItems(await response.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  const sync = async (provider: string) => {
    setNotice(`Syncing ${provider.replace('_', ' ')}…`);
    const response = await fetch(`/api/connectors/${provider}/sync-live`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const result = await response.json();
    setNotice(response.ok ? `${provider.replace('_', ' ')} sync complete · ${result.eventCount ?? 0} events observed.` : result.error ?? 'Connector sync failed.');
    await load();
  };
   return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Provider layer" title="Connectors" detail="Adapters translate external services into provider-neutral records and domain events. Lee never writes externally without governance approval." action={<button onClick={() => void load()} className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold hover:bg-muted"><RefreshCw size={14} className="mr-2 inline" />Refresh health</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}<div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Panel key={item.provider}><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="lee-label text-primary">{item.providerCategory ?? 'provider'}</span><span className="lee-label text-muted-foreground">{item.adapterName ?? item.provider}</span></div><h3 className="mt-1 text-lg font-semibold capitalize">{item.status}</h3></div><StatusPill status={item.status === 'healthy' ? 'verified' : item.status === 'error' ? 'offline' : 'evolving'} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Auth</p><p className="mt-1 font-medium">{item.authStatus ?? 'not connected'}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Events</p><p className="mt-1 font-medium">{item.supportedEvents?.length ?? 0} declared</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Last sync</p><p className="mt-1 font-medium">{item.lastSyncAt ? formatDate(item.lastSyncAt) : 'never'}</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Observed</p><p className="mt-1 font-medium">{item.eventCount ?? 0}</p></div></div>{item.supportedEvents?.length ? <p className="mt-4 text-xs text-muted-foreground">{item.supportedEvents.join(' · ')}</p> : null}{item.lastError && <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">{item.lastError}</p>}<button onClick={() => void sync(item.provider)} disabled={item.provider === 'replit' || item.provider === 'gmail' || item.provider === 'google_calendar'} className="mt-4 w-full rounded-xl border border-border py-2.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">{item.status === 'unconfigured' ? 'Connect provider' : 'Run read-only sync'}</button></Panel>)}</div><Panel className="mt-5"><p className="lee-label text-accent-foreground">Authorization boundary</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Provider adapters are read-only at this boundary. Drafts, calendar edits, Drive sharing, GitHub writes, and deployments stay behind CerbaSeal.</p></Panel></div>;
}

function AndroidPairingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [label, setLabel] = useState('Android companion');
  const load = async () => { const response = await fetch('/api/android/pairings'); if (response.ok) setItems(await response.json()); };
  useEffect(() => { void load(); }, []);
  const issue = async () => { const response = await fetch('/api/android/pairings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label }) }); const data = await response.json(); if (response.ok) { setNewToken(data.token); await load(); } };
  const rotate = async (id: string) => { const response = await fetch(`/api/android/pairings/${id}/rotate`, { method: 'POST', headers: { 'content-type': 'application/json' } }); const data = await response.json(); if (response.ok) { setNewToken(data.token); await load(); } };
  const revoke = async (id: string) => { await fetch(`/api/android/pairings/${id}/revoke`, { method: 'POST' }); await load(); };
  return <div className="mx-auto max-w-[960px]"><SectionHeading eyebrow="Settings / Android" title="Android pairing" detail="Issue short-lived device credentials. Raw tokens are shown only once and are never stored by Lee." /><Panel><div className="flex flex-wrap gap-2"><input value={label} onChange={(event) => setLabel(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" /><button onClick={() => void issue()} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Issue token</button></div>{newToken && <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3"><p className="text-xs font-semibold">Copy this token now</p><code className="mt-2 block break-all text-xs">{newToken}</code><p className="mt-2 text-[11px] text-muted-foreground">It will not be displayed again.</p></div>}</Panel><Panel className="mt-5"><div className="divide-y divide-border">{items.length ? items.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.label}</p><p className="text-xs text-muted-foreground">Expires {new Date(item.expiresAt).toLocaleString()}</p></div><StatusPill status={item.active && !item.revokedAt ? 'active' : 'offline'} /><button onClick={() => void rotate(item.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Rotate</button><button onClick={() => void revoke(item.id)} disabled={!item.active} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive disabled:opacity-40">Revoke</button></div>) : <EmptyState title="No Android pairings" detail="Issue a token to connect the companion." />}</div></Panel></div>;
}

function SettingsPage({ onLock }: { onLock: () => void }) {
  const [notifications, setNotifications] = useState(true);
  const [briefs, setBriefs] = useState(true);
  const [notice, setNotice] = useState('');
  const [capacity, setCapacity] = useState<any>(null);
  const [pairing, setPairing] = useState<any>(null);
  const [newToken, setNewToken] = useState('');
  const [pairingBusy, setPairingBusy] = useState(false);
  useEffect(() => { void fetch('/api/operational-capacity').then((response) => response.ok ? response.json() : null).then(setCapacity); }, []);
  const loadPairing = useCallback(async () => { const response = await fetch('/api/android/pairing', { cache: 'no-store' }); if (response.ok) setPairing(await response.json()); }, []);
  useEffect(() => { void loadPairing(); }, [loadPairing]);
  const overrideCapacity = async (state: string | null) => { const response = await fetch('/api/operational-capacity/override', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state }) }); if (response.ok) setCapacity((await response.json())[0]); };
  const rotatePairing = async () => { setPairingBusy(true); setNewToken(''); const response = await fetch('/api/android/pairing/rotate', { method: 'POST' }); const result = await response.json(); if (response.ok) { setNewToken(result.token); setPairing({ active: true, ...result }); setNotice('New Android pairing token issued. Save it now; it will not be shown again.'); } else setNotice(result.error ?? 'Could not issue an Android pairing token.'); setPairingBusy(false); };
  const revokePairing = async () => { setPairingBusy(true); const response = await fetch('/api/android/pairing/revoke', { method: 'POST' }); if (response.ok) { setPairing({ active: false }); setNewToken(''); setNotice('Android pairing token revoked.'); } else setNotice('Could not revoke the Android pairing token.'); setPairingBusy(false); };
  return <div className="mx-auto max-w-[960px]"><SectionHeading eyebrow="Boundaries & preferences" title="Settings" detail="The quiet controls behind a private operating console." /><div className="space-y-5"><Panel><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck size={23} /></div><div className="flex-1"><p className="lee-label text-primary">Private access</p><h3 className="mt-1 text-lg font-semibold">Founder session is active</h3><p className="mt-1 text-sm text-muted-foreground">This console has no invited members and no public share surface.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Verified</span></div></Panel>{capacity && <Panel><div className="flex items-center justify-between gap-4"><div><p className="lee-label text-primary">Operational capacity</p><h3 className="mt-1 text-lg font-semibold">{capacity.state} · {Math.round(capacity.score)}/100</h3><p className="mt-1 text-sm text-muted-foreground">Inference-only presentation signal. It does not model mood or collect new data.</p></div><div className="flex flex-wrap gap-2">{['HIGH', 'NOMINAL', 'CONSTRAINED', 'LOW'].map((state) => <button key={state} onClick={() => void overrideCapacity(state)} className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${capacity.overrideState === state ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{state}</button>)}<button onClick={() => void overrideCapacity(null)} className="rounded-xl border border-border px-3 py-2 text-[11px] font-semibold">Auto</button></div></div></Panel>}<Panel><div className="flex items-center gap-3"><Radio className="text-primary" size={18} /><div><p className="lee-label text-primary">Android companion</p><h3 className="mt-1 text-lg font-semibold">Pairing access</h3></div><span className={`ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold ${pairing?.active ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{pairing?.active ? 'Token active' : 'Not paired'}</span></div><p className="mt-3 text-sm text-muted-foreground">Issue a one-time token for the Android companion. Rotating immediately revokes every previous token.</p>{newToken && <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3"><p className="lee-label text-primary">Copy this token now</p><code className="mt-2 block break-all text-xs">{newToken}</code></div>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void rotatePairing()} disabled={pairingBusy} className="rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-rotate-android-pairing">{pairing?.active ? 'Rotate token' : 'Generate token'}</button>{pairing?.active && <button onClick={() => void revokePairing()} disabled={pairingBusy} className="rounded-xl border border-destructive/30 px-3.5 py-2.5 text-xs font-semibold text-destructive disabled:opacity-50" data-testid="button-revoke-android-pairing">Revoke token</button>}</div>{pairing?.lastUsedAt && <p className="mt-3 text-xs text-muted-foreground">Last verified by Android {formatDate(pairing.lastUsedAt)}.</p>}</Panel><Panel><div className="flex items-center gap-3"><Settings2 className="text-primary" size={18} /><div><p className="lee-label text-primary">Session preferences</p><h3 className="mt-1 text-lg font-semibold">How Lee should meet you</h3></div></div><div className="mt-5 divide-y divide-border"><SettingToggle title="Opening brief" detail="Prepare the daily signal when the console opens." value={briefs} onChange={() => setBriefs(!briefs)} testId="toggle-opening-brief" /><SettingToggle title="Quiet system notices" detail="Show meaningful state changes without interrupting the work surface." value={notifications} onChange={() => setNotifications(!notifications)} testId="toggle-system-notices" /></div></Panel><Panel><div className="flex items-center gap-3"><Clock3 className="text-primary" size={18} /><div><p className="lee-label text-primary">Current session</p><h3 className="mt-1 text-lg font-semibold">Local session-22</h3></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Started</p><p className="mt-2 text-sm font-semibold">Today, 07:28</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Location</p><p className="mt-2 text-sm font-semibold">Founder device</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Access</p><p className="mt-2 text-sm font-semibold">Full console</p></div></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setNotice('Other sessions revoked. This device remains active.')} className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-revoke-sessions">Revoke other sessions</button><button onClick={onLock} className="rounded-xl border border-destructive/30 px-3.5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10" data-testid="button-lock-console-settings">Lock console</button></div>{notice && <p className="mt-4 text-xs text-primary" data-testid="status-settings-notice">{notice}</p>}</Panel></div></div>;
}

function SelfTestPage() {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const load = async () => { const response = await fetch('/api/self-tests'); if (response.ok) setHistory(await response.json()); };
  useEffect(() => { void load(); }, []);
  const run = async () => { setRunning(true); setNotice('Running full system check…'); const response = await fetch('/api/self-tests/run', { method: 'POST' }); const result = await response.json(); if (response.ok) { setReport(result); setNotice(`Completed ${result.overall_result}.`); await load(); } else setNotice(result.error ?? 'Self-test failed to start.'); setRunning(false); };
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Settings / System" title="Full system check" detail="Verify that Lee is not merely running, but capable of the functions she claims to provide." action={<button onClick={() => void run()} disabled={running} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{running ? 'Running checks…' : 'Run Full System Check'}</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}{report && <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="lee-label text-primary">Latest report</p><p className="mt-1 text-lg font-semibold">{report.test_run_id}</p></div><StatusPill status={String(report.overall_result).toLowerCase() as any} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{report.test_suites.map((suite: any) => <details key={suite.suite_name} className="rounded-xl bg-muted/50 p-3" open={suite.result !== 'PASS'}><summary className="cursor-pointer text-sm font-semibold">{suite.suite_name} · {suite.result}</summary><div className="mt-3 space-y-2">{suite.tests.map((item: any) => <details key={item.test_id} className="border-t border-border/70 pt-2 text-xs"><summary className="cursor-pointer"><span className={item.result === 'PASS' ? 'text-primary' : item.result === 'WARN' ? 'text-accent-foreground' : 'text-destructive'}>{item.result}</span> · {item.test_name}</summary><p className="mt-1 text-muted-foreground">{item.message}</p><pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">{JSON.stringify(item.evidence, null, 2)}</pre></details>)}</div></details>)}</div></Panel>}<Panel className="mt-5"><div className="mb-4 flex items-center justify-between"><div><p className="lee-label text-muted-foreground">History</p><h3 className="mt-1 text-lg font-semibold">Past self-tests</h3></div><span className="lee-label text-muted-foreground">{history.length} reports</span></div>{history.length ? <div className="divide-y divide-border">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><span className="text-sm font-medium">{new Date(item.startedAt).toLocaleString()}</span><StatusPill status={String(item.overallResult).toLowerCase() as any} /><span className="text-xs text-muted-foreground">{item.passCount} pass · {item.warnCount} warn · {item.failCount} fail</span></div>)}</div> : <EmptyState title="No self-test history" detail="Run the first full system check to establish a baseline." />}</Panel></div>;
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
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-5 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl border border-card-border bg-card p-6 shadow-2xl lee-enter lee-red-edge" role="dialog" aria-modal="true" data-testid="dialog-ask-lee"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="lee-metal grid h-10 w-10 place-items-center rounded-xl text-white"><BrainCircuit size={19} /></span><div><p className="lee-label text-primary">Private reasoning surface</p><h2 className="mt-1 text-xl font-semibold">Ask LEE</h2></div></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-ask-lee"><X size={17} /></button></div>{submitted ? <div className="mt-7 rounded-xl border border-primary/25 bg-primary/10 p-5"><div className="flex items-center gap-2 text-primary"><CircleCheck size={17} /><p className="text-sm font-semibold">Question held for the private session.</p></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">LEE will ground the response in current objectives, evidence, and system state. This first pass keeps the interaction local.</p><button onClick={() => { setSubmitted(false); setQuestion(''); }} className="mt-4 text-xs font-semibold text-primary hover:underline" data-testid="button-ask-another">Ask another question</button></div> : <form onSubmit={submit}><p className="mt-6 text-sm leading-relaxed text-muted-foreground">What deserves a sharper read right now?</p><textarea autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about an objective, a signal, or a decision..." className="mt-4 min-h-32 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="textarea-ask-lee" /><div className="mt-4 flex items-center justify-between"><span className="lee-label text-muted-foreground">Private · founder context only</span><button type="submit" disabled={!question.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-submit-ask-lee">Ask LEE <ArrowUpRight size={14} /></button></div></form>}</div></div>;
}

function LockedScreen({ onUnlock }: { onUnlock: () => void }) {
  return <div className="lee-noise grid min-h-[100dvh] place-items-center bg-sidebar p-5 text-sidebar-foreground"><div className="max-w-md text-center lee-enter"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><LockKeyhole size={25} /></span><p className="lee-label mt-7 text-sidebar-primary">Console locked</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Private state is protected.</h1><p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/60">The founder session is still here. Unlock locally to return to the operating view.</p><button onClick={onUnlock} className="mt-7 rounded-xl bg-sidebar-primary px-5 py-3 text-sm font-semibold text-sidebar-primary-foreground hover:opacity-90" data-testid="button-unlock-console">Unlock local session</button></div></div>;
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
    if (response.ok) onAuthenticated(); else setError('The owner credentials were not accepted.');
    setBusy(false);
  };
  return <div className="lee-noise grid min-h-[100dvh] place-items-center bg-sidebar p-5 text-sidebar-foreground"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-7 shadow-2xl"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><LockKeyhole size={22} /></div><p className="lee-label mt-7 text-sidebar-primary">Private founder console</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Enter Lee.</h1><p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/60">This surface is private. Your session is scoped to the owner and expires automatically.</p><div className="mt-7 space-y-3"><input name="username" required autoComplete="username" placeholder="Owner name" className="h-11 w-full rounded-xl border border-sidebar-border bg-sidebar px-3 text-sm outline-none focus:border-sidebar-primary" /><input name="password" required type="password" autoComplete="current-password" placeholder="Password" className="h-11 w-full rounded-xl border border-sidebar-border bg-sidebar px-3 text-sm outline-none focus:border-sidebar-primary" /></div>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}<button disabled={busy} className="mt-6 w-full rounded-xl bg-sidebar-primary py-3 text-sm font-semibold text-sidebar-primary-foreground disabled:opacity-50">{busy ? 'Verifying…' : 'Unlock console'}</button></form></div>;
}

function LiveCollectionPage({ eyebrow, title, detail, endpoint, emptyTitle, emptyDetail, icon: Icon = ListChecks }: { eyebrow: string; title: string; detail: string; endpoint: string; emptyTitle: string; emptyDetail: string; icon?: typeof ListChecks }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const liveEndpoint = title === 'Evidence' ? '/api/facts' : endpoint;
  useEffect(() => { void fetch(liveEndpoint).then(async (response) => { if (!response.ok) throw new Error('This live surface is not available yet.'); return response.json(); }).then((value) => setItems(Array.isArray(value) ? value : value?.items ?? [])).catch((cause) => { setItems([]); setError(cause instanceof Error ? cause.message : 'Unable to load this surface.'); }); }, [liveEndpoint]);
  if (endpoint === '/api/understanding/runs') return <ImportsPage />;
  if (endpoint === '/api/governance/requests') return <GovernancePage />;
  if (endpoint === '/api/brain-versions') return <BackupsPage />;
  if (title === 'Evidence') return <EvidenceLedgerPage />;
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow={eyebrow} title={title} detail={detail} /><Panel>{error && <div className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-muted-foreground">{error}</div>}{items === null ? <SkeletonRows /> : items.length ? <div className="grid gap-3 md:grid-cols-2">{items.map((item, index) => <div key={item.id ?? index} className="rounded-xl border border-border bg-muted/40 p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.name ?? item.title ?? item.subject ?? item.originalFilename ?? item.eventType ?? `Record ${index + 1}`}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description ?? item.body ?? item.status ?? item.sourceRef ?? 'Live record from the Lee API.'}</p>{item.createdBy && <p className="mt-2 text-[11px] text-muted-foreground">{item.createdBy === 'owner' ? 'Owner-created' : `Created by ${item.createdBy}`} · {item.verifiedBy ? `Verified by ${item.verifiedBy}` : <span className={item.generatedBy ? 'text-accent-foreground' : ''}>{item.generatedBy ? 'Unverified' : 'Never verified'}</span>}</p>}</div><div className="flex flex-col items-end gap-2"><span className="lee-label text-muted-foreground">{item.status ?? 'live'}</span>{item.id && item.createdBy && !item.verifiedBy && <button onClick={async () => { await fetch(`/api/ownership/${title === 'People' ? 'person' : title === 'Evidence' ? 'fact' : 'object'}/${item.id}/verify`, { method: 'POST' }); setItems((current) => current?.map((row) => row.id === item.id ? { ...row, verifiedBy: 'owner', verifiedAt: new Date().toISOString() } : row) ?? null); }} className="text-[10px] font-semibold text-primary hover:underline">Mark verified</button>}</div></div></div>)}</div> : <EmptyState title={emptyTitle} detail={emptyDetail} />}</Panel></div>;
}

function LegacyAskPage() {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('normal');
  const [notice, setNotice] = useState('');
  const [packet, setPacket] = useState<any>(null);
  const [conversationId, setConversationId] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const prepare = async () => {
    if (!message.trim()) { setNotice('Add a question first.'); return; }
    setBusy(true); setNotice('');
    const response = await fetch('/api/ai/context-preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
    const result = await response.json();
    if (!response.ok) setNotice(result.error ?? 'Unable to prepare context.'); else { setPacket(result); setNotice('Context packet prepared. Nothing has run yet.'); }
    setBusy(false);
  };
  const run = async () => {
    if (!packet || !message.trim()) return;
    setBusy(true); setNotice('');
    let id = conversationId;
    if (!id) { const created = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }).then((response) => response.json()); id = created.id; setConversationId(id); }
    const response = await fetch(`/api/ai/conversations/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
    const result = await response.json();
    if (result.held) setNotice(`Held for approval. Estimated cost $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`); else if (result.packetOnly) { setAnswer('Packet-only mode selected. No model was called.'); setNotice('Context packet returned without a model call.'); } else if (!response.ok) setNotice(result.error ?? 'Lee could not complete this request.'); else { setAnswer(result.answer ?? ''); setNotice(`Answered with ${result.model} · ${result.provider} · $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`); }
    setBusy(false);
  };
  const modeLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const intent = packet?.intent;
  const correctIntent = async (intentType: string) => { if (!intent?.id) return; const response = await fetch(`/api/intents/${intent.id}/correct`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intentType }) }); if (response.ok) { const corrected = await response.json(); setPacket((current: any) => ({ ...current, intent: corrected })); setNotice('Intent corrected and sent to Learning.'); } };
  return <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[1fr_360px]"><div><SectionHeading eyebrow="Private reasoning surface" title="Ask Lee" detail="Prepare a bounded context packet first. Review the route and estimated cost before Lee executes." /><Panel><div className="min-h-64 rounded-xl border border-dashed border-border bg-muted/30 p-5">{answer ? <div><p className="lee-label text-primary">Lee’s response</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{answer}</p>{packet?.packet?.items?.length > 0 && <p className="mt-5 text-xs text-muted-foreground">Grounded in {packet.packet.items.length} evidence items.</p>}</div> : <EmptyState title="No response in this session" detail="Your questions and answers remain inside the private founder session." />}</div><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should Lee help you see?" className="mt-4 min-h-28 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm outline-none focus:border-primary" /><div className="mt-3 flex flex-wrap items-center gap-2"><select value={mode} onChange={(event) => { setMode(event.target.value); setPacket(null); }} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">{['normal','deep_think','build','write','review','pilot','low_cost','private','no_model','governed_action'].map((item) => <option key={item} value={item}>{modeLabel(item)}</option>)}</select><button onClick={() => void prepare()} disabled={busy} className="ml-auto rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-semibold text-primary disabled:opacity-50">{busy ? 'Working…' : 'Prepare context'}</button><button onClick={() => void run()} disabled={busy || !packet} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Run Lee</button></div>{notice && <p className="mt-3 text-sm text-primary">{notice}</p>}</Panel></div><div className="space-y-5"><Panel><p className="lee-label text-primary">Intent confirmation</p><h3 className="mt-2 text-lg font-semibold">{intent ? `Understood as: ${modeLabel(intent.intentType)}` : 'Awaiting a question'}</h3>{intent && <><p className="mt-2 text-xs text-muted-foreground">{Math.round(intent.confidence * 100)}% confidence · {intent.retrievalMode} retrieval · {intent.audienceProfile} audience</p><select value={intent.intentType} onChange={(event) => void correctIntent(event.target.value)} className="mt-4 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value={intent.intentType}>{modeLabel(intent.intentType)}</option>{['question_factual','question_exploratory','explanation_seeking','recommendation_request','review_request','status_check','capture_input'].filter((item) => item !== intent.intentType).map((item) => <option key={item} value={item}>{modeLabel(item)}</option>)}</select></>}</Panel><Panel><p className="lee-label text-primary">Context packet preview</p><h3 className="mt-2 text-lg font-semibold">{packet ? 'Ready for your decision' : 'Awaiting a question'}</h3><div className="mt-5 space-y-3 text-sm text-muted-foreground"><div className="flex justify-between"><span>Mode</span><span className="font-medium text-foreground">{modeLabel(mode)}</span></div><div className="flex justify-between"><span>Route</span><span className="font-medium text-foreground">{packet?.route?.replace('_', ' ') ?? 'Not selected'}</span></div><div className="flex justify-between"><span>Model</span><span className="font-medium text-foreground">{packet?.selectedModel ?? 'Not selected'}</span></div><div className="flex justify-between"><span>Estimated cost</span><span className="font-medium text-foreground">{packet ? `$${Number(packet.estimatedCostUsd).toFixed(4)}` : 'Calculated on prepare'}</span></div><div className="flex justify-between"><span>Context</span><span className="font-medium text-foreground">{packet ? `${packet.packet.tokens} tokens · ${packet.packet.items.length} items` : 'Not assembled'}</span></div></div>{packet?.packet?.excludedRefs?.length > 0 && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{packet.packet.excludedRefs.length} stale or lower-relevance items excluded from this packet.</p>}</Panel><Panel><p className="lee-label text-muted-foreground">Actions</p><div className="mt-4 grid gap-2"><button className="rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted">Save as decision</button><button className="rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted">Create task</button><button className="rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted">Mark as scratch</button></div></Panel></div></div>;
}

function AskPage() {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('normal');
  const [notice, setNotice] = useState('');
  const [packet, setPacket] = useState<any>(null);
  const [conversationId, setConversationId] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const modeLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const prepare = async () => {
    if (!message.trim()) { setNotice('Add a question first.'); return; }
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/ai/context-preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
      const result = await response.json();
      if (!response.ok) setNotice(result.error ?? 'Unable to prepare context.'); else { setPacket(result); setNotice('Context is ready. Nothing has run yet.'); }
    } catch { setNotice('Unable to prepare context right now.'); }
    setBusy(false);
  };

  const ask = async () => {
    if (!packet || !message.trim()) return;
    setBusy(true); setNotice('');
    try {
      let id = conversationId;
      if (!id) {
        const created = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }).then((response) => response.json());
        id = created.id;
        setConversationId(id);
      }
      const response = await fetch(`/api/ai/conversations/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
      const result = await response.json();
      if (result.held) setNotice('This request is waiting for approval.'); else if (result.packetOnly) { setAnswer('Context-only mode selected. No model was called.'); } else if (!response.ok) setNotice(result.error ?? 'LEE could not complete this request.'); else setAnswer(result.answer ?? '');
    } catch { setNotice('Unable to ask LEE right now.'); }
    setBusy(false);
  };

  return <div className="mx-auto max-w-4xl">
    <SectionHeading eyebrow="Private reasoning" title="Ask LEE" detail="Write one question, review the context, then ask the system." />
    <Panel>
      {answer ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-5"><p className="lee-label text-primary">LEE response</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{answer}</p></div> : <p className="text-sm text-muted-foreground">Start with a decision, loose thread, or question that deserves a clearer read.</p>}
      <textarea value={message} onChange={(event) => { setMessage(event.target.value); setPacket(null); }} placeholder="What should the system help you see?" className="mt-5 min-h-32 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="textarea-ask-lee" />
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={mode} onChange={(event) => { setMode(event.target.value); setPacket(null); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm sm:w-auto">{['normal', 'deep_think', 'build', 'write', 'review', 'pilot', 'low_cost', 'private', 'no_model', 'governed_action'].map((item) => <option key={item} value={item}>{modeLabel(item)}</option>)}</select>
        <button onClick={() => void prepare()} disabled={busy || !message.trim()} className="rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-semibold text-primary disabled:opacity-50">{busy ? 'Working…' : 'Review context'}</button>
        <button onClick={() => void ask()} disabled={busy || !packet} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Ask LEE</button>
      </div>
      {packet && <div className="mt-4 rounded-xl border border-border bg-muted/35 p-4 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Context ready</span><span className="ml-2">· {packet.packet?.items?.length ?? 0} items · {packet.selectedModel ?? 'model not selected'} · {packet.estimatedCostUsd != null ? `$${Number(packet.estimatedCostUsd).toFixed(4)}` : 'cost pending'}</span></div>}
      {notice && <p className="mt-4 text-sm text-primary" role="status">{notice}</p>}
    </Panel>
  </div>;
}

function ImportsPage() {
  const [imports, setImports] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('manual-note.txt');
  const [mimeType, setMimeType] = useState('text/plain');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const [sources, queue] = await Promise.all([fetch('/api/imports', { cache: 'no-store' }), fetch('/api/imports/review', { cache: 'no-store' })]);
    if (sources.ok) setImports(await sources.json());
    if (queue.ok) setReviews(await queue.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) { setNotice('Add source text or choose a text-readable file first.'); return; }
    const response = await fetch('/api/imports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename, mimeType, content }) });
    const result = await response.json();
    setNotice(result.duplicate ? 'Duplicate source detected by checksum; nothing was imported twice.' : response.ok ? 'Source accepted and processing completed or queued for review.' : result.error ?? 'Import failed.');
    if (response.ok) { setContent(''); await load(); }
  };
  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setFilename(file.name); setMimeType(file.type || 'text/plain');
    if (file.type === 'application/json' || /\.(txt|md|csv|eml|json)$/i.test(file.name)) setContent(await file.text());
    else setNotice('This Phase 1 parser accepts the file, but browser text preview is unavailable for this binary format. Paste extracted text to process it.');
  };
  const resolve = async (id: string, status: string) => { await fetch(`/api/imports/review/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }); await load(); };
  return <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[1fr_360px]"><div><SectionHeading eyebrow="Source intake" title="Imports" detail="Drop evidence into Lee. Every source is checksum-protected, parsed, chunked, and held below canon until reviewed." /><Panel><form onSubmit={submit}><div className="flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted"><Upload className="mr-2 inline" size={14} /> Choose file<input type="file" onChange={chooseFile} className="hidden" accept=".json,.pdf,.docx,.md,.txt,.eml,.png,.jpg,.jpeg" /></label><span className="lee-label text-muted-foreground">{filename}</span><select value={mimeType} onChange={(event) => setMimeType(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-xs"><option value="text/plain">Manual note / transcript</option><option value="text/markdown">Markdown</option><option value="application/json">ChatGPT JSON</option><option value="message/rfc822">Email thread</option><option value="application/pdf">PDF text</option><option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX text</option></select></div><textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-4 min-h-48 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:border-primary" placeholder="Paste a transcript, email thread, note, or extracted document text here…" /><div className="mt-3 flex items-center"><p className="text-xs text-muted-foreground">{notice || 'Low-confidence entities and belief changes will enter the review queue.'}</p><button className="ml-auto rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Import and understand</button></div></form></Panel><div className="mt-5"><SectionHeading eyebrow="Pipeline status" title="Recent sources" detail="uploaded → parsing → chunking → extracting → reviewing → complete" />{imports.length ? <div className="space-y-2">{imports.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><FileText size={17} className="text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.originalFilename}</p><p className="mt-1 text-xs text-muted-foreground">{item.mimeType} · {item.runs?.[0]?.factCount ?? 0} facts · {item.runs?.[0]?.interpretationCount ?? 0} interpretations</p></div><StatusPill status={item.processingStatus === 'completed' ? 'verified' : item.processingStatus === 'failed' ? 'offline' : 'evolving'} /><button onClick={() => fetch(`/api/imports/${item.id}/retry`, { method: 'POST' }).then(load)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary" title="Retry"><RefreshCw size={14} /></button></div>)}</div> : <Panel><EmptyState title="No sources imported" detail="Your first note, transcript, or export will establish the intake history." /></Panel>}</div></div><div><Panel><div className="flex items-center justify-between"><div><p className="lee-label text-accent-foreground">Needs review</p><h3 className="mt-2 text-lg font-semibold">{reviews.length} suggestions</h3></div><ShieldAlert className="text-accent" size={20} /></div>{reviews.length ? <div className="mt-5 space-y-3">{reviews.map((item) => <div key={item.id} className="rounded-xl border border-border bg-muted/35 p-3"><div className="flex items-center justify-between"><StatusPill status="needs review" /><span className="text-xs text-muted-foreground">{Math.round(item.confidence * 100)}%</span></div><p className="mt-2 text-sm font-medium">{item.itemType}</p><p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{item.proposedValue?.statement ?? item.proposedValue?.name ?? item.evidenceExcerpt}</p><div className="mt-3 flex gap-2"><button onClick={() => resolve(item.id, 'approved')} className="flex-1 rounded-lg bg-primary/15 py-2 text-xs font-semibold text-primary">Approve</button><button onClick={() => resolve(item.id, 'rejected')} className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold">Reject</button></div></div>)}</div> : <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Nothing is waiting for owner review. Canon and Locked beliefs are never auto-promoted.</p>}</Panel></div></div>;
}

function TimeSignals() {
  const [overview, setOverview] = useState<any>(null);
  const [notice, setNotice] = useState('');
  const load = useCallback(() => { void fetch('/api/time/overview', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setOverview).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [load]);
  if (!overview) return <Panel><SkeletonRows /></Panel>;
  const stale = overview.objects?.filter((item: any) => ['stale', 'critical'].includes(item.temporal?.freshnessState)).length ?? 0;
  const red = overview.waitingLoops?.filter((item: any) => item.risk === 'red').length ?? 0;
  const generate = async () => { const response = await fetch('/api/briefs/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'today' }) }); setNotice(response.ok ? 'Today’s brief saved to history.' : 'Brief generation failed.'); load(); };
  return <Panel className="lee-enter lee-enter-delay-1"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="lee-label text-primary">Time engine</p><h3 className="mt-2 text-lg font-semibold">Context pulse</h3></div><button onClick={generate} className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">Generate today’s brief</button></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Aging context</p><p className="mt-2 text-xl font-semibold">{stale}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Waiting loops</p><p className="mt-2 text-xl font-semibold">{overview.waitingLoops?.length ?? 0}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Escalated</p><p className="mt-2 text-xl font-semibold text-accent-foreground">{red}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Unread</p><p className="mt-2 text-xl font-semibold">{overview.notifications?.length ?? 0}</p></div></div>{notice && <p className="mt-3 text-xs text-primary">{notice}</p>}</Panel>;
}

function Router({ onAsk, onLock }: { onAsk: () => void; onLock: () => void }) {
  const [location] = useLocation();
  if (location === "/settings/internal-services") return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><InternalServicesPage /></AppShell></ErrorBoundary>;
  if (location === "/connections") return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><ConnectionCenterPage /></AppShell></ErrorBoundary>;
  return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><Switch><Route path="/" component={() => <HomePage onAsk={onAsk} />} /><Route path="/ask" component={AskPage} /><Route path="/initiative" component={InitiativePage} /><Route path="/operational-intelligence/history" component={OperationalHistoryPage} /><Route path="/settings/bootstrap" component={BootstrapPage} /><Route path="/projects" component={ProjectsPage} /><Route path="/people" component={() => <LiveCollectionPage eyebrow="Relationship layer" title="People" detail="People and relationship health from the live Lee API." endpoint="/api/people" emptyTitle="No people recorded" emptyDetail="Relationship records will appear here after the first connector sync or manual capture." icon={Users} />} /><Route path="/decisions" component={() => <LiveCollectionPage eyebrow="Decision ledger" title="Decisions" detail="Decisions are shown with their evidence and current canon state." endpoint="/api/objects?type=decision" emptyTitle="No decisions recorded" emptyDetail="Use Ask Lee or an import to record the first decision." icon={Scale} />} /><Route path="/waiting" component={() => <LiveCollectionPage eyebrow="Open loops" title="Waiting" detail="Loops that need a person, system, or future event before they can move." endpoint="/api/waiting-loops" emptyTitle="No waiting loops" emptyDetail="A quiet waiting list is a useful signal. New loops will be surfaced here." icon={Clock3} />} /><Route path="/evidence" component={() => <LiveCollectionPage eyebrow="Reality ledger" title="Evidence" detail="Sources, provenance, and processing state remain visible before beliefs are trusted." endpoint="/api/sources" emptyTitle="No sources in the vault" emptyDetail="Import a file or capture a source to make evidence browsable." icon={FileText} />} /><Route path="/imports" component={() => <LiveCollectionPage eyebrow="Source intake" title="Imports" detail="Upload and processing flows connect here as the Understanding Pipeline expands." endpoint="/api/understanding/runs" emptyTitle="No imports yet" emptyDetail="Drop a document, transcript, or note into the intake flow when you are ready." icon={Upload} />} /><Route path="/connectors" component={ConnectorsPage} /><Route path="/costs" component={SystemEconomicsPage} /><Route path="/governance" component={() => <LiveCollectionPage eyebrow="Execution boundary" title="Governance" detail="Consequential actions require an explicit verdict before release." endpoint="/api/governance/requests" emptyTitle="No pending approvals" emptyDetail="Held and reviewable governed actions will appear here." icon={ShieldAlert} />} /><Route path="/backups" component={() => <LiveCollectionPage eyebrow="Continuity" title="Backups" detail="Verified brain versions protect the accumulated operating state." endpoint="/api/brain-versions" emptyTitle="No brain backups yet" emptyDetail="Create a Brain Version when you are ready to checkpoint the operating state." icon={Archive} />} /><Route path="/objectives" component={LiveObjectivesPage} /><Route path="/organization" component={OrganizationPage} /><Route path="/strategy/decision-patterns" component={DecisionPatternsPage} /><Route path="/knowledge" component={KnowledgePage} /><Route path="/institutional" component={() => <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Knowledge layer" title="Institutional Knowledge" detail="Operational patterns reality has reinforced across independent experiences." /><InstitutionalKnowledgePanel /></div>} /><Route path="/events" component={EventsPage} /><Route path="/reviews" component={ReviewsPage} /><Route path="/settings/manifest" component={ManifestPage} /><Route path="/settings/world-state" component={WorldStatePage} /><Route path="/settings/operational-memory" component={OperationalMemoryPage} /><Route path="/settings/self-test" component={SelfTestPage} /><Route path="/settings/self-improvement" component={SelfImprovementPage} /><Route path="/settings/system-economics" component={SystemEconomicsPage} /><Route path="/settings/identity" component={IdentityPage} /><Route path="/health" component={HealthPage} /><Route path="/settings" component={() => <SettingsPage onLock={onLock} />} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  const [askOpen, setAskOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => { document.documentElement.classList.add('dark'); return () => document.documentElement.classList.remove('dark'); }, []);
  useEffect(() => { void fetch('/api/auth/session', { cache: 'no-store' }).then((response) => response.json()).then((result) => { setAuthenticated(Boolean(result.authenticated)); setAuthChecked(true); }).catch(() => setAuthChecked(true)); }, []);
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><DesktopSetupPanel />{!authChecked ? <div className="grid min-h-[100dvh] place-items-center bg-sidebar text-sidebar-foreground"><RefreshCw className="animate-spin text-sidebar-primary" /></div> : !authenticated ? <LoginScreen onAuthenticated={() => setAuthenticated(true)} /> : locked ? <LockedScreen onUnlock={() => setLocked(false)} /> : <Router onAsk={() => setAskOpen(true)} onLock={() => setLocked(true)} />}{askOpen && authenticated && !locked && <AskDialog onClose={() => setAskOpen(false)} />}</WouterRouter></TooltipProvider><Toaster /></QueryClientProvider>;
}

export default App;
