---
name: Knowledge Aging boundary
description: Freshness is an independent, configurable temporal dimension that gates retrieval without deleting knowledge.
---

Knowledge Aging computes Fresh, Current, Old, Historical, Stale, or Expired from per-type windows and the latest verification clock; Stale creates curiosity work, while Expired remains stored but cannot enter context.

**Why:** Confidence and memory tier describe certainty and usage, not whether the underlying reality is still current.

**How to apply:** Keep age state separate from confidence/tier, reset it on explicit verification, emit transitions, and make retrieval enforce Expired exclusion plus Stale penalty.