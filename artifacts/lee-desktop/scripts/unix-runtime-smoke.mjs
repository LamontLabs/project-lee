import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { verifyPostgresRuntime } from "./verify-postgres-runtime.mjs";

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const appArgument = process.argv[2] === "--" ? process.argv[3] : process.argv[2];
const appPath = appArgument && !appArgument.startsWith("--") ? resolve(process.cwd(), appArgument) : null;
const architecture = process.argv.includes("--architecture")
  ? process.argv[process.argv.indexOf("--architecture") + 1]
  : process.arch === "arm64" ? "arm64" : "x64";
const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";
const evidencePath = argument("--evidence") ? resolve(process.cwd(), argument("--evidence")) : null;
const writeEvidence = async (evidence) => {
  if (!evidencePath) return;
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
};
if (!appPath || !existsSync(appPath)) {
  const error = `Packaged LEE executable is missing: ${appPath ?? "(none)"}`;
  await writeEvidence({ platform, architecture, status: "failed", phase: "validate-app", error });
  throw new Error(error);
}
const resourcesRoot = platform === "macos"
  ? join(dirname(appPath), "..", "Resources")
  : join(dirname(appPath), "resources");

const testRoot = await mkdtemp(join(tmpdir(), "lee-desktop-runtime-smoke-"));
const configRoot = join(testRoot, "config");
const statusFile = join(testRoot, "runtime-status.json");
const migrationUpgradeFile = join(testRoot, "migration-upgrade.json");
const ownerAuthFile = join(testRoot, "owner-authentication.json");
const ownerUsername = "lee-smoke-owner";
const ownerPassword = "Lee smoke password 2026!";
const env = {
  ...process.env,
  XDG_CONFIG_HOME: configRoot,
  LEE_SMOKE_STATUS_FILE: statusFile,
  LEE_SMOKE_OWNER_AUTH_FILE: ownerAuthFile,
  LEE_DESKTOP_API_PORT: "43917",
  LEE_OWNER_USERNAME: ownerUsername,
  LEE_OWNER_PASSWORD: ownerPassword,
};
delete env.APPDATA;
delete env.DATABASE_URL;
let phase = "verify-postgres-runtime";
let migrationUpgrade = null;
let status = null;
let migrationOutput = "";
let activeChild = null;
let lastChild = null;
let terminationInProgress = false;
let timeoutSignal = null;

function safeOutput(value) {
  return String(value).replaceAll(ownerPassword, "[redacted]").slice(-32_768);
}

