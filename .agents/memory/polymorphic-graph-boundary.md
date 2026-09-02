---
name: Polymorphic graph boundary
description: The durable node and edge contract for the Intelligence Graph.
---

Graph nodes identify knowledge objects by object type and UUID. Edges are validated typed, directed relationships with confidence and source provenance; inferred links remain reviewable candidates until explicit owner promotion.

**Why:** The graph must connect facts, interpretations, projects, and future engine records without forcing every ledger into one relational table or creating migration coupling.

**How to apply:** Add new object types through graph references, preserve edge semantics/provenance, keep candidate evidence and contradiction states visible, and use bounded bidirectional traversal for reconstruction.