---
name: Connection health projection
description: The shared owner-facing contract for provider-neutral connection status across desktop and Android.
---

Connection health must describe authority separately from connectivity and must tell the owner what failed, what remains available, what is blocked, whether recovery is automatic, and whether owner action is required. Desktop may opt into redacted Advanced diagnostics; paired Android receives the normal projection without endpoints, scopes, or configuration.

**Why:** Optional provider outages must not look like canonical Brain failures, and connectivity alone must never imply permission to operate or govern a provider.

**How to apply:** Extend the normalized projection when adding providers or client surfaces. Keep credentials and secret-like legacy configuration server-side, and preserve the same warning vocabulary in Today, Systems, setup, and Android.