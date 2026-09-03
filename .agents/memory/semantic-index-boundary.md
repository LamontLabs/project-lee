---
name: Semantic Index boundary
description: Local, eventual-consistency semantic discovery over canonical Lee records.
---

Semantic Index is a discovery layer, not a truth store: it keeps local model-versioned embeddings and excerpts while canonical facts, interpretations, objects, and events remain authoritative. Search returns similarity separately from structured confidence.

**Why:** Meaning-based discovery must improve recall without replacing auditable structured retrieval or transmitting private founder data externally.

**How to apply:** Index writes are low-priority and eventually consistent; rebuild after model/schema changes, preserve hashed search telemetry, and merge semantic results only for discovery-mode queries.