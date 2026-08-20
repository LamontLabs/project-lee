---
name: Internal route boundary
description: The API boundary that keeps engine and capability-service routes private.
---

Internal capability routes must not be mounted through the public API router. Mount them separately behind registered service identity authentication, while retaining per-engine contract authorization and generic error responses.

**Why:** Public aliases made internal engine and capability-service contracts reachable without proving service identity; internal responses could also accidentally expose downstream error details.

**How to apply:** Keep Console, Android, and health routes on the public mount. Require `x-engine-id` for internal mounts, enforce `INTERNAL_API_TOKEN` when configured, and never return raw downstream errors or credentials.