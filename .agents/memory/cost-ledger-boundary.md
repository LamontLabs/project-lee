---
name: Cost ledger boundary
description: The durable usage accounting contract for model calls.
---

Every reasoning resolution produces a queryable cost record containing engine, provider, tier, model, prompt tokens, completion tokens, total tokens, and estimated USD cost. Cost creation is atomic with the routing events.

**Why:** System Economics will need to extend usage accounting without losing the per-request evidence that explains spend.

**How to apply:** Add new providers and economic dimensions as additive fields or related tables; keep the per-request record and `CostRecordCreated` event intact.