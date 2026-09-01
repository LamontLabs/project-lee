---
name: Packaged desktop migration boundary
description: Packaged desktop startup must migrate from installer resources rather than the development workspace.
---

Packaged desktop startup uses a bundled migration runner with versioned SQL and a migration journal; it must not require pnpm, the source repository, or development-only database tooling.

**Why:** Installed applications do not contain the monorepo workspace or its development dependencies, while first launch still needs repeatable schema upgrades and the existing migration failure diagnostics.

**How to apply:** Keep migration assets and the private PostgreSQL bin/lib/share runtime in the release resource staging path for every desktop platform, use a private app-data socket directory, and preserve the development command only as a non-packaged override.