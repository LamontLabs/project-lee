---
name: Resource Engine boundary
description: Live capacity state gates orchestration dispatch across compute, budgets, quotas, network, disk, and battery.
---

Resource Engine is a pre-dispatch constraint layer: it samples local capacity, records snapshots and alerts, and defers work by priority when state is constrained or critical. It does not replace Cost or Policy ledgers.

**Why:** Orchestration needs a current operational picture so heavy or non-urgent work does not compound resource pressure.

**How to apply:** Keep dimension state and overall state auditable, use configurable Resource Policy thresholds, log every deferral, and let future allocation work build on requirements and snapshots rather than bypassing the gate.