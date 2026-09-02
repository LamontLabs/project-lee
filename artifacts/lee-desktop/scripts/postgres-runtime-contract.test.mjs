import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("macOS PostgreSQL staging relocates and verifies native dependencies", async () => {
  const stage = await read("scripts/stage-postgres-runtime.mjs");
  const verify = await read("scripts/verify-postgres-runtime.mjs");
  const smoke = await read("scripts/unix-runtime-smoke.mjs");

  assert.match(stage, /install_name_tool/);
  assert.match(stage, /ownerDependencies\.filter\(\(value\) => value\.startsWith\("@rpath\/"\)\)/);
  assert.match(stage, /verifyPostgresRuntime\(destination/);
  assert.match(verify, /Mach-O dependency escapes the packaged runtime/);
  assert.match(verify, /lipo/);
  assert.match(verify, /@loader_path/);
  assert.match(verify, /@executable_path/);
  assert.match(verify, /@rpath/);
  assert.match(smoke, /verifyPostgresRuntime/);
  assert.match(smoke, /--architecture/);
});

test("release workflow stages PostgreSQL for Windows and Linux", async () => {
  const workflow = await read("../../.github/workflows/lee-desktop-release.yml");

  assert.doesNotMatch(workflow, /macos|macOS|APPLE|LEE_MACOS/i);
  assert.match(workflow, /runner: windows-latest/);
  assert.match(workflow, /runner: ubuntu-latest/);
  assert.match(workflow, /postgresql-\$version-windows-x64-binaries\.zip/);
  assert.match(workflow, /apt-get install --no-install-recommends -y postgresql/);
});