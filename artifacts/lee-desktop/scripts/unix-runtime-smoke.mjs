import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { verifyPostgresRuntime } from "./verify-postgres-runtime.mjs";

const appPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : null;
if (!appPath || !existsSync(appPath)) throw new Error(`Packaged LEE executable is missing: ${appPath ?? "(none)"}`);
const architecture = process.argv.includes("--architecture")
  ? process.argv[process.argv.indexOf("--architecture") + 1]
  : process.arch === "arm64" ? "arm64" : "x64";
const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";
const resourcesRoot = platform === "macos"
  ? join(dirname(appPath), "..", "Resources")
  : join(dirname(appPath), "resources");
verifyPostgresRuntime(join(resourcesRoot, "postgres"), { platform, architecture });

const testRoot = await mkdtemp(join(tmpdir(), "lee-desktop-runtime-smoke-"));
const configRoot = join(testRoot, "config");
const statusFile = join(testRoot, "runtime-status.json");
const migrationUpgradeFile = join(testRoot, "migration-upgrade.json");
const env = { ...process.env, XDG_CONFIG_HOME: configRoot, LEE_SMOKE_STATUS_FILE: statusFile, LEE_DESKTOP_API_PORT: "43917" };
delete env.APPDATA;
delete env.DATABASE_URL;

try {
  execFileSync(process.execPath, [
    join(dirname(new URL(import.meta.url).pathname), "migration-upgrade-smoke.mjs"),
    "--resources-root", resourcesRoot,
    "--postgres-root", join(resourcesRoot, "postgres"),
    "--platform", platform,
    "--output", migrationUpgradeFile,
  ], { cwd: dirname(new URL(import.meta.url).pathname), env, stdio: "inherit" });
  const migrationUpgrade = JSON.parse(await readFile(migrationUpgradeFile, "utf8"));
  if (migrationUpgrade.status !== "passed" || migrationUpgrade.migration?.previousJournalEntries !== 1 || migrationUpgrade.migration?.upgradedJournalEntries !== 2) {
    throw new Error(`Existing-database migration upgrade did not complete: ${JSON.stringify(migrationUpgrade)}`);
  }

  const child = spawn(appPath, ["--lee-smoke-exit"], { cwd: dirname(appPath), env, stdio: "inherit" });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
  if (exitCode !== 0) throw new Error(`Packaged LEE smoke process exited with ${exitCode}.`);
  if (!existsSync(statusFile)) throw new Error("Packaged LEE did not produce runtime status.");

  const status = JSON.parse(await readFile(statusFile, "utf8"));
  if (status.database !== "configured") throw new Error(`Bundled PostgreSQL was not configured: ${JSON.stringify(status)}`);
  if (status.migration !== "complete") throw new Error(`Bundled database migration did not complete: ${JSON.stringify(status)}`);
  if (status.state !== "live") throw new Error(`LEE Core did not reach a live state: ${JSON.stringify(status)}`);

  const databaseDir = join(configRoot, "Project LEE", "database");
  if (!existsSync(join(databaseDir, "PG_VERSION"))) throw new Error("Bundled PostgreSQL did not initialize its database directory.");
  if (!existsSync(join(configRoot, "Project LEE", "logs", "migration.log"))) throw new Error("Desktop migration log was not produced.");

  await new Promise((resolveDone) => setTimeout(resolveDone, 500));
  const processes = execFileSync("ps", ["-axo", "command"], { encoding: "utf8" });
  if (processes.split("\n").some((line) => line.includes(databaseDir) && /\/postgres(?:\s|$)/.test(line))) {
    throw new Error("PostgreSQL survived the packaged LEE shutdown.");
  }

  console.log(`LEE Unix desktop runtime smoke passed: bundled PostgreSQL initialization, existing-database migration upgrade ${JSON.stringify(migrationUpgrade.migration)}, startup, migration, contract health, and shutdown.`);
} finally {
  await rm(testRoot, { recursive: true, force: true });
}