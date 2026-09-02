---
name: Hosted desktop release prerequisites
description: Hosted signed-release verification depends on the connected GitHub account exposing the target repository and its release secrets.
---

Hosted desktop release verification cannot be completed from a local checkout alone; the GitHub connection must expose the target repository, and the release workflow must have access to Windows signing and release secrets.

**Why:** Local contract tests can prove workflow wiring and feed logic, but only a published GitHub release on the matrix runners can prove installer signatures, notarization, updater installation, and retained release evidence.

**How to apply:** Before treating the first signed Windows/Linux release as verified, confirm the connected GitHub account can read the target repository and inspect the tagged workflow run and release assets. If the repository is unavailable, report the external prerequisite instead of fabricating evidence.

The Replit GitHub OAuth connector's `repo` scope can create a private repository and administer Actions settings, but its offered scope set may omit GitHub's separate `workflow` authorization. In that case GitHub rejects writes under `.github/workflows/` even when repository admin access is present.

**Why:** Repository write access and workflow-file write access are distinct GitHub permissions; retrying or reconnecting with the same offered scope set cannot add a missing scope.

**How to apply:** Use an owner-provided fine-grained token stored through Replit Secrets with repository Contents, Actions, and Secrets write permissions, or have the owner add the workflow in GitHub. Never treat `repo` scope alone as proof that workflows can be published.