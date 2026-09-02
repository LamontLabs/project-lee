import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

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

export type LocalServiceDiscoveryCandidate = {
  discoveryKey: string;
  contractId: string;
  provider: string;
  displayName: string;
  targetType: string;
  method: "local";
  baseUrl: string;
  healthEndpoint: string;
  contractVersion: string;
  capabilities: Array<Record<string, string>>;
  dependencies: Array<Record<string, string | boolean>>;
  observedAt: string;
};

export type LocalServiceProbeFailure = {
  contractId: string;
  displayName: string;
  endpoint: string;
  reason: "Not reachable" | "Timed out" | "Malformed response" | "Oversized response" | "Unsupported response" | "Not a compatible service contract" | `Returned HTTP ${number}`;
};

export type LocalServiceDiscovery = {
  candidates: LocalServiceDiscoveryCandidate[];
  failures: LocalServiceProbeFailure[];
  attempted: number;
  completedAt: string;
};

type LocalServiceAllowlistEntry = {
  contractId: string;
  provider: string;
  displayName: string;
  targetType: string;
  defaultPort: number;
  paths: readonly string[];
};

/**
 * This list is intentionally finite. Discovery never enumerates ports, interfaces,
 * hostnames, or paths supplied by a caller.
 */
export const LOCAL_SERVICE_ALLOWLIST: readonly LocalServiceAllowlistEntry[] = [
  { contractId: "lee-system", provider: "lee", displayName: "LEE System Contract", targetType: "local_system", defaultPort: 4317, paths: ["/api/contract", "/api/system-contract"] },
  { contractId: "k6", provider: "k6", displayName: "K6 Service Contract", targetType: "service", defaultPort: 6420, paths: ["/k6/contract", "/api/contract"] },
];

type RemoteLocalServiceContract = {
  contractId: unknown;
  provider: unknown;
  displayName: unknown;
  targetType: unknown;
  port: unknown;
  paths: unknown;
};

type RuntimeConfig = {
  databaseUrl?: string;
  apiPort?: number;
  apiCommand?: string;
  apiArgs?: string[];
  postgresBin?: string;
  migrationCommand?: string;
};

const appData = process.env.APPDATA
  ?? process.env.XDG_CONFIG_HOME
  ?? (process.platform === "darwin" ? join(homedir(), "Library", "Application Support") : join(homedir(), ".config"));
export const dataDir = join(appData, "Project LEE");
const configPath = join(dataDir, "config.json");
const databaseDir = join(dataDir, "database");
export const MAX_DISCOVERY_RESPONSE_BYTES = 256 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length <= 160 && !/(api[_-]?key|secret|password|token|private[_-]?key|credential)/i.test(value) ? value : fallback;
}

function safeValue(value: unknown): string | null {
  return typeof value === "string" && value.length <= 160 && !/(api[_-]?key|secret|password|token|private[_-]?key|credential)/i.test(value) ? value : null;
}

function safeCapabilities(value: unknown): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item)) return [];
    const result: Record<string, string> = {};
    for (const key of ["id", "name", "engineId", "state"]) {
      const safe = safeValue(item[key]);
      if (safe) result[key] = safe;
    }
    return Object.keys(result).length ? [result] : [];
  });
}

function safeDependencies(value: unknown): Array<Record<string, string | boolean>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item)) return [];
    const result: Record<string, string | boolean> = {};
    for (const key of ["id", "engine", "name", "state", "required"]) {
      const safe = safeValue(item[key]);
      if (safe || typeof item[key] === "boolean") result[key] = safe ?? item[key] as boolean;
    }
    return Object.keys(result).length ? [result] : [];
  });
}

function findPostgresBin(): string | null {
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [process.platform === "win32" ? "initdb.exe" : "initdb"], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  const executable = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return executable ? dirname(executable) : null;
}

function compatibleContract(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return typeof value.contractVersion === "string" || typeof value.contract_version === "string";
}

