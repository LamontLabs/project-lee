---
name: Event sequence migration
description: Constraint for introducing per-aggregate event sequence numbers into an existing event log
---

Per-aggregate event sequence numbers must be backfilled before adding a database uniqueness constraint; legacy rows can share the original default value.

**Why:** Existing Event Log rows predated sequence numbering and were safely preserved, but a direct unique-index migration failed on duplicate defaults.

**How to apply:** Use the event emitter for new writes immediately, then run an ordered aggregate backfill before enforcing uniqueness at the database layer.

Startup continuity proofs must treat an all-default sequence-one prefix as historical evidence, not silently rewrite it; once an aggregate enters numbered sequencing, later gaps remain recovery failures.

**Why:** Existing installations contain immutable legacy rows alongside newer numbered events, so strict replay would quarantine valid historical data while ignoring a real post-migration gap would weaken recovery safety.

**How to apply:** Report the legacy aggregate count as evidence, validate numbered continuity and causation references within a bounded scan, and route actual gaps to owner-reviewed recovery.