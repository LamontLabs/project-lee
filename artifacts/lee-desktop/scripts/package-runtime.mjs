import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stagePostgresRuntime } from "./stage-postgres-runtime.mjs";
import { verifyPostgresRuntime } from "./verify-postgres-runtime.mjs";

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const postgresDestination = resolve(desktop, "resources", "postgres");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function normalizedPlatform() {
  if (process.platform === "darwin") return "macos";
  if (process.platform === "win32") return "windows";
  if (process.platform === "linux") return "linux";
  throw new Error(`Unsupported desktop packaging platform: ${process.platform}.`);
}

function executableName(platform) {
  return platform === "windows" ? "initdb.exe" : "initdb";
}

function findInitdb(platform) {
  const command = platform === "windows" ? "where" : "which";
  const result = spawnSync(command, [executableName(platform)], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  return (result.stdout ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function sourceDetails(platform, sourceArgument) {
  if (sourceArgument) {
    const supplied = resolve(sourceArgument);
    const suppliedRoot = existsSync(resolve(supplied, "bin", executableName(platform))) ? supplied : null;
    const suppliedInitdb = existsSync(supplied) && supplied.endsWith(executableName(platform)) ? supplied : null;
    if (!suppliedRoot && !suppliedInitdb) {
      throw new Error(`PostgreSQL source ${supplied} must contain bin/${executableName(platform)} or point directly to ${executableName(platform)}.`);
    }
    const source = suppliedRoot ?? resolve(suppliedInitdb, "..", "..");
    const major = source.split("/").at(-1);
    const systemShare = platform === "linux" && major ? `/usr/share/postgresql/${major}` : null;
    const explicitShare = argument("--share-source") ?? (systemShare && existsSync(systemShare) ? systemShare : null);
    return { source, explicitShare };
  }

  const initdb = platform === "linux" ? findInitdb(platform) : null;
  if (!initdb) {
    throw new Error(
      `Bundled PostgreSQL runtime is missing. Set LEE_POSTGRES_SOURCE to a ${platform} PostgreSQL installation and rerun packaging; ` +
      "macOS and Windows runtimes must be staged explicitly so a Homebrew or development runtime is never captured accidentally.",
    );
  }
  const sourceBin = resolve(initdb, "..");
  const source = resolve(sourceBin, "..");
  const major = source.split("/").at(-1);
  const systemShare = platform === "linux" && major ? `/usr/share/postgresql/${major}` : null;
  const explicitShare = argument("--share-source") ?? (systemShare && existsSync(systemShare) ? systemShare : null);
  return { source, explicitShare };
}

function existingRuntime(platform) {
  try {
    return verifyPostgresRuntime(postgresDestination, { platform });
  } catch {
    return null;
  }
}

const platform = normalizedPlatform();
const existing = existingRuntime(platform);
if (existing) {
  console.log(`Using staged PostgreSQL ${existing.version ?? "runtime"} for ${platform} packaging.`);
} else {
  const source = sourceDetails(platform, argument("--source") ?? process.env.LEE_POSTGRES_SOURCE);
  const staged = await stagePostgresRuntime({
    platform,
    source: source.source,
    explicitShare: source.explicitShare,
    architecture: argument("--architecture") ?? (process.arch === "arm64" ? "arm64" : "x64"),
  });
  console.log(`Packaged PostgreSQL ${staged.version} for ${platform} from ${source.source}.`);
}

const manifest = JSON.parse(readFileSync(resolve(postgresDestination, "runtime-manifest.json"), "utf8"));
console.log(`Bundled PostgreSQL runtime ready: ${JSON.stringify({ platform: manifest.platform, version: manifest.version, source: manifest.source })}.`);