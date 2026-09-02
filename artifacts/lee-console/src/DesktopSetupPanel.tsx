import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Compass,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SkipForward,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";

type CheckState = "live" | "degraded" | "unavailable";
type ExternalHealth = "healthy" | "degraded" | "unavailable";
type RuntimeSnapshot = {
  state: "starting" | "live" | "degraded" | "unavailable" | "stopped";
  apiUrl: string;
  database: "starting" | "configured" | "unavailable";
  migration: "pending" | "complete" | "failed";
  contract: CheckState;
  checks: Record<string, CheckState>;
  reason: string | null;
  migrationLogPath: string;
  apiLogPath?: string;
  postgresLogPath?: string;
  apiProcessId?: number | null;
  postgresProcessId?: number | null;
};
type UpdateState = {
  status:
    | "unsupported"
    | "idle"
    | "checking"
    | "available"
    | "not-available"
    | "downloading"
    | "downloaded"
    | "error";
  version?: string;
  message?: string;
};
type ExternalService = {
  serviceId?: string;
  currentHealth?: ExternalHealth;
  displayName?: string;
  failurePolicy?: string;
};
type SetupStep = { key: string; label: string; status: string; detail?: string; updatedAt?: string };
type DiscoveryCandidate = LocalServiceDiscoveryPayload["candidates"][number] & {
  status?: "new" | "existing";
  connectionId?: string;
  scanNonce?: string;
};
type DiscoveryReport = {
  candidates: DiscoveryCandidate[];
  failures: LocalServiceDiscoveryPayload["failures"];
  attempted?: number;
  completedAt?: string;
};
type SetupRun = {
  status: string;
  steps: SetupStep[];
  summary?: {
    providers?: number;
    connections?: number;
    authorized?: number;
    needsOwner?: number;
    healthy?: number;
    failed?: number;
    discovery?: DiscoveryReport;
  };
  lastError?: string | null;
};
type SafeConnection = {
  id: string;
  displayName: string;
  method: string;
  status: string;
  authStatus: string;
  credentialConfigured: boolean;
  lastHealthCheck?: string | null;
  lastError?: string | null;
};

export type LocalServiceDiscoveryPayload = {
  candidates: Array<{
    discoveryKey: string;
    contractId: string;
    provider: string;
    displayName: string;
    targetType: "local_system" | "service";
    method: "local";
    baseUrl: string;
    healthEndpoint: string;
    contractVersion: string;
    capabilities: Array<Record<string, string>>;
    dependencies: Array<Record<string, string | boolean>>;
    observedAt: string;
  }>;
  failures: Array<{ contractId: string; displayName: string; endpoint: string; reason: string }>;
  attempted: number;
  completedAt: string;
};

declare global {
  interface Window {
    leeRuntime?: {
      status: () => Promise<RuntimeSnapshot>;
      restartRuntime: () => Promise<RuntimeSnapshot>;
      discoverLocalServices: () => Promise<LocalServiceDiscoveryPayload>;
      updateStatus: () => Promise<UpdateState>;
      checkForUpdates: () => Promise<UpdateState>;
      downloadUpdate: () => Promise<UpdateState>;
      installUpdate: () => Promise<UpdateState>;
      onUpdateState: (listener: (state: UpdateState) => void) => () => void;
    };
  }
}

const WIZARD_STORAGE_KEY = "lee.desktop-setup.wizard-step";
const WIZARD_COMPLETE_KEY = "lee.desktop-setup.completed";
const stepKeys = ["runtime", "owner", "discovery", "connections", "summary"] as const;
type WizardStep = (typeof stepKeys)[number];

function StateIcon({ state }: { state: CheckState | "pending" }) {
  if (state === "live") return <CircleCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
  if (state === "pending") return <LoaderCircle className="h-4 w-4 animate-spin text-amber-300" aria-hidden="true" />;
  return <CircleAlert className="h-4 w-4 text-amber-300" aria-hidden="true" />;
}

