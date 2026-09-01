The installer uses resources/lee.png for the application icon and shortcuts.
The release pipeline bundles the API server and Console builds. Windows releases
must be Authenticode-signed, and macOS releases must be Developer ID-signed and
notarized before they can be published. Linux releases include SHA-256 sidecars,
platform checksum manifests, and a release manifest alongside electron-updater's
latest-linux.yml metadata.

Production packages are published through the GitHub release provider. The
desktop updater consumes latest.yml, latest-mac.yml, or latest-linux.yml from
the stable release channel. Windows updater downloads are signature-verified by
electron-updater before installation.

The private PostgreSQL runtime is bundled by the Windows release job. macOS and
Linux packages use the same runtime supervisor and require a configured PostgreSQL
binary until platform-specific database archives are added to their release jobs.