function probeFailure(error: unknown): LocalServiceProbeFailure["reason"] {
  if (error instanceof Error && error.name === "AbortError") return "Timed out";
  return "Not reachable";
}

function failurePriority(reason: LocalServiceProbeFailure["reason"]): number {
  if (reason === "Malformed response" || reason === "Oversized response") return 5;
  if (reason === "Not a compatible service contract" || reason === "Unsupported response") return 4;
  if (reason === "Timed out") return 3;
  if (reason.startsWith("Returned HTTP")) return 2;
  return 1;
}

function retainMostSpecificFailure(
  current: LocalServiceProbeFailure["reason"],
  next: LocalServiceProbeFailure["reason"],
): LocalServiceProbeFailure["reason"] {
  return failurePriority(next) >= failurePriority(current) ? next : current;
}

type BoundedJsonResult =
  | { kind: "payload"; payload: unknown }
  | { kind: "malformed" }
  | { kind: "oversized" }
  | { kind: "unsupported" };

async function readBoundedJson(response: Response): Promise<BoundedJsonResult> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_DISCOVERY_RESPONSE_BYTES) return { kind: "oversized" };

  if (!response.body) {
    try {
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > MAX_DISCOVERY_RESPONSE_BYTES) return { kind: "oversized" };
      return { kind: "payload", payload: JSON.parse(text) };
    } catch (error) {
      return error instanceof SyntaxError ? { kind: "malformed" } : { kind: "unsupported" };
    }
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      total += chunk.byteLength;
      if (total > MAX_DISCOVERY_RESPONSE_BYTES) {
        await reader.cancel();
        return { kind: "oversized" };
      }
      chunks.push(chunk);
    }
  } catch {
    return { kind: "unsupported" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { kind: "payload", payload: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { kind: "malformed" };
  }
}

function normalizeRemoteAllowlist(value: unknown): LocalServiceAllowlistEntry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item) => {
    if (!isRecord(item)) return [];
    const candidate = item as RemoteLocalServiceContract;
    if (
      typeof candidate.contractId !== "string"
      || !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(candidate.contractId)
      || typeof candidate.provider !== "string"
      || !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(candidate.provider)
      || typeof candidate.displayName !== "string"
      || candidate.displayName.length < 1
      || candidate.displayName.length > 160
      || (candidate.targetType !== "local_system" && candidate.targetType !== "service")
      || !Number.isInteger(candidate.port)
      || Number(candidate.port) < 1
      || Number(candidate.port) > 65535
      || !Array.isArray(candidate.paths)
    ) return [];
    const paths = [...new Set(candidate.paths.filter((path): path is string => typeof path === "string" && /^\/[a-zA-Z0-9._/:-]*$/.test(path) && path.length <= 240))];
    if (!paths.length || paths.length > 8) return [];
    return [{
      contractId: candidate.contractId,
      provider: candidate.provider,
      displayName: stringValue(candidate.displayName, "Approved local service"),
      targetType: candidate.targetType,
      defaultPort: Number(candidate.port),
      paths,
    }];
  });
}

