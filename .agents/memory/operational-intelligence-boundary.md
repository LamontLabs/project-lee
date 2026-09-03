---
name: Operational Intelligence boundary
description: Operational Intelligence continuously ranks what deserves attention from current initiatives, memory, world state, and canonical records.
---

Operational Intelligence is a synthesis layer, not another ledger of facts: it persists auditable context snapshots, scores current signals, and exposes focus/history without taking action.

**Why:** Lee needs one coherent answer to “what deserves attention right now?” while preserving the underlying engines and their separate evidence boundaries.

**How to apply:** Refresh on demand and on a bounded cadence, weight recency/significance/current operating context, keep empty focus explicit, and emit OperationalContextUpdated for downstream consumers.

Reactive refresh must invalidate Query Engine cache entries before rebuilding, and bounded source reads must order time-bearing records before applying limits so newly changed evidence cannot be omitted.

**Why:** A fresh initiative can otherwise be hidden behind a stale cached result or an unordered pre-limit slice, making reactive recalculation appear to succeed while preserving the old priority.

**How to apply:** Use the shared cache invalidation path for OIE refreshes and prefer generated/updated/occurred timestamps when selecting bounded canonical query records.

Owner-facing command-center and readiness surfaces should compose these persisted signals and live layer checks, never static “healthy” claims; optional degradation must remain separate from Core failure.

**Why:** The operator experience must tell the truth about what LEE can currently know or do without making an unavailable optional provider look like a Brain outage.

**How to apply:** Keep Today focused on ranked, evidence-backed attention items and keep Systems layered across Core, Intelligence, Governance, Connections, Project Operations, and Desktop.