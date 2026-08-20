---
name: CerbaSeal contract drift
description: The deployed CerbaSeal frontend and enforcement-gate API are different surfaces.
---

CerbaSeal-Core’s deployment starter exposes POST /evaluate and GET /health with GateRequest/GateResult; the public cerbaseal.replit.app surface is a Client Success Center frontend and does not provide those JSON routes.

**Why:** Pointing LEE at the frontend produces HTML/404 responses and cannot establish ServiceRegistry health; the API origin must be deployed and reachable separately.

**How to apply:** Keep explicit endpoint configuration and GateResult normalization in LEE, but do not mark CerbaSeal healthy until authenticated JSON health, policy, and evaluate probes succeed.