export async function discoverLocalServices(
  entries: readonly LocalServiceAllowlistEntry[] = LOCAL_SERVICE_ALLOWLIST,
  fetcher: typeof fetch = fetch,
  apiPort?: number,
): Promise<LocalServiceDiscovery> {
  const candidates: LocalServiceDiscoveryCandidate[] = [];
  const failures: LocalServiceProbeFailure[] = [];
  let attempted = 0;
  for (const entry of entries) {
    const port = entry.contractId === "lee-system" ? apiPort ?? entry.defaultPort : entry.defaultPort;
    const baseUrl = `http://127.0.0.1:${port}`;
    let found: LocalServiceDiscoveryCandidate | null = null;
    let lastFailure: LocalServiceProbeFailure["reason"] = "Not reachable";
    for (const path of entry.paths) {
      attempted += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      try {
        const response = await fetcher(`${baseUrl}${path}`, {
          method: "GET",
          headers: { accept: "application/json", "X-LEE-Identity": "lee", "X-LEE-Discovery": "local-allowlist" },
          signal: controller.signal,
        });
        if (!response.ok) {
          lastFailure = retainMostSpecificFailure(lastFailure, `Returned HTTP ${response.status}`);
          continue;
        }
        const parsed = await readBoundedJson(response);
        if (parsed.kind === "oversized") {
          lastFailure = "Oversized response";
          continue;
        }
        if (parsed.kind === "malformed") {
          lastFailure = "Malformed response";
          continue;
        }
        if (parsed.kind === "unsupported") {
          lastFailure = "Unsupported response";
          continue;
        }
        const payload = parsed.payload;
        if (!compatibleContract(payload)) {
          lastFailure = "Not a compatible service contract";
          continue;
        }
        const contract = payload as Record<string, unknown>;
        const identity = isRecord(contract.identity) ? contract.identity : {};
        found = {
          discoveryKey: `${entry.contractId}|${baseUrl}|${path}`,
          contractId: entry.contractId,
          provider: entry.provider,
          displayName: stringValue(identity.displayName, entry.displayName),
          targetType: entry.targetType,
          method: "local",
          baseUrl,
          healthEndpoint: path,
          contractVersion: stringValue(contract.contractVersion ?? contract.contract_version, "v1"),
          capabilities: safeCapabilities(contract.capabilities),
          dependencies: safeDependencies(contract.dependencies),
          observedAt: new Date().toISOString(),
        };
        break;
      } catch (error) {
        lastFailure = retainMostSpecificFailure(lastFailure, probeFailure(error));
      } finally {
        clearTimeout(timer);
      }
    }
    if (found) candidates.push(found);
    else failures.push({ contractId: entry.contractId, displayName: entry.displayName, endpoint: baseUrl, reason: lastFailure });
  }
  return { candidates, failures, attempted, completedAt: new Date().toISOString() };
}

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

  async discoverLocalServices(): Promise<LocalServiceDiscovery> {
    let allowlist: readonly LocalServiceAllowlistEntry[] = [];
    try {
      const response = await fetch(`${this.apiUrl}/api/desktop-setup/local-contracts`, { headers: { accept: "application/json", "X-LEE-Identity": "lee" } });
      if (response.ok) allowlist = normalizeRemoteAllowlist(await response.json());
    } catch {
      // Fail closed if the owner-controlled registry cannot be read.
    }
    return discoverLocalServices(allowlist, fetch, this.port);
  }

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
    const command = config.apiCommand ?? process.execPath;
    const args = config.apiArgs ?? [apiPath];
    const childEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PORT: String(this.port),
      NODE_ENV: this.production ? "production" : "development",
      LEE_DATA_DIR: dataDir,
      ...(this.production ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    };
    this.child = spawn(command, args, {
      cwd: this.production ? process.resourcesPath : this.root,
      env: childEnv,
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
    const bin = config.postgresBin
      ?? (this.production ? join(process.resourcesPath, "postgres", "bin") : process.env.LEE_POSTGRES_BIN)
      ?? findPostgresBin();
    if (!bin) return null;
    const executable = (name: string) => join(bin, process.platform === "win32" ? `${name}.exe` : name);
    const initdb = executable("initdb");
    const pgCtl = executable("pg_ctl");
    if (!existsSync(initdb) || !existsSync(pgCtl)) return null;
    const postgresEnvironment = this.postgresEnvironment(bin);
    const port = this.port + 1;
    const socketDir = join(dataDir, "postgres-socket");
    mkdirSync(socketDir, { recursive: true, mode: 0o700 });
    if (!existsSync(join(databaseDir, "PG_VERSION"))) {
      const initialized = spawnSync(initdb, ["-D", databaseDir, "--auth=trust", "--username=lee"], { encoding: "utf8", windowsHide: true, env: postgresEnvironment });
      if (initialized.status !== 0) {
        writeFileSync(join(dataDir, "logs", "postgres-init.log"), `${initialized.stdout ?? ""}\n${initialized.stderr ?? ""}`, { mode: 0o600 });
        return null;
      }
    }
    const started = spawn(pgCtl, ["-D", databaseDir, "-o", `-p ${port} -k "${socketDir}"`, "-w", "start"], { windowsHide: true, stdio: "ignore", env: postgresEnvironment });
    this.postgres = started;
    this.postgresCtl = pgCtl;
    const url = `postgresql://lee@127.0.0.1:${port}/lee`;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const probe = spawnSync(executable("pg_isready"), ["-h", "127.0.0.1", "-p", String(port)], { windowsHide: true, env: postgresEnvironment });
      if (probe.status === 0) {
        const created = spawnSync(executable("createdb"), ["-h", "127.0.0.1", "-p", String(port), "-U", "lee", "lee"], { windowsHide: true, env: postgresEnvironment });
        if (created.status === 0 || created.stderr?.toString().includes("already exists")) return url;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    spawnSync(pgCtl, ["-D", databaseDir, "-w", "stop", "-m", "immediate"], { windowsHide: true, stdio: "ignore" });
    this.postgres = null;
    return null;
  }

  private postgresEnvironment(bin: string): NodeJS.ProcessEnv {
    const root = dirname(bin);
    const pathSeparator = process.platform === "win32" ? ";" : ":";
    const prepend = (value: string, existing: string | undefined) => [value, existing].filter(Boolean).join(pathSeparator);
    return {
      ...process.env,
      PATH: prepend(bin, process.env.PATH),
      ...(process.platform === "win32" ? {} : {
        LD_LIBRARY_PATH: prepend(join(root, "lib"), process.env.LD_LIBRARY_PATH),
        DYLD_LIBRARY_PATH: prepend(join(root, "lib"), process.env.DYLD_LIBRARY_PATH),
      }),
      PGSHAREDIR: join(root, "share", "postgresql"),
      PGLIBDIR: join(root, "lib"),
    };
  }

  private runMigrations(config: RuntimeConfig, databaseUrl: string): boolean {
    const configuredCommand = config.migrationCommand ?? process.env.LEE_MIGRATION_COMMAND;
    const bundledMigration = this.production && !configuredCommand;
    const command = configuredCommand ?? (bundledMigration
      ? process.execPath
      : "pnpm --filter @workspace/db push");
    const args = bundledMigration
      ? [join(process.resourcesPath, "migrate-runtime.mjs")]
      : [];
    const migrationEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      ...(bundledMigration
        ? {
          ELECTRON_RUN_AS_NODE: "1",
          LEE_MIGRATIONS_DIR: join(process.resourcesPath, "migrations"),
        }
        : {}),
    };
    const migrationOptions = {
      cwd: bundledMigration ? dataDir : this.root,
      env: migrationEnv,
      encoding: "utf8",
      windowsHide: true,
    } as const;
    const result = bundledMigration
      ? spawnSync(command, args, migrationOptions)
      : spawnSync(command, { ...migrationOptions, shell: true });
    writeFileSync(
      join(dataDir, "logs", "migration.log"),
      `${result.stdout ?? ""}\n${result.stderr ?? ""}${result.error ? `\n${result.error.message}\n` : ""}`,
      { mode: 0o600 },
    );
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
    this.terminate(this.child);
    if (this.postgresCtl) spawnSync(this.postgresCtl, ["-D", databaseDir, "-w", "stop", "-m", "fast"], { windowsHide: true, stdio: "ignore" });
    this.terminate(this.postgres);
    this.child = null;
    this.postgres = null;
    this.postgresCtl = null;
  }

  private terminate(child: ChildProcess | null): void {
    if (!child || child.killed || child.pid == null) return;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    } else {
      child.kill();
    }
  }
}
