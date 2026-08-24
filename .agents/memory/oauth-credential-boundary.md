---
name: OAuth credential boundary
description: OAuth callback state and provider tokens must remain server-side and out of connection projections.
---

OAuth integrations use signed, short-lived state and an encrypted server-side credential record; connection APIs expose only status and whether a credential is configured.

**Why:** Browser redirects need a replay-resistant handoff, while provider access and refresh tokens must never reach the console, Android companion, logs, or event payloads.

**How to apply:** Add providers through the explicit adapter registry, validate the exact requested scopes before storing, and map expired or failed authorization to visible reauthorization status.