function captureProcessState() {
  try {
    return execFileSync("ps", ["-eo", "pid=,ppid=,stat=,etime=,args="], {
      encoding: "utf8",
      timeout: 5_000,
    }).trim();
  } catch (error) {
    return `Unable to capture process state: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function childEvidence() {
  if (!lastChild) return null;
  return {
    pid: lastChild.pid,
    startedAt: lastChild.startedAt,
    endedAt: lastChild.endedAt ?? null,
    exitCode: lastChild.exitCode ?? null,
    signal: lastChild.signal ?? null,
    timedOut: lastChild.timedOut === true,
    output: lastChild.output,
    processState: lastChild.processState ?? null,
  };
}

function smokeEvidence(statusValue, error = null) {
  return {
    platform,
    architecture,
    status: statusValue,
    phase,
    appPath,
    resourcesRoot,
    migrationUpgrade,
    migrationOutput,
    runtime: status,
    child: childEvidence(),
    processState: captureProcessState(),
    timedOut: Boolean(lastChild?.timedOut),
    timeoutSignal,
    ...(error ? {
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    } : {}),
  };
}

function setPhase(nextPhase) {
  phase = nextPhase;
  console.log(`[unix-runtime-smoke] phase: ${phase}`);
}

async function terminateChild(child, graceMs = 5_000) {
  if (!child || child.exitCode !== null) return;
  try {
    if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {
    try { child.kill("SIGTERM"); } catch { /* The child may have exited between checks. */ }
  }
  await new Promise((resolve) => setTimeout(resolve, graceMs));
  if (child.exitCode === null) {
    try {
      if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    } catch {
      try { child.kill("SIGKILL"); } catch { /* The child may have exited between checks. */ }
    }
  }
}

async function handleTerminationSignal(signal) {
  if (terminationInProgress) return;
  terminationInProgress = true;
  timeoutSignal = signal;
  console.error(`[unix-runtime-smoke] outer timeout received during phase: ${phase}`);
  if (activeChild) {
    lastChild.timedOut = true;
    lastChild.processState = captureProcessState();
    await terminateChild(activeChild);
    lastChild.endedAt = new Date().toISOString();
    lastChild.output = lastChild.output || "";
  }
  try {
    await writeEvidence(smokeEvidence("failed", new Error(`Smoke test received ${signal} while in phase ${phase}.`)));
  } finally {
    process.exit(124);
  }
}

process.once("SIGTERM", () => { void handleTerminationSignal("SIGTERM"); });
process.once("SIGINT", () => { void handleTerminationSignal("SIGINT"); });

async function runPackagedApp({ waitForOwnerAuthentication = false } = {}) {
  if (waitForOwnerAuthentication) {
    await rm(ownerAuthFile, { force: true });
    env.LEE_SMOKE_OWNER_AUTH_FILE = ownerAuthFile;
  } else {
    delete env.LEE_SMOKE_OWNER_AUTH_FILE;
  }
  let output = "";
  const launchArgs = ["--lee-smoke-exit"];
  if (platform === "linux" && env.LEE_SMOKE_NO_SANDBOX === "1") launchArgs.push("--no-sandbox");
  const child = spawn(appPath, launchArgs, {
    cwd: dirname(appPath),
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  const childRecord = {
    pid: child.pid ?? null,
    startedAt: new Date().toISOString(),
    output: "",
    timedOut: false,
  };
  lastChild = childRecord;
  activeChild = child;
  const appendOutput = (chunk) => {
    output = safeOutput(`${output}${chunk}`);
    childRecord.output = output;
  };
  child.stdout?.on("data", appendOutput);
  child.stderr?.on("data", appendOutput);
  const requestedTimeoutMs = Number(process.env.LEE_SMOKE_CHILD_TIMEOUT_MS ?? 120_000);
  const timeoutMs = Number.isFinite(requestedTimeoutMs) && requestedTimeoutMs > 0 ? requestedTimeoutMs : 120_000;
  let timeoutHandle;
  try {
    const result = await Promise.race([
      new Promise((resolveExit, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolveExit({ code: code ?? (signal ? 1 : 0), signal }));
      }),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(async () => {
          childRecord.timedOut = true;
          childRecord.processState = captureProcessState();
          await terminateChild(child);
          reject(new Error(`Packaged LEE smoke process exceeded its ${timeoutMs}ms timeout.`));
        }, timeoutMs);
      }),
    ]);
    childRecord.endedAt = new Date().toISOString();
    childRecord.output = safeOutput(output);
    childRecord.exitCode = result.code;
    childRecord.signal = result.signal;
    return { exitCode: result.code, output };
  } catch (error) {
    childRecord.endedAt = new Date().toISOString();
    childRecord.output = safeOutput(output);
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
    activeChild = null;
  }
}

async function verifyRuntimeStatus(label) {
  if (!existsSync(statusFile)) throw new Error(`Packaged LEE did not produce runtime status during ${label}.`);
  const current = JSON.parse(await readFile(statusFile, "utf8"));
  if (current.database !== "configured") throw new Error(`Bundled PostgreSQL was not configured during ${label}: ${JSON.stringify(current)}`);
  if (current.migration !== "complete") throw new Error(`Bundled database migration did not complete during ${label}: ${JSON.stringify(current)}`);
  if (current.state !== "live") throw new Error(`LEE Core did not reach a live state during ${label}: ${JSON.stringify(current)}`);
  if (current.contract !== "live") throw new Error(`LEE owner runtime contract was not live during ${label}: ${JSON.stringify(current)}`);
  return current;
}

async function verifyOwnerAuthentication(apiUrl) {
  const login = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: ownerUsername, password: ownerPassword }),
  });
  if (!login.ok) throw new Error(`Packaged owner login returned HTTP ${login.status}.`);
  const loginPayload = await login.json();
  if (loginPayload.authenticated !== true) throw new Error(`Packaged owner login did not authenticate: ${JSON.stringify(loginPayload)}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie?.startsWith("lee_session=")) throw new Error("Packaged owner login did not issue a session cookie.");
  const session = await fetch(`${apiUrl}/api/auth/session`, { headers: { cookie } });
  if (!session.ok) throw new Error(`Packaged owner session probe returned HTTP ${session.status}.`);
  const sessionPayload = await session.json();
  if (sessionPayload.authenticated !== true) throw new Error(`Packaged owner session was not authenticated: ${JSON.stringify(sessionPayload)}`);
  await writeFile(ownerAuthFile, "passed\n", { mode: 0o600 });
}

