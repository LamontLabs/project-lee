---
name: Decision impact graph
description: The separate causal graph used to record retrospective decision consequences.
---

Decision Impact nodes and edges are distinct from Intelligence Graph relationships. Approved directional causal edges drive weighted downstream impact scores; engine-proposed edges remain needs-review until evidence or owner approval.

**Why:** Related objects do not prove consequence. Keeping causal edges separate preserves the difference between connection and observed operational impact.

**How to apply:** Use the impact graph APIs and score recalculation for retrospective consequences; do not infer causal edges merely because two objects are related.