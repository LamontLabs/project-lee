---
name: Relationship provider boundary
description: The durable data boundary for people, roles, interactions, and relationship health.
---

People and relationship state are provider-neutral. Connector adapters contribute normalized interactions with source provenance; health and recommended cadence are computed from interaction timing and organizational roles.

**Why:** Gmail, GitHub, calendar, and future providers express communication differently, but relationship intelligence needs one stable model.

**How to apply:** Record normalized connector event references on interactions, preserve person role/project metadata, and keep provider payloads in connector storage.