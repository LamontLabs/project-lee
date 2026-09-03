---
name: Capability Registry boundary
description: Engine discovery uses persisted versioned registrations and typed internal contracts instead of implicit cross-engine assumptions.
---

The registry is the source for engine identity, capabilities, dependencies, contracts, ownership, health, and heartbeats; internal calls authenticate a registered engine and validate v1 request/response shapes before dispatch.

**Why:** Hardcoded engine references silently break when an engine changes, while a persisted registry makes availability and compatibility observable.

**How to apply:** Register engines at startup, heartbeat them through the registry, resolve orchestration actions by healthy capability, and reserve lifecycle, self-test, manifest, and CIL extensions for their dedicated tasks.