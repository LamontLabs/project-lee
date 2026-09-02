import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_EXECUTABLES = ["initdb", "pg_ctl", "pg_isready", "createdb", "postgres"];
const SYSTEM_LIBRARY_ROOTS = [
  "/System/Library/",
  "/System/Volumes/Preboot/Cryptexes/OS/System/Library/",
  "/usr/lib/",
  "/System/Volumes/Preboot/Cryptexes/OS/usr/lib/",
];

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function isSystemLibrary(path) {
  return SYSTEM_LIBRARY_ROOTS.some((root) => path === root.slice(0, -1) || path.startsWith(root));
}

function run(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${label ?? command} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return result.stdout ?? "";
}

function filesUnder(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return entry.isFile() || entry.isSymbolicLink() ? [path] : [];
  });
}

function machoFiles(runtimeRoot) {
  return filesUnder(join(runtimeRoot, "bin")).concat(filesUnder(join(runtimeRoot, "lib"))).filter((path) => {
    const result = spawnSync("file", [path], { encoding: "utf8" });
    return result.status === 0 && result.stdout.includes("Mach-O");
  });
}

function otoolDependencies(path) {
  return run("otool", ["-L", path], `otool dependency inspection for ${path}`)
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim().replace(/\s+\(.*$/, ""))
    .filter((dependency) => dependency.startsWith("/") || dependency.startsWith("@"));
}

function otoolRpaths(path) {
  const lines = run("otool", ["-l", path], `otool load-command inspection for ${path}`).split(/\r?\n/);
  const rpaths = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== "cmd LC_RPATH") continue;
    const match = lines.slice(index, index + 8).map((line) => line.match(/^\s*path (.+) \(offset/)).find(Boolean);
    if (match) rpaths.push(match[1]);
  }
  return rpaths;
}

function otoolId(path) {
  const result = spawnSync("otool", ["-D", path], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const lines = (result.stdout ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines[1] ?? null;
}

function assertSafeMachOPath(path, owner) {
  if (path.startsWith("/") && !isSystemLibrary(path)) {
    throw new Error(`Mach-O dependency escapes the packaged runtime: ${owner} -> ${path}. Homebrew and builder paths must be rewritten before packaging.`);
  }
}

function expectedArchitecture(architecture) {
  if (architecture === "x64" || architecture === "x86_64") return "x86_64";
  if (architecture === "arm64" || architecture === "aarch64") return "arm64";
  throw new Error(`Unsupported macOS runtime architecture: ${architecture ?? "(missing)"}. Expected x64 or arm64.`);
}

function verifyArchitecture(path, architecture) {
  const expected = expectedArchitecture(architecture);
  const archs = run("lipo", ["-archs", path], `lipo architecture inspection for ${path}`).trim().split(/\s+/).filter(Boolean);
  if (!archs.includes(expected)) {
    throw new Error(`Packaged PostgreSQL file ${path} does not contain ${expected}; found ${archs.join(", ") || "(none)"}.`);
  }
}

function resolveLocalDependency(dependency, owner, runtimeRoot, rpaths) {
  const ownerDirectory = resolve(owner, "..");
  const executableRoot = join(runtimeRoot, "bin");
  const candidates = [];
  if (dependency.startsWith("@loader_path/")) candidates.push(resolve(ownerDirectory, dependency.slice("@loader_path/".length)));
  if (dependency.startsWith("@executable_path/")) candidates.push(resolve(executableRoot, dependency.slice("@executable_path/".length)));
  if (dependency.startsWith("@rpath/")) {
    for (const rpath of rpaths) {
      if (rpath.startsWith("@loader_path/")) candidates.push(resolve(ownerDirectory, rpath.slice("@loader_path/".length), dependency.slice("@rpath/".length)));
      else if (rpath.startsWith("@executable_path/")) candidates.push(resolve(executableRoot, rpath.slice("@executable_path/".length), dependency.slice("@rpath/".length)));
      else if (rpath.startsWith("/")) candidates.push(resolve(rpath, dependency.slice("@rpath/".length)));
    }
  }
  const localCandidate = candidates.find((candidate) => candidate.startsWith(`${resolve(runtimeRoot)}/`) && existsSync(candidate));
  if (localCandidate) return localCandidate;
  const packagedCandidates = candidates.filter((candidate) => candidate.startsWith(`${resolve(runtimeRoot)}/`));
  if (packagedCandidates.length > 0 && !packagedCandidates.some((candidate) => existsSync(candidate))) {
    throw new Error(`Packaged Mach-O dependency is missing: ${owner} -> ${dependency}.`);
  }
  return null;
}

export function verifyMacPostgresRuntime(runtimeRoot, architecture) {
  const root = resolve(runtimeRoot);
  if (process.platform !== "darwin") {
    throw new Error("macOS PostgreSQL Mach-O verification must run on a macOS runner.");
  }
  const files = machoFiles(root);
  if (files.length === 0) throw new Error(`No Mach-O PostgreSQL files found under ${root}.`);
  for (const path of files) {
    verifyArchitecture(path, architecture);
    for (const dependency of otoolDependencies(path)) assertSafeMachOPath(dependency, path);
    for (const rpath of otoolRpaths(path)) assertSafeMachOPath(rpath, path);
    const id = otoolId(path);
    if (id) assertSafeMachOPath(id, path);
  }
  for (const path of files) {
    const rpaths = otoolRpaths(path);
    for (const dependency of otoolDependencies(path)) {
      if (dependency.startsWith("/") && isSystemLibrary(dependency)) continue;
      resolveLocalDependency(dependency, path, root, rpaths);
    }
  }
  return { architecture: expectedArchitecture(architecture), machOFiles: files.length };
}

export function verifyPostgresRuntime(runtimeRoot, { platform = "linux", architecture = null } = {}) {
  const root = resolve(runtimeRoot);
  const suffix = platform === "windows" ? ".exe" : "";
  for (const executable of REQUIRED_EXECUTABLES) {
    const path = join(root, "bin", `${executable}${suffix}`);
    if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Bundled PostgreSQL runtime is missing ${path}.`);
  }
  const share = join(root, "share", "postgresql", "postgresql.conf.sample");
  if (!existsSync(share)) throw new Error(`Bundled PostgreSQL runtime is missing ${share}.`);
  const manifestPath = join(root, "runtime-manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`Bundled PostgreSQL runtime manifest is missing: ${manifestPath}.`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error(`Bundled PostgreSQL runtime manifest is not valid JSON: ${manifestPath}.`);
  }
  if (manifest.platform !== platform) throw new Error(`Bundled PostgreSQL runtime manifest platform ${manifest.platform ?? "(missing)"} does not match ${platform}.`);
  if (platform === "macos") {
    if (!architecture) throw new Error("macOS PostgreSQL verification requires --architecture x64|arm64.");
    return { ...manifest, ...verifyMacPostgresRuntime(root, architecture) };
  }
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyPostgresRuntime(argument("--runtime-root"), {
    platform: argument("--platform"),
    architecture: argument("--architecture"),
  });
  console.log(`Verified bundled PostgreSQL ${result.platform} runtime${result.architecture ? ` for ${result.architecture}` : ""}.`);
}