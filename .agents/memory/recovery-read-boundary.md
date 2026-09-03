---
name: Recovery read boundary
description: Read-only service access that remains available while writes are locked
---

Recovery and safe modes must block state-changing operations while preserving read-only canonical retrieval, including POST-shaped query endpoints whose semantics are reads.

Low-priority consolidation and scheduled maintenance must also defer when recovery proof is failing or resources are critical; they must not bypass the HTTP write guard through an internal service call.

**Why:** Recovery diagnostics, Ask LEE context assembly, and architecture checks need to inspect the verified Brain before repair is complete; locking every POST makes the protected mode less observable. Background maintenance is still a write and can make an invalid history harder to repair.

**How to apply:** Exempt only explicitly read-only routes from the recovery write guard. Keep cache invalidation, provider mutations, consolidation, and all other writes protected. Schedule deferred work for a later retry instead of marking it complete as if it ran.