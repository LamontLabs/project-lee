# Project LEE desktop runtime

Project LEE opens the Connection Center on startup and runs the safe setup pass
automatically. The owner only needs to review discovered services or authorize
external accounts when those actions are required.

LEE keeps its database, brain, event history, backups, and logs in the platform's
application-data directory. The Windows installer includes a private PostgreSQL
runtime and initializes it on first launch. macOS and Linux builds use the same
runtime supervisor and currently require a configured PostgreSQL binary.

External CIL, CerbaSeal, and Replit AI Bridge services remain API-connected
dependencies. Credentials are never accepted by the desktop installer.