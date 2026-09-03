---
name: Development fixture cleanup
description: How to keep a new LEE development workspace free of historical fixture activity.
---

When resetting a never-used development workspace, remove seeded canonical content together with its derived analysis projections and invalidate the query cache. Clear generated governance requests, audit entries, and consultation trails too when they were produced by idle context evaluation. Keep operational configuration and live system-health records unless the owner explicitly asks for a full system reset.

**Why:** Canonical records can be deleted while cached query results, risk projections, momentum, and context snapshots continue to display old project IDs and fabricated activity.

**How to apply:** After fixture cleanup, clear derived user-facing projections and query caches, restart the API when in-memory state may be involved, and verify the Console’s empty states through the live API and preview.