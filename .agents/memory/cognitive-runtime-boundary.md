---
name: Cognitive Runtime boundary
description: The persisted coordination layer for LEE's thirteen cognitive models, including continuity, partial refresh, and owner-safe summaries.
---

The Cognitive Runtime coordinates the existing World, Owner, Lab, Project, Relationship, Temporal, Self, Uncertainty, Goal, Authority, Attention, Experience, and Memory engines without replacing their canonical ledgers or local authority. Each cycle persists model states, evidence windows, freshness, degraded causes, configuration fingerprint, prior-cycle linkage, and a bounded owner summary.

**Why:** Model availability and freshness vary independently, and a single failed provider must not erase a trustworthy partial operational picture or silently weaken governance.

**How to apply:** Keep refreshes all-settled and explicit about stale/degraded/unavailable models. Preserve cycle continuity across restarts and config changes. Attention may rank surfacing only; CIL routing, owner confirmation, CerbaSeal governance, recovery protections, and consequential permissions remain outside the runtime.