try {
  verifyPostgresRuntime(join(resourcesRoot, "postgres"), { platform, architecture });
  setPhase("migration-upgrade");
  try {
    migrationOutput = execFileSync(process.execPath, [
      join(dirname(new URL(import.meta.url).pathname), "migration-upgrade-smoke.mjs"),
      "--resources-root", resourcesRoot,
      "--postgres-root", join(resourcesRoot, "postgres"),
      "--platform", platform,
      "--output", migrationUpgradeFile,
    ], {
      cwd: dirname(new URL(import.meta.url).pathname),
      env,
      encoding: "utf8",
      timeout: 60_000,
    });
  } catch (error) {
    migrationOutput = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
    throw error;
  }
  migrationUpgrade = JSON.parse(await readFile(migrationUpgradeFile, "utf8"));
  if (
    migrationUpgrade.status !== "passed" ||
    !Number.isInteger(migrationUpgrade.migration?.previousJournalEntries) ||
    migrationUpgrade.migration.previousJournalEntries < 1 ||
    migrationUpgrade.migration?.upgradedJournalEntries !== migrationUpgrade.migration.previousJournalEntries + 1
  ) {
    throw new Error(`Existing-database migration upgrade did not complete: ${JSON.stringify(migrationUpgrade)}`);
  }

  setPhase("packaged-startup");
  const firstRun = await runPackagedApp({ waitForOwnerAuthentication: true });
  if (firstRun.exitCode !== 0) {
    throw new Error(`Packaged LEE smoke process exited with ${firstRun.exitCode}.${firstRun.output.trim() ? ` Output: ${firstRun.output.trim()}` : ""}`);
  }
  status = await verifyRuntimeStatus("initial startup");
  setPhase("owner-authentication");
  await verifyOwnerAuthentication(status.apiUrl);

  setPhase("shutdown");
  const databaseDir = join(configRoot, "Project LEE", "database");
  if (!existsSync(join(databaseDir, "PG_VERSION"))) throw new Error("Bundled PostgreSQL did not initialize its database directory.");
  if (!existsSync(join(configRoot, "Project LEE", "logs", "migration.log"))) throw new Error("Desktop migration log was not produced.");

  await new Promise((resolveDone) => setTimeout(resolveDone, 500));
  const processes = execFileSync("ps", ["-axo", "command"], { encoding: "utf8" });
  if (processes.split("\n").some((line) => line.includes(databaseDir) && /\/postgres\/bin\/postgres(?:\s|$)/.test(line))) {
    throw new Error("PostgreSQL survived the packaged LEE shutdown.");
  }

  setPhase("restart");
  const secondRun = await runPackagedApp();
  if (secondRun.exitCode !== 0) {
    throw new Error(`Packaged LEE restart process exited with ${secondRun.exitCode}.${secondRun.output.trim() ? ` Output: ${secondRun.output.trim()}` : ""}`);
  }
  status = await verifyRuntimeStatus("restart");
  await new Promise((resolveDone) => setTimeout(resolveDone, 500));
  const restartProcesses = execFileSync("ps", ["-axo", "command"], { encoding: "utf8" });
  if (restartProcesses.split("\n").some((line) => line.includes(databaseDir) && /\/postgres\/bin\/postgres(?:\s|$)/.test(line))) {
    throw new Error("PostgreSQL survived the packaged LEE restart shutdown.");
  }

  await writeEvidence({
    ...smokeEvidence("passed"),
    checks: { initialization: "passed", migration: "passed", ownerAuthentication: "passed", ownerRuntimeContract: "passed", shutdown: "passed", restart: "passed" },
  });
  console.log(`LEE Unix desktop runtime smoke passed: bundled PostgreSQL initialization, existing-database migration upgrade ${JSON.stringify(migrationUpgrade.migration)}, startup, migration, contract health, and shutdown.`);
} catch (error) {
  await writeEvidence(smokeEvidence("failed", error));
  throw error;
} finally {
  await rm(testRoot, { recursive: true, force: true });
}