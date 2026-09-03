---
name: Executive Loop boundary
description: The Executive Loop is a persisted phase heartbeat wrapped around Operational Intelligence, not a replacement scheduler.
---

The loop owns phase progression, maximum durations, cycle metrics, and critical-event re-entry across Observe, Understand, Prioritize, Decide, Prepare, Wait, and Review; Operational Intelligence remains the synthesis substrate.

**Why:** Continuous reassessment needs durable lifecycle state and visible transitions without duplicating orchestration or intelligence responsibilities.

**How to apply:** Persist the current phase before transitions, emit phase/interrupt events, resume from the stored phase after restart, and force critical interruptions back through Observe.

Owner review feedback must be recorded as both an Executive Loop event and an Operational Memory behavioral signal, linked by the event ID.

**Why:** A loop that only advances phases can resume, but it cannot demonstrate learning or preserve the evidence behind owner feedback.

**How to apply:** Keep review feedback explicit and auditable; do not infer feedback from phase transitions or create a new phase for it.