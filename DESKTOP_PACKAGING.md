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
- GitHub Release automation for `lee-v*` tags
- SHA-256 checksums for release artifacts

The installer keeps CIL, CerbaSeal, Replit AI Bridge, and other specialist systems external. It does not copy or reimplement those services.

## First-launch initialization

On first launch the desktop supervisor creates `%APPDATA%/Project LEE` and its
`brain`, `event-log`, `backups`, `logs`, and private `database` directories.
When PostgreSQL binaries are available in the packaged `resources/postgres/bin`
(or `LEE_POSTGRES_BIN` during development), it initializes and starts a private
instance on the next local port, creates the `lee` database, persists the
connection string in the protected config file, and runs migrations before
starting the API. An existing `DATABASE_URL` remains supported for development.

The console displays database, migration, Brain, Event Log, System Contract,
CIL, CerbaSeal, and Replit Bridge states during startup. Missing external
services are shown as unavailable rather than silently treated as healthy.
Choosing `Exit LEE` stops the API and the private PostgreSQL process; closing
the window only minimizes to the tray so state is preserved.

## Release

Tagging `lee-v1.0.0` runs `.github/workflows/lee-desktop-release.yml` on Windows. The workflow builds the API and Console, packages the Electron shell, and publishes the installer and checksum to GitHub Releases.