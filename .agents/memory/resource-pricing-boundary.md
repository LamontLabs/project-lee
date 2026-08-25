---
name: Resource pricing boundary
description: How storage, backup, embedding, and network economics become measured spend
---

Measured resource usage and provider price evidence are separate append-only ledgers. Spend is measured only when every usage record in the period has a matching provider and unit price effective no later than the observation time; partial or missing pricing remains UNAVAILABLE.

**Why:** Synthetic multipliers would turn an operational estimate into a financial fact and hide gaps in provider billing coverage.

**How to apply:** Record usage at the operation boundary and publish dated provider prices separately. Reconciliation may aggregate backup and embedding usage into storage spend, but must preserve both usage and price IDs in provenance.