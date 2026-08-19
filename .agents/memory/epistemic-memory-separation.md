---
name: Epistemic memory separation
description: The durable memory architecture rule for facts, interpretations, retrieval, and conflicts.
---

Facts and interpretations remain separate source-backed record types. Shared tags, project/entity references, and conflict records belong in related index tables rather than flattening epistemic distinctions into one memory object.

**Why:** Retrieval needs a common surface, but conclusions must not silently gain the evidentiary status of observations.

**How to apply:** Index knowledge objects by type and ID, search through the shared index, and surface contradictions as open conflict records with provenance intact.