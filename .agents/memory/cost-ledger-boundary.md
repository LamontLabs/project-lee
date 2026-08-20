---
name: Cost ledger boundary
description: The durable usage accounting contract for model calls.
---

Every reasoning resolution produces a queryable cost record containing engine, provider, tier, model, prompt tokens, completion tokens, total tokens, and estimated USD cost. Cost creation is atomic with the routing events.

**Why:** System Economics will need to extend usage accounting without losing the per-request evidence that explains spend.

**How to apply:** Add new providers and economic dimensions as additive fields or related tables; keep the per-request record and `CostRecordCreated` event intact.

System Economics must expose a status-bearing metric contract: measured ledger values, documented estimates, and unavailable dimensions are never interchangeable.

**Why:** Event-count multipliers and null values previously looked like real measurements, which made reconciliation and operator decisions unsafe.

**How to apply:** Every metric needs a unit, source, observation timestamp, provenance references, and reconciliation evidence; counterfactual CIL savings remain estimated unless a live pricing ledger proves them.