---
name: CIL cost benchmark
description: Reproducible CIL savings evidence is persisted inside System Economics.
---

CIL savings must be measured against a fixed, hashed corpus and a same-request no-reuse frontier baseline; accepted reuse may avoid frontier calls, but stale, drifted, or contradictory evidence retains frontier dependence.

**Why:** A reuse-rate-only metric can make savings look better by hiding correctness and freshness failures.

**How to apply:** Keep corpus methodology, case evidence, cost, latency, rejection, dependency, and override metrics together in the System Economics cycle summary without tuning routing thresholds for optics.