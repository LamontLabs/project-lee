---
name: Explanation Engine boundary
description: Audience-calibrated explanations stored with the interpretation ledger and source lineage.
---

Explanations are interpretations, not new facts: they retain audience/type metadata, source object IDs, a structured brief, confidence, Why Chain, and provenance, and are reusable only while their source context remains valid.

**Why:** Translating internal state for different audiences must not create a second truth ledger or hide which source-backed records shaped the explanation.

**How to apply:** Keep audience adaptation in the Explanation Engine, preserve source links and feedback, and invalidate cached explanations when their source records change.