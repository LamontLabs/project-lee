---
name: Provider Abstraction boundary
description: External adapters translate service-specific data into typed provider-neutral records and domain events before internal engines consume it.
---

Provider adapters are replaceable edges: category-specific interfaces and a persisted registry expose capabilities/status, while higher engines consume Standard records and service-agnostic events.

**Why:** Replacing Gmail, GitHub, Calendar, or Drive must not require changes throughout understanding, relationship, initiative, or intelligence engines.

**How to apply:** Keep provider names at the adapter/registry boundary, declare supported events, preserve read-only connector behavior, and validate adapter-neutral contracts in Self-Test.

Mailbox search criteria should cross the Ask Lee and EmailProvider boundary as typed sender, subject, date, unread, and free-text fields; provider query syntax belongs only in the adapter.

**Why:** Natural-language mailbox requests need to work independently of Gmail, while translating provider syntax upstream would couple intent and context engines to one service.

**How to apply:** Parse owner language once at intent classification, pass the structured filters through context retrieval, and let each adapter define date inclusivity, quoting, pagination, and label syntax.