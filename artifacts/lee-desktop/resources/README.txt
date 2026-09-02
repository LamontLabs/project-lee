The installer uses resources/lee.png for the application icon and shortcuts.
The release pipeline bundles the API server and Console builds. Private Windows
releases are Authenticode-signed with the owner's self-signed PFX; the installer
automatically trusts its public lee-signing.cer certificate for update verification.
Linux releases include SHA-256 sidecars, platform checksum manifests, and a release
manifest alongside electron-updater's latest-linux.yml metadata.

Private packages are published through the GitHub release provider. The desktop
updater consumes latest.yml or latest-linux.yml from the stable release channel.
Windows updater downloads are checksum- and signature-verified before installation.

Every production package contains a private PostgreSQL runtime under
resources/postgres with bin, lib, and share/postgresql directories. The Windows
and Linux release jobs stage their platform-compatible runtimes before packaging;
installed users do not need to configure PostgreSQL separately.