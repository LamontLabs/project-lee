---
name: Delivery evidence boundary
description: How Bootstrap Awareness decides whether build, test, deployment, and desktop-release signals are trustworthy.
---

Bootstrap Awareness must not treat environment labels, a commit SHA, a deployment ID, or a running local process as proof of delivery health. Build and test status may come from the connected repository's authoritative GitHub Actions runs; desktop-release status requires the hosted Windows validation job, not merely a successful package job. Deployment status requires fresh, signed evidence from the deployment producer. Missing, unreadable, or stale signals remain unverified.

**Why:** A successful local check or an existing deployment identifier can outlive the artifact, runner, or deployment state it was meant to describe. Optimistic projections would make K6 readiness appear healthier than its evidence.

**How to apply:** Keep signal freshness explicit, include source/observed-time references in every item, cache live provider reads with a bounded timeout, and use the HMAC delivery-evidence ingress for external deployment results. Do not write delivery events while merely reading awareness.