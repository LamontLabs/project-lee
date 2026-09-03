---
name: Recovery Modes boundary
description: Boot mode selection persists clean shutdowns, recovery agendas, boot history, and write restrictions.
---

Recovery mode is distinct from operational State: startup selects among Cold Boot, Warm Restart, Safe, Recovery, Migration, and Read Only using explicit intent and persisted integrity markers, then records the boot and its engine outcomes.

**Why:** A restart after a clean deploy should not behave like a crash recovery, while forensic and repair sessions must prevent normal writes.

**How to apply:** Select mode before orchestration starts, emit boot events, keep recovery agenda/boot history queryable, and enforce Read Only at the API middleware boundary.