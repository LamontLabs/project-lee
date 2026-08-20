---
name: Engine Lifecycle boundary
description: Capability Registry owns engine lifecycle state, dependency declarations, degraded capabilities, and recovery policy.
---

Engine startup and recovery are coordinated through persisted registry metadata: lifecycle state, required/optional dependencies, degraded capabilities, and one explicit recovery policy; orchestration validates dependencies before routing work.

**Why:** Engines that cannot declare readiness or failure behavior force orchestration to discover outages at call time and risk silent partial operation.

**How to apply:** Register lifecycle metadata with every capability, validate in dependency-layer order, publish degraded capabilities, and log recovery attempts/outcomes through the Event Log.