function statusTone(status: string) {
  if (["connected", "healthy", "complete", "authorized", "live"].includes(status)) return "border-emerald-300/25 bg-emerald-300/10 text-emerald-200";
  if (["pending", "needs_owner", "degraded", "starting"].includes(status)) return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  return "border-rose-300/25 bg-rose-300/10 text-rose-200";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeJson(response: Response) {
  return response.json().catch(() => ({}));
}

export function DesktopSetupPanel() {
  const [runtime, setRuntime] = useState<RuntimeSnapshot | null>(null);
  const [services, setServices] = useState<ExternalService[]>([]);
  const [connections, setConnections] = useState<SafeConnection[]>([]);
  const [update, setUpdate] = useState<UpdateState | null>(null);
  const [setup, setSetup] = useState<SetupRun | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("runtime");
  const [loading, setLoading] = useState(true);
  const [setupRunning, setSetupRunning] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const desktopLaunch = new URLSearchParams(window.location.search).get("desktop") === "1";
  const healthFor = (id: string): ExternalHealth =>
    services.find((service) => service.serviceId === id)?.currentHealth ?? "unavailable";
  const cilHealth = healthFor("cil");
  const governanceHealth = healthFor("cerbaseal");
  const executionReady = services.some(
    (service) => service.serviceId?.startsWith("replit-ai-") && service.currentHealth === "healthy",
  );
  const projectBridgeRegistered =
    services.some((service) => service.serviceId === "mcp-project-bridge" && service.currentHealth === "healthy") ||
    connections.some((connection) => {
      const serialized = JSON.stringify(connection).toLowerCase();
      return serialized.includes("mcp") && (serialized.includes("connected") || serialized.includes("healthy"));
    });
  const coreReady =
    runtime?.database === "configured" &&
    runtime?.migration === "complete" &&
    runtime?.contract === "live" &&
    runtime?.checks.Brain === "live" &&
    runtime?.checks["Event Log"] === "live";
  const readiness = useMemo(
    () => [
      {
        label: "LEE Core",
        state: coreReady ? ("live" as const) : runtime?.state === "starting" ? ("degraded" as const) : ("unavailable" as const),
        detail: coreReady ? "Database, Event Log, Brain, API, and local knowledge are available." : "Local foundation is still starting or needs attention.",
      },
      {
        label: "AI",
        state: cilHealth === "healthy" && executionReady ? ("live" as const) : cilHealth === "degraded" || (cilHealth === "healthy" && !executionReady) ? ("degraded" as const) : ("unavailable" as const),
        detail: cilHealth !== "healthy" ? "CIL is unavailable; model execution remains blocked." : executionReady ? "CIL and an approved execution provider are healthy." : "CIL is reachable, but no approved execution provider is healthy.",
      },
      {
        label: "Governed Actions",
        state: governanceHealth === "healthy" ? ("live" as const) : governanceHealth === "degraded" ? ("degraded" as const) : ("unavailable" as const),
        detail: governanceHealth === "healthy" ? "CerbaSeal is reachable and valid." : "CerbaSeal is unavailable; consequential actions remain on HOLD.",
      },
      {
        label: "Project Operations",
        state: projectBridgeRegistered ? ("live" as const) : ("unavailable" as const),
        detail: projectBridgeRegistered ? "MCP project operations are connected." : "MCP Project Bridge is unavailable; local LEE Core is unaffected.",
      },
    ],
    [cilHealth, coreReady, executionReady, governanceHealth, projectBridgeRegistered],
  );

  const loadSetup = async () => {
    try {
      const response = await fetch("/api/desktop-setup", { cache: "no-store" });
      if (response.ok) setSetup(await response.json());
    } catch {
      setError("The saved setup run could not be loaded. LEE remains usable in degraded mode.");
    }
  };
  const loadConnections = async () => {
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      if (!response.ok) throw new Error("Connection inventory unavailable.");
      const data = await response.json();
      setConnections(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection inventory unavailable.");
    }
  };
  const refreshRuntime = async () => {
    if (!window.leeRuntime) return;
    try {
      setRuntime(await window.leeRuntime.status());
    } catch {
      setError("The local runtime did not answer. LEE is available in degraded mode.");
    }
  };
  useEffect(() => {
    const storedStep = window.localStorage.getItem(WIZARD_STORAGE_KEY) as WizardStep | null;
    if (storedStep && stepKeys.includes(storedStep)) setWizardStep(storedStep);
    let active = true;
    const refreshExternal = () => {
      void Promise.all([
        fetch("/api/internal-services/health", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
        fetch("/api/connections", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
      ]).then(([health, connectionList]) => {
        if (!active) return;
        setServices(Array.isArray(health) ? health : []);
        setConnections(Array.isArray(connectionList) ? connectionList : []);
      }).catch(() => undefined);
    };
    void Promise.all([refreshRuntime(), loadSetup(), loadConnections()]).finally(() => {
      if (active) setLoading(false);
    });
    refreshExternal();
    const runtimeTimer = window.setInterval(() => void refreshRuntime(), 2500);
    const externalTimer = window.setInterval(refreshExternal, 5000);
    if (window.leeRuntime) {
      void window.leeRuntime.updateStatus().then((value) => { if (active) setUpdate(value); }).catch(() => undefined);
    }
    const unsubscribe = window.leeRuntime?.onUpdateState((value) => { if (active) setUpdate(value); });
    return () => {
      active = false;
      window.clearInterval(runtimeTimer);
      window.clearInterval(externalTimer);
      unsubscribe?.();
    };
  }, []);
  useEffect(() => {
    const setupIncomplete = !setup || setup.status !== "complete";
    if (desktopLaunch && setupIncomplete && window.localStorage.getItem(WIZARD_COMPLETE_KEY) !== "true") {
      setWizardOpen(true);
    }
  }, [desktopLaunch, setup]);
  useEffect(() => {
    if (wizardOpen) window.localStorage.setItem(WIZARD_STORAGE_KEY, wizardStep);
  }, [wizardOpen, wizardStep]);
  const startSetup = async () => {
    setSetupRunning(true);
    setError("");
    setNotice("LEE is checking providers, existing connections, and safe defaults.");
    try {
      const discovery = window.leeRuntime ? await window.leeRuntime.discoverLocalServices().catch(() => null) : null;
      const response = await fetch("/api/desktop-setup/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(discovery ? { discovery } : {}),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Desktop setup could not start.");
      setSetup(data);
      setWizardStep("owner");
      await loadConnections();
      setNotice("Initial checks are complete. Review the decisions LEE cannot make for you.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Desktop setup could not reach the API.");
    } finally {
      setSetupRunning(false);
    }
  };
  const discover = async () => {
    if (!window.leeRuntime) {
      setNotice("Local discovery is unavailable in this browser session.");
      return;
    }
    setDiscovering(true);
    setError("");
    try {
      const discovery = await window.leeRuntime.discoverLocalServices();
      const response = await fetch("/api/desktop-setup/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ discovery }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Discovery could not be refreshed.");
      setSetup(data);
      setNotice("Discovery refreshed. Nothing was connected without your approval.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Local discovery could not be refreshed.");
    } finally {
      setDiscovering(false);
    }
  };
  const acceptDiscovery = async (candidate: DiscoveryCandidate) => {
    setError("");
    setNotice(`Reviewing ${candidate.displayName}.`);
    const response = await fetch("/api/desktop-setup/discoveries/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(candidate),
    });
    const data = await safeJson(response);
    if (!response.ok) {
      setError(data?.error ?? "This discovery is no longer current. Refresh discovery and review it again.");
      return;
    }
    setSetup((current) => current ? {
      ...current,
      summary: {
        ...current.summary,
        discovery: current.summary?.discovery ? {
          ...current.summary.discovery,
          candidates: current.summary.discovery.candidates.map((item) =>
            item.discoveryKey === candidate.discoveryKey ? { ...item, status: "existing", connectionId: data.connection?.id } : item,
          ),
        } : current.summary?.discovery,
      },
    } : current);
    await loadConnections();
    setNotice(data.reused ? `${candidate.displayName} is already connected; LEE reused it.` : `${candidate.displayName} was added as an OBSERVE-only connection.`);
  };
  const testConnection = async (connection: SafeConnection) => {
    setTestingId(connection.id);
    setError("");
    try {
      const response = await fetch(`/api/connections/${connection.id}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Connection test failed.");
      setNotice(`${connection.displayName} test completed.`);
      await loadConnections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection test failed.");
    } finally {
      setTestingId(null);
    }
  };
  const reauthorize = async (connection: SafeConnection) => {
    try {
      const response = await fetch(`/api/connections/${connection.id}/reauthorize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Sign-in could not start.");
      if (data.authorizationUrl) window.location.assign(data.authorizationUrl);
      else setNotice("Sign-in is ready to continue in the connection center.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in could not start.");
    }
  };
  const finishWizard = () => {
    window.localStorage.setItem(WIZARD_COMPLETE_KEY, "true");
    window.localStorage.removeItem(WIZARD_STORAGE_KEY);
    setWizardOpen(false);
    setCollapsed(false);
    setNotice("Setup is saved. LEE will keep reporting readiness as services change.");
  };
  const stepIndex = stepKeys.indexOf(wizardStep);
  const goNext = () => {
    if (stepIndex === stepKeys.length - 1) finishWizard();
    else setWizardStep(stepKeys[stepIndex + 1]);
  };
  const goBack = () => {
    if (stepIndex > 0) setWizardStep(stepKeys[stepIndex - 1]);
  };
  const skipStep = () => {
    if (wizardStep === "discovery" || wizardStep === "connections") goNext();
  };

  if (loading && !runtime) return <div className="border-b border-sidebar-border bg-sidebar px-5 py-3 text-sidebar-foreground"><div className="mx-auto h-5 max-w-[1280px] animate-pulse rounded bg-sidebar-accent" /></div>;
  return (
    <>
      {!collapsed && <section className="border-b border-sidebar-border bg-sidebar px-5 py-4 text-sidebar-foreground" aria-label="LEE readiness">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="lee-label text-sidebar-primary">Private control room</p>
              <h2 className="mt-1 text-base font-semibold">LEE readiness</h2>
              <p className="mt-1 max-w-2xl text-xs text-sidebar-foreground/70">Core, authority, discovery, and project operations report independently. Unavailable optional services never block the local console.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!setup || setup.status !== "complete" ? <button type="button" onClick={() => setWizardOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-3 py-1.5 text-xs font-semibold text-sidebar-primary-foreground" data-testid="button-open-setup-wizard"><Sparkles size={14} /> Continue setup</button> : <button type="button" onClick={() => { setWizardStep("summary"); setWizardOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-1.5 text-xs font-semibold text-sidebar-primary" data-testid="button-review-setup"><ShieldCheck size={14} /> Review setup</button>}
              <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse readiness panel" className="rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-collapse-readiness"><ChevronDown size={16} /></button>
            </div>
          </div>
          {runtime?.reason && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">{runtime.reason}</p>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{readiness.map((item) => <ReadinessCard key={item.label} {...item} />)}</div>
          {runtime && <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Status label="Private database" state={runtime.database === "configured" ? "live" : runtime.database === "starting" ? "pending" : "unavailable"} />
            <Status label="Migrations" state={runtime.migration === "complete" ? "live" : runtime.migration === "pending" ? "pending" : "unavailable"} />
            <Status label="CIL authority" state={cilHealth === "healthy" ? "live" : cilHealth} />
            <Status label="CerbaSeal authority" state={governanceHealth === "healthy" ? "live" : governanceHealth} />
          </div>}
          {runtime && (runtime.migration === "failed" || runtime.state !== "live") && <div className="mt-3 space-y-1 text-xs text-sidebar-foreground/60">
            {runtime.migration === "failed" && <p>Migration log: {runtime.migrationLogPath}</p>}
            {runtime.apiLogPath && <p>API log: {runtime.apiLogPath}{runtime.apiProcessId ? ` · process ${runtime.apiProcessId}` : ""}</p>}
            {runtime.postgresLogPath && <p>PostgreSQL log: {runtime.postgresLogPath}{runtime.postgresProcessId ? ` · process ${runtime.postgresProcessId}` : ""}</p>}
            {runtime.state !== "live" && <button type="button" disabled={restarting} onClick={() => { setRestarting(true); void window.leeRuntime?.restartRuntime().then(setRuntime).catch(() => setError("Runtime restart failed.")).finally(() => setRestarting(false)); }} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/40 px-3 py-1.5 font-semibold text-sidebar-primary disabled:opacity-50" data-testid="button-restart-runtime"><RotateCcw size={13} />{restarting ? "Restarting runtime" : "Restart local runtime"}</button>}
          </div>}
          {update && update.status !== "unsupported" && update.status !== "idle" && update.status !== "not-available" && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sidebar-primary/30 bg-sidebar-accent/40 px-3 py-2.5 text-xs">
            <span>{update.status === "available" ? `A new LEE version is ready${update.version ? ` · ${update.version}` : ""}.` : update.status === "downloaded" ? `LEE ${update.version ?? "update"} is ready to install.` : update.status === "downloading" ? `Downloading LEE update${update.message ? ` · ${update.message}` : ""}` : update.status === "checking" ? "Checking for LEE updates" : update.message ?? "LEE update check failed."}</span>
            {update.status === "available" && <button type="button" onClick={() => void window.leeRuntime?.downloadUpdate()} className="rounded-lg bg-sidebar-primary px-3 py-1.5 font-semibold text-sidebar-primary-foreground" data-testid="button-download-update">Download update</button>}
            {update.status === "downloaded" && <button type="button" onClick={() => void window.leeRuntime?.installUpdate()} className="rounded-lg bg-sidebar-primary px-3 py-1.5 font-semibold text-sidebar-primary-foreground" data-testid="button-install-update">Restart and update</button>}
            {update.status === "error" && <button type="button" onClick={() => void window.leeRuntime?.checkForUpdates()} className="rounded-lg border border-sidebar-primary/30 px-3 py-1.5 font-semibold text-sidebar-primary" data-testid="button-retry-update">Try again</button>}
          </div>}
        </div>
      </section>}
      {collapsed && <button type="button" onClick={() => setCollapsed(false)} className="fixed right-5 top-20 z-10 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar px-3 py-2 text-xs text-sidebar-foreground shadow-xl" data-testid="button-expand-readiness"><ChevronDown className="rotate-180" size={14} /> Readiness</button>}
      {error && <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-rose-300/30 bg-sidebar px-4 py-3 text-xs text-rose-100 shadow-2xl" role="alert" data-testid="status-setup-error"><CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-300" /><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss setup error" data-testid="button-dismiss-setup-error"><X size={14} /></button></div>}
      {notice && <div className="fixed bottom-5 left-5 z-50 max-w-sm rounded-xl border border-sidebar-primary/30 bg-sidebar px-4 py-3 text-xs text-sidebar-foreground shadow-2xl" role="status" data-testid="status-setup-notice">{notice}</div>}
      {wizardOpen && <SetupWizard
        step={wizardStep}
        setup={setup}
        runtime={runtime}
        connections={connections}
        setupRunning={setupRunning}
        discovering={discovering}
        testingId={testingId}
        onClose={() => setWizardOpen(false)}
        onStep={setWizardStep}
        onStart={startSetup}
        onRestart={() => { setRestarting(true); void window.leeRuntime?.restartRuntime().then(setRuntime).catch(() => setError("Runtime restart failed.")).finally(() => setRestarting(false)); }}
        onDiscover={discover}
        onAccept={acceptDiscovery}
        onTest={testConnection}
        onReauthorize={reauthorize}
        onBack={goBack}
        onNext={goNext}
        onSkip={skipStep}
      />}
    </>
  );
}

function SetupWizard({
  step,
  setup,
  runtime,
  connections,
  setupRunning,
  discovering,
  testingId,
  onClose,
  onStep,
  onStart,
  onRestart,
  onDiscover,
  onAccept,
  onTest,
  onReauthorize,
  onBack,
  onNext,
  onSkip,
}: {
  step: WizardStep;
  setup: SetupRun | null;
  runtime: RuntimeSnapshot | null;
  connections: SafeConnection[];
  setupRunning: boolean;
  discovering: boolean;
  testingId: string | null;
  onClose: () => void;
  onStep: (step: WizardStep) => void;
  onStart: () => void;
  onRestart: () => void;
  onDiscover: () => void;
  onAccept: (candidate: DiscoveryCandidate) => void;
  onTest: (connection: SafeConnection) => void;
  onReauthorize: (connection: SafeConnection) => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const currentIndex = stepKeys.indexOf(step);
  const report = setup?.summary?.discovery;
  const ownerConnections = connections.filter((connection) =>
    connection.method === "oauth" &&
    (["pending", "needs_reauthorization"].includes(connection.status) || connection.authStatus !== "authorized"),
  );
  const optionalUnavailable = connections.filter((connection) => ["unavailable", "disconnected", "degraded"].includes(connection.status));
  const runtimeReady = runtime?.state === "live" && runtime.database === "configured" && runtime.migration === "complete";
  const discoveryStale = report?.completedAt ? Date.now() - new Date(report.completedAt).getTime() > 10 * 60 * 1000 : false;
  const stepTitles: Record<WizardStep, { eyebrow: string; title: string; detail: string }> = {
    runtime: { eyebrow: "01 / local foundation", title: "Make sure the local room is ready", detail: "LEE starts with the private runtime on this computer. We check it without asking for a credential." },
    owner: { eyebrow: "02 / owner authorization", title: "Keep authority in your hands", detail: "LEE can prepare connection records, but only you can authorize an account or widen its capabilities." },
    discovery: { eyebrow: "03 / local discovery", title: "Review what is listening locally", detail: "Discovery checks only approved loopback contracts. A service is never connected just because it answered." },
    connections: { eyebrow: "04 / external connections", title: "See the outside edges clearly", detail: "Test what exists, sign in where needed, and leave optional services unavailable when they are not part of your setup." },
    summary: { eyebrow: "05 / readiness summary", title: "A clear starting position", detail: "This is the state LEE will keep showing you. You can return to Connections whenever a decision changes." },
  };
  const title = stepTitles[step];
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-sidebar/90 p-3 text-sidebar-foreground backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="setup-wizard-title" data-testid="dialog-setup-wizard">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[1.5rem] border border-sidebar-border bg-sidebar shadow-2xl lee-enter">
          <div className="border-b border-sidebar-border bg-sidebar-accent/35 px-5 py-4 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-sidebar-primary/35 bg-sidebar-primary/15 text-sidebar-primary"><TerminalSquare size={17} /></span><div><p className="lee-label text-sidebar-primary">Project LEE / first run</p><p className="mt-1 text-xs text-sidebar-foreground/55">A guided setup that can pause safely at any point</p></div></div>
              <button type="button" onClick={onClose} aria-label="Close setup wizard" className="rounded-lg p-2 text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-close-setup-wizard"><X size={18} /></button>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-1.5" aria-label="Setup progress">
              {stepKeys.map((item, index) => <button type="button" key={item} onClick={() => index <= currentIndex && onStep(item)} disabled={index > currentIndex} aria-current={item === step ? "step" : undefined} aria-label={`Go to ${titleFor(item)}`} className="group text-left disabled:cursor-not-allowed" data-testid={`button-setup-step-${item}`}><span className={`block h-1 rounded-full ${index <= currentIndex ? "bg-sidebar-primary" : "bg-sidebar-border"}`} /><span className={`mt-2 hidden text-[9px] uppercase tracking-[.14em] sm:block ${item === step ? "text-sidebar-primary" : "text-sidebar-foreground/35"}`}>{titleFor(item)}</span></button>)}
            </div>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <main className="min-h-[26rem] px-5 py-7 sm:px-8 sm:py-9">
              <p className="lee-label text-sidebar-primary">{title.eyebrow}</p>
              <h1 id="setup-wizard-title" className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">{title.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sidebar-foreground/65">{title.detail}</p>
              <div className="mt-7">
                {step === "runtime" && <RuntimeStep runtime={runtime} ready={runtimeReady} running={setupRunning} onStart={onStart} onRestart={onRestart} />}
                {step === "owner" && <OwnerStep connections={connections} ownerConnections={ownerConnections} onReauthorize={onReauthorize} />}
                {step === "discovery" && <DiscoveryStep report={report} stale={discoveryStale} discovering={discovering} onDiscover={onDiscover} onAccept={onAccept} />}
                {step === "connections" && <ConnectionsStep connections={connections} optionalUnavailable={optionalUnavailable} testingId={testingId} onTest={onTest} onReauthorize={onReauthorize} />}
                {step === "summary" && <SummaryStep setup={setup} runtimeReady={runtimeReady} connections={connections} />}
              </div>
            </main>
            <aside className="border-t border-sidebar-border bg-sidebar-accent/20 px-5 py-6 lg:border-l lg:border-t-0 sm:px-6">
              <p className="lee-label text-sidebar-foreground/40">Setup map</p>
              <div className="mt-4 space-y-1">{stepKeys.map((item, index) => <div key={item} className={`flex items-start gap-3 rounded-lg px-2 py-2.5 ${item === step ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/45"}`}><span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border text-[10px] ${index < currentIndex ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground" : item === step ? "border-sidebar-primary text-sidebar-primary" : "border-sidebar-border"}`}>{index < currentIndex ? <Check size={11} /> : index + 1}</span><span><span className="block text-xs font-semibold">{titleFor(item)}</span><span className="mt-0.5 block text-[10px] leading-relaxed">{detailFor(item)}</span></span></div>)}</div>
              <div className="mt-7 rounded-xl border border-sidebar-primary/20 bg-sidebar-primary/10 p-3.5"><div className="flex items-start gap-2"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-sidebar-primary" /><p className="text-[11px] leading-relaxed text-sidebar-foreground/70">No credentials are created or inferred here. LEE only stores safe connection projections and waits for an explicit owner decision.</p></div></div>
            </aside>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-sidebar-border bg-sidebar-accent/25 px-5 py-4 sm:px-8">
            <button type="button" onClick={onBack} disabled={currentIndex === 0} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent disabled:invisible" data-testid="button-setup-back"><ArrowLeft size={14} /> Back</button>
            <div className="flex items-center gap-2">{(step === "discovery" || step === "connections") && <button type="button" onClick={onSkip} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-sidebar-foreground/55 hover:bg-sidebar-accent" data-testid={`button-skip-setup-${step}`}><SkipForward size={14} /> Skip for now</button>}<button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-sidebar-foreground/55 hover:bg-sidebar-accent" data-testid="button-setup-save-close"><Clock3 size={14} /> Save and close</button><button type="button" onClick={onNext} className="inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-4 py-2 text-xs font-semibold text-sidebar-primary-foreground hover:opacity-90" data-testid="button-setup-next">{step === "summary" ? "Finish setup" : step === "owner" || step === "discovery" ? "Continue" : "Next"} <ArrowRight size={14} /></button></div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function RuntimeStep({ runtime, ready, running, onStart, onRestart }: { runtime: RuntimeSnapshot | null; ready: boolean; running: boolean; onStart: () => void; onRestart: () => void }) {
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <WizardMetric label="Runtime" value={runtime ? statusLabel(runtime.state) : "Checking"} state={runtime?.state === "live" ? "good" : "wait"} />
      <WizardMetric label="Private database" value={runtime?.database === "configured" ? "Configured" : runtime?.database ?? "Checking"} state={runtime?.database === "configured" ? "good" : "wait"} />
      <WizardMetric label="Migrations" value={runtime?.migration === "complete" ? "Complete" : runtime?.migration ?? "Checking"} state={runtime?.migration === "complete" ? "good" : "wait"} />
    </div>
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-4">
      <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary"><Compass size={16} /></span><div><p className="text-sm font-semibold">{ready ? "The local foundation is ready." : "LEE can still operate while this settles."}</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">{ready ? "Database, migrations, and the runtime contract are answering. The next step is about owner decisions, not hidden setup." : "The check is intentionally visible. You can retry the runtime without losing your place, and unavailable optional services will remain clearly marked."}</p></div></div>
      {runtime?.reason && <p className="mt-4 border-l-2 border-amber-300/50 pl-3 text-xs text-amber-100">{runtime.reason}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onStart} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-3.5 py-2.5 text-xs font-semibold text-sidebar-primary-foreground disabled:opacity-50" data-testid="button-start-setup-run">{running && <LoaderCircle className="animate-spin" size={14} />}{running ? "Checking local foundation" : "Run local checks"}</button>
      {runtime && runtime.state !== "live" && <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-border px-3.5 py-2.5 text-xs font-semibold hover:bg-sidebar-accent" data-testid="button-wizard-restart-runtime"><RotateCcw size={14} /> Restart runtime</button>}
    </div>
  </div>;
}

function OwnerStep({ connections, ownerConnections, onReauthorize }: { connections: SafeConnection[]; ownerConnections: SafeConnection[]; onReauthorize: (connection: SafeConnection) => void }) {
  return <div className="space-y-4">
    <div className="rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 p-4"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-sidebar-primary" /><div><p className="text-sm font-semibold">Why approval stays explicit</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">A responding service is not proof that LEE should trust it. Only the owner can grant account access, approve scopes, or allow consequential actions. Setup creates no credentials and accepts no discovery silently.</p></div></div></div>
    {ownerConnections.length ? <div className="space-y-2" aria-label="Connections needing owner action">{ownerConnections.map((connection) => <div key={connection.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-3.5" data-testid={`row-owner-action-${connection.id}`}><div><p className="text-sm font-semibold">{connection.displayName}</p><p className="mt-1 text-xs text-sidebar-foreground/55">{connection.method === "oauth" ? "Provider sign-in is required before LEE can use this connection." : "No credential is configured. Keep it disconnected until you are ready."}</p></div>{connection.method === "oauth" && <button type="button" onClick={() => onReauthorize(connection)} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary" data-testid={`button-authorize-${connection.id}`}><ExternalLink size={13} /> Authorize</button>}</div>)}</div> : <EmptyWizard icon={<Check size={18} />} title="No owner action is pending" detail={connections.length ? "Existing projections are authorized or safely disconnected." : "No external account has been added. You can do that later from Connections."} />}
  </div>;
}

function DiscoveryStep({ report, stale, discovering, onDiscover, onAccept }: { report?: DiscoveryReport; stale: boolean; discovering: boolean; onDiscover: () => void; onAccept: (candidate: DiscoveryCandidate) => void }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-4"><div><p className="text-sm font-semibold">Nothing is accepted automatically</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">Review the contract, endpoint, and observed time. Accepting creates an OBSERVE-only connection; it does not grant write access.</p></div><button type="button" onClick={onDiscover} disabled={discovering} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary disabled:opacity-50" data-testid="button-refresh-local-discovery">{discovering ? <LoaderCircle className="animate-spin" size={14} /> : <Search size={14} />}{discovering ? "Scanning" : "Refresh scan"}</button></div>
    {stale && <div className="flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-100" role="status" data-testid="status-stale-discovery"><Clock3 size={15} className="mt-0.5 shrink-0" />This scan is more than ten minutes old. Refresh it before accepting a candidate.</div>}
    {report?.candidates.length ? <div className="space-y-2" aria-label="Local discovery candidates">{report.candidates.map((candidate) => <div key={candidate.discoveryKey} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4" data-testid={`card-discovery-${candidate.discoveryKey}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{candidate.displayName}</p><p className="mt-1 text-xs text-sidebar-foreground/55">{candidate.provider} · {candidate.baseUrl}{candidate.healthEndpoint}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(candidate.status === "existing" ? "connected" : "pending")}`}>{candidate.status === "existing" ? "Already connected" : "Needs review"}</span></div><div className="mt-3 flex flex-wrap gap-3 text-[11px] text-sidebar-foreground/50"><span>Contract {candidate.contractVersion}</span><span>{candidate.capabilities.length} capabilities observed</span><span>Observed {new Date(candidate.observedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>{candidate.status !== "existing" && <button type="button" disabled={stale} onClick={() => onAccept(candidate)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-3 py-2 text-xs font-semibold text-sidebar-primary-foreground disabled:cursor-not-allowed disabled:opacity-45" data-testid={`button-accept-discovery-${candidate.discoveryKey}`}><Check size={13} /> Accept as OBSERVE-only</button>}</div>)}</div> : <EmptyWizard icon={<Search size={18} />} title="No local candidates found" detail={report?.failures.length ? `${report.failures.length} approved contract${report.failures.length === 1 ? " was" : "s were"} unreachable. No connection was created.` : "No approved local service answered. You can refresh later or continue without one."} />}
    {!!report?.failures.length && <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-sidebar-foreground/60"><p className="font-semibold text-amber-100">Discovery notes</p>{report.failures.map((failure) => <p key={failure.contractId} className="mt-1">{failure.displayName}: {failure.reason}</p>)}</div>}
  </div>;
}

function ConnectionsStep({ connections, optionalUnavailable, testingId, onTest, onReauthorize }: { connections: SafeConnection[]; optionalUnavailable: SafeConnection[]; testingId: string | null; onTest: (connection: SafeConnection) => void; onReauthorize: (connection: SafeConnection) => void }) {
  return <div className="space-y-4">
    {connections.length ? <div className="space-y-2" aria-label="External connection status">{connections.map((connection) => <div key={connection.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3.5" data-testid={`row-connection-status-${connection.id}`}><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{connection.displayName}</p><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(connection.status)}`}>{statusLabel(connection.status)}</span></div><p className="mt-1 text-xs text-sidebar-foreground/50">{connection.authStatus ? `Authorization: ${statusLabel(connection.authStatus)}` : connection.credentialConfigured ? "Credential reference configured" : "No credential configured"}</p>{connection.lastError && <p className="mt-1 text-xs text-rose-200">{connection.lastError}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => onTest(connection)} disabled={testingId === connection.id} className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border px-2.5 py-2 text-[11px] font-semibold hover:bg-sidebar-accent disabled:opacity-50" data-testid={`button-test-wizard-${connection.id}`}>{testingId === connection.id ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />} Test</button>{connection.method === "oauth" && connection.status !== "connected" && <button type="button" onClick={() => onReauthorize(connection)} className="rounded-lg border border-sidebar-primary/35 px-2.5 py-2 text-[11px] font-semibold text-sidebar-primary" data-testid={`button-reauthorize-wizard-${connection.id}`}>Sign in</button>}</div></div>)}</div> : <EmptyWizard icon={<ExternalLink size={18} />} title="No external connections yet" detail="LEE Core is independent. Add accounts when there is a clear reason to connect them." />}
    <a href="/connections" className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary hover:bg-sidebar-accent" data-testid="link-wizard-connections"><ExternalLink size={14} /> Open Connections</a>
    {optionalUnavailable.length > 0 && <div className="flex items-start gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/15 p-3 text-xs leading-relaxed text-sidebar-foreground/60"><SkipForward size={15} className="mt-0.5 shrink-0 text-sidebar-primary" />{optionalUnavailable.length} optional service{optionalUnavailable.length === 1 ? " is" : "s are"} not available. That is an honest degraded state, not a failed setup.</div>}
  </div>;
}

function SummaryStep({ setup, runtimeReady, connections }: { setup: SetupRun | null; runtimeReady: boolean; connections: SafeConnection[] }) {
  const healthy = connections.filter((connection) => connection.status === "connected").length;
  const needsOwner = connections.filter((connection) => connection.status === "pending" || connection.status === "needs_reauthorization").length;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><WizardMetric label="Local foundation" value={runtimeReady ? "Ready" : "Degraded"} state={runtimeReady ? "good" : "wait"} /><WizardMetric label="Connected" value={`${healthy} ${healthy === 1 ? "connection" : "connections"}`} state={healthy ? "good" : "wait"} /><WizardMetric label="Owner decisions" value={`${needsOwner} remaining`} state={needsOwner ? "wait" : "good"} /></div>
    <div className="rounded-xl border border-sidebar-primary/25 bg-sidebar-primary/10 p-4"><div className="flex items-start gap-3"><CircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-300" /><div><p className="text-sm font-semibold">{setup?.status === "complete" ? "Setup is saved and resumable." : "LEE is ready to work with what is available."}</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/65">Unavailable providers remain unavailable, and optional steps can be completed from Connections later. The compact readiness panel stays visible after you finish.</p></div></div></div>
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4 text-xs leading-relaxed text-sidebar-foreground/60"><p className="font-semibold text-sidebar-foreground">What happens next</p><ul className="mt-2 list-disc space-y-1 pl-4"><li>LEE continues to report runtime and service health independently.</li><li>Every new connection starts narrow and requires owner review.</li><li>Use Connections for credentials, scopes, imports, tests, and disconnection.</li></ul></div>
  </div>;
}

function WizardMetric({ label, value, state }: { label: string; value: string; state: "good" | "wait" }) {
  return <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3.5"><p className="lee-label text-sidebar-foreground/40">{label}</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${state === "good" ? "bg-emerald-300" : "bg-amber-300"}`} />{value}</p></div>;
}

function EmptyWizard({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar-accent/15 p-7 text-center"><span className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-sidebar-accent text-sidebar-primary">{icon}</span><p className="mt-3 text-sm font-semibold">{title}</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-sidebar-foreground/55">{detail}</p></div>;
}

function titleFor(step: WizardStep) {
  return { runtime: "Runtime", owner: "Owner approval", discovery: "Local discovery", connections: "Connections", summary: "Summary" }[step];
}

function detailFor(step: WizardStep) {
  return { runtime: "Check the private foundation", owner: "Review authority", discovery: "Review local candidates", connections: "Test external edges", summary: "Confirm your starting point" }[step];
}

function Status({ label, state }: { label: string; state: CheckState | "pending" }) {
  const text = state === "live" ? "Live" : state === "pending" ? "Starting" : state === "degraded" ? "Degraded" : "Unavailable";
  return <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs"><span>{label}</span><span className="flex items-center gap-2 text-sidebar-foreground/70"><StateIcon state={state} />{text}</span></div>;
}

function ReadinessCard({ label, state, detail }: { label: string; state: CheckState; detail: string }) {
  return <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-3"><div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{label}</span><span className="flex items-center gap-1.5 text-sidebar-foreground/70"><StateIcon state={state} />{state === "live" ? "Ready" : state === "degraded" ? "Degraded" : "Unavailable"}</span></div><p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/65">{detail}</p></div>;
}