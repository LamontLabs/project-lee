import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_RUNNER = "migrate-runtime.mjs";
const REQUIRED_JOURNAL = join("migrations", "meta", "_journal.json");

function findArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function findResourcesRoot(input) {
  const resolved = resolve(input);
  const candidates = [
    resolved,
    join(resolved, "resources"),
    join(resolved, "Contents", "Resources"),
  ];
  return candidates.find((candidate) => existsSync(join(candidate, REQUIRED_RUNNER)))
    ?? candidates.find((candidate) => existsSync(candidate));
}

function listSqlFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSqlFiles(path);
    return entry.isFile() && entry.name.endsWith(".sql") ? [path] : [];
  });
}

export function assertProductionMigrationSource(source) {
  if (!/const bundledMigration = this\.production;/.test(source)) {
    throw new Error("Production migration contract is missing: packaged startup must always select bundled migrations.");
  }
  if (!/const args = bundledMigration\s+\? \[join\(process\.resourcesPath, "migrate-runtime\.mjs"\)\]/.test(source)) {
    throw new Error("Production migration contract is missing the packaged migration runner path.");
  }
  if (!/LEE_MIGRATIONS_DIR: join\(process\.resourcesPath, "migrations"\)/.test(source)) {
    throw new Error("Production migration contract is missing the packaged migration directory.");
  }
  if (!/spawnSync\(process\.execPath, args/.test(source)) {
    throw new Error("Production migration contract is missing the Electron Node migration invocation.");
  }
}

export function verifyPackagedMigrations(input, platform) {
  if (!platform || !["windows", "macos", "linux"].includes(platform)) {
    throw new Error("Usage requires --platform windows|macos|linux.");
  }
  const resourcesRoot = findResourcesRoot(input);
  if (!resourcesRoot) {
    throw new Error(`Packaged ${platform} resources are missing ${REQUIRED_RUNNER}. Expected a resources directory under ${resolve(input)}.`);
  }
  const runnerPath = join(resourcesRoot, REQUIRED_RUNNER);
  const migrationRoot = join(resourcesRoot, "migrations");
  const journalPath = join(resourcesRoot, REQUIRED_JOURNAL);
  const sqlFiles = listSqlFiles(migrationRoot);
  if (!existsSync(runnerPath) || !statSync(runnerPath).isFile()) {
    throw new Error(`Packaged ${platform} migration runner is missing: ${runnerPath}. Run prepare-runtime.mjs before packaging.`);
  }
  if (sqlFiles.length === 0) {
    throw new Error(`Packaged ${platform} migration SQL is missing under ${migrationRoot}. Run prepare-runtime.mjs before packaging.`);
  }
  if (!existsSync(journalPath) || !statSync(journalPath).isFile()) {
    throw new Error(`Packaged ${platform} migration journal is missing: ${journalPath}. Copy lib/db/drizzle including meta/_journal.json before packaging.`);
  }
  let journal;
  try {
    journal = JSON.parse(readFileSync(journalPath, "utf8"));
  } catch {
    throw new Error(`Packaged ${platform} migration journal is not valid JSON: ${journalPath}.`);
  }
  if (journal.dialect !== "postgresql" || !Array.isArray(journal.entries) || journal.entries.length === 0) {
    throw new Error(`Packaged ${platform} migration journal is incomplete: ${journalPath}.`);
  }
  const runner = readFileSync(runnerPath, "utf8");
  if (!runner.includes("LEE_MIGRATIONS_DIR") || runner.includes("pnpm --filter @workspace/db push")) {
    throw new Error(`Packaged ${platform} migration runner is not installer-safe: ${runnerPath}.`);
  }
  return {
    platform,
    resourcesRoot,
    runner: runnerPath,
    sqlFiles: sqlFiles.length,
    journal: journalPath,
    journalEntries: journal.entries.length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyPackagedMigrations(findArgument("--resources-root"), findArgument("--platform"));
  const sourcePath = findArgument("--source-file");
  if (sourcePath) assertProductionMigrationSource(readFileSync(resolve(sourcePath), "utf8"));
  console.log(`Verified ${result.platform} packaged migrations: ${result.sqlFiles} SQL file(s), ${result.journalEntries} journal entr${result.journalEntries === 1 ? "y" : "ies"}; workspace fallback disabled.`);
}