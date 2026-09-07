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
  assert.match(workflow, /X509Certificate2/);
  assert.match(workflow, /EphemeralKeySet/);
  assert.match(workflow, /Import-PublicCertificateToCurrentUserStore/);
  assert.match(workflow, /LeeCertificateStoreNative/);
  assert.match(workflow, /CertOpenStore/);
  assert.match(workflow, /CertAddEncodedCertificateToStore/);
  assert.match(workflow, /0x00010000/);
  assert.match(workflow, /0x00010001/);
  assert.match(workflow, /GetLastWin32Error/);
  assert.match(workflow, /Add-Type -TypeDefinition @'/);
  assert.match(workflow, /\n {10}'@\n/);
  assert.match(workflow, /StoreLocation\]::CurrentUser/);
  assert.match(workflow, /OpenFlags\]::ReadOnly/);
  assert.match(workflow, /The public certificate was not recognized exactly once/);
  assert.doesNotMatch(workflow, /certutil\.exe|HKCU:\\Software\\Microsoft\\SystemCertificates|Import-Certificate|Import-PfxCertificate|StoreLocation\]::LocalMachine/);
  assert.doesNotMatch(workflow, /result\.exitCode|certutil could not add/);
  assert.match(workflow, /@\("Root", "TrustedPublisher"\)/);
  assert.match(workflow, /resources\\lee-signing\.cer/);
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

test("Windows installer validation uses a fresh non-admin user profile", () => {
  assert.match(workflow, /Validate clean non-admin Windows installation/);
  assert.match(workflow, /New-LocalUser -Name \$userName/);
  assert.match(workflow, /-Credential \$credential/);
  assert.match(workflow, /-LoadUserProfile/);
  assert.match(workflow, /-RequireNonAdmin/);
  assert.match(workflow, /Remove-LocalUser -Name \$userName/);
});

test("Linux timeout evidence heredoc remains valid YAML", () => {
  assert.match(
    workflow,
    /run: \|\n(?:(?: {10}).*\n)+\s+node - .*<<'NODE'\n {10}const fs = require\("node:fs"\);[\s\S]*\n {10}NODE\n/,
  );
});