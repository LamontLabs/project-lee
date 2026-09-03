---
name: Hosted desktop release prerequisites
description: Hosted signed-release verification depends on the connected GitHub account exposing the target repository and its release secrets.
---

Hosted desktop release verification cannot be completed from a local checkout alone; the GitHub connection must expose the target repository, and the release workflow must have access to the private Windows signing and release secrets.

**Why:** Local contract tests can prove workflow wiring and feed logic, but only a published GitHub release on the matrix runners can prove installer signatures, notarization, updater installation, and retained release evidence.

**How to apply:** Before treating the first signed Windows/Linux release as verified, confirm the connected GitHub account can read the target repository and inspect the tagged workflow run and release assets. If the repository is unavailable, report the external prerequisite instead of fabricating evidence.

For this private single-owner system, Windows releases use a self-signed code-signing PFX rather than a commercial certificate. The workflow imports its public certificate into the Windows runner's temporary Root and TrustedPublisher stores before Authenticode verification.

**Why:** The owner needs signed update integrity without purchasing a public publisher identity; a self-signed certificate is sufficient when the owner controls the client trust setup.

**How to apply:** Keep `LEE_WINDOWS_CERTIFICATE` as one-line Base64 PFX data and `LEE_WINDOWS_CERTIFICATE_PASSWORD` as its password. Install the matching public certificate on the owner's Windows machine; never use the self-signed certificate as evidence of public Windows reputation.

The Windows installer bootstraps the owner's trust automatically by importing only the packaged public certificate into the current user's Root and TrustedPublisher stores; the PFX private key remains CI-only.

**Why:** A personal installation should not require a separate certificate setup step, while packaging the private key would turn every installed copy into a signing credential.

**How to apply:** Keep the installer trust bootstrap limited to the exact public certificate produced from the release PFX, and verify that bootstrap on a real Windows runner before treating the first release as complete.

The Replit GitHub OAuth connector's `repo` scope can create a private repository and administer Actions settings, but its offered scope set may omit GitHub's separate `workflow` authorization. In that case GitHub rejects writes under `.github/workflows/` even when repository admin access is present.

**Why:** Repository write access and workflow-file write access are distinct GitHub permissions; retrying or reconnecting with the same offered scope set cannot add a missing scope.

**How to apply:** Use an owner-provided fine-grained token stored through Replit Secrets with repository Contents, Actions, and Secrets write permissions, or have the owner add the workflow in GitHub. Never treat `repo` scope alone as proof that workflows can be published.

Publishing selected files through an API-created commit does not synchronize a local checkout: the hosted branch can retain older versions of related files while the new commit looks current.

**Why:** API-created commits may have a different ancestry from the workspace's local history, so local typechecks can pass against newer companion files while hosted CI checks an older tree.

**How to apply:** After any API publication, verify the hosted tree for every source file used by the check, and prefer a deliberately scoped source sync over assuming commit recency means the branches are equivalent.