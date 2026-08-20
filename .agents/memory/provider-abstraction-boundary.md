---
name: Provider Abstraction boundary
description: External adapters translate service-specific data into typed provider-neutral records and domain events before internal engines consume it.
---

Provider adapters are replaceable edges: category-specific interfaces and a persisted registry expose capabilities/status, while higher engines consume Standard records and service-agnostic events.

**Why:** Replacing Gmail, GitHub, Calendar, or Drive must not require changes throughout understanding, relationship, initiative, or intelligence engines.

**How to apply:** Keep provider names at the adapter/registry boundary, declare supported events, preserve read-only connector behavior, and validate adapter-neutral contracts in Self-Test.