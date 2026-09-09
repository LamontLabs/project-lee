import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(new URL("./migration-upgrade-smoke.mjs", import.meta.url), "utf8");
const unixSmoke = await readFile(new URL("./unix-runtime-smoke.mjs", import.meta.url), "utf8");
const windowsSmoke = await readFile(new URL("./windows-smoke-test.ps1", import.meta.url), "utf8");
const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");
const migrationRoot = new URL("../../../lib/db/drizzle/", import.meta.url);

test("existing-database migration smoke preserves history and records the upgrade", () => {
  assert.match(script, /oldMigrations/);
  assert.match(script, /upgradeMigrations/);
  assert.match(script, /runPackagedMigration\(runner, oldMigrations/);
  assert.match(script, /runPackagedMigration\(runner, upgradeMigrations/);
  assert.match(script, /mkdir\(socketDir/);
  assert.match(script, /priorJournalHashes/);
  assert.match(script, /after\.rows\[0\]\.hash !== previousJournalHashes\[0\]/);
  assert.match(script, /identity_profile\.desktop_upgrade_probe/);
  assert.match(script, /upgradedJournalEntries: after\.rows\.length/);
  assert.match(script, /requestedWorkRoot/);
  assert.match(script, /ownsWorkRoot/);
});

test("Windows packaged smoke tests execute and validate migration-upgrade evidence", () => {
  assert.match(unixSmoke, /migration-upgrade-smoke\.mjs/);
  assert.match(unixSmoke, /migrationUpgrade\.status !== "passed"/);
  assert.match(unixSmoke, /--evidence/);
  assert.match(unixSmoke, /firstRun\.output/);
  assert.match(unixSmoke, /verifyOwnerAuthentication/);
  assert.match(unixSmoke, /Packaged LEE restart process exited/);
  assert.match(windowsSmoke, /migration-upgrade-smoke\.mjs/);
  assert.match(windowsSmoke, /--work-root \$testRoot/);
  assert.match(windowsSmoke, /\$migrationUpgrade\.migration\.upgradedJournalEntries -eq \(\$migrationUpgrade\.migration\.previousJournalEntries \+ 1\)/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /windows-smoke-test\.ps1/);
  assert.doesNotMatch(workflow, /linux-package:|Smoke test bundled Linux runtime|LEE_SMOKE_NO_SANDBOX|--no-sandbox/);
  assert.doesNotMatch(workflow, /macos|macOS|APPLE|LEE_MACOS/i);
});

test("latest schema snapshot is covered by packaged migration SQL", async () => {
  const journal = JSON.parse(await readFile(new URL("meta/_journal.json", migrationRoot), "utf8"));
  const latest = journal.entries.at(-1);
  assert.ok(latest, "migration journal must contain a latest entry");
  const snapshot = JSON.parse(await readFile(new URL(`meta/${String(latest.idx).padStart(4, "0")}_snapshot.json`, migrationRoot), "utf8"));
  const files = await readdir(migrationRoot);
  const sql = (await Promise.all(files.filter((file) => file.endsWith(".sql")).map((file) => readFile(new URL(file, migrationRoot), "utf8")))).join("\n");
  const migratedTables = new Set([...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]));
  const missing = Object.values(snapshot.tables ?? {}).map((table) => table.name).filter((name) => !migratedTables.has(name));
  assert.deepEqual(missing, [], "every schema table must be created by the packaged migration history");
});