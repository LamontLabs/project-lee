import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execFileAsync = promisify(execFile);
const root = new URL("..", import.meta.url);

test("macOS updater metadata merges architecture-specific files without a legacy single-arch fallback", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "lee-mac-metadata-"));
  try {
    const x64 = join(fixture, "latest-mac-x64.yml");
    const arm64 = join(fixture, "latest-mac-arm64.yml");
    const output = join(fixture, "latest-mac.yml");
    const metadata = (file) => `version: 1.2.3
files:
  - url: ${file}
    sha512: checksum-${file}
    size: 123
path: ${file}
sha512: checksum-${file}
releaseDate: 2026-09-01T00:00:00.000Z
`;
    await writeFile(x64, metadata("Project-LEE-Setup-1.2.3-x64.zip"), "utf8");
    await writeFile(arm64, metadata("Project-LEE-Setup-1.2.3-arm64.zip"), "utf8");
    await execFileAsync(process.execPath, [
      fileURLToPath(new URL("./scripts/merge-mac-updater-metadata.mjs", root)),
      "--x64", x64,
      "--arm64", arm64,
      "--output", output,
    ]);
    const merged = await readFile(output, "utf8");
    assert.match(merged, /Project-LEE-Setup-1\.2\.3-x64\.zip/);
    assert.match(merged, /Project-LEE-Setup-1\.2\.3-arm64\.zip/);
    assert.equal((merged.match(/^\s+-\s+url:/gm) ?? []).length, 2);
    assert.doesNotMatch(merged, /^path:/m);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("publish workflow keeps macOS metadata separate until it is merged", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");
  const manifest = await readFile(new URL("./scripts/write-release-manifest.mjs", root), "utf8");
  assert.match(workflow, /latest-mac-\$\{\{ matrix\.arch \}\}\.yml/);
  assert.match(workflow, /merge-mac-updater-metadata\.mjs/);
  assert.match(workflow, /--x64/);
  assert.match(workflow, /--arm64/);
  assert.match(workflow, /runner: macos-13[\s\S]*architecture: x64/);
  assert.match(workflow, /runner: macos-14[\s\S]*architecture: arm64/);
  assert.match(workflow, /download-release-assets\.mjs[\s\S]*--architecture/);
  assert.match(workflow, /unix-update-smoke\.mjs[\s\S]*--architecture/);
  assert.match(workflow, /write-release-manifest\.mjs --platform macos --version/);
  assert.match(manifest, /versionArgument/);
});

test("published update evidence is unique for every validation matrix entry", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /evidence_suffix: windows/);
  assert.match(workflow, /evidence_suffix: macos-x64/);
  assert.match(workflow, /evidence_suffix: macos-arm64/);
  assert.match(workflow, /evidence_suffix: linux/);
  assert.match(workflow, /name: lee-update-verification-\$\{\{ matrix\.evidence_suffix \}\}/);
  assert.match(workflow, /update-verification-\$\{\{ matrix\.evidence_suffix \}\}\.json/);
  assert.match(workflow, /UPDATE-VERIFICATION-\$\{\{ matrix\.evidence_suffix \}\}\.md/);
  assert.doesNotMatch(workflow, /gh release upload[\s\S]*update-verification-\$\{\{ matrix\.platform \}\}\.json/);
});

test("release workflow rejects branch and malformed manual dispatches", async () => {
  const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");
  assert.match(workflow, /validate-release-ref:/);
  assert.match(workflow, /GITHUB_REF_TYPE.*tag/);
  assert.match(workflow, /GITHUB_REF_NAME.*\^lee-v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+/);
  assert.match(workflow, /windows-installer:\s*\n\s+needs: validate-release-ref/);
  assert.match(workflow, /macos-package:\s*\n\s+needs: validate-release-ref/);
  assert.match(workflow, /linux-package:\s*\n\s+needs: validate-release-ref/);
});