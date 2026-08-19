---
name: Foundation event immutability
description: The durable rule used to protect Lee's event history.
---

The event history must remain append-only at the database boundary. The application may add events, but updates and deletes are rejected by PostgreSQL so a future engine cannot accidentally rewrite system history.

**Why:** Application-level discipline is insufficient when multiple engines and maintenance jobs will share the database.

**How to apply:** Preserve and re-install the trigger as part of the development schema push whenever the event-log table is recreated or changed.