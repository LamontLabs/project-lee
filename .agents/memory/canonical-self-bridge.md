---
name: Canonical self bridge
description: How Project LEE identifies and inspects its own workspace without weakening remote bridge authentication.
---

Project LEE always exposes a default local canonical registration at OBSERVE capability so Bootstrap Awareness can select and inspect the current workspace even when no external MCP project credential is configured. The local bridge aggregates repository identity, dependency manifests, contract comparison, project-local log paths, and deployment metadata; build health remains unverified until delivery evidence says otherwise. External project registrations continue to require their named server-side credential and remote bridge authentication.

**Why:** A missing optional remote registration should not make LEE describe itself as an unknown repository, but using an unrelated session or database secret as a bridge credential would collapse security boundaries.

**How to apply:** Keep the local registration read-only and exclude it from persisted external-project configuration. Prefer an explicitly configured external Project LEE registration when one exists; otherwise select the local fallback and surface partial/unverified metadata instead of optimistic health.