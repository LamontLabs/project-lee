---
name: Consequential execution boundary
description: The single gate for provider and connector mutations.
---

Every consequential provider mutation must call the shared execution boundary. It runs request/intent and Constitution checks, records local Governance, requires owner and human confirmation, then accepts only a unique, unexpired CerbaSeal ALLOW immediately before the writer callback.

**Why:** A provider adapter can hold credentials and a valid API request without being authorized to create an external side effect; fail-closed governance must be enforced at the last common boundary.

**How to apply:** Add future provider mutations through the provider write wrapper only. Never invoke a provider writer directly, and preserve explicit HOLD/REJECT/unavailable/malformed/expired/replayed reasons in audit records.