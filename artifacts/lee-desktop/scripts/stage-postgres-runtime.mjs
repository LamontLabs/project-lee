import { chmod, cp, mkdir, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyPostgresRuntime } from "./verify-postgres-runtime.mjs";

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resources = resolve(desktop, "resources");
const destination = resolve(resources, "postgres");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const MAC_SYSTEM_LIBRARY_ROOTS = [
  "/System/Library/",
  "/System/Volumes/Preboot/Cryptexes/OS/System/Library/",
  "/usr/lib/",
  "/System/Volumes/Preboot/Cryptexes/OS/usr/lib/",
];

function isSystemLibrary(path) {
  return MAC_SYSTEM_LIBRARY_ROOTS.some((root) => path.startsWith(root));
}

function macTool(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${label ?? command} failed: ${(result.stderr || result.stdout || "").trim()}`);
  return result.stdout ?? "";
}

function machoFiles(root) {
  const directories = [resolve(root, "bin"), resolve(root, "lib")];
  const files = [];
  const walk = (directory) => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() || entry.isSymbolicLink()) files.push(path);
    }
  };
  directories.forEach(walk);
  return files.filter((path) => {
    const result = spawnSync("file", [path], { encoding: "utf8" });
    return result.status === 0 && result.stdout.includes("Mach-O");
  });
}

function dependencies(path) {
  return macTool("otool", ["-L", path], `otool dependency inspection for ${path}`)
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().replace(/\s+\(.*$/, ""))
    .filter((dependency) => dependency.startsWith("/") || dependency.startsWith("@"));
}

function rpaths(path) {
  const lines = macTool("otool", ["-l", path], `otool load-command inspection for ${path}`).split(/\r?\n/);
  const result = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== "cmd LC_RPATH") continue;
    const match = lines.slice(index, index + 8).map((line) => line.match(/^\s*path (.+) \(offset/)).find(Boolean);
    if (match) result.push(match[1]);
  }
  return result;
}

function localPathFor(owner, root, basename) {
  return owner.startsWith(`${resolve(root, "bin")}/`)
    ? `@loader_path/../lib/${basename}`
    : `@loader_path/${basename}`;
}

function localRpathFor(owner, root) {
  return owner.startsWith(`${resolve(root, "bin")}/`) ? "@loader_path/../lib" : "@loader_path";
}

async function relocateMacRuntime(root, sourceRoot) {
  if (process.platform !== "darwin") throw new Error("macOS PostgreSQL relocation must run on a macOS runner.");
  const queue = machoFiles(root);
  const seen = new Set();
  while (queue.length) {
    const owner = queue.shift();
    if (seen.has(owner)) continue;
    seen.add(owner);
    const ownerDependencies = dependencies(owner);
    const ownerRpaths = rpaths(owner);
    let addedPrivateRpath = false;
    const stageDependency = async (sourceDependency, dependency) => {
      const resolvedSource = await realpath(sourceDependency);
      const target = resolve(root, "lib", basename(resolvedSource));
      if (!target.startsWith(`${resolve(root)}/`)) throw new Error(`Refusing to stage dependency outside the private PostgreSQL runtime: ${target}`);
      if (!existsSync(target) || resolve(resolvedSource) !== resolve(target)) await cp(resolvedSource, target, { force: true });
      await chmod(target, 0o755);
      if (dependency.startsWith("/")) {
        macTool("install_name_tool", ["-change", dependency, localPathFor(owner, root, basename(target)), owner], `relocating ${owner}`);
      }
      if (!seen.has(target)) queue.push(target);
    };
    for (const dependency of ownerDependencies) {
      if (!dependency.startsWith("/") || isSystemLibrary(dependency)) continue;
      const sourceDependency = existsSync(dependency) ? await realpath(dependency) : null;
      if (!sourceDependency) throw new Error(`Homebrew dependency is missing while staging ${owner}: ${dependency}`);
      await stageDependency(sourceDependency, dependency);
    }
    for (const dependency of ownerDependencies.filter((value) => value.startsWith("@rpath/"))) {
      const dependencyName = dependency.slice("@rpath/".length);
      const sourceDependency = ownerRpaths
        .filter((rpath) => rpath.startsWith("/") && !isSystemLibrary(rpath))
        .map((rpath) => resolve(rpath, dependencyName))
        .find((candidate) => existsSync(candidate));
      if (!sourceDependency) throw new Error(`Homebrew rpath dependency is missing while staging ${owner}: ${dependency}`);
      await stageDependency(sourceDependency, dependency);
    }
    for (const rpath of ownerRpaths) {
      if (!rpath.startsWith("/") || isSystemLibrary(rpath)) continue;
      macTool("install_name_tool", ["-delete_rpath", rpath, owner], `removing build rpath from ${owner}`);
      if (!addedPrivateRpath) {
        macTool("install_name_tool", ["-add_rpath", localRpathFor(owner, root), owner], `adding private rpath to ${owner}`);
        addedPrivateRpath = true;
      }
    }
    if (owner.startsWith(`${resolve(root, "lib")}/`) && owner.endsWith(".dylib")) {
      const idLines = macTool("otool", ["-D", owner], `otool install-name inspection for ${owner}`).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const id = idLines[1];
      if (id && id.startsWith("/") && !isSystemLibrary(id)) {
        macTool("install_name_tool", ["-id", localPathFor(owner, root, basename(owner)), owner], `relocating install name for ${owner}`);
      }
    }
  }
}

async function makeDirectoriesWritable(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      await chmod(path, 0o755);
      await makeDirectoriesWritable(path);
    }
  }
}

export async function stagePostgresRuntime({ platform, source, explicitShare = null, architecture = null }) {
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
  await makeDirectoriesWritable(destination);
  if (platform !== "win32" && platform !== "windows") {
    for (const name of executableNames) await chmod(resolve(destination, "bin", name), 0o755);
  }
  if (platform === "macos" || platform === "darwin") await relocateMacRuntime(destination, sourceRoot);

  const executable = resolve(destination, "bin", `postgres${executableSuffix}`);
  const versionProbe = spawnSync(executable, ["--version"], { encoding: "utf8" });
  const version = versionProbe.status === 0 ? (versionProbe.stdout ?? "").trim() : "unknown";
  await writeFile(
    resolve(destination, "runtime-manifest.json"),
    `${JSON.stringify({ platform: platform === "darwin" ? "macos" : platform, architecture, source: basename(sourceRoot), version, requiredExecutables: executableNames }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  verifyPostgresRuntime(destination, { platform: platform === "darwin" ? "macos" : platform, architecture });
  return { destination, version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const platform = argument("--platform", process.platform);
  const result = await stagePostgresRuntime({
    platform,
    source: argument("--source"),
    explicitShare: argument("--share-source"),
    architecture: argument("--arch"),
  });
  console.log(`Staged ${result.version} into ${result.destination}.`);
}