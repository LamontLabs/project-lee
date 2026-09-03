---
name: Historical Event Log recovery
description: Historical sequence anomalies must be preserved and explicitly reviewed rather than silently rewritten.
---

When old Event Log sequence anomalies are discovered, preserve the original rows and keep Recovery Mode fail-closed until an owner-approved, evidence-backed reconciliation exists; never reset or rewrite canonical history as an automatic repair.

**Why:** The Event Log is the authoritative immutable history, and changing old rows would destroy provenance while making a clean startup proof appear to pass.

**How to apply:** Fix the allocator for future writes, expose the exact anomaly evidence, and require an explicit recovery decision before any development-data reset or separate reconciliation workflow.