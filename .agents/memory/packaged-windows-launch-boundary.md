---
name: Packaged Windows launch boundary
description: Hosted clean-install evidence distinguishes working external PostgreSQL execution from packaged Electron child startup.
---

The hosted Windows smoke test proves the bundled PostgreSQL runtime and migration path can initialize, start, accept connections, migrate, and stop when invoked by an external Node process. The same installed app cannot currently launch a child helper through its packaged Electron executable: `ELECTRON_RUN_AS_NODE=1`, `--run-as-node`, and `--no-sandbox --run-as-node` all leave only the parent launcher-path marker, with no helper-start marker. Shell-based `pg_ctl` launches likewise fail to produce a server process.

**Why:** This separates the remaining failure from PostgreSQL binaries, database initialization, certificate trust, and migration assets. Further fixes should focus on obtaining a real native executable/runtime that the packaged Windows app can launch, or on a Windows-specific process model that does not depend on packaged Electron re-entering Node mode.

**How to apply:** Treat hosted clean-install evidence as authoritative. Do not declare the desktop release publishable until the installed non-admin app reaches `postgres-ready`, writes runtime status, completes migration, and passes cleanup.