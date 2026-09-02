import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { assertProductionMigrationSource, verifyPackagedMigrations } from "./verify-packaged-migrations.mjs";

const desktopRoot = new URL("..", import.meta.url);

test("packaged migration assets are complete in Windows, macOS, and Linux resource layouts", async () => {
  const root = await mkdtemp(join(tmpdir(), "lee-migration-assets-"));
  try {
    const source = new URL("../resources/", import.meta.url);
    for (const [platform, layout] of [["windows", "win/resources"], ["macos", "Project LEE.app/Contents/Resources"], ["linux", "linux/resources"]]) {
      const target = join(root, layout);
      await cp(source, target, { recursive: true });
      const result = verifyPackagedMigrations(target, platform);
      assert.equal(result.sqlFiles, 1);
      assert.equal(result.journalEntries, 1);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production migration source selects only packaged assets by default", async () => {
  const source = await readFile(new URL("../src/runtime.ts", import.meta.url), "utf8");
  assert.doesNotThrow(() => assertProductionMigrationSource(source));
});

test("missing packaged migration assets fail with the repair path", async () => {
  const root = await mkdtemp(join(tmpdir(), "lee-migration-assets-negative-"));
  try {
    const target = join(root, "resources");
    await cp(new URL("../resources/", import.meta.url), target, { recursive: true });
    await rm(join(target, "migrate-runtime.mjs"));
    assert.throws(() => verifyPackagedMigrations(target, "linux"), /migration runner is missing.*prepare-runtime\.mjs/);

    await cp(new URL("../resources/", import.meta.url), target, { recursive: true, force: true });
    await rm(join(target, "migrations", "0000_omniscient_retro_girl.sql"));
    assert.throws(() => verifyPackagedMigrations(target, "linux"), /migration SQL is missing.*prepare-runtime\.mjs/);

    await cp(new URL("../resources/", import.meta.url), target, { recursive: true, force: true });
    await rm(join(target, "migrations", "meta", "_journal.json"));
    assert.throws(() => verifyPackagedMigrations(target, "linux"), /migration journal is missing.*_journal\.json/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});