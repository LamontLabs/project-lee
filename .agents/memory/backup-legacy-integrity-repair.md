---
name: Backup legacy integrity repair
description: How portable backups handle older canonical rows and omitted provenance targets.
---

Portable backup collection must include every canonical table referenced by provenance and must append auditable reconciliation events for legacy universal objects and external evidence references before snapshotting the payload. Verification must fail for unresolved legacy references.

**Why:** A checksum-valid backup is not sufficient if provenance targets are omitted or canonical objects cannot be rebuilt from the immutable Event Log; silently downgrading those checks would hide a restore-integrity failure.

**How to apply:** When adding a provenance-bearing ledger or canonical object type, update the backup table set and provide an explicit append-only lineage repair path with regression coverage for replay and isolated restore. Migrate external references to durable Event Log IDs while preserving the original value in the migration event payload.

Append-only repair events can be appended after a legacy update even though they semantically establish the object first. The projector must recognize the explicit legacy-repair create marker as the predecessor during reset/rebuild, and rebuild results must report the last event for that projection rather than an unrelated global-log event.

**Why:** Repair cannot rewrite the original event sequence, so a literal chronological replay would otherwise report a false missing-object conflict and leave the checkpoint/result cursors inconsistent.

**How to apply:** Keep the exception scoped to marked repair creates; ordinary update-only histories remain conflicts. Scope projection cursors and returned last-event IDs to events handled by that projection.

Portable restore verification must hydrate the snapshot into real PostgreSQL tables cloned from the migrated schema, then exercise the Event Log append-only trigger in that isolated scope; JSON row staging alone is not a restore test.

**Why:** Checksums and replay assertions can pass while a fresh installation still fails on column types, constraints, or trigger protection.

**How to apply:** Keep the isolated schema transactional and disposable, report per-table counts and original SQL errors, and permit replacement import only when every canonical table in the target installation is empty.