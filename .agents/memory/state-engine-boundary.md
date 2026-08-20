---
name: State Engine boundary
description: Lee has one validated primary operational state with auditable transitions and durations.
---

State Engine is the authoritative operational summary above queues and health: exactly one primary state is active, transitions follow a finite graph, invalid moves are rejected and logged, and history retains reasons, jobs, and durations.

**Why:** Users and orchestration need a single answer to what Lee is doing without reconstructing it from queue depth, health checks, and model activity.

**How to apply:** Read state before dispatch, transition significant work explicitly, expose current state and history on every relevant surface, and leave recovery/offline behavior to the dedicated recovery work.