---
name: Model routing boundary
description: The durable separation between context selection, CIL, and model fallback.
---

Lee must construct a bounded context packet before choosing a reasoning tier. Strategic anchors are prioritized, CIL is called only through its signed service boundary when configured, and the managed model provider is the graceful fallback when CIL is unavailable.

**Why:** Keeping context selection and provider routing separate makes cost, provenance, and degraded-service behavior observable and replaceable.

**How to apply:** Add future model providers behind the router; do not let engines call provider SDKs directly or bypass the context budget.