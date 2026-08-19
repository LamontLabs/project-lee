---
name: Persisted scheduler boundary
description: The durable contract for orchestration jobs and engine execution.
---

Scheduler state belongs in the database: jobs carry run times, dependencies, attempts, recurrence metadata, and failure details. Execution must emit explicit scheduled, completed, or failed events; an unknown handler is a visible failure, never a silent no-op.

**Why:** In-memory timers disappear on restart and make engine work impossible to audit or recover.

**How to apply:** Register future engine handlers behind the scheduler and keep direct background execution out of engine code.