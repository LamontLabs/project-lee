import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const script = await readFile(new URL("./migration-upgrade-smoke.mjs", import.meta.url), "utf8");
const unixSmoke = await readFile(new URL("./unix-runtime-smoke.mjs", import.meta.url), "utf8");
const windowsSmoke = await readFile(new URL("./windows-smoke-test.ps1", import.meta.url), "utf8");
const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");

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
});

test("Windows and Linux packaged smoke tests execute and validate migration-upgrade evidence", () => {
  assert.match(unixSmoke, /migration-upgrade-smoke\.mjs/);
  assert.match(unixSmoke, /migrationUpgrade\.status !== "passed"/);
  assert.match(unixSmoke, /--evidence/);
  assert.match(unixSmoke, /firstRun\.output/);
  assert.match(unixSmoke, /verifyOwnerAuthentication/);
  assert.match(unixSmoke, /Packaged LEE restart process exited/);
  assert.match(unixSmoke, /LEE_SMOKE_NO_SANDBOX/);
  assert.match(unixSmoke, /--no-sandbox/);
  assert.match(windowsSmoke, /migration-upgrade-smoke\.mjs/);
  assert.match(windowsSmoke, /\$migrationUpgrade\.migration\.upgradedJournalEntries -eq \(\$migrationUpgrade\.migration\.previousJournalEntries \+ 1\)/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /Smoke test bundled Linux runtime/);
  assert.match(workflow, /LEE_SMOKE_NO_SANDBOX: "1"/);
  assert.match(workflow, /windows-smoke-test\.ps1/);
  assert.doesNotMatch(workflow, /macos|macOS|APPLE|LEE_MACOS/i);
});