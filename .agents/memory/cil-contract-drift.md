---
name: CIL contract drift
description: The live CIL API uses authenticated /api JSON routes and nests inventory counts under summary.
---

The verified live CIL contract is POST /api/query/lee, GET /api/capabilities/models, and GET /api/health on cognitive-infrastructure-layer.replit.app. Inventory totals are under summary; model records remain in models. The frontend fallback is /query/lee.

**Why:** The host serves both the frontend and authenticated API; using the frontend fallback or assuming top-level inventory totals produces HTML or false contract drift.

**How to apply:** Keep CIL degraded until authenticated JSON responses pass correlation, replay, and schema validation. Use /api/health for a structured health probe, and normalize inventory counts from summary without selecting a local model or bypassing signed routing.