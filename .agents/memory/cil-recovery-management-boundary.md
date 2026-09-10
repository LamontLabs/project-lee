---
name: CIL recovery management boundary
description: The durable authority and fail-closed rules for repairing the CIL project when normal reasoning is unavailable.
---

CIL recovery is a management plane, not a read-only awareness surface. When CIL is degraded or unavailable, normal LEE reasoning remains blocked and external-model fallback remains disabled. LEE may inspect, validate, preview, restart, and self-apply routine CIL project changes at MANAGE after fresh evidence; authentication, secrets, routing/model authority, trust contracts, governance, dependencies, deployment, and database changes require GOVERNED_MANAGE with the existing CerbaSeal and owner-confirmation path.

**Why:** LEE must be able to restore its reasoning dependency without bypassing the project bridge, while a recovery outage must not become an unreviewed route to alter authority-bearing or production behavior.

**How to apply:** Keep CIL recovery actions under the explicit recovery namespace, emit durable entry/clear and repair events, require a bounded recovery probe to reopen normal CIL queries, and verify the project contract, CIL health, model inventory, and signed LEE query path before declaring recovery complete.