import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all desktop packages include the relocatable PostgreSQL runtime", async () => {
  const builder = await read("electron-builder.yml");
  const runtime = await read("src/runtime.ts");
  const main = await read("src/main.ts");
  const prepare = await read("scripts/prepare-runtime.mjs");
  const migrationCheck = await read("scripts/verify-packaged-migrations.mjs");

  assert.match(builder, /extraResources:[\s\S]*from: resources\/postgres[\s\S]*to: postgres/);
  assert.doesNotMatch(builder, /win:[\s\S]*extraResources:/);
  assert.match(runtime, /join\(process\.resourcesPath, "postgres", "bin"\)/);
  assert.match(runtime, /LD_LIBRARY_PATH/);
  assert.match(runtime, /DYLD_LIBRARY_PATH/);
  assert.match(runtime, /PGSHAREDIR/);
  assert.match(runtime, /postgres-socket/);
  assert.match(main, /LEE_SMOKE_UPDATE_FEED_URL/);
  assert.match(main, /quitAndInstall/);
  assert.match(prepare, /Bundled PostgreSQL runtime is missing/);
  assert.match(prepare, /verifyPackagedMigrations/);
  assert.match(migrationCheck, /_journal\.json/);
  assert.match(migrationCheck, /workspace fallback disabled/);
});

test("release jobs stage and smoke-test PostgreSQL on every supported desktop platform", async () => {
  const workflow = await read("../../.github/workflows/lee-desktop-release.yml");

  assert.equal((workflow.match(/name: Stage private PostgreSQL runtime/g) ?? []).length, 3);
  assert.match(workflow, /postgresql-\$version-windows-x64-binaries\.zip/);
  assert.match(workflow, /brew install postgresql@17/);
  assert.match(workflow, /apt-get install --no-install-recommends -y postgresql/);
  assert.match(workflow, /Smoke test bundled macOS runtime/);
  assert.match(workflow, /Smoke test bundled Linux runtime/);
  assert.match(workflow, /xvfb-run --auto-servernum/);
  assert.match(workflow, /windows-update-smoke\.ps1/);
  assert.match(workflow, /download-release-assets\.mjs/);
  assert.match(workflow, /update-verification-\$\{\{ matrix\.platform \}\}\.json/);
  assert.match(workflow, /Verify packaged Linux migration assets/);
  assert.match(workflow, /verify-packaged-migrations\.mjs/);
  assert.match(workflow, /--platform windows/);
  assert.match(workflow, /--platform macos/);
});