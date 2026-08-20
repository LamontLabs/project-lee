# Hostile Architecture Validation Report

**Run date:** 2026-08-20  
**Scope:** Controlled runtime and isolated hostile validation, followed by the focused repairs assigned from the findings. The original report below is retained as the baseline; the repair status is recorded here.

## Executive result

- **P0:** 0 confirmed
- **P1:** 0 remaining (2 repaired)
- **P2:** 1 remaining
- **P3:** 0 confirmed
- **Automated hostile suites:** 43 passing tests, 1 failing test
- **Manual hostile probes:** 2 unsafe error contracts found, 2 expected rejection paths passed

The baseline run reproduced two P1s and one P2. After repair, the full hostile suite is clean: all 18 package scripts exited 0, with 46 tests passing and no P0/P1 failures. The recovery agenda response remains a separate P2 and was intentionally not expanded in this task.

## Repair status

- **HV-001 backup provenance/replay:** repaired. Portable backups now include `experienceRecord`, and backup collection appends auditable `UniversalObjectCreated` repair events for legacy canonical objects that have no creation event. Checksum, append-only, isolated restore, replay, and production-write-boundary checks remain enforced.
- **HV-002 invalid Time Machine reference:** repaired. Empty or unresolved references return HTTP 400; valid dates and known semantic references continue to work. The semantic matcher now ignores absent/empty event fields.
- **HV-003 recovery agenda resolution:** remains P2 and is reported below without scope expansion.

## P1 findings

### HV-001 — Portable backup cannot prove provenance and event-replay integrity — **REPAIRED**

**Baseline impact:** A backup could be checksum-valid and restorable into an isolated transaction while still failing to reconstruct historical canonical records and resolve provenance.

**Reproduction:**

```sh
pnpm --filter @workspace/api-server run test:backup-restore
```

**Baseline observed result:** Exit code 1. The test failed because `/api/backups/:id/verify` returned `evidence.overall = "FAIL"` where the existing harness requires a non-FAIL result.

**Evidence from the verification report:**

- `foreign-key-and-provenance-integrity`: `FAIL`
- `legacyProvenanceRefs`: 23
- `invalidProvenanceCount`: 88
- `legacyExternalEvidenceRefs`: 2
- `event-log-continuity-and-rebuild`: `FAIL`
- `eventCount`: 7903
- `comparedObjects`: 68
- `missingReplayedObjects`: non-empty
- `isolated-clean-database-restore`: `PASS`
- `transactionRolledBack`: `true`
- `databaseRowCount`: 8379
- `restoredRowCount`: 8379

**Relevant files:**

- `artifacts/api-server/src/lib/backup-restore.ts`
- `artifacts/api-server/src/lib/provenance.ts`
- `artifacts/api-server/src/lib/projector.ts`
- `artifacts/api-server/scripts/backup-restore.test.mjs`
- `lib/db/src/schema/backup.ts`

**Repair direction:** Reconcile legacy provenance references and create/recover auditable event lineage for canonical objects. Preserve the distinction between checksum validity, isolated restore success, provenance integrity, and replay completeness.

**Post-repair evidence:** `test:backup-restore` passes, including canonical payload integrity, event-log continuity/rebuild, canonical-state equality, isolated restore, and production state untouched.

### HV-002 — Invalid Time Machine references silently become “now” — **REPAIRED**

**Baseline impact:** A malformed historical reference could produce a successful snapshot of the current state, allowing an operator or downstream engine to mistake an invalid request for a valid historical reconstruction.

**Reproduction:**

```sh
curl -sS -i -X POST http://127.0.0.1:8080/api/time-machine/reconstruct \
  -H 'content-type: application/json' \
  -d '{"reference":"not-a-date"}'
```

**Observed result:** HTTP `200`; response contained a `targetAt` equal to the current request time and a populated snapshot. The route did not reject or mark the reference unresolved.

**Relevant files:**

- `artifacts/api-server/src/routes/time-machine.ts`
- `artifacts/api-server/src/lib/time-machine.ts`
- `artifacts/api-server/scripts/manifest-contract.test.mjs` (current manifest coverage does not exercise invalid reconstruction references)

