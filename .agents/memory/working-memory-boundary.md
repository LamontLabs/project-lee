---
name: Working Memory boundary
description: Persisted, bounded active-context projection and its relationship to canonical and durable memory.
---

Working Memory is a small persisted projection of the current conversation and attention state. It is refreshed from Context Economy selections, retains selected and excluded rationale with provenance, and may be rebuilt from canonical retrieval and Event Log evidence. It is never canonical truth and leaving it does not delete durable memory.

**Why:** API restarts must not erase active context, while bounded attention must remain explainable and safe to hand off; treating the projection as memory truth would make eviction destructive.

**How to apply:** Keep the projection one scope at a time, cap entries and text, reject expired candidates, expose category and scoring rationale to the owner, and give CIL only bounded asset references rather than provider bodies or projection text.