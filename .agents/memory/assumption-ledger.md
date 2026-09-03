---
name: Assumption ledger
description: Rules for naming, reusing, and invalidating premises behind Lee conclusions.
---

Assumptions are explicit, typed records reused by statement while active, and linked to every conclusion that depends on them. Validation raises confidence; invalidation creates a high-priority review notification.

**Why:** Conclusions can remain syntactically valid after a premise becomes false, so dependency links and lifecycle state must make stale reasoning visible.

**How to apply:** Engines should create or reference assumptions before writing simulations, recommendations, or strategy outputs, and context should include active assumptions alongside facts and interpretations.