import { createRequire } from "node:module";
import { createServer } from "node:net";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { verifyPackagedMigrations } from "./verify-packaged-migrations.mjs";

const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const { Pool } = require("pg");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredArgument(name) {
  const value = argument(name);
  if (!value) throw new Error(`Missing required argument ${name}.`);
  return resolve(value);
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => server.listen(0, "127.0.0.1", resolveListen).once("error", reject));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolveClose) => server.close(resolveClose));
  return port;
}

function run(command, args, environment) {
  execFileSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
}

function runtimeEnvironment(postgresRoot) {
  const bin = join(postgresRoot, "bin");
  const separator = process.platform === "win32" ? ";" : ":";
  return {
    ...process.env,
    PATH: [bin, process.env.PATH].filter(Boolean).join(separator),
    ...(process.platform === "win32" ? {} : {
      LD_LIBRARY_PATH: [join(postgresRoot, "lib"), process.env.LD_LIBRARY_PATH].filter(Boolean).join(separator),
      DYLD_LIBRARY_PATH: [join(postgresRoot, "lib"), process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(separator),
    }),
    PGSHAREDIR: join(postgresRoot, "share", "postgresql"),
    PGLIBDIR: join(postgresRoot, "lib"),
  };
}

function executable(postgresRoot, name) {
  return join(postgresRoot, "bin", process.platform === "win32" ? `${name}.exe` : name);
}

async function runPackagedMigration(runner, migrationsDir, databaseUrl) {
  run(process.execPath, [runner], {
    ...process.env,
    DATABASE_URL: databaseUrl,
    LEE_MIGRATIONS_DIR: migrationsDir,
    ELECTRON_RUN_AS_NODE: "1",
  });
}

const platform = argument("--platform");
const resourcesRoot = requiredArgument("--resources-root");
const postgresRoot = requiredArgument("--postgres-root");
const output = requiredArgument("--output");
if (!["windows", "macos", "linux"].includes(platform)) throw new Error(`Unsupported migration smoke platform: ${platform}`);

const packaged = verifyPackagedMigrations(resourcesRoot, platform);
const runner = packaged.runner;
const root = await mkdtemp(join(tmpdir(), "lee-migration-upgrade-"));
const oldMigrations = join(root, "old-migrations");
const upgradeMigrations = join(root, "upgrade-migrations");
const databaseDir = join(root, "database");
const socketDir = join(root, "socket");
const postgresLog = join(root, "postgres.log");
const databaseName = "lee_upgrade_smoke";
const port = await freePort();
const environment = runtimeEnvironment(postgresRoot);
const initdb = executable(postgresRoot, "initdb");
const pgCtl = executable(postgresRoot, "pg_ctl");
const createdb = executable(postgresRoot, "createdb");
const pgIsReady = executable(postgresRoot, "pg_isready");
let postgresStarted = false;
let pool;

try {
  for (const command of [initdb, pgCtl, createdb, pgIsReady]) {
    if (!existsSync(command)) throw new Error(`Packaged PostgreSQL command is missing: ${command}`);
  }
  await cp(join(resourcesRoot, "migrations"), oldMigrations, { recursive: true });
  await cp(oldMigrations, upgradeMigrations, { recursive: true });
  const journalPath = join(upgradeMigrations, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  const baseEntry = journal.entries.at(-1);
  if (!baseEntry) throw new Error("Packaged migration journal has no base entry.");
  const upgradeEntry = {
    ...baseEntry,
    idx: baseEntry.idx + 1,
    when: baseEntry.when + 1,
    tag: "0001_desktop_upgrade_smoke",
  };
  journal.entries.push(upgradeEntry);
  await writeFile(join(upgradeMigrations, `${upgradeEntry.tag}.sql`), 'ALTER TABLE "identity_profile" ADD COLUMN "desktop_upgrade_probe" text;\n', "utf8");
  await writeFile(journalPath, `${JSON.stringify(journal, null, 2)}\n`, "utf8");

  run(initdb, ["-D", databaseDir, "--auth=trust", "--username=lee"], environment);
  run(pgCtl, ["-D", databaseDir, "-o", `-p ${port} -k "${socketDir}"`, "-l", postgresLog, "-w", "start"], environment);
  postgresStarted = true;
  run(pgIsReady, ["-h", "127.0.0.1", "-p", String(port)], environment);
  run(createdb, ["-h", "127.0.0.1", "-p", String(port), "-U", "lee", databaseName], environment);

  const databaseUrl = `postgresql://lee@127.0.0.1:${port}/${databaseName}`;
  await runPackagedMigration(runner, oldMigrations, databaseUrl);
  pool = new Pool({ connectionString: databaseUrl });
  const before = await pool.query('SELECT hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at ASC');
  if (before.rows.length !== 1) throw new Error(`Expected one prior migration journal row, found ${before.rows.length}.`);
  const previousJournalHashes = before.rows.map((row) => row.hash);

  await runPackagedMigration(runner, upgradeMigrations, databaseUrl);
  const after = await pool.query('SELECT hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at ASC');
  const probe = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'identity_profile'
      AND column_name = 'desktop_upgrade_probe'
  `);
  if (after.rows.length !== 2) throw new Error(`Expected two migration journal rows after upgrade, found ${after.rows.length}.`);
  if (after.rows[0].hash !== previousJournalHashes[0]) throw new Error("The prior migration journal hash changed during upgrade.");
  if (probe.rows.length !== 1) throw new Error("The next migration did not create desktop_upgrade_probe.");

  const result = {
    platform,
    status: "passed",
    migration: {
      previousJournalEntries: before.rows.length,
      upgradedJournalEntries: after.rows.length,
      priorJournalHashes: previousJournalHashes,
      upgradedJournalHashes: after.rows.map((row) => row.hash),
      newSchemaColumn: "identity_profile.desktop_upgrade_probe",
    },
  };
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Verified ${platform} existing-database migration upgrade: prior journal preserved, next migration applied, and schema upgraded.`);
} finally {
  await pool?.end().catch(() => {});
  if (postgresStarted) {
    try { run(pgCtl, ["-D", databaseDir, "-w", "stop", "-m", "immediate"], environment); } catch { /* Cleanup must not hide the migration result. */ }
  }
  await rm(root, { recursive: true, force: true });
}