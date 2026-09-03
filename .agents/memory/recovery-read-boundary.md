---
name: Recovery read boundary
description: Read-only service access that remains available while writes are locked
---

Recovery and safe modes must block state-changing operations while preserving read-only canonical retrieval, including POST-shaped query endpoints whose semantics are reads.

**Why:** Recovery diagnostics, Ask LEE context assembly, and architecture checks need to inspect the verified Brain before repair is complete; locking every POST makes the protected mode less observable.

**How to apply:** Exempt only explicitly read-only routes from the recovery write guard. Keep cache invalidation, provider mutations, and all other writes protected.