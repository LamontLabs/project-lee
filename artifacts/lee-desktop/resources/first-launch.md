# Project LEE desktop runtime

Project LEE opens the Connection Center on startup and runs the safe setup pass
automatically. The owner only needs to review discovered services or authorize
external accounts when those actions are required.

LEE keeps its database, brain, event history, backups, and logs in the platform's
application-data directory. The Windows installer includes a private PostgreSQL
runtime and initializes it on first launch. macOS and Linux builds use the same
runtime supervisor and currently require a configured PostgreSQL binary. Every
packaged build includes the database migration runner, SQL, and migration journal
as installer resources; first launch does not use the source repository or pnpm.

External CIL, CerbaSeal, Replit AI Bridge, and MCP Project Bridge services remain
API-connected dependencies with independent readiness states. CIL is mandatory
before model execution; if it is unavailable, LEE continues only with local or
no-model work. CerbaSeal remains fail-closed for consequential actions, while
MCP unavailability affects project operations only. Credentials are never
accepted by the desktop installer.