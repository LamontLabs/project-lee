import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type RuntimeState = "starting" | "live" | "degraded" | "unavailable" | "stopped";
export type RuntimeSnapshot = {
  state: RuntimeState;
  apiUrl: string;
  database: "starting" | "configured" | "unavailable";
  migration: "pending" | "complete" | "failed";
  contract: "live" | "unavailable";
  checks: Record<string, "live" | "degraded" | "unavailable">;
  reason: string | null;
  migrationLogPath: string;
};

type RuntimeConfig = {
  databaseUrl?: string;
  apiPort?: number;
  apiCommand?: string;
  apiArgs?: string[];
  postgresBin?: string;
  migrationCommand?: string;
};

const appData = process.env.APPDATA ?? join(homedir(), ".config");
export const dataDir = join(appData, "Project LEE");
const configPath = join(dataDir, "config.json");
const databaseDir = join(dataDir, "database");

function loadConfig(): RuntimeConfig {
  if (!existsSync(configPath)) return {};
  try { return JSON.parse(readFileSync(configPath, "utf8")) as RuntimeConfig; } catch { return {}; }
}

export function ensureRuntimeDirectories(): void {
  for (const directory of [dataDir, join(dataDir, "backups"), join(dataDir, "logs"), join(dataDir, "brain"), join(dataDir, "event-log"), databaseDir]) {
    mkdirSync(directory, { recursive: true });
  }
  try { chmodSync(dataDir, 0o700); } catch { /* Windows ACLs are inherited from appData. */ }
}

export function saveRuntimeConfig(config: RuntimeConfig): void {
  ensureRuntimeDirectories();
  writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: "utf8", mode: 0o600 });
}

