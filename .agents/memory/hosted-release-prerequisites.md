---
name: Hosted desktop release prerequisites
description: Hosted signed-release verification depends on the connected GitHub account exposing the target repository and its release secrets.
---

Hosted desktop release verification cannot be completed from a local checkout alone; the GitHub connection must expose the target repository, and the release workflow must have access to signing and notarization secrets.

**Why:** Local contract tests can prove workflow wiring and feed logic, but only a published GitHub release on the matrix runners can prove installer signatures, notarization, updater installation, and retained release evidence.

**How to apply:** Before treating the first signed release as verified, confirm the connected GitHub account can read the target repository and inspect the tagged workflow run and release assets. If the repository is unavailable, report the external prerequisite instead of fabricating evidence.