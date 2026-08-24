---
name: OAuth credential boundary
description: OAuth callback state and provider tokens must remain server-side and out of connection projections.
---

OAuth integrations use signed, short-lived state and an encrypted server-side credential record; connection APIs expose only status and whether a credential is configured.

**Why:** Browser redirects need a replay-resistant handoff, while provider access and refresh tokens must never reach the console, Android companion, logs, or event payloads.

**How to apply:** Add providers through the explicit adapter registry, validate the exact requested scopes before storing, and map expired or failed authorization to visible reauthorization status.

OAuth access tokens should be refreshed server-side shortly before expiry; a rotated refresh token is retained when a provider omits it, and refresh failures use a generic reauthorization message.

**Why:** Providers commonly rotate refresh tokens and their error payloads can contain credential-adjacent details that must not cross the credential boundary.

**How to apply:** Keep refresh and credential replacement inside the connection-center path; connector code may request an access token but must never return, log, persist, or emit it.