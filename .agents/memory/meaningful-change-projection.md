---
name: Meaningful change projection
description: Operational history is a durable, replay-safe projection of immutable events and normalized provider records.
---

Meaningful changes belong in their own additive projection with before/after state, significance, evidence, confidence, freshness, and causal references. Routine connector transport events may be retained as source data but must not flood owner-facing history.

**Why:** The Event Log must remain authoritative and immutable, while Today, Timeline, and scoped “since last open” views need stable records that can be replayed, ranked, and read without rebuilding interpretation from raw provider payloads.

**How to apply:** Project through deterministic fingerprints, keep provider credentials and raw payloads out of the projection, use persisted projector and owner-read cursors separately, and never bypass recovery-mode write protection for cursor updates.