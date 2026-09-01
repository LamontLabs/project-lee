import { chmod, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resources = resolve(desktop, "resources");
const destination = resolve(resources, "postgres");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const platform = argument("--platform", process.platform);
const source = argument("--source");
const explicitShare = argument("--share-source");

if (!source) throw new Error("A PostgreSQL runtime source directory is required.");
if (!["win32", "windows", "darwin", "macos", "linux"].includes(platform)) throw new Error(`Unsupported PostgreSQL runtime platform: ${platform}`);

const sourceRoot = resolve(source);
const sourceBin = resolve(sourceRoot, "bin");
const sourceLib = resolve(sourceRoot, "lib");
const sourceShareRoot = explicitShare ? resolve(explicitShare) : resolve(sourceRoot, "share");
let sourceShare = sourceShareRoot;
if (!explicitShare && existsSync(resolve(sourceShareRoot, "postgresql"))) {
  sourceShare = resolve(sourceShareRoot, "postgresql");
} else if (!explicitShare && existsSync(sourceShareRoot)) {
  const entries = await readdir(sourceShareRoot, { withFileTypes: true });
  const candidate = entries.find((entry) => entry.isDirectory() && entry.name.startsWith("postgresql"));
  if (candidate) sourceShare = resolve(sourceShareRoot, candidate.name);
}

const executableNames = ["initdb", "pg_ctl", "pg_isready", "createdb", "postgres"];
const executableSuffix = platform === "win32" || platform === "windows" ? ".exe" : "";
for (const name of executableNames) {
  const path = resolve(sourceBin, `${name}${executableSuffix}`);
  if (!existsSync(path)) throw new Error(`PostgreSQL runtime is missing ${path}.`);
}
if (!existsSync(resolve(sourceShare, "postgresql.conf.sample"))) {
  throw new Error(`PostgreSQL runtime is missing postgresql.conf.sample in ${sourceShare}.`);
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(sourceBin, resolve(destination, "bin"), { recursive: true, force: true });
if (existsSync(sourceLib)) await cp(sourceLib, resolve(destination, "lib"), { recursive: true, force: true });
await mkdir(resolve(destination, "share"), { recursive: true });
await cp(sourceShare, resolve(destination, "share", "postgresql"), { recursive: true, force: true });

async function makeDirectoriesWritable(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      await chmod(path, 0o755);
      await makeDirectoriesWritable(path);
    }
  }
}
await makeDirectoriesWritable(destination);

if (platform !== "win32" && platform !== "windows") {
  for (const name of executableNames) await chmod(resolve(destination, "bin", name), 0o755);
}

const versionProbe = spawnSync(resolve(destination, "bin", `postgres${executableSuffix}`), ["--version"], { encoding: "utf8" });
const version = versionProbe.status === 0 ? (versionProbe.stdout ?? "").trim() : "unknown";
await writeFile(
  resolve(destination, "runtime-manifest.json"),
  `${JSON.stringify({ platform, source: basename(sourceRoot), version, requiredExecutables: executableNames }, null, 2)}\n`,
  { encoding: "utf8", mode: 0o600 },
);
console.log(`Staged ${version} into ${destination}.`);