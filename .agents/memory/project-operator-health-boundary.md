---
name: Project operator health boundary
description: Governed project inspection must expose sanitized evidence, per-project health, and fresh preview-bound writes.
---

Project operators may inspect repository structure, manifests, packaging, migrations, desktop runtime, and diagnostics only as bounded, credential-free evidence. Each registered project reports its own health and observation freshness; one unavailable or unauthorized project must not make the aggregate appear healthy. Local project-agent writes require both the signed request and a short-lived matching preview token.

**Why:** A project bridge that exposes raw manifests, treats failed probes as a generic global failure, or trusts a signature without a fresh preview can leak credentials or apply stale changes.

**How to apply:** Keep sensitive paths excluded from reads and searches, return dependency names and script metadata rather than raw lockfile content, classify unauthorized/unavailable/partial/stale states explicitly, and preserve capability plus governance checks before any mutation.