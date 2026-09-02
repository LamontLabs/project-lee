import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");

test("publish workflow is limited to Windows and Linux release metadata", () => {
  assert.match(workflow, /windows-installer:/);
  assert.match(workflow, /linux-package:/);
  assert.match(workflow, /name: lee-windows-installer/);
  assert.match(workflow, /name: lee-linux-installers/);
  assert.match(workflow, /"latest\.yml", "latest-linux\.yml"/);
  assert.match(workflow, /Import-PfxCertificate/);
  assert.match(workflow, /Cert:\\CurrentUser\\Root/);
  assert.match(workflow, /Cert:\\CurrentUser\\TrustedPublisher/);
  assert.doesNotMatch(workflow, /macos|macOS|latest-mac|LEE_APPLE|LEE_MACOS|merge-mac/i);
});

test("published update evidence is unique for Windows and Linux validation", () => {
  assert.match(workflow, /evidence_suffix: windows/);
  assert.match(workflow, /evidence_suffix: linux/);
  assert.match(workflow, /name: lee-update-verification-\$\{\{ matrix\.evidence_suffix \}\}/);
  assert.match(workflow, /update-verification-\$\{\{ matrix\.evidence_suffix \}\}\.json/);
  assert.match(workflow, /UPDATE-VERIFICATION-\$\{\{ matrix\.evidence_suffix \}\}\.md/);
  assert.doesNotMatch(workflow, /evidence_suffix: macos/);
  assert.doesNotMatch(workflow, /gh release upload[\s\S]*update-verification-\$\{\{ matrix\.platform \}\}\.json/);
});

test("release workflow rejects branch and malformed manual dispatches", () => {
  assert.match(workflow, /validate-release-ref:/);
  assert.match(workflow, /GITHUB_REF_TYPE.*tag/);
  assert.match(workflow, /GITHUB_REF_NAME.*\^lee-v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+/);
  assert.match(workflow, /windows-installer:\s*\n\s+needs: validate-release-ref/);
  assert.match(workflow, /linux-package:\s*\n\s+needs: validate-release-ref/);
  assert.doesNotMatch(workflow, /macos-package|macOS|APPLE_ID|LEE_MACOS/);
});