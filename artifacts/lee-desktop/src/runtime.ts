import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type RuntimeState = "starting" | "live" | "degraded" | "unavailable" | "stopped";
export type RuntimeSnapshot = {
  state: RuntimeState;
  apiUrl: string;
  database: "configured" | "unavailable";
  contract: "live" | "unavailable";
  reason: string | null;
};

type RuntimeConfig = { databaseUrl?: string; apiPort?: number; apiCommand?: string; apiArgs?: string[] };

const appData = process.env.APPDATA ?? join(homedir(), ".config");
export const dataDir = join(appData, "Project LEE");
const configPath = join(dataDir, "config.json");

function loadConfig(): RuntimeConfig {
  if (!existsSync(configPath)) return {};
  try { return JSON.parse(readFileSync(configPath, "utf8")) as RuntimeConfig; } catch { return {}; }
}

export function ensureRuntimeDirectories(): void {
  for (const directory of [dataDir, join(dataDir, "backups"), join(dataDir, "logs"), join(dataDir, "brain"), join(dataDir, "event-log")]) {
    mkdirSync(directory, { recursive: true });
  }
}

export function saveRuntimeConfig(config: RuntimeConfig): void {
  ensureRuntimeDirectories();
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8", mode: 0o600 });
}

export class RuntimeSupervisor {
  private child: ChildProcess | null = null;
  private snapshot: RuntimeSnapshot = { state: "stopped", apiUrl: "", database: "unavailable", contract: "unavailable", reason: null };
  private readonly port: number;
  private readonly apiUrl: string;

  constructor(private readonly root: string, private readonly production: boolean) {
    const config = loadConfig();
    this.port = config.apiPort ?? Number(process.env.LEE_DESKTOP_API_PORT ?? 4317);
    this.apiUrl = `http://127.0.0.1:${this.port}`;
  }

  get status(): RuntimeSnapshot { return this.snapshot; }

  async start(): Promise<RuntimeSnapshot> {
    ensureRuntimeDirectories();
    const config = loadConfig();
    if (!config.databaseUrl && !process.env.DATABASE_URL) {
      this.snapshot = { state: "unavailable", apiUrl: this.apiUrl, database: "unavailable", contract: "unavailable", reason: "A local PostgreSQL DATABASE_URL has not been configured. Complete first-launch setup to continue." };
      return this.snapshot;
    }
    this.snapshot = { state: "starting", apiUrl: this.apiUrl, database: "configured", contract: "unavailable", reason: null };
    const apiPath = this.production ? join(process.resourcesPath, "api-server", "index.mjs") : join(this.root, "..", "api-server", "dist", "index.mjs");
    const command = config.apiCommand ?? process.execPath.replace(/electron(?:\.exe)?$/i, "node.exe");
    const args = config.apiArgs ?? [apiPath];
    this.child = spawn(command, args, {
      cwd: this.root,
      env: { ...process.env, DATABASE_URL: config.databaseUrl ?? process.env.DATABASE_URL, PORT: String(this.port), NODE_ENV: this.production ? "production" : "development", LEE_DATA_DIR: dataDir },
      stdio: "ignore",
      windowsHide: true,
    });
    this.child.once("exit", (code) => {
      if (this.snapshot.state !== "stopped") this.snapshot = { ...this.snapshot, state: "unavailable", reason: `LEE Core stopped unexpectedly${code == null ? "" : ` (exit ${code})`}.` };
    });
    const healthy = await this.waitForContract();
    this.snapshot = healthy
      ? { ...this.snapshot, state: "live", contract: "live", reason: null }
      : { ...this.snapshot, state: "degraded", contract: "unavailable", reason: "LEE Core started, but the System Contract did not become reachable." };
    return this.snapshot;
  }

  private async waitForContract(): Promise<boolean> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(`${this.apiUrl}/api/contract`);
        if (response.ok) return true;
      } catch { /* Startup probe; the final state remains visible to the user. */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  }

  stop(): void {
    this.snapshot = { ...this.snapshot, state: "stopped", reason: null };
    if (this.child && !this.child.killed) this.child.kill();
    this.child = null;
  }
}