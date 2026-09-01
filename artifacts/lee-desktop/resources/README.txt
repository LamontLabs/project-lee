The installer uses resources/lee.png for the application icon and shortcuts.
The release pipeline bundles the API server and Console builds. Production packages
are published through electron-builder's GitHub provider and are update-ready when
the release is signed and published.

The private PostgreSQL runtime is bundled by the Windows release job. macOS and
Linux packages use the same runtime supervisor and require a configured PostgreSQL
binary until platform-specific database archives are added to their release jobs.