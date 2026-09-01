import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

type CheckState = "live" | "degraded" | "unavailable";
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

const labels = ["Brain", "Event Log", "System Contract", "CIL", "CerbaSeal", "Replit Bridge"];

function StateIcon({ state }: { state: CheckState | "pending" }) {
  if (state === "live") return <CircleCheck className="h-4 w-4 text-emerald-400" />;
  if (state === "pending") return <LoaderCircle className="h-4 w-4 animate-spin text-amber-300" />;
  return <CircleAlert className="h-4 w-4 text-amber-300" />;
}

export function DesktopSetupPanel() {
  const [runtime, setRuntime] = useState<RuntimeSnapshot | null>(null);
  const [update, setUpdate] = useState<UpdateState | null>(null);
  useEffect(() => {
    if (!window.leeRuntime) return;
    let active = true;
    const refresh = () => window.leeRuntime!.status().then((value) => { if (active) setRuntime(value); }).catch(() => undefined);
    void refresh();
    void window.leeRuntime.updateStatus().then((value) => { if (active) setUpdate(value); }).catch(() => undefined);
    const unsubscribe = window.leeRuntime.onUpdateState((value) => { if (active) setUpdate(value); });
    const timer = window.setInterval(refresh, 2000);
    return () => { active = false; window.clearInterval(timer); unsubscribe(); };
  }, []);
  if (!runtime) return null;

  return (
    <section className="border-b border-sidebar-border bg-sidebar px-5 py-4 text-sidebar-foreground" aria-label="LEE first-launch setup">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="lee-label text-sidebar-primary">First launch</p>
            <h2 className="mt-1 text-base font-semibold">LEE local runtime</h2>
            <p className="mt-1 max-w-2xl text-xs text-sidebar-foreground/70">
              LEE keeps its database and operating records on this computer. External services remain optional and are shown honestly below.
            </p>
          </div>
          {runtime.reason && <p className="max-w-md text-right text-xs text-amber-200">{runtime.reason}</p>}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Status label="Private database" state={runtime.database === "configured" ? "live" : runtime.database === "starting" ? "pending" : "unavailable"} />
          <Status label="Migrations" state={runtime.migration === "complete" ? "live" : runtime.migration === "pending" ? "pending" : "unavailable"} />
          {labels.map((label) => <Status key={label} label={label} state={runtime.checks[label] ?? "unavailable"} />)}
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