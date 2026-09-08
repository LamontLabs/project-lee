import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../../../.github/workflows/lee-desktop-release.yml", import.meta.url), "utf8");

test("publish workflow is limited to Windows release metadata", () => {
  assert.match(workflow, /windows-installer:/);
  assert.match(workflow, /name: lee-windows-installer/);
  assert.doesNotMatch(workflow, /linux-package:|lee-linux-installers|latest-linux\.yml/);
  assert.match(workflow, /foreach \(\$metadata in @\("latest\.yml"\)\)/);
  assert.match(workflow, /X509Certificate2/);
  assert.match(workflow, /EphemeralKeySet/);
  assert.match(workflow, /Prepare public Windows signing certificate for CI verification/);
  assert.match(workflow, /privateKeyPresent = \$publicCertificate\.HasPrivateKey/);
  assert.match(workflow, /storeMutation = "not-performed"/);
  assert.match(workflow, /Get-AuthenticodeSignature/);
  assert.match(workflow, /SignerCertificate\.Thumbprint/);
  assert.match(workflow, /expectedThumbprint/);
  assert.match(workflow, /"UnknownError"/);
  assert.doesNotMatch(workflow, /certutil\.exe|HKCU:\\Software\\Microsoft\\SystemCertificates|Import-Certificate|Import-PfxCertificate|StoreLocation\]::LocalMachine/);
  assert.doesNotMatch(workflow, /CertOpenStore|CertOpenSystemStore|CertAddEncodedCertificateToStore|LeeCertificateStoreNative/);
  assert.match(workflow, /resources\\lee-signing\.cer/);
  assert.doesNotMatch(workflow, /macos|macOS|latest-mac|LEE_APPLE|LEE_MACOS|merge-mac/i);
});

test("published update evidence is unique for Windows validation", () => {
  assert.match(workflow, /evidence_suffix: windows/);
  assert.match(workflow, /name: lee-update-verification-\$\{\{ matrix\.evidence_suffix \}\}/);
  assert.match(workflow, /update-verification-\$\{\{ matrix\.evidence_suffix \}\}\.json/);
  assert.match(workflow, /UPDATE-VERIFICATION-\$\{\{ matrix\.evidence_suffix \}\}\.md/);
  assert.doesNotMatch(workflow, /evidence_suffix: linux|evidence_suffix: macos/);
  assert.doesNotMatch(workflow, /gh release upload[\s\S]*update-verification-\$\{\{ matrix\.platform \}\}\.json/);
});

test("release workflow rejects branch and malformed manual dispatches", () => {
  assert.match(workflow, /validate-release-ref:/);
  assert.match(workflow, /GITHUB_REF_TYPE.*tag/);
  assert.match(workflow, /GITHUB_REF_NAME.*\^lee-v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+/);
  assert.match(workflow, /windows-installer:\s*\n\s+needs: validate-release-ref/);
  assert.match(workflow, /publish-release:\s*\n\s+needs:\s*\n\s+- windows-installer-validation/);
  assert.doesNotMatch(workflow, /linux-package:/);
  assert.doesNotMatch(workflow, /macos-package|macOS|APPLE_ID|LEE_MACOS/);
});

test("Windows installer validation uses a fresh non-admin user profile", () => {
  assert.match(workflow, /Validate clean non-admin Windows installation/);
  assert.match(workflow, /New-LocalUser -Name \$userName/);
  assert.match(workflow, /-Credential \$credential/);
  assert.match(workflow, /-LoadUserProfile/);
  assert.match(workflow, /-RequireNonAdmin/);
  assert.match(workflow, /\$userName = "lee-smoke-owner"/);
  assert.match(workflow, /Remove-LocalUser -Name \$userName/);
});
