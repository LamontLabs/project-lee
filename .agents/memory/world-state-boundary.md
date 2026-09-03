---
name: World State boundary
description: Lee maintains a curated external-context ledger with universal time signals and explicitly configured monitoring topics.
---

World State is scoped context, not general search: universal time/calendar/market signals are refreshed automatically, while news, regulatory, competitor, and software topics exist only after explicit owner configuration.

**Why:** Recommendations need reliable time and operational context without silently expanding Lee’s external surveillance scope.

**How to apply:** Persist current values, source, confidence, staleness, and history; emit WorldStateUpdated only on value changes; keep refreshes low-priority and quota-aware.