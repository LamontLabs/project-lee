---
name: Ask LEE evidence contract
description: The presentation boundary for concise answers, source labels, privacy redaction, and CIL route provenance.
---

Ask LEE uses a compact conclusion with expandable evidence details. Source-backed facts, Lee interpretations, assumptions, contradictions, freshness, confidence, domain relevance, Why Chain, and provenance remain separately labeled.

**Why:** Founder-facing answers need to be useful at a glance without turning provider bodies, credentials, or connector payloads into ordinary UI content, while routing authority must remain auditable.

**How to apply:** Keep the model's bounded server-side context separate from the public response projection. Treat CIL as the sole route authority; expose its resolution and selected provider/model/route ID as provenance, never as a local model-selection control.