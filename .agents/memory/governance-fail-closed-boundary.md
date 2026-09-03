---
name: Governance fail-closed boundary
description: The durable authorization rule for consequential actions.
---

Every consequential action must submit a uniquely identified, HMAC-signed governed request. Only an explicit CerbaSeal `ALLOW` can release execution; unavailable services, HOLD, REJECT, malformed responses, and replayed request IDs remain blocked.

**Why:** Governance is the authorization boundary, not an advisory signal. A fallback path would allow external writes to bypass policy.

**How to apply:** Keep CerbaSeal credentials in environment secrets, persist every decision and hold reason, and generate a new request ID for every retry or resubmission.