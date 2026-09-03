---
name: Resource pricing boundary
description: How storage, backup, embedding, and network economics become measured spend
---

Measured resource usage and provider price evidence are separate append-only ledgers. Spend is measured only when every usage record in the period has a matching provider and unit price effective no later than the observation time; partial or missing pricing remains UNAVAILABLE.

**Why:** Synthetic multipliers would turn an operational estimate into a financial fact and hide gaps in provider billing coverage.

**How to apply:** Record usage at the operation boundary and publish dated provider prices separately. Reconciliation may aggregate backup and embedding usage into storage spend, but must preserve both usage and price IDs in provenance.

Pricing reconciliation should have deterministic tests over isolated usage and price fixtures, while a separate integration check covers the persisted cycle summary.

**Why:** The live usage ledger can contain unrelated provider records that legitimately make a category unavailable, which is useful for integration coverage but unreliable for proving one matching-price rule.

**How to apply:** Test missing evidence, effective-at-or-before matching, and out-of-order price records through the shared reconciler; reserve database-backed cycle tests for status-contract and reconciliation assertions.

Economics writes must resolve their submitted source reference to either an available registered provider contract or an existing internal evidence record before insertion. Keep the submitted reference and the canonical resolved evidence identity separately so reconciliation can show both.

**Why:** A well-formed source string is not evidence by itself; unresolved provenance can make unsupported provider claims look like measured spend.

**How to apply:** Enforce resolution at every HTTP usage and price write, store the canonical identity on the ledger row, and include that identity in measured and unavailable reconciliation provenance.