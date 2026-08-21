# Project LEE desktop runtime

The installer creates `%APPDATA%/Project LEE` with `backups`, `brain`, `event-log`, and `logs` directories.
The first-launch setup must provide a local PostgreSQL `DATABASE_URL` before LEE Core can start.
External CIL, CerbaSeal, and Replit AI Bridge services remain API-connected dependencies.