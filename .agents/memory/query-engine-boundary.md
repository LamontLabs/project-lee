---
name: Query Engine boundary
description: Shared retrieval policy, ranking, caching, and telemetry beneath Lee engines.
---

Lee retrieval should pass through Query Engine: it validates the spec, checks Constitution access, ranks with shared freshness/importance/confidence/relevance factors, caches by normalized spec, and emits telemetry.

**Why:** Independent engine reads create inconsistent ranking, stale caches, and duplicated authorization logic.

**How to apply:** Add new source adapters to the standardized result format and invalidate shared cache entries when relevant source records change; keep write operations outside Query Engine.