**Repair direction:** Reject invalid date references unless a documented semantic event/person match succeeds; if fallback resolution is intentional, return explicit resolution metadata and a degraded result rather than silently selecting the current time.

**Post-repair evidence:** `test:time-machine-hostile` passes both rejection cases and a valid historical-date reconstruction case.

## P2 finding

### HV-003 — Missing recovery agenda resolution returns HTTP 200 with an empty body

**Impact:** A caller cannot reliably distinguish “agenda resolved,” “agenda not found,” and “no response body.” This can hide a failed recovery operation and makes retry/audit behavior ambiguous.

**Reproduction:**

```sh
curl -sS -i -X POST \
  http://127.0.0.1:8080/api/recovery/agenda/00000000-0000-4000-8000-000000000000/resolve
```

**Observed result:** HTTP `200` with an empty response body. The underlying `resolveAgenda()` returned `undefined`, and the route serialized that value without an explicit not-found response.

**Relevant files:**

- `artifacts/api-server/src/routes/recovery.ts`
- `artifacts/api-server/src/lib/recovery-modes.ts`
- `lib/db/src/schema/recovery.ts`

**Repair direction:** Return a structured 404 for an unknown agenda and a JSON representation for a successful resolution.

## Hostile coverage matrix

| Boundary | Hostile exercise | Result |
|---|---|---|
| Append-only Event Log | Mutation rejection probe in Full System Check; replay/event-first tests | PASS |
| Request ordering | Request pipeline identity → Constitution → Intent → Context | PASS |
| Constitution | Unauthenticated internal bypass and ledger boundary attempts | PASS |
| Facts/Interpretations ledgers | Missing provenance and cross-ledger evidence attempts | PASS |
| Provenance | Invalid UUID/unresolved evidence attempts; backup surfaced legacy defects | PASS for rejection, P1 for existing data |
| Provider isolation | Adapter source scan and provider-neutral contract tests | PASS |
| Database isolation | Isolated backup restore and rollback verification | PASS for isolation |
| Bootstrap secrets | Fixture containing credentials and `.secrets` content | PASS |
| Credentials/privacy | Internal route authentication, CORS, and secret exposure checks | PASS |
| HMAC/replay/timestamps | CIL malformed/mismatched/replayed responses; CerbaSeal expired/auth-failure/unavailable cases | PASS |
| CerbaSeal fail-closed | HOLD, REJECT, malformed, expired, confirmation, auth failure, unavailable | PASS |
| Query Engine | Canonical gateway architecture and epistemic evidence metadata | PASS |
| Semantic Index | Locality/freshness behavior through diagnostics and query architecture | PASS |
| Institutional Knowledge | Repeated independent evidence and contradiction lifecycle | PASS |
| Strategic Anchors | Malformed anchor rejected with HTTP 400 | PASS |
| Self-Improvement | Protected-target bypass and rollback evidence | PASS |
| Backup/restore | Checksum, isolated restore, provenance, replay, production-write boundary | PASS after repair |
| Time Machine | Missing snapshot rejected; malformed reference rejected; valid date preserved | PASS after repair |
| Internal privacy | Public aliases rejected; registered service identity accepted | PASS |
| Durable event recovery | Restart delivery, idempotency, bounded retry, dead-letter behavior | PASS |
| Operational Intelligence | Controlled prioritization and upstream retrieval failure visibility | PASS |
| Manifest | Live claims compared with runtime state | PASS |

## Commands executed

The following package scripts were executed sequentially against the running controlled API:

```text
test:behavioral
test:pipeline
test:internal-security
test:event-replay
test:backup-restore
test:event-delivery
test:consequential-execution
test:cil-protocol
test:provider-boundary
test:project-bootstrap
test:institutional-knowledge
test:self-improvement-boundary
test:operational-intelligence-evidence
test:query-architecture
test:ledger-boundary
test:manifest
test:self-test-diagnostics
```

The remediation changed only the backup and Time Machine boundaries plus focused regression coverage. The report remains repair-ready for the separate recovery-agenda P2 follow-up.