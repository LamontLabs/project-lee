---
name: Model routing boundary
description: The durable separation between context selection, CIL, and model fallback.
---

Lee must construct a bounded context packet before CIL chooses a reasoning tier or model route. Strategic anchors are prioritized, CIL is called only through its signed service boundary, and CIL unavailability must produce an explicit degraded/held result rather than a locally selected model fallback.

**Why:** CIL owns cognitive reuse, escalation, and model selection; keeping that authority outside LEE prevents silent specialist duplication and makes degraded behavior auditable.

**How to apply:** Add future transports behind the router; do not let engines call provider SDKs directly, override a CIL route, or bypass the context budget. Retry failed T3 execution by consulting CIL again.