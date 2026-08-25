---
name: Backup legacy integrity repair
description: How portable backups handle older canonical rows and omitted provenance targets.
---

Portable backup collection must include every canonical table referenced by provenance and must append auditable reconciliation events for legacy universal objects and external evidence references before snapshotting the payload. Verification must fail for unresolved legacy references.

**Why:** A checksum-valid backup is not sufficient if provenance targets are omitted or canonical objects cannot be rebuilt from the immutable Event Log; silently downgrading those checks would hide a restore-integrity failure.

**How to apply:** When adding a provenance-bearing ledger or canonical object type, update the backup table set and provide an explicit append-only lineage repair path with regression coverage for replay and isolated restore. Migrate external references to durable Event Log IDs while preserving the original value in the migration event payload.