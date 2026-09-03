---
name: Event sequence allocation
description: Event stream sequence numbers are allocated atomically at both the application and database boundaries.
---

Sequence allocation must be serialized per aggregate while the insert is in the same transaction; the database trigger is the final protection because some legitimate writers insert Event Log rows directly.

**Why:** Read-latest-then-insert races previously created duplicate and regressed sequence values, forcing the canonical Brain into recovery mode.

**How to apply:** Keep the advisory transaction lock and insert allocator installed whenever Event Log writers or restore/import paths change; never repair old rows by updating or deleting them.