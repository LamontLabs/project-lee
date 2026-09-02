# Project LEE Desktop Packaging

The first Windows desktop packaging layer lives in `artifacts/lee-desktop`.

## Current milestone

The Electron shell now provides:

- Project LEE window, tray menu, and minimize-to-tray behavior
- Explicit `Exit LEE` shutdown
- Local runtime supervisor for the API process
- Contract-based startup probing
- Application data directories under `%APPDATA%/Project LEE`
- Windows NSIS installer configuration with desktop and Start Menu shortcuts
- Disposable Windows installer validation in the release workflow
- GitHub Release automation for `lee-v*` tags
- SHA-256 checksums for release artifacts

The installer keeps CIL, CerbaSeal, Replit AI Bridge, and other specialist systems external. It does not copy or reimplement those services.

## First-launch initialization

On first launch the desktop supervisor creates `%APPDATA%/Project LEE` and its
`brain`, `event-log`, `backups`, `logs`, and private `database` directories.
The Windows package includes PostgreSQL binaries from `resources/postgres/bin`.
The release build must populate that directory before `electron-builder` runs;
development can instead use `LEE_POSTGRES_BIN`. On first launch the supervisor
initializes and starts a private instance on the next local port, creates the
`lee` database, persists the connection string in the protected config file,
and runs migrations before starting the API. A persisted local URL restarts that
same private instance on every subsequent launch. An external `DATABASE_URL`
remains supported for development.

The console displays database, migration, Brain, Event Log, System Contract,
CIL, CerbaSeal, and Replit Bridge states during startup. Missing external
services are shown as unavailable rather than silently treated as healthy.
Choosing `Exit LEE` stops the API and the private PostgreSQL process; closing
the window only minimizes to the tray so state is preserved. If migrations fail,
the first-launch checklist marks them unavailable and shows the full path to
`%APPDATA%/Project LEE/logs/migration.log`.

## Windows smoke test

Run this on a clean Windows VM after building the NSIS installer:

1. Install Project LEE without opening a shell. Confirm the first launch creates
   `%APPDATA%/Project LEE/database`, `brain`, `event-log`, and `logs`, and that
   the checklist reports the private database as live.
2. Before launch, set `migrationCommand` in `%APPDATA%/Project LEE/config.json`
   to a command that exits non-zero. Launch LEE and confirm migrations are
   marked unavailable and the checklist displays
   `%APPDATA%/Project LEE/logs/migration.log`. Restore the command afterward.
3. Choose `Exit LEE` from the tray. Confirm no `postgres.exe`, `pg_ctl.exe`, or
   LEE API process remains, then reopen LEE. Confirm the same database directory,
   data directories, and persisted local database URL are reused.

## Release

Tagging `lee-v1.0.0` runs `.github/workflows/lee-desktop-release.yml` on Windows. The workflow builds the API and Console, packages the Electron shell, and uploads the NSIS artifact to a separate disposable Windows validation job. That job installs silently into a temporary directory and verifies private PostgreSQL startup, migration failure reporting, `Exit LEE` process cleanup, and restart reuse of the configured data/database directories. GitHub Release publication runs only after validation passes and includes the installer and checksum.