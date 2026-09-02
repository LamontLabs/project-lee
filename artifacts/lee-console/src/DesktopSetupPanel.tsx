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
  category?: string;
  baseUrl?: string | null;
  healthEndpoint?: string | null;
  credentialEnvKey?: string | null;
  capabilities?: string[];
  failurePolicy?: string;
  lastHealthCheck?: string | null;
  lastError?: string | null;
};
type ProjectRegistration = {
  id: string;
  name: string;
  endpoint: string;
  adapter: string;
  capabilities: string[];
  credentialConfigured: boolean;
};
type ProjectSetup = {
  mcpEndpoint?: string;
  configuration?: Record<string, unknown>;
  authentication?: string;
  adapters?: Record<string, string>;
};
type CILInventory = {
  correlation_id: string;
  total_configured: number;
  total_enabled: number;
  total_available: number;
  total_unavailable: number;
  models: Array<{ model_id: string; provider: string; status: string; enabled: boolean; route_ids: string[] }>;
};
type ProjectValidation = {
  status: string;
  checks: Array<{ operation: string; status: string; error?: string }>;
  note?: string;
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
  configuration?: Record<string, unknown>;
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
const stepKeys = ["runtime", "owner", "services", "discovery", "connections", "projects", "summary"] as const;
type WizardStep = (typeof stepKeys)[number];
type ProviderOption = {
  id: "gmail" | "google_drive" | "google_calendar" | "github" | "proton";
  label: string;
  detail: string;
  method: "oauth" | "manual";
  optional?: boolean;
};
const providerOptions: ProviderOption[] = [
  { id: "gmail", label: "Gmail", detail: "Read, search, labels, drafts, and mail actions after Google consent.", method: "oauth" },
  { id: "google_drive", label: "Google Drive", detail: "Read-only file metadata and source discovery after Google consent.", method: "oauth" },
  { id: "google_calendar", label: "Google Calendar", detail: "Read-only upcoming events after Google consent.", method: "oauth" },
  { id: "github", label: "GitHub", detail: "Repository metadata and project context after GitHub consent.", method: "oauth" },
  { id: "proton", label: "Proton (optional)", detail: "Create a pending provider projection for later manual configuration; no unsupported adapter is implied.", method: "manual", optional: true },
];

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
  const [projects, setProjects] = useState<ProjectRegistration[]>([]);
  const [projectSetup, setProjectSetup] = useState<ProjectSetup | null>(null);
  const [projectForm, setProjectForm] = useState({ id: "", name: "", endpoint: "", tokenEnv: "", adapter: "auto" });
  const [projectBusy, setProjectBusy] = useState<string | null>(null);
  const [projectNotice, setProjectNotice] = useState("");
  const [projectTestedIds, setProjectTestedIds] = useState<string[]>([]);
  const [projectValidation, setProjectValidation] = useState<Record<string, ProjectValidation>>({});
  const [validatingProject, setValidatingProject] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [checkingServices, setCheckingServices] = useState(false);
  const [modelInventory, setModelInventory] = useState<CILInventory | null>(null);
  const [modelInventoryError, setModelInventoryError] = useState("");
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
    projectTestedIds.length > 0 ||
    Object.values(projectValidation).some((result) => result.status === "validated") ||
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
    [cilHealth, coreReady, executionReady, governanceHealth, projectBridgeRegistered, projectTestedIds, projectValidation],
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
  const loadProjects = async () => {
    try {
      const [projectsResponse, setupResponse] = await Promise.all([
        fetch("/api/mcp-projects", { cache: "no-store" }),
        fetch("/api/mcp-projects/setup", { cache: "no-store" }),
      ]);
      if (!projectsResponse.ok) throw new Error("Project bridge inventory unavailable.");
      const data = await projectsResponse.json();
      setProjects(Array.isArray(data?.projects) ? data.projects : []);
      if (setupResponse.ok) setProjectSetup(await setupResponse.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Project bridge inventory unavailable.");
    }
  };
  const checkInternalServices = async () => {
    setCheckingServices(true);
    setError("");
    try {
      const [healthResponse, inventoryResponse] = await Promise.all([
        fetch("/api/internal-services/health/check", { method: "POST", cache: "no-store" }),
        fetch("/api/systems/cil/model-inventory", { cache: "no-store" }),
      ]);
      const data = await safeJson(healthResponse);
      if (!healthResponse.ok) throw new Error(data?.error ?? "Internal service checks failed.");
      setServices(Array.isArray(data) ? data : []);
      const inventoryData = await safeJson(inventoryResponse);
      if (inventoryResponse.ok && inventoryData?.inventory) {
        setModelInventory(inventoryData.inventory);
        setModelInventoryError("");
      } else {
        setModelInventory(null);
        setModelInventoryError(inventoryData?.error ?? "CIL model inventory is unavailable.");
      }
      setNotice("Internal service and CIL model inventory checks completed. Unavailable services remain safely blocked.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Internal service checks failed.");
    } finally {
      setCheckingServices(false);
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
          fetch("/api/mcp-projects", { cache: "no-store" }).then((response) => response.ok ? response.json() : {}),
        ]).then(([health, connectionList, projectList]) => {
        if (!active) return;
        setServices(Array.isArray(health) ? health : []);
        setConnections(Array.isArray(connectionList) ? connectionList : []);
          setProjects(Array.isArray((projectList as { projects?: unknown[] })?.projects) ? (projectList as { projects: ProjectRegistration[] }).projects : []);
      }).catch(() => undefined);
    };
    void Promise.all([refreshRuntime(), loadSetup(), loadConnections(), loadProjects()]).finally(() => {
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
  const setupProvider = async (provider: ProviderOption) => {
    const existing = connections.find((connection) =>
      connection.configuration?.oauthProvider === provider.id || connection.configuration?.provider === provider.id,
    );
    if (existing) {
      if (existing.method === "oauth" && existing.status !== "connected") await reauthorize(existing);
      else setNotice(`${existing.displayName} is already represented as ${statusLabel(existing.status)}.`);
      return;
    }
    setConnectingProvider(provider.id);
    setError("");
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: provider.label,
          targetType: "account",
          method: provider.method,
          permissions: ["OBSERVE"],
          configuration: provider.method === "oauth" ? { oauthProvider: provider.id } : { provider: provider.id },
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error ?? `${provider.label} setup could not start.`);
      await loadConnections();
      if (provider.method === "oauth") {
        await reauthorize({ ...data, method: "oauth" } as SafeConnection);
      } else {
        setNotice(`${provider.label} is represented as a pending OBSERVE-only connection. Configure its supported provider path later; no unsupported credential was inferred.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${provider.label} setup could not start.`);
    } finally {
      setConnectingProvider(null);
    }
  };
  const registerProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProjectBusy("register");
    setProjectNotice("");
    setError("");
    try {
      const response = await fetch("/api/mcp-projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data?.error ?? "Project could not be registered.");
      setProjectForm({ id: "", name: "", endpoint: "", tokenEnv: "", adapter: "auto" });
      setProjectNotice(`${data.project?.name ?? "Project"} is registered. Test it before relying on project operations.`);
      await loadProjects();
    } catch (cause) {
      setProjectNotice(cause instanceof Error ? cause.message : "Project could not be registered.");
    } finally {
      setProjectBusy(null);
    }
  };
  const testProject = async (id: string) => {
    setProjectBusy(id);
    setProjectNotice("");
    setError("");
    try {
      const response = await fetch(`/api/mcp-projects/${encodeURIComponent(id)}/test`, { method: "POST" });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(`${data?.error ?? "Project contract test failed."} ${data?.requiredSetup ?? ""}`.trim());
      setProjectTestedIds((current) => current.includes(id) ? current : [...current, id]);
      setProjectNotice(`${data.project?.name ?? id} passed inspect, the first project-bridge check.`);
      await loadProjects();
    } catch (cause) {
      setProjectNotice(cause instanceof Error ? cause.message : "Project contract test failed.");
    } finally {
      setProjectBusy(null);
    }
  };
  const validateProject = async (id: string) => {
    setValidatingProject(id);
    setProjectNotice("");
    setError("");
    try {
      const response = await fetch(`/api/mcp-projects/${encodeURIComponent(id)}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ readPath: "package.json", command: "pnpm run typecheck" }),
      });
      const data = await safeJson(response);
      if (!response.ok && response.status !== 207) throw new Error(data?.error ?? "Project validation failed.");
      setProjectValidation((current) => ({ ...current, [id]: data }));
      setProjectNotice(data.status === "validated" ? `${id} passed inspect, read, preview, and check validation.` : `${id} returned a partial validation result. Review each operation below.`);
    } catch (cause) {
      setProjectNotice(cause instanceof Error ? cause.message : "Project validation failed.");
    } finally {
      setValidatingProject(null);
    }
  };
  const copyProjectConfig = async () => {
    if (!projectSetup?.configuration) return;
    await navigator.clipboard?.writeText(JSON.stringify(projectSetup.configuration, null, 2));
    setProjectNotice("Credential-free MCP configuration copied.");
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
    if (["services", "discovery", "connections", "projects"].includes(wizardStep)) goNext();
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
         connectingProvider={connectingProvider}
         onSetupProvider={setupProvider}
         services={services}
         checkingServices={checkingServices}
         onCheckServices={checkInternalServices}
         modelInventory={modelInventory}
         modelInventoryError={modelInventoryError}
         projects={projects}
         projectSetup={projectSetup}
         projectForm={projectForm}
         projectBusy={projectBusy}
         projectNotice={projectNotice}
         projectTestedIds={projectTestedIds}
         projectValidation={projectValidation}
         validatingProject={validatingProject}
         onProjectFormChange={setProjectForm}
         onRegisterProject={registerProject}
         onTestProject={testProject}
         onValidateProject={validateProject}
         onCopyProjectConfig={copyProjectConfig}
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
  services,
  checkingServices,
  onCheckServices,
   modelInventory,
   modelInventoryError,
  projects,
  projectSetup,
  projectForm,
  projectBusy,
  projectNotice,
  projectTestedIds,
   projectValidation,
   validatingProject,
  onProjectFormChange,
  onRegisterProject,
  onTestProject,
   onValidateProject,
  onCopyProjectConfig,
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
   connectingProvider,
   onSetupProvider,
  onBack,
  onNext,
  onSkip,
}: {
  step: WizardStep;
  setup: SetupRun | null;
  runtime: RuntimeSnapshot | null;
  connections: SafeConnection[];
  services: ExternalService[];
  checkingServices: boolean;
  onCheckServices: () => void;
   modelInventory: CILInventory | null;
   modelInventoryError: string;
  projects: ProjectRegistration[];
  projectSetup: ProjectSetup | null;
  projectForm: { id: string; name: string; endpoint: string; tokenEnv: string; adapter: string };
  projectBusy: string | null;
  projectNotice: string;
  projectTestedIds: string[];
   projectValidation: Record<string, ProjectValidation>;
   validatingProject: string | null;
  onProjectFormChange: (form: { id: string; name: string; endpoint: string; tokenEnv: string; adapter: string }) => void;
  onRegisterProject: (event: React.FormEvent<HTMLFormElement>) => void;
  onTestProject: (id: string) => void;
   onValidateProject: (id: string) => void;
  onCopyProjectConfig: () => void;
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
   connectingProvider: string | null;
   onSetupProvider: (provider: ProviderOption) => void;
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
    services: { eyebrow: "03 / internal services", title: "Verify reasoning and authority", detail: "CIL, AI providers, and CerbaSeal are checked independently. Missing configuration stays visible and never becomes a silent fallback." },
    discovery: { eyebrow: "04 / local discovery", title: "Review what is listening locally", detail: "Discovery checks only approved loopback contracts. A service is never connected just because it answered." },
    connections: { eyebrow: "05 / external connections", title: "See the outside edges clearly", detail: "Test what exists, sign in where needed, and leave optional services unavailable when they are not part of your setup." },
    projects: { eyebrow: "06 / project operations", title: "Connect project work safely", detail: "Register the MCP Project Bridge, validate its inspect/read/preview/check contract, and keep apply behind fresh confirmation." },
    summary: { eyebrow: "07 / readiness summary", title: "A clear starting position", detail: "This is the state LEE will keep showing you. You can return to any stage whenever a decision changes." },
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
             <div className="mt-6 grid grid-cols-7 gap-1.5" aria-label="Setup progress">
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
                 {step === "services" && <InternalServicesStep services={services} checking={checkingServices} inventory={modelInventory} inventoryError={modelInventoryError} onCheck={onCheckServices} />}
                {step === "discovery" && <DiscoveryStep report={report} stale={discoveryStale} discovering={discovering} onDiscover={onDiscover} onAccept={onAccept} />}
                 {step === "connections" && <ExternalConnectionsStep connections={connections} optionalUnavailable={optionalUnavailable} testingId={testingId} connectingProvider={connectingProvider} onTest={onTest} onReauthorize={onReauthorize} onSetupProvider={onSetupProvider} />}
                 {step === "projects" && <ProjectsStep projects={projects} setup={projectSetup} form={projectForm} busy={projectBusy} notice={projectNotice} testedIds={projectTestedIds} validation={projectValidation} validatingProject={validatingProject} onFormChange={onProjectFormChange} onRegister={onRegisterProject} onTest={onTestProject} onValidate={onValidateProject} onCopy={onCopyProjectConfig} />}
                 {step === "summary" && <SummaryStep setup={setup} runtimeReady={runtimeReady} connections={connections} services={services} projects={projects} projectValidation={projectValidation} />}
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
             <div className="flex items-center gap-2">{(["services", "discovery", "connections", "projects"] as WizardStep[]).includes(step) && <button type="button" onClick={onSkip} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-sidebar-foreground/55 hover:bg-sidebar-accent" data-testid={`button-skip-setup-${step}`}><SkipForward size={14} /> Skip for now</button>}<button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-sidebar-foreground/55 hover:bg-sidebar-accent" data-testid="button-setup-save-close"><Clock3 size={14} /> Save and close</button><button type="button" onClick={onNext} className="inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-4 py-2 text-xs font-semibold text-sidebar-primary-foreground hover:opacity-90" data-testid="button-setup-next">{step === "summary" ? "Finish setup" : ["owner", "services", "discovery", "projects"].includes(step) ? "Continue" : "Next"} <ArrowRight size={14} /></button></div>
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

function InternalServicesStep({ services, checking, inventory, inventoryError, onCheck }: { services: ExternalService[]; checking: boolean; inventory: CILInventory | null; inventoryError: string; onCheck: () => void }) {
  const required = services.filter((service) => ["cil", "cerbaseal"].includes(service.serviceId ?? "") || service.serviceId?.startsWith("replit-ai-"));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 p-4">
      <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-sidebar-primary" /><div><p className="text-sm font-semibold">Configuration is server-side and explicit</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">LEE checks configured endpoints, credentials, contracts, and policy responses. This browser never receives a secret, and an unavailable dependency never gets bypassed.</p></div></div>
      <button type="button" onClick={onCheck} disabled={checking} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary disabled:opacity-50" data-testid="button-check-internal-services">{checking ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCw size={14} />}{checking ? "Checking" : "Check services"}</button>
    </div>
    {required.length ? <div className="grid gap-2 sm:grid-cols-2" aria-label="Internal service readiness">{required.map((service) => {
      const health = service.currentHealth ?? "unavailable";
      const isGovernance = service.serviceId === "cerbaseal";
      return <div key={service.serviceId} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3.5" data-testid={`card-internal-service-${service.serviceId}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="lee-label text-sidebar-primary">{service.category ?? "internal service"}</p><p className="mt-1 text-sm font-semibold">{service.displayName ?? service.serviceId}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(health)}`}>{statusLabel(health)}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><div className="rounded-lg bg-sidebar-accent/35 p-2.5"><p className="text-sidebar-foreground/40">Endpoint</p><p className="mt-1 truncate font-medium">{service.baseUrl ? "Configured" : "Missing"}</p></div><div className="rounded-lg bg-sidebar-accent/35 p-2.5"><p className="text-sidebar-foreground/40">Policy</p><p className="mt-1 font-medium">{service.failurePolicy ?? "Not reported"}</p></div><div className="rounded-lg bg-sidebar-accent/35 p-2.5"><p className="text-sidebar-foreground/40">Credential</p><p className="mt-1 truncate font-mono">{service.credentialEnvKey ?? "Not reported"}</p></div><div className="rounded-lg bg-sidebar-accent/35 p-2.5"><p className="text-sidebar-foreground/40">Capabilities</p><p className="mt-1 font-medium">{service.capabilities?.join(" · ") || "Not reported"}</p></div></div>
        {service.lastError && <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/5 p-2.5 text-[11px] leading-relaxed text-rose-200">{service.lastError}</p>}
        <p className="mt-3 text-[11px] leading-relaxed text-sidebar-foreground/55">{isGovernance ? "CerbaSeal unavailable means consequential actions remain on HOLD." : service.serviceId === "cil" ? "CIL unavailable means model execution remains blocked." : "This provider can be unavailable without blocking the private local foundation."}</p>
      </div>;
    })}</div> : <EmptyWizard icon={<RefreshCw size={18} />} title="No internal service registrations yet" detail="Run the check after configuring the server-side endpoints and provider integrations." />}
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4" data-testid="card-cil-model-inventory">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-sidebar-primary">CIL model inventory</p><p className="mt-1 text-sm font-semibold">Verify available routes before reasoning</p></div>{inventory && <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">{inventory.total_available} available</span>}</div>
      {inventory ? <><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Configured", inventory.total_configured], ["Enabled", inventory.total_enabled], ["Available", inventory.total_available], ["Unavailable", inventory.total_unavailable]].map(([label, value]) => <div key={label} className="rounded-lg bg-sidebar-accent/35 p-2.5"><p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/40">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div><div className="mt-3 space-y-1.5">{inventory.models.slice(0, 6).map((model) => <div key={`${model.provider}-${model.model_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-[11px]"><span className="min-w-0 truncate font-medium">{model.model_id}</span><span className="text-sidebar-foreground/50">{model.provider} · {model.enabled ? "enabled" : "disabled"} · {model.status}</span></div>)}{inventory.models.length > 6 && <p className="pt-1 text-[11px] text-sidebar-foreground/45">Showing 6 of {inventory.models.length} configured models. Full inventory is available in System health.</p>}</div></> : <p className="mt-3 text-xs leading-relaxed text-sidebar-foreground/55">{inventoryError || "Run the service check to retrieve the signed CIL inventory."}</p>}
    </div>
    <a href={`${import.meta.env.BASE_URL}settings/internal-services`} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary hover:bg-sidebar-accent" data-testid="link-wizard-internal-services"><ExternalLink size={14} /> Open internal services</a>
  </div>;
}

function ProjectsStep({
  projects,
  setup,
  form,
  busy,
  notice,
  testedIds,
  validation,
  validatingProject,
  onFormChange,
  onRegister,
  onTest,
  onValidate,
  onCopy,
}: {
  projects: ProjectRegistration[];
  setup: ProjectSetup | null;
  form: { id: string; name: string; endpoint: string; tokenEnv: string; adapter: string };
  busy: string | null;
  notice: string;
  testedIds: string[];
  validation: Record<string, ProjectValidation>;
  validatingProject: string | null;
  onFormChange: (form: { id: string; name: string; endpoint: string; tokenEnv: string; adapter: string }) => void;
  onRegister: (event: React.FormEvent<HTMLFormElement>) => void;
  onTest: (id: string) => void;
  onValidate: (id: string) => void;
  onCopy: () => void;
}) {
  return <div className="space-y-4">
    <div className="rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 p-4"><div className="flex items-start gap-3"><TerminalSquare size={18} className="mt-0.5 shrink-0 text-sidebar-primary" /><div><p className="text-sm font-semibold">Project operations stay narrow</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">Register a project endpoint with a server-side credential reference. Setup can inspect, read, preview, and run an allowlisted check; it never applies changes or accepts a credential value.</p></div></div></div>
    <form onSubmit={onRegister} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4" data-testid="form-wizard-project">
      <div className="flex items-center justify-between gap-3"><div><p className="lee-label text-sidebar-primary">Register a project</p><p className="mt-1 text-sm font-semibold">Add an MCP Project Bridge target</p></div><span className="text-[10px] text-sidebar-foreground/45">HTTPS only</span></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input required pattern="[a-zA-Z0-9_-]{1,64}" placeholder="Project ID" value={form.id} onChange={(event) => onFormChange({ ...form, id: event.target.value })} className="h-10 rounded-lg border border-sidebar-border bg-sidebar px-3 text-xs" data-testid="input-wizard-project-id" />
        <input required maxLength={120} placeholder="Project name" value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} className="h-10 rounded-lg border border-sidebar-border bg-sidebar px-3 text-xs" data-testid="input-wizard-project-name" />
        <input required type="url" placeholder="https://project.example" value={form.endpoint} onChange={(event) => onFormChange({ ...form, endpoint: event.target.value })} className="h-10 rounded-lg border border-sidebar-border bg-sidebar px-3 text-xs sm:col-span-2" data-testid="input-wizard-project-endpoint" />
        <input pattern="[A-Z][A-Z0-9_]{0,127}" placeholder="Server-side credential name (optional)" value={form.tokenEnv} onChange={(event) => onFormChange({ ...form, tokenEnv: event.target.value })} className="h-10 rounded-lg border border-sidebar-border bg-sidebar px-3 text-xs" data-testid="input-wizard-project-token-env" />
        <select value={form.adapter} onChange={(event) => onFormChange({ ...form, adapter: event.target.value })} className="h-10 rounded-lg border border-sidebar-border bg-sidebar px-3 text-xs" data-testid="select-wizard-project-adapter"><option value="auto">Auto-detect adapter</option><option value="project-agent">Project agent contract</option><option value="replit-standard">Replit standard contract</option></select>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] leading-relaxed text-sidebar-foreground/50">Enter only a secret name. Set its value in the server environment, never in this form.</p><button type="submit" disabled={busy === "register"} className="rounded-lg bg-sidebar-primary px-3 py-2 text-xs font-semibold text-sidebar-primary-foreground disabled:opacity-50" data-testid="button-register-wizard-project">{busy === "register" ? "Registering…" : "Register project"}</button></div>
    </form>
    {notice && <div className="rounded-lg border border-sidebar-primary/25 bg-sidebar-primary/10 p-3 text-xs leading-relaxed text-sidebar-foreground/75" role="status" data-testid="status-wizard-project">{notice}</div>}
    {projects.length ? <div className="space-y-2" aria-label="Registered projects">{projects.map((project) => {
      const result = validation[project.id];
      return <div key={project.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3.5" data-testid={`card-wizard-project-${project.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold">{project.name}</p><p className="mt-1 truncate text-[11px] text-sidebar-foreground/50">{project.endpoint}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${project.credentialConfigured ? statusTone("connected") : statusTone("pending")}`}>{project.credentialConfigured ? "Credential ready" : "Credential needed"}</span></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{project.capabilities.map((capability) => <span key={capability} className="rounded-full bg-sidebar-accent px-2 py-1 text-[10px] uppercase tracking-wide text-sidebar-foreground/55">{capability}</span>)}</div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onTest(project.id)} disabled={busy === project.id} className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border px-2.5 py-2 text-[11px] font-semibold hover:bg-sidebar-accent disabled:opacity-50" data-testid={`button-test-wizard-project-${project.id}`}>{busy === project.id ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />} Inspect</button><button type="button" onClick={() => onValidate(project.id)} disabled={validatingProject === project.id} className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-primary/35 px-2.5 py-2 text-[11px] font-semibold text-sidebar-primary hover:bg-sidebar-accent disabled:opacity-50" data-testid={`button-validate-wizard-project-${project.id}`}>{validatingProject === project.id ? <LoaderCircle className="animate-spin" size={13} /> : <Check size={13} />} Validate contract</button></div>
        {testedIds.includes(project.id) && !result && <p className="mt-2 text-[11px] text-emerald-200">Inspect responded.</p>}
        {result && <div className="mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-2.5"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-semibold">Read-only validation</p><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(result.status === "validated" ? "complete" : "degraded")}`}>{statusLabel(result.status)}</span></div><div className="mt-2 grid grid-cols-2 gap-1.5">{result.checks.map((check) => <div key={check.operation} className="flex items-center justify-between rounded-md bg-sidebar-accent px-2 py-1.5 text-[10px]"><span>{check.operation}</span><span className={check.status === "passed" ? "text-emerald-200" : "text-rose-200"}>{check.status}</span></div>)}</div>{result.checks.some((check) => check.error) && <p className="mt-2 text-[10px] leading-relaxed text-rose-200">{result.checks.filter((check) => check.error).map((check) => `${check.operation}: ${check.error}`).join(" · ")}</p>}</div>}
      </div>;
    })}</div> : <EmptyWizard icon={<TerminalSquare size={18} />} title="No project agents registered" detail="Register a project endpoint to enable safe inspect, read, preview, and check validation." />}
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="lee-label text-sidebar-primary">MCP client setup</p><p className="mt-1 text-sm font-semibold">Credential-free configuration</p></div><button type="button" onClick={onCopy} disabled={!setup?.configuration} className="rounded-lg border border-sidebar-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-sidebar-accent disabled:opacity-50" data-testid="button-copy-wizard-mcp-config">Copy JSON</button></div><pre className="mt-3 overflow-x-auto rounded-lg bg-sidebar-accent p-3 text-[10px] leading-relaxed">{setup?.configuration ? JSON.stringify(setup.configuration, null, 2) : "MCP configuration is loading…"}</pre><p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/50">{setup?.mcpEndpoint ? `Endpoint: ${setup.mcpEndpoint}. ` : ""}Keep the bridge credential in the MCP client secret store.</p></div>
    <a href={`${import.meta.env.BASE_URL}projects`} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary hover:bg-sidebar-accent" data-testid="link-wizard-projects"><ExternalLink size={14} /> Open Projects</a>
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
    <a href={`${import.meta.env.BASE_URL}connections`} className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary hover:bg-sidebar-accent" data-testid="link-wizard-connections"><ExternalLink size={14} /> Open Connections</a>
    {optionalUnavailable.length > 0 && <div className="flex items-start gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/15 p-3 text-xs leading-relaxed text-sidebar-foreground/60"><SkipForward size={15} className="mt-0.5 shrink-0 text-sidebar-primary" />{optionalUnavailable.length} optional service{optionalUnavailable.length === 1 ? " is" : "s are"} not available. That is an honest degraded state, not a failed setup.</div>}
  </div>;
}

function ExternalConnectionsStep({ connections, optionalUnavailable, testingId, connectingProvider, onTest, onReauthorize, onSetupProvider }: { connections: SafeConnection[]; optionalUnavailable: SafeConnection[]; testingId: string | null; connectingProvider: string | null; onTest: (connection: SafeConnection) => void; onReauthorize: (connection: SafeConnection) => void; onSetupProvider: (provider: ProviderOption) => void }) {
  const connectionFor = (provider: ProviderOption) => connections.find((connection) =>
    connection.configuration?.oauthProvider === provider.id || connection.configuration?.provider === provider.id,
  );
  return <div className="space-y-4">
    <div className="rounded-xl border border-sidebar-primary/30 bg-sidebar-primary/10 p-4"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-sidebar-primary" /><div><p className="text-sm font-semibold">Choose only the accounts LEE needs</p><p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/70">Each provider begins as a pending OBSERVE-only connection. OAuth opens the provider’s consent page; credentials and scopes stay server-side. Proton is optional and remains visibly degraded until a supported path is configured.</p></div></div></div>
    <div className="grid gap-2 sm:grid-cols-2" aria-label="External provider setup">
      {providerOptions.map((provider) => {
        const existing = connectionFor(provider);
        const connected = existing?.status === "connected";
        return <div key={provider.id} className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3.5" data-testid={`card-provider-setup-${provider.id}`}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{provider.label}</p><p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/55">{provider.detail}</p></div>{provider.optional && <span className="rounded-full border border-sidebar-border px-2 py-1 text-[10px] text-sidebar-foreground/45">Optional</span>}</div>
          <div className="mt-3 flex items-center justify-between gap-2"><span className={`text-[11px] font-semibold ${connected ? "text-emerald-200" : existing ? "text-amber-200" : "text-sidebar-foreground/45"}`}>{connected ? "Connected" : existing ? statusLabel(existing.status) : "Not configured"}</span>{existing?.method === "oauth" && !connected ? <button type="button" onClick={() => onReauthorize(existing)} className="rounded-lg border border-sidebar-primary/35 px-2.5 py-1.5 text-[11px] font-semibold text-sidebar-primary" data-testid={`button-authorize-provider-${provider.id}`}>Continue sign-in</button> : <button type="button" onClick={() => onSetupProvider(provider)} disabled={Boolean(existing) || connectingProvider === provider.id} className="rounded-lg border border-sidebar-primary/35 px-2.5 py-1.5 text-[11px] font-semibold text-sidebar-primary hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-50" data-testid={`button-setup-provider-${provider.id}`}>{connectingProvider === provider.id ? "Starting…" : existing ? "Already added" : provider.optional ? "Add optional" : "Add provider"}</button>}</div>
        </div>;
      })}
    </div>
    {connections.length ? <div className="space-y-2" aria-label="External connection status">{connections.map((connection) => <div key={connection.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3.5" data-testid={`row-connection-status-${connection.id}`}><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{connection.displayName}</p><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(connection.status)}`}>{statusLabel(connection.status)}</span></div><p className="mt-1 text-xs text-sidebar-foreground/50">{connection.authStatus ? `Authorization: ${statusLabel(connection.authStatus)}` : connection.credentialConfigured ? "Credential reference configured" : "No credential configured"}</p>{connection.lastError && <p className="mt-1 text-xs text-rose-200">{connection.lastError}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => onTest(connection)} disabled={testingId === connection.id} className="inline-flex items-center gap-1.5 rounded-lg border border-sidebar-border px-2.5 py-2 text-[11px] font-semibold hover:bg-sidebar-accent disabled:opacity-50" data-testid={`button-test-wizard-${connection.id}`}>{testingId === connection.id ? <LoaderCircle className="animate-spin" size={13} /> : <RefreshCw size={13} />} Test</button>{connection.method === "oauth" && connection.status !== "connected" && <button type="button" onClick={() => onReauthorize(connection)} className="rounded-lg border border-sidebar-primary/35 px-2.5 py-2 text-[11px] font-semibold text-sidebar-primary" data-testid={`button-reauthorize-wizard-${connection.id}`}>Sign in</button>}</div></div>)}</div> : <EmptyWizard icon={<ExternalLink size={18} />} title="No external connections yet" detail="Use the provider choices above to add Gmail, Drive, Calendar, GitHub, or optional Proton without leaving setup." />}
    <a href="/connections" className="inline-flex items-center gap-2 rounded-lg border border-sidebar-primary/35 px-3 py-2 text-xs font-semibold text-sidebar-primary hover:bg-sidebar-accent" data-testid="link-wizard-connections"><ExternalLink size={14} /> Open Connections</a>
    {optionalUnavailable.length > 0 && <div className="flex items-start gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/15 p-3 text-xs leading-relaxed text-sidebar-foreground/60"><SkipForward size={15} className="mt-0.5 shrink-0 text-sidebar-primary" />{optionalUnavailable.length} optional service{optionalUnavailable.length === 1 ? " is" : "s are"} not available. That is an honest degraded state, not a failed setup.</div>}
  </div>;
}

function SummaryStep({ setup, runtimeReady, connections, services, projects, projectValidation }: { setup: SetupRun | null; runtimeReady: boolean; connections: SafeConnection[]; services: ExternalService[]; projects: ProjectRegistration[]; projectValidation: Record<string, ProjectValidation> }) {
  const healthy = connections.filter((connection) => connection.status === "connected").length;
  const needsOwner = connections.filter((connection) => connection.status === "pending" || connection.status === "needs_reauthorization").length;
  const cil = services.find((service) => service.serviceId === "cil");
  const cerbaseal = services.find((service) => service.serviceId === "cerbaseal");
  const aiReady = services.some((service) => service.serviceId?.startsWith("replit-ai-") && service.currentHealth === "healthy");
  const validatedProjects = projects.filter((project) => projectValidation[project.id]?.status === "validated").length;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><WizardMetric label="Local foundation" value={runtimeReady ? "Ready" : "Degraded"} state={runtimeReady ? "good" : "wait"} /><WizardMetric label="CIL + AI" value={cil?.currentHealth === "healthy" && aiReady ? "Ready" : "Degraded"} state={cil?.currentHealth === "healthy" && aiReady ? "good" : "wait"} /><WizardMetric label="CerbaSeal" value={cerbaseal?.currentHealth === "healthy" ? "Ready" : "HOLD"} state={cerbaseal?.currentHealth === "healthy" ? "good" : "wait"} /><WizardMetric label="Project operations" value={projects.length ? `${validatedProjects}/${projects.length} validated` : "Not configured"} state={validatedProjects ? "good" : "wait"} /><WizardMetric label="Connected" value={`${healthy} ${healthy === 1 ? "connection" : "connections"}`} state={healthy ? "good" : "wait"} /><WizardMetric label="Owner decisions" value={`${needsOwner} remaining`} state={needsOwner ? "wait" : "good"} /></div>
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
  return { runtime: "Runtime", owner: "Owner approval", services: "Internal services", discovery: "Local discovery", connections: "Connections", projects: "Project operations", summary: "Summary" }[step];
}

function detailFor(step: WizardStep) {
  return { runtime: "Check the private foundation", owner: "Review authority", services: "Check reasoning and policy", discovery: "Review local candidates", connections: "Test external edges", projects: "Validate project work", summary: "Confirm your starting point" }[step];
}

function Status({ label, state }: { label: string; state: CheckState | "pending" }) {
  const text = state === "live" ? "Live" : state === "pending" ? "Starting" : state === "degraded" ? "Degraded" : "Unavailable";
  return <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs"><span>{label}</span><span className="flex items-center gap-2 text-sidebar-foreground/70"><StateIcon state={state} />{text}</span></div>;
}

function ReadinessCard({ label, state, detail }: { label: string; state: CheckState; detail: string }) {
  return <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-3"><div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{label}</span><span className="flex items-center gap-1.5 text-sidebar-foreground/70"><StateIcon state={state} />{state === "live" ? "Ready" : state === "degraded" ? "Degraded" : "Unavailable"}</span></div><p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/65">{detail}</p></div>;
}