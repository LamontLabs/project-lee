---
name: Connector write boundary
description: The durable safety rule for external provider adapters.
---

Connector adapters are read-only by default. They may normalize provider events and report health, but any external write must stop until a separate CerbaSeal authorization returns an explicit ALLOW decision.

**Why:** Provider credentials and external side effects must never become implicit capabilities of an engine or connector sync.

**How to apply:** Keep provider implementations behind the typed adapter interface and make write authorization an explicit input to any future write path.