# Project LEE Version 12 Hardening Baseline

- Baseline date: 2026-08-20 (America/Los_Angeles)
- Baseline purpose: reproducible control point before the remaining hardening sequence
- Baseline type: read-only evidence capture; no implementation, schema, route, workflow, or feature changes made by this task
- Prior acceptance audit source: .agents/outputs/project-lee-v12-audit.md
- Prior audit classification: FULL 0 (0%), PARTIAL 67 (97.1%), SCAFFOLD ONLY 1 (1.4%), DIFFERENT 1 (1.4%)
- Current checkpoint note: this control point follows the merged System Manifest milestone (#108); the prior audit remains the pre-hardening architectural comparison baseline.

## Repository checkpoint

- HEAD: c03c3bb1c6c053bed3edf24a87b920a3892e3c8d
- HEAD subject: Update system manifest logic and dependencies in api-server
- Recent history includes the audit artifacts and the System Manifest milestone.
- Working tree was clean when captured.
- No secrets, credentials, tokens, or environment-variable values are included in this report.

## Runtime evidence

| Surface | Evidence | Result |
|---|---|---|
| API health | GET /api/health | PASS: service responded with status ok |
| Database | PostgreSQL 16.10, public schema, 128 tables | PASS: reachable and queryable |
| Brain Version | 16 records; latest why-provenance-verification, schema 1, verified | PASS: current Brain record identified |
| Constitution | 1 persisted Constitution Version, version 1; 27 active provisions | PASS: current Constitution identified |
| Event Log | 567 records at capture; latest observed event ManifestGenerated | PASS: append-only ledger is present; reconstructive behavior remains unproven |
| Self-Test | 2 persisted runs; latest FAIL with 51 PASS, 0 WARN, 18 FAIL | FAIL: current diagnostic evidence is not healthy |
| CIL | ServiceRegistry health unavailable | FAIL: live CIL integration unavailable |
| CerbaSeal | ServiceRegistry health unavailable; recorded last error is HTTP 404 | FAIL: live CerbaSeal integration unavailable |
| Manifest | Canonical /api/manifest responded and included live registry/ledger values | PASS for endpoint availability; full Version 12 correctness remains under hardening |
| Workflows | Android, Console, Manual, API, and mockup workflows running | PASS: development surfaces are serving |

## Database inventory

The development database contains the following relevant persisted boundaries:

- Brain and identity: brain_version, identity_profile, identity_profile_version
- Constitution and policy: constitution_provision, constitution_version, policy_record, policy_consultation
- Canonical knowledge: universal_object, fact_ledger, interpretation_ledger, assumption_ledger, source_vault, provenance_record
- Event and rebuild state: event_log, graph_node, graph_edge, timeline and state tables
- Runtime registries: engine_registry, engine_health, provider_registration, internal_capability_service
- Recovery and diagnostics: backup_archive, self_test_run, boot_history, clean_shutdown, recovery_agenda, lee_state
- Retrieval and cost: semantic_index, query_cache, query_log, cost_record, model_route_decision
- The full public table inventory is represented by the checked-in schema directory and the 128-table database query captured during this baseline.

## P0 findings mapped to evidence and required tests

### P0-1 — Event sourcing is not reconstructive

- Evidence: artifacts/api-server/src/lib/foundation-events.ts; artifacts/api-server/src/lib/domain-events.ts; artifacts/api-server/src/lib/projector.ts; artifacts/api-server/src/routes/foundation.ts; lib/db/src/schema/foundation.ts
- Current state: Event Log append-only protection exists, but application mutations still write projections directly and replay covers only limited universal-object paths.
- Required proof: event-first mutation test; deterministic projector test; reset-and-rebuild equivalence test; restart replay test; explicit conflict/failure test; no-direct-canonical-write architecture test.
- Downstream hardening: Event Sourcing task (#92).

### P0-2 — Backup restore is checksum-only

- Evidence: artifacts/api-server/src/routes/backups.ts; lib/db/src/schema/backups.ts; artifacts/api-server/src/lib/projector.ts
- Current state: backup payload/checksum metadata exists; test-restore recomputes integrity but does not restore a clean isolated database, rebuild projections, validate invariants, or compare canonical state.
- Required proof: portable backup contents test; isolated clean DB restore test; migration compatibility test; Event Log rebuild test; foreign-key/invariant test; source/restored canonical comparison; production non-overwrite guard.
- Downstream hardening: Backup/Restore task (#95).

### P0-3 — CIL is unavailable

- Evidence: artifacts/api-server/src/services/internal-services.ts; artifacts/api-server/src/lib/model-router.ts; artifacts/api-server/src/routes/internal-services.ts; lib/db/src/schema/internal-services.ts
- Current state: signed internal-service client and fallback routing exist; ServiceRegistry reports CIL unavailable.
- Required proof: controlled T1/T2/T3 tests; unavailable fallback; request/response schema; HMAC/replay/timestamp; provenance/confidence/cost/tier/latency persistence; live health test.
- Downstream hardening: CIL repair task (#99), then savings benchmark (#100).

### P0-4 — CerbaSeal end-to-end execution blocking is not proven

- Evidence: artifacts/api-server/src/lib/governance-engine.ts; artifacts/api-server/src/services/internal-services.ts; artifacts/api-server/src/lib/connector-engine.ts; artifacts/api-server/src/lib/provider-abstraction.ts; artifacts/api-server/src/routes/connectors.ts; lib/db/src/schema/governance.ts
- Current state: local governance and fail-closed CerbaSeal adapter behavior exist, but every consequential provider write is not proven to use one boundary; live CerbaSeal is unavailable.
- Required proof: integration tests for HOLD, REJECT, unavailable, timeout, malformed response, authentication failure, expired authorization, missing approval, missing human confirmation, and provider-write bypass attempts.
- Downstream hardening: universal CerbaSeal execution boundary (#97), then live repair (#98).

### P0-5 — Identity → Constitution ordering is not universal

- Evidence: artifacts/api-server/src/app.ts; artifacts/api-server/src/index.ts; artifacts/api-server/src/routes/ai.ts; artifacts/api-server/src/routes/reasoning.ts; artifacts/api-server/src/routes/android.ts; artifacts/api-server/src/lib/identity.ts; artifacts/api-server/src/lib/constitution.ts; artifacts/api-server/src/lib/intent.ts; artifacts/api-server/src/lib/context-engine.ts
- Current state: individual engines exist, but one server-side order is not proven across Console, Android, scheduled, Executive Loop, internal, and proactive paths.
- Required proof: ordering trace; stage-failure stop test; public/mobile/scheduled/internal/proactive bypass rejection; auditable failure evidence.
- Downstream hardening: universal request pipeline (#90).

## P1 findings mapped to evidence and required tests

| Finding | Current evidence | Required proof |
|---|---|---|
| Query Engine is not universal | artifacts/api-server/src/lib/query-engine.ts; context-engine.ts; context-economy.ts; operational-intelligence.ts; operational-memory.ts; portfolio-intelligence.ts; project-bootstrap.ts | prohibited DB/ORM import architecture test; centralized authorization/freshness/confidence/ranking/cache/why_included behavior tests |
| Self-Test is metadata-heavy | artifacts/api-server/src/lib/self-test.ts; artifacts/api-server/src/routes/self-test.ts; lib/db/src/schema/self-test.ts | real behavioral checks with PASS/WARN/FAIL evidence; intentional invariant failure; restart and failure injection |
| Institutional Knowledge promotion unproven | artifacts/api-server/src/lib/experience.ts; artifacts/api-server/src/lib/learning.ts; artifacts/api-server/src/routes/institutional-knowledge.ts; institutional knowledge schema | one/two/three independent evidence threshold; contradiction; provenance; defer/reject; invalidation/supersession |
| Self-Improvement boundaries untested | artifacts/api-server/src/lib/self-improvement.ts; artifacts/api-server/src/routes/self-improvement.ts; operational_adaptation schema | allowed output adaptation; protected Identity, Constitution, Facts, Anchors, governance, permissions, and credentials rejection; rollback evidence |
| Provider isolation convention-based | artifacts/api-server/src/lib/provider-abstraction.ts; artifacts/api-server/src/lib/connector-engine.ts; artifacts/api-server/src/routes/providers.ts; provider-registration schema | prohibited provider SDK/import architecture test; normalized provider-neutral consumer test |
| Internal route privacy incomplete | artifacts/api-server/src/app.ts; artifacts/api-server/src/middlewares/private-auth.ts; artifacts/api-server/src/routes/internal.ts; artifacts/api-server/src/routes/internal-services.ts | direct, alias, CORS, unauthenticated, normal-user, and valid-service access tests |
| Console route/API drift and silent failures | artifacts/lee-console/src/App.tsx; artifacts/api-server/src/routes/index.ts | route inventory comparison; live API contract checks; loading/error/empty/stale/degraded state checks |
| Bootstrap lacks end-to-end evidence and secret exclusion | artifacts/api-server/src/lib/project-bootstrap.ts; artifacts/api-server/src/routes/bootstrap.ts; lib/db/src/schema/bootstrap.ts | controlled repository inspection, persistence/restart, source-backed Fact vs Interpretation, graph/timeline, unresolved questions, .env exclusion |
| Operational Intelligence lacks controlled proof | artifacts/api-server/src/lib/operational-intelligence.ts; artifacts/api-server/src/routes/operational-intelligence.ts | multi-project evidence scenario, Why Chain, restart persistence, reactive recalculation |
| Durable event subscribers are not proven | artifacts/api-server/src/lib/domain-events.ts; artifacts/api-server/src/lib/foundation-events.ts; artifacts/api-server/src/lib/scheduler.ts | subscriber cursor/retry/backoff/dead-letter/restart redelivery/idempotency test |

## Dependency-ordered hardening sequence

1. #88 — record and preserve this baseline.
2. #89 — build behavioral test foundation.
3. #90 — enforce Identity → Constitution → Intent → Context.
4. #91 — make internal routes private.
5. #92 — make Event Log the source of rebuildable state.
6. #93 — make Query Engine universal.
7. #94 — enforce Fact/Interpretation/Provenance boundaries.
8. #95 — build real backup and restore.
9. #96 — make event delivery durable.
10. #97 — make CerbaSeal the universal execution boundary.
11. #98 — repair live CerbaSeal.
12. #99 — repair and prove live CIL.
13. #100 — benchmark CIL savings without gaming thresholds.
14. #101 — harden Provider Abstraction.
15. #102 — prove Bootstrap end to end.
16. #103 — make Institutional Knowledge earned.
17. #104 — bound operational Self-Improvement.
18. #105 — prove Operational Intelligence.
19. #106 — prove Executive Loop.
20. #107 — harden System Economics.
21. #108 — clean and prove System Manifest.
22. #109 — turn Self-Test into real diagnostics.
23. #110 — clean Console and Android runtime wiring.
24. #111 — run hostile validation without fixes.
25. #112 — fix P0/P1 hostile-test failures.
26. #113 — run the final no-fix Version 12 acceptance audit.

## Baseline decision

This report is the read-only control point for the remaining hardening program. It records what is live, what is unavailable, and what evidence is still missing. It does not treat route existence, table existence, task status, or UI labels as proof of implementation.
