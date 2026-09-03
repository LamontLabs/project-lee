---
name: Brain snapshot integrity
description: The durable checksum rule for brain versions and restore verification.
---

Brain snapshot checksums must hash canonical JSON with recursively sorted object keys and timestamps normalized to ISO strings. Restore is verification-first and must not rewrite immutable event history.

**Why:** PostgreSQL JSONB can reorder keys and converts timestamps during round trips; raw JSON serialization creates false checksum failures.

**How to apply:** Preserve canonicalization whenever snapshot payloads gain new tables or fields, and keep restore preflight separate from any future state mutation.