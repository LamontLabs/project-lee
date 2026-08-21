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

## Honest database boundary

The current API requires `DATABASE_URL`. The desktop supervisor treats a missing local database as `unavailable` and does not silently start a partial system. The next packaging milestone must provision and manage a private local PostgreSQL service, run migrations, and write its connection configuration into the protected LEE data directory.

Until that is implemented, the installer is a runtime-shell milestone rather than the final self-contained K6 installer.

## Release

Tagging `lee-v1.0.0` runs `.github/workflows/lee-desktop-release.yml` on Windows. The workflow builds the API and Console, packages the Electron shell, and publishes the installer and checksum to GitHub Releases.