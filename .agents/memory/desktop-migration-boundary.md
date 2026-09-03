---
name: Packaged desktop migration boundary
description: Packaged desktop startup must migrate from installer resources rather than the development workspace.
---

Packaged desktop startup uses a bundled migration runner with versioned SQL and a migration journal; it must not require pnpm, the source repository, or development-only database tooling.

**Why:** Installed applications do not contain the monorepo workspace or its development dependencies, while first launch still needs repeatable schema upgrades and the existing migration failure diagnostics.

**How to apply:** Keep migration assets and the private PostgreSQL bin/lib/share runtime in the release resource staging path for every desktop platform, use a private app-data socket directory, and preserve the development command only as a non-packaged override.

Existing-install validation must apply the packaged migration runner to a disposable database seeded with the prior migration set, then verify the prior journal hashes remain and the next schema change is present.

**Why:** A clean first-launch migration can pass while an upgrade accidentally rewrites migration history or fails to apply the next journaled change.

**How to apply:** Run the upgrade fixture on every desktop release platform using that platform’s staged PostgreSQL binaries, and retain the platform/result/journal/schema record with the smoke evidence.