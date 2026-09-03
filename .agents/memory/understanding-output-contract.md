---
name: Understanding output contract
description: The durable separation required for Lee's ingestion pipeline.
---

Every understanding run must preserve the source reference and keep observed facts separate from inferred interpretations. Each emitted record receives provenance and confidence, and the run ends with an append-only completion event.

**Why:** Later model-based extraction can improve recall and entity resolution, but it must not erase the epistemic boundary that makes Lee's knowledge trustworthy.

**How to apply:** Treat the current run response and ledger writes as the stable contract when adding connectors, model routing, or richer extraction.