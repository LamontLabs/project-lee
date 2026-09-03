---
name: Intent Engine boundary
description: Every Lee request gets one persisted, confidence-scored intent that downstream retrieval and routing can reuse.
---

Intent is the shared pipeline input, not a UI-only label: each turn stores type, entities, urgency, model complexity, retrieval mode, audience, confidence, source, and corrections, and conversation messages retain its ID.

**Why:** Independent interpretation in Ask Lee, retrieval, and routing compounds classification errors and makes outcomes hard to explain.

**How to apply:** Classify once per request, pass the record downstream, use semantic retrieval for exploratory intent, and route corrections to Learning rather than silently overwriting history. For email-search intents, retain only the normalized provider-neutral criteria as history metadata; never persist mailbox bodies, snippets, or provider credentials.