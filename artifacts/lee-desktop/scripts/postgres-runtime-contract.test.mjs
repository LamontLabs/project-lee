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

test("macOS release matrix covers Intel and Apple Silicon with architecture-aware smoke", async () => {
  const workflow = await read("../../.github/workflows/lee-desktop-release.yml");

  assert.match(workflow, /macos-package:\s+strategy:/);
  assert.match(workflow, /runner: macos-13[\s\S]*arch: x64/);
  assert.match(workflow, /runner: macos-14[\s\S]*arch: arm64/);
  assert.match(workflow, /actual_arch="\$\(uname -m\)"/);
  assert.match(workflow, /expected_arch="\$\{\{ matrix\.arch == 'x64' && 'x86_64' \|\| 'arm64' \}\}"/);
  assert.match(workflow, /--arch "\$\{\{ matrix\.arch \}\}"/);
  assert.match(workflow, /smoke:unix -- "\$GITHUB_WORKSPACE\/\$app_path" --architecture "\$\{\{ matrix\.arch \}\}"/);
  assert.match(workflow, /lee-macos-installers-x64/);
  assert.match(workflow, /lee-macos-installers-arm64/);
});