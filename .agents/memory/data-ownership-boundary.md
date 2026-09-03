---
name: Data Ownership boundary
description: Knowledge records carry creator, modifier, verifier, import, generation, and current-owner provenance.
---

Ownership is provenance, not permission: records identify who created, changed, verified, imported, or generated them, while explicit owner verification emits an auditable event and trust signal.

**Why:** Source provenance alone cannot distinguish a stale connector import from owner-confirmed or model-generated knowledge.

**How to apply:** Preserve ownership fields through creation, updates, backup/projection, and context display; keep verification optional and informational, never a blocking access rule.