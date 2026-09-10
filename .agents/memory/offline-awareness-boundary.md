---
name: Offline reality boundary
description: Rules for separating local continuity from current external provider reality during offline and degraded periods.
---

Provider freshness is an auditable projection, not a replacement for canonical local records. Persist refresh attempts, successful evidence, failure periods, limitations, and reconnection evidence separately so restart and recovery do not erase the offline interval.

**Why:** Local Brain, Event Log, indexes, diagnostics, and approved local cognition can remain useful while external providers are stale or unavailable. Treating synchronized local data as current external truth would silently invent provider state and could bypass freshness or governance gates.

**How to apply:** Label external claims current, stale, unavailable, or unverified at provider and answer-contract boundaries. Read-only awareness must not create missing state. Reconnection may close a persisted period only after a successful provider refresh, preserving local observations and the refresh evidence.