export class RuntimeSupervisor {
  private child: ChildProcess | null = null;
  private postgres: ChildProcess | null = null;
  private postgresCtl: string | null = null;
  private snapshot: RuntimeSnapshot = {
    state: "stopped", apiUrl: "", database: "unavailable", migration: "pending",
    contract: "unavailable", checks: this.emptyChecks(), reason: null,
    migrationLogPath: join(dataDir, "logs", "migration.log"),
  };
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
    this.snapshot = { ...this.snapshot, state: "starting", apiUrl: this.apiUrl, database: "starting", migration: "pending", reason: null };
    const configuredDatabaseUrl = config.databaseUrl ?? process.env.DATABASE_URL;
    const hasPrivatePostgres = this.production || Boolean(config.postgresBin ?? process.env.LEE_POSTGRES_BIN);
    const databaseUrl = configuredDatabaseUrl && (!this.isLocalDatabaseUrl(configuredDatabaseUrl) || !hasPrivatePostgres)
      ? configuredDatabaseUrl
      : await this.ensurePostgres(config);
    if (!databaseUrl) {
      this.snapshot = { ...this.snapshot, state: "unavailable", database: "unavailable", reason: "LEE could not find or start its private PostgreSQL service. Set postgresBin in the LEE config or reinstall with the bundled database runtime." };
      return this.snapshot;
    }
    saveRuntimeConfig({ ...config, databaseUrl });
    this.snapshot = { ...this.snapshot, database: "configured" };
    if (!this.runMigrations(config, databaseUrl)) {
      this.snapshot = { ...this.snapshot, state: "degraded", migration: "failed", reason: `The local database is available, but migrations failed. Review ${this.snapshot.migrationLogPath} and repair the migration command before continuing.` };
      return this.snapshot;
    }
    this.snapshot = { ...this.snapshot, migration: "complete" };
    const apiPath = this.production ? join(process.resourcesPath, "api-server", "index.mjs") : join(this.root, "..", "api-server", "dist", "index.mjs");
    const command = config.apiCommand ?? process.execPath.replace(/electron(?:\.exe)?$/i, "node.exe");
    const args = config.apiArgs ?? [apiPath];
    this.child = spawn(command, args, {
      cwd: this.root,
      env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(this.port), NODE_ENV: this.production ? "production" : "development", LEE_DATA_DIR: dataDir },
      stdio: "ignore",
      windowsHide: true,
    });
    this.child.once("exit", (code) => {
      if (this.snapshot.state !== "stopped") this.snapshot = { ...this.snapshot, state: "unavailable", reason: `LEE Core stopped unexpectedly${code == null ? "" : ` (exit ${code})`}.` };
    });
    const healthy = await this.waitForContract();
    this.snapshot = healthy
      ? { ...this.snapshot, state: "live", contract: "live", checks: { ...this.snapshot.checks, "System Contract": "live", Brain: "live", "Event Log": "live" }, reason: null }
      : { ...this.snapshot, state: "degraded", contract: "unavailable", reason: "LEE Core started, but the System Contract did not become reachable." };
    return this.snapshot;
  }

  private emptyChecks(): Record<string, "live" | "degraded" | "unavailable"> {
    return { Brain: "unavailable", "Event Log": "unavailable", "System Contract": "unavailable", CIL: "unavailable", CerbaSeal: "unavailable", "Replit Bridge": "unavailable" };
  }

  private isLocalDatabaseUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.hostname === "127.0.0.1" || url.hostname === "localhost";
    } catch {
      return false;
    }
  }

  private async ensurePostgres(config: RuntimeConfig): Promise<string | null> {
    const bin = config.postgresBin ?? (this.production ? join(process.resourcesPath, "postgres", "bin") : process.env.LEE_POSTGRES_BIN);
    if (!bin) return null;
    const executable = (name: string) => join(bin, process.platform === "win32" ? `${name}.exe` : name);
    const initdb = executable("initdb");
    const pgCtl = executable("pg_ctl");
    if (!existsSync(initdb) || !existsSync(pgCtl)) return null;
    const port = this.port + 1;
    if (!existsSync(join(databaseDir, "PG_VERSION"))) {
      const initialized = spawnSync(initdb, ["-D", databaseDir, "--auth=trust", "--username=lee"], { encoding: "utf8", windowsHide: true });
      if (initialized.status !== 0) {
        writeFileSync(join(dataDir, "logs", "postgres-init.log"), `${initialized.stdout ?? ""}\n${initialized.stderr ?? ""}`, { mode: 0o600 });
        return null;
      }
    }
    const started = spawn(pgCtl, ["-D", databaseDir, "-o", `-p ${port}`, "-w", "start"], { windowsHide: true, stdio: "ignore" });
    this.postgres = started;
    this.postgresCtl = pgCtl;
    const url = `postgresql://lee@127.0.0.1:${port}/lee`;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const probe = spawnSync(executable("pg_isready"), ["-h", "127.0.0.1", "-p", String(port)], { windowsHide: true });
      if (probe.status === 0) {
        const created = spawnSync(executable("createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "lee", "lee"], { windowsHide: true });
        if (created.status === 0 || created.stderr?.toString().includes("already exists")) return url;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    spawnSync(pgCtl, ["-D", databaseDir, "-w", "stop", "-m", "immediate"], { windowsHide: true, stdio: "ignore" });
    this.postgres = null;
    return null;
  }

  private runMigrations(config: RuntimeConfig, databaseUrl: string): boolean {
    const command = config.migrationCommand ?? process.env.LEE_MIGRATION_COMMAND ?? "pnpm --filter @workspace/db push";
    const result = spawnSync(command, { shell: true, cwd: this.root, env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8", windowsHide: true });
    writeFileSync(join(dataDir, "logs", "migration.log"), `${result.stdout ?? ""}\n${result.stderr ?? ""}`, { mode: 0o600 });
    return result.status === 0;
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
    if (this.postgresCtl) spawnSync(this.postgresCtl, ["-D", databaseDir, "-w", "stop", "-m", "fast"], { windowsHide: true, stdio: "ignore" });
    if (this.postgres && !this.postgres.killed) this.postgres.kill();
    this.child = null;
    this.postgres = null;
    this.postgresCtl = null;
  }
}