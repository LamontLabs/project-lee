---
name: Historical belief state
description: Rules for preserving revisions, predictions, causal claims, and knowledge gaps as separate epistemic records.
---

Historical belief state is append-only at the conclusion level: a revision supersedes the prior row while retaining its prior belief link, prior interpretation link, evidence, contradiction state, confidence, provenance, and revision reason. Predictions, causal claims, and knowledge gaps are separate durable record types and must not be flattened into facts.

**Why:** LEE must be able to explain what it believed at an earlier time, what evidence changed it, and what remains unknown without silently converting model output into canonical fact.

**How to apply:** Route epistemic writes through provenance and Constitution checks, expose the records through Query Engine and backup/restore, and keep owner-facing labels explicit about belief, prediction, causal inference, and unknown status.