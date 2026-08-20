---
name: Executive Loop boundary
description: The Executive Loop is a persisted phase heartbeat wrapped around Operational Intelligence, not a replacement scheduler.
---

The loop owns phase progression, maximum durations, cycle metrics, and critical-event re-entry across Observe, Understand, Prioritize, Decide, Prepare, Wait, and Review; Operational Intelligence remains the synthesis substrate.

**Why:** Continuous reassessment needs durable lifecycle state and visible transitions without duplicating orchestration or intelligence responsibilities.

**How to apply:** Persist the current phase before transitions, emit phase/interrupt events, resume from the stored phase after restart, and force critical interruptions back through Observe.