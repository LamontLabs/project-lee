---
name: Unified approval inbox boundary
description: Provider-neutral owner review envelopes and the shared CerbaSeal decision path across desktop and Android.
---

All consequential requests project into one provider-neutral approval envelope with action, target, affected system, reason, proposed change, evidence references, risk, expiry, CerbaSeal state, owner confirmation, outcome, and audit linkage. Project repair and provider/action requests retain their subsystem label inside the same queue.

**Why:** Separate approval surfaces create inconsistent review context and make it possible for one client to drift from the server’s fail-closed governance rules.

**How to apply:** Use the shared server review function from every client. Only a fresh, valid, unexpired CerbaSeal ALLOW can authorize approval; offline clients may read cached envelopes but must not decide, and stale, replayed, missing-evidence, unavailable, or malformed verdicts remain blocked.