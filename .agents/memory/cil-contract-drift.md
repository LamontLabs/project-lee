---
name: CIL contract drift
description: The configured CIL host is not currently serving the enriched JSON API.
---

LEE’s enriched CIL contract is POST /query/lee with signed JSON, but the configured cognitive-infrastructure-layer.replit.app route currently returns frontend HTML or Cannot POST /api/query/lee rather than CILQueryResponse JSON.

**Why:** Treating the frontend deployment as the reasoning API would erase tier, provenance, confidence, cost, and fallback evidence.

**How to apply:** Keep CIL degraded until authenticated JSON responses pass correlation, replay, and schema validation; route failures to the managed frontier and record the fallback.