---
name: System Manifest boundary
description: The manifest is a live, read-only description of Lee’s software, brain, policy, capability, connector, storage, and health state.
---

System Manifest assembles current system facts on demand, emits ManifestGenerated, and offers JSON/Markdown exports plus optional persisted snapshots; it describes state but does not prescribe remediation.

**Why:** Debugging, migration, and trusted handoff need one authoritative system description instead of six separate settings surfaces.

**How to apply:** Query canonical registries/ledgers in parallel, keep generated timestamps/version at the root, mask owner-sensitive values, and preserve snapshot history separately from live generation.