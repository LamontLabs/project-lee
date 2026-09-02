import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all desktop packages include the relocatable PostgreSQL runtime", async () => {
  const builder = await read("electron-builder.yml");
  const installer = await read("resources/installer.nsh");
  const runtime = await read("src/runtime.ts");
  const main = await read("src/main.ts");
  const prepare = await read("scripts/prepare-runtime.mjs");
  const migrationCheck = await read("scripts/verify-packaged-migrations.mjs");
  const windowsSmoke = await read("scripts/windows-smoke-test.ps1");
  const windowsUpdate = await read("scripts/windows-update-smoke.ps1");
  const unixUpdate = await read("scripts/unix-update-smoke.mjs");

  assert.match(builder, /extraResources:[\s\S]*from: resources\/postgres[\s\S]*to: postgres/);
  assert.match(builder, /nsis:[\s\S]*include: resources\/installer\.nsh/);
  assert.match(installer, /customInstall/);
  assert.match(installer, /IfSilent/);
  assert.match(installer, /certutil\.exe/);
  assert.match(installer, /TrustedPublisher/);
  assert.match(windowsSmoke, /resources\\lee-signing\.cer/);
  assert.match(windowsSmoke, /X509Store/);
  assert.match(windowsSmoke, /StoreLocation\]::CurrentUser/);
  assert.match(windowsSmoke, /FindByThumbprint/);
  assert.match(windowsSmoke, /certificateThumbprint = \$packagedCertificate\.Thumbprint/);
  assert.match(windowsSmoke, /automatic trust bootstrap may have regressed/);
  assert.doesNotMatch(builder, /win:[\s\S]*extraResources:/);
  assert.match(runtime, /join\(process\.resourcesPath, "postgres", "bin"\)/);
  assert.match(runtime, /LD_LIBRARY_PATH/);
  assert.match(runtime, /DYLD_LIBRARY_PATH/);
  assert.match(runtime, /PGSHAREDIR/);
  assert.match(runtime, /postgres-socket/);
  assert.match(runtime, /randomUUID\(\)/);
  assert.match(runtime, /LEE_INSTANCE_ID: instanceId/);
  assert.match(runtime, /timeout: 60_000/);
  assert.match(runtime, /recoveryMode: "RECOVERY_MODE"/);
  assert.match(runtime, /\/api\/recovery\/status/);
  assert.match(main, /LEE_SMOKE_UPDATE_FEED_URL/);
  assert.match(main, /quitAndInstall/);
  assert.match(prepare, /Bundled PostgreSQL runtime is missing/);
  assert.match(prepare, /verifyPackagedMigrations/);
  assert.match(migrationCheck, /_journal\.json/);
  assert.match(migrationCheck, /workspace fallback disabled/);
  assert.match(main, /LEE_SMOKE_UPDATE_INTERRUPT/);
  assert.match(main, /phase === "download"[\s\S]*app\.quit\(\)/);
  assert.match(main, /quitAndInstall/);
  assert.match(windowsUpdate, /LEE_SMOKE_UPDATE_INTERRUPT = "download"/);
  assert.match(windowsUpdate, /LEE_SMOKE_UPDATE_INTERRUPT = "install"/);
  assert.match(windowsUpdate, /after-download-interruption/);
  assert.match(windowsUpdate, /after-install-interruption/);
  assert.match(unixUpdate, /LEE_SMOKE_UPDATE_INTERRUPT: interrupt/);
  assert.match(unixUpdate, /after-download-interruption/);
  assert.match(unixUpdate, /after-install-interruption/);
});

test("Windows and Linux release jobs stage and smoke-test PostgreSQL", async () => {
  const workflow = await read("../../.github/workflows/lee-desktop-release.yml");

  assert.equal((workflow.match(/name: Stage private PostgreSQL runtime/g) ?? []).length, 2);
  assert.match(workflow, /postgresql-\$version-windows-x64-binaries\.zip/);
  assert.match(workflow, /apt-get install --no-install-recommends -y postgresql/);
  assert.match(workflow, /Smoke test bundled Linux runtime/);
  assert.match(workflow, /xvfb-run --auto-servernum/);
  assert.match(workflow, /windows-update-smoke\.ps1/);
  assert.match(workflow, /download-release-assets\.mjs/);
  assert.match(workflow, /update-verification-\$\{\{ matrix\.evidence_suffix \}\}\.json/);
  assert.match(workflow, /Verify packaged Linux migration assets/);
  assert.match(workflow, /verify-packaged-migrations\.mjs/);
  assert.match(workflow, /--platform windows/);
  assert.doesNotMatch(workflow, /macos|macOS|APPLE|LEE_MACOS/i);
});