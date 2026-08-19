---
name: Polymorphic graph boundary
description: The durable node and edge contract for the Intelligence Graph.
---

Graph nodes identify knowledge objects by object type and UUID. Edges are validated typed, directed relationships with confidence and source provenance; endpoint registration is transactional and traversal is depth-bounded.

**Why:** The graph must connect facts, interpretations, projects, and future engine records without forcing every ledger into one relational table or creating migration coupling.

**How to apply:** Add new object types through graph references and preserve edge semantics, provenance, and bounded traversal for engine queries.