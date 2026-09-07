---
name: Welcome-back briefing boundary
description: Safety rules for owner-facing continuity summaries across sessions
---

The welcome-back briefing is a source-backed projection, not a generated narrative. It uses a dedicated owner session cursor; a missing cursor establishes an explicit baseline rather than exposing all historical changes.

**Why:** A continuity summary must not convert an unknown session boundary, unavailable CIL, recovery protection, or missing evidence into confident owner-facing prose.

**How to apply:** Advance the cursor only after a valid read assembles its evidence sections. Keep unavailable, recovery-protected, and baseline-required states explicit, with evidence references, freshness, and contradiction labels on every material section.