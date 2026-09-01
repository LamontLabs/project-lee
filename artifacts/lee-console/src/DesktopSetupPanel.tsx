import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

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
};
type UpdateState = { status: "unsupported" | "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error"; version?: string; message?: string };
type ExternalService = { serviceId?: string; currentHealth?: ExternalHealth; displayName?: string; failurePolicy?: string };

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
      discoverLocalServices: () => Promise<LocalServiceDiscoveryPayload>;
      updateStatus: () => Promise<UpdateState>;
      checkForUpdates: () => Promise<UpdateState>;
      downloadUpdate: () => Promise<UpdateState>;
      installUpdate: () => Promise<UpdateState>;
      onUpdateState: (listener: (state: UpdateState) => void) => () => void;
    };
  }
}

function StateIcon({ state }: { state: CheckState | "pending" }) {
  if (state === "live") return <CircleCheck className="h-4 w-4 text-emerald-400" />;
  if (state === "pending") return <LoaderCircle className="h-4 w-4 animate-spin text-amber-300" />;
  return <CircleAlert className="h-4 w-4 text-amber-300" />;
}

export function DesktopSetupPanel() {
  const [runtime, setRuntime] = useState<RuntimeSnapshot | null>(null);
  const [services, setServices] = useState<ExternalService[]>([]);
  const [connections, setConnections] = useState<Array<Record<string, unknown>>>([]);
  const [update, setUpdate] = useState<UpdateState | null>(null);
  useEffect(() => {
    if (!window.leeRuntime) return;
    let active = true;
    const refresh = () => window.leeRuntime!.status().then((value) => { if (active) setRuntime(value); }).catch(() => undefined);
    void refresh();
    const refreshExternal = () => {
      void Promise.all([
        fetch("/api/internal-services/health", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
        fetch("/api/connections", { cache: "no-store" }).then((response) => response.ok ? response.json() : []),
      ]).then(([health, connectionList]) => {
        if (active) {
          setServices(Array.isArray(health) ? health : []);
          setConnections(Array.isArray(connectionList) ? connectionList : []);
        }
      }).catch(() => undefined);
    };
    refreshExternal();
    void window.leeRuntime.updateStatus().then((value) => { if (active) setUpdate(value); }).catch(() => undefined);
    const unsubscribe = window.leeRuntime.onUpdateState((value) => { if (active) setUpdate(value); });
    const timer = window.setInterval(refresh, 2000);
    const externalTimer = window.setInterval(refreshExternal, 5000);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(externalTimer); unsubscribe(); };
  }, []);
  if (!runtime) return null;

  const healthFor = (id: string): ExternalHealth => services.find((service) => service.serviceId === id)?.currentHealth ?? "unavailable";
  const cilHealth = healthFor("cil");
  const governanceHealth = healthFor("cerbaseal");
  const executionReady = services.some((service) => service.serviceId?.startsWith("replit-ai-") && service.currentHealth === "healthy");
  const projectBridgeRegistered = services.some((service) => service.serviceId === "mcp-project-bridge" && service.currentHealth === "healthy")
    || connections.some((connection) => {
      const serialized = JSON.stringify(connection).toLowerCase();
      return serialized.includes("mcp") && (serialized.includes("connected") || serialized.includes("healthy"));
    });
  const coreReady = runtime.database === "configured" && runtime.migration === "complete" && runtime.contract === "live"
    && runtime.checks.Brain === "live" && runtime.checks["Event Log"] === "live";
  const readiness: Array<{ label: string; state: CheckState; detail: string }> = [
    { label: "LEE Core", state: coreReady ? "live" : runtime.state === "starting" ? "degraded" : "unavailable", detail: coreReady ? "Database, Event Log, Brain, API, and local knowledge are available." : "Local foundation is still starting or needs attention." },
    { label: "AI", state: cilHealth === "healthy" && executionReady ? "live" : cilHealth === "degraded" || (cilHealth === "healthy" && !executionReady) ? "degraded" : "unavailable", detail: cilHealth !== "healthy" ? "CIL is unavailable; model execution remains blocked." : executionReady ? "CIL and an approved execution provider are healthy." : "CIL is reachable, but no approved execution provider is healthy." },
    { label: "Governed Actions", state: governanceHealth === "healthy" ? "live" : governanceHealth === "degraded" ? "degraded" : "unavailable", detail: governanceHealth === "healthy" ? "CerbaSeal is reachable and valid." : "CerbaSeal is unavailable; consequential actions remain on HOLD." },
    { label: "Project Operations", state: projectBridgeRegistered ? "live" : "unavailable", detail: projectBridgeRegistered ? "MCP project operations are connected." : "MCP Project Bridge is unavailable; local LEE Core is unaffected." },
  ];

  return (
    <section className="border-b border-sidebar-border bg-sidebar px-5 py-4 text-sidebar-foreground" aria-label="LEE first-launch setup">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="lee-label text-sidebar-primary">First launch</p>
            <h2 className="mt-1 text-base font-semibold">LEE local runtime</h2>
            <p className="mt-1 max-w-2xl text-xs text-sidebar-foreground/70">
              LEE keeps its database and operating records on this computer. Core, AI, governance, and project operations report independently.
            </p>
          </div>
          {runtime.reason && <p className="max-w-md text-right text-xs text-amber-200">{runtime.reason}</p>}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {readiness.map((item) => <ReadinessCard key={item.label} {...item} />)}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Status label="Private database" state={runtime.database === "configured" ? "live" : runtime.database === "starting" ? "pending" : "unavailable"} />
          <Status label="Migrations" state={runtime.migration === "complete" ? "live" : runtime.migration === "pending" ? "pending" : "unavailable"} />
          <Status label="CIL authority" state={cilHealth === "healthy" ? "live" : cilHealth} />
          <Status label="CerbaSeal authority" state={governanceHealth === "healthy" ? "live" : governanceHealth} />
        </div>
        {runtime.migration === "failed" && <p className="mt-3 text-xs text-amber-200">Migration log: {runtime.migrationLogPath}</p>}
        {update && update.status !== "unsupported" && update.status !== "idle" && update.status !== "not-available" && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sidebar-primary/30 bg-sidebar-accent/40 px-3 py-2.5 text-xs">
          <span>{update.status === "available" ? `A new LEE version is ready${update.version ? ` · ${update.version}` : ""}.` : update.status === "downloaded" ? `LEE ${update.version ?? "update"} is ready to install.` : update.status === "downloading" ? `Downloading LEE update${update.message ? ` · ${update.message}` : ""}` : update.status === "checking" ? "Checking for LEE updates…" : update.message ?? "LEE update check failed."}</span>
          {update.status === "available" && <button onClick={() => void window.leeRuntime?.downloadUpdate()} className="rounded-lg bg-sidebar-primary px-3 py-1.5 font-semibold text-sidebar-primary-foreground">Download update</button>}
          {update.status === "downloaded" && <button onClick={() => void window.leeRuntime?.installUpdate()} className="rounded-lg bg-sidebar-primary px-3 py-1.5 font-semibold text-sidebar-primary-foreground">Restart and update</button>}
          {update.status === "error" && <button onClick={() => void window.leeRuntime?.checkForUpdates()} className="rounded-lg border border-sidebar-primary/30 px-3 py-1.5 font-semibold text-sidebar-primary">Try again</button>}
        </div>}
      </div>
    </section>
  );
}

function Status({ label, state }: { label: string; state: CheckState | "pending" }) {
  const text = state === "live" ? "Live" : state === "pending" ? "Starting" : state === "degraded" ? "Degraded" : "Unavailable";
  return <div className="flex items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2 text-xs"><span>{label}</span><span className="flex items-center gap-2 text-sidebar-foreground/70"><StateIcon state={state} />{text}</span></div>;
}

function ReadinessCard({ label, state, detail }: { label: string; state: CheckState; detail: string }) {
  return <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-3"><div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{label}</span><span className="flex items-center gap-1.5 text-sidebar-foreground/70"><StateIcon state={state} />{state === "live" ? "Ready" : state === "degraded" ? "Degraded" : "Unavailable"}</span></div><p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/65">{detail}</p></div>;
}