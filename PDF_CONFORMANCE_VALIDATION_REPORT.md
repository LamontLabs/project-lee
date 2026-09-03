# Project LEE PDF Conformance Validation

**Audit date:** 2026-09-02 America/Los_Angeles (the UTC service logs begin 2026-09-03)  
**Authoritative specification:** `attached_assets/Project_LEE_Operational_Intelligence_Project_Operator_Database_1788397432964.pdf`  
**Specification identity:** 23 pages, 25 phases. The attached revision is byte-for-byte identical to the previously inspected `1788376408200` copy.  
**Scope:** Validation only. No new product scope was added and no existing follow-up was duplicated.

## Executive decision

**PDF conformance acceptance: NOT GRANTED.**

LEE has substantial persisted implementation, real API boundaries, working focused safety contracts, and functioning Console,
Android, Manual, and desktop build surfaces. It is not honest to call the 25-phase direction complete because:

- the development API is correctly in protected `RECOVERY_MODE` with an open Event Log continuity agenda;
- live CIL and live CerbaSeal operation are not available/proven in this environment;
- eight write-oriented scripts were gated by the recovery guard rather than proving their happy paths;
- three independent non-recovery regressions currently fail: provider-boundary scan, Bootstrap timeline evidence, and Operational Intelligence changed-item evidence;
- packaged desktop smoke is blocked until the bundled PostgreSQL runtime is staged in the package resources;
- the complete cross-system lifecycle, production-scale, hosted-release, and machine-loss claims remain unproven.

The right description is: **a substantial, behaviorally tested founder-operating-system foundation with real governance and
recovery boundaries, but still partial as a complete externally integrated, event-reconstructable, turnkey desktop system.**

## Validation method and repeatable command

The new root command is:

```sh
pnpm run validate:pdf
```

It is implemented by `scripts/validate-pdf-spec.mjs`. It runs 60 checks covering:

- API typecheck and build;
- Console and Manual typecheck/build with their required `PORT` and `BASE_PATH`;
- Android and desktop typechecks/build;
- all API scripts listed in `artifacts/api-server/package.json`;
- all Android focused tests;
- all desktop contract tests.

The command intentionally continues after a failure and exits non-zero with a summary. It does not convert a blocked or
skipped check into a pass. The Android static build and desktop Unix runtime smoke are listed separately below because they
require exclusive Metro/package resources and do not safely belong in a command that may run while the preview workflows are
active.

## Commands actually executed

### Typecheck and build

| Area | Command/result |
|---|---|
| API | `pnpm --filter @workspace/api-server run typecheck` and `build` — PASS |
| Console | `typecheck` — PASS; `PORT=5173 BASE_PATH=/lee-console ... build` — PASS |
| Manual | `typecheck` — PASS; `PORT=5174 BASE_PATH=/lee-manual ... build` — PASS |
| Android | `typecheck` — PASS; `build` — PASS after stopping the shared component-preview Metro process |
| Desktop | `typecheck` and `build` — PASS |
| Validation script | `node --check scripts/validate-pdf-spec.mjs` and `pnpm --filter @workspace/scripts run typecheck` — PASS |

The Console build emitted an existing source-map warning and both Vite builds emitted the existing large-chunk warning. These
are warnings, not hidden build failures.

### API behavioral and integration scripts

The following scripts were executed individually and sequentially. A script is listed as **PASS** only when its process and
assertions passed; recovery-gated failures are listed separately.

**PASS**

```text
test:behavioral
test:backup-restore
test:backup-restore-legacy
test:backup-restore-failure-injection
test:reality-graph-contract
test:reality-graph-integration (test skipped its write scenario because API was in protected recovery mode)
test:event-delivery
test:consequential-execution
test:cil-protocol
test:api-first-boundary
test:provider-transport
test:mcp-project-bridge
test:project-repair
test:gmail-email-provider
test:ask-lee-email
test:ask-lee-evidence
test:approval-envelope
test:ask-lee-email-filters
test:ask-lee-email-privacy
test:desktop-discovery
test:connection-health
test:owner-auth
test:cil-cost-benchmark
test:change-intelligence
test:commitment-intelligence
test:institutional-knowledge
test:self-improvement-boundary
test:executive-loop-proof
test:system-economics-contract
test:query-architecture
test:manifest
test:system-contract
```

**FAIL because the live API was already in protected recovery mode (`HTTP 423`)**

```text
test:pipeline
test:internal-security (two checks pass; registered-service happy path was gated)
test:event-replay
test:time-machine-hostile
test:system-economics-boundary (invalid-record rejection passes; accepted-write cases were gated)
test:self-test-diagnostics
test:ledger-boundary
test:resource-allocation-lifecycle
```

These failures are evidence that the recovery guard blocks writes; they are not reclassified as product passes. The Time
Machine hostile test in particular could not reach its expected `400`/`200` route behavior because recovery gating returned
`423` first. The prior hostile report records that the underlying malformed-reference defect was repaired; this run does not
re-prove it while the canonical API is locked.

**FAIL for non-recovery reasons**

```text
test:provider-boundary
test:project-bootstrap
test:operational-intelligence-evidence
```

Details:

- `test:provider-boundary`: the source scan reports a provider endpoint pattern in
  `src/lib/connection-center.ts`, so the adapter-boundary assertion currently fails.
- `test:project-bootstrap`: the real-repository run completes its inventory assertions but does not produce the expected
  `project_bootstrapped` timeline item for the run.
- `test:operational-intelligence-evidence`: the controlled scenario does not expose the expected critical item in
  `changedItems`; the upstream-retrieval-failure visibility assertion passes.

### Focused Android tests

All passed:

```text
test:runtime-wiring       2 tests
test:offline-uncertainty  3 tests
test:device-wiring        5 tests
```

The Android static Expo build also passed for iOS and Android bundles/manifests after the component-preview workflow was
stopped to free Metro port 8081. Existing Expo compatibility warnings for `@types/react` and `@types/react-dom` remain.

### Focused desktop tests

All six contract scripts passed:

```text
test:runtime-contract
test:migration-assets
test:migration-upgrade
test:release-metadata
test:app-icon
test:postgres-runtime
```

The separate `smoke:unix` command was first run without an executable and correctly rejected the missing argument. It was then
run against `release/linux-unpacked/Project-LEE` and correctly stopped at the next real prerequisite:
`resources/postgres/bin/initdb` is absent from that unpacked package. This is classified as **blocked**, not passed.

## Live runtime evidence

| Probe | Result | Interpretation |
|---|---|---|
| `GET /api/healthz` | HTTP 200, `{"status":"ok"}` | HTTP service is reachable; this is not Brain readiness |
| `GET /api/health` | HTTP 200, health service response | Basic health route is reachable |
| `GET /api/recovery/status` | HTTP 200, `mode: RECOVERY_MODE`, agenda `OPEN` | Recovery state is visible and persistent |
| Recovery proof | `overall: FAIL`; 16 Event Log sequence gaps; 0 invalid causation IDs; append-only trigger present | Canonical Brain/Event Log is not verified for normal writes |
| Database identity proof | `WARN`; `lee_runtime_identity` relation does not exist in the development API | This runtime is not a packaged installation identity |
| Brain proof | `PASS`; latest Brain version verified | Brain metadata itself is readable |
| `GET /api/manifest` | HTTP 200 | Live manifest surface responds |
| `GET /api/system-manifest` | HTTP 200 | System manifest surface responds |
| `GET /api/contract` | HTTP 200, runtime `degraded`, `recoveryMode: RECOVERY_MODE` | Contract reports degradation rather than pretending ready |
| `GET /api/operational-confidence` | HTTP 200, score `0` with explanation | Missing indexed/current evidence is represented conservatively |
| `GET /api/economics/summary` | HTTP 200 | Economics contract and summary are available; current period contains explicit zero/labelled metrics |
| `GET /api/economics/ledger` | HTTP 200 | Usage ledger is readable |
| `GET /api/self-tests` | HTTP 200; 20 reports; latest `WARN` | Persisted diagnostic evidence exists, but the latest report is not all-clear |
| `GET /api/backups/status` | HTTP 200, empty object | Route exists, but this probe is not sufficient to claim backup inventory completeness |

The Console preview visibly showed four independent degraded/unavailable readiness cards and a first-run owner setup gate. The
Android preview visibly showed the pairing gate and local-first pairing language. Browser logs contained only expected React/
Expo warnings plus an unauthenticated Console resource `403`; no application crash was observed.

## Phase-by-phase acceptance matrix

Status means whole-phase acceptance against the PDF, not whether a screen or one narrow contract exists.

| Phase | Status | Evidence and boundary |
|---:|---|---|
| 1. Correct CIL reasoning authority | PARTIAL / BLOCKED LIVE | `test:cil-protocol`, `test:api-first-boundary`, and cost benchmark pass the authority/fail-closed contracts. Live CIL availability and end-to-end selected-route execution are not proven; the self-test records CIL unavailable and model execution blocked. |
| 2. Service plane vs management plane | PARTIAL | `test:mcp-project-bridge`, provider transport, and API-first boundary pass. The project bridge is a real guarded management surface, but no live cross-system repair/consumption session proves the complete separation. |
| 3. Canonical database and Brain lifecycle | BLOCKED / PARTIAL | Desktop migration/runtime contracts pass. Live proof is in recovery because of 16 sequence gaps and absent packaged identity table; packaged Unix smoke is blocked by missing staged PostgreSQL resources. |
| 4. Backup and recovery as Brain capability | PARTIAL | `test:backup-restore`, legacy repair, and failure injection pass, including isolated restore and production-write protection. Latest Self-Test remains WARN and machine-loss/re-authorize continuity is not proven. |
| 5. Cross-system relationship graph | PARTIAL | Reality graph contract passes; integration write scenario is skipped under recovery. Full provider-backed reconstruction and promotion lifecycle remain unproven. |
| 6. What changed | PARTIAL | `test:change-intelligence` passes state transitions, source/significance fields, connector-noise suppression, and replay fingerprints. Broad live cross-system change reconstruction is not proven. |
| 7. Change significance | PARTIAL | Low/high/critical boundary behavior passes inside change-intelligence tests. Continuous significance filtering across all provider event producers is not proven. |
| 8. Today command center | PARTIAL | Console contains `TodayCommandCenter` and the readiness surface explains needs/blocks. The preview is held at first-run authentication/setup, so owner-authenticated Today behavior is not live-proven. |
| 9. Ask LEE universal interface | PARTIAL / BLOCKED LIVE | Ask LEE evidence, email criteria/privacy, Query Engine, and route metadata contracts pass. Live model-backed answers are blocked by recovery/CIL unavailability, and universal cross-domain retrieval is not proven. |
| 10. Commitment and waiting intelligence | PARTIAL | `test:commitment-intelligence` passes directions, uncertainty, cadence/noise suppression, completion evidence, and contradiction handling. Gmail/Calendar-to-ledger live reconciliation is not proven. |
| 11. People relationship intelligence | PARTIAL | People/relationship surfaces and normalized relationship contracts exist. Full evidence-backed reconstruction across messages, documents, meetings, commitments, and cadence is not proven in a live authenticated flow. |
| 12. Project operational state | PARTIAL | Project repair contracts pass safe authority and bounded failures; change intelligence passes evidence fields. Provider-backed project health classification across CI/build/deploy/task signals is not complete. |
| 13. Project Bridge as operator | PARTIAL | MCP bridge and project-repair tests pass scoped OBSERVE/USE/MANAGE behavior and credential-free registration. A live registered project session covering the full operation list is not proven. |
| 14. Governed project repair loop | PARTIAL | Deterministic repair contract and bounded failure evidence pass. The full observed→diagnosed→previewed→approved→applied→rechecked Event Log loop is not proven end to end. |
| 15. Unified approval inbox | PARTIAL | Approval envelope, expiry, CerbaSeal states, and consequential execution tests pass; Android approval wiring passes. Live CerbaSeal availability and a complete desktop/mobile approval execution are not proven. |
| 16. Connection Center | PARTIAL | Connection health, authority projection, discovery sanitization, provider adapters, and Android Core routing tests pass. OAuth/API registration and reauthorization are not live end-to-end proven; secure credential storage remains server-side by design. |
| 17. Layered readiness | PARTIAL | `/api/contract`, `/api/manifest`, recovery proof, and Console readiness cards report independent state. The live sample is degraded and the full optional-provider/project/desktop health set is not operationally healthy. |
| 18. Operational Confidence | PARTIAL | Route and computation exist and return an evidence explanation, but live score is `0` with no indexed records. Calibration and full factor propagation are not proven. |
| 19. Evidence powerful but quiet | PARTIAL | Ask LEE evidence/privacy tests pass redaction, provenance, freshness, and expandable-route metadata contracts. Authenticated UX-level evidence expansion is not proven. |
| 20. Meaningful unified timeline | PARTIAL / BLOCKED LIVE | Timeline routes and significance/change models exist; Time Machine and graph contracts are narrow. Recovery prevented the hostile timeline route from reaching its expected behavior, and full provider/entity projection rebuild is not proven. |
| 21. Focused Android | PARTIAL / DELIBERATELY DEFERRED | All Android wiring/offline/device tests and static build pass for text, voice, photo, screenshot, URL, idea, observation, project update, retry, alerts, and approvals. Arbitrary file capture is deliberately deferred; the prior Source Vault follow-up was cancelled and is not counted as implemented. |
| 22. Desktop product experience | PARTIAL / BLOCKED PACKAGED SMOKE | Desktop build, migration assets, release metadata, runtime contracts, and Android-independent packaging checks pass. Actual bundled PostgreSQL startup smoke is blocked until the package contains `resources/postgres`; hosted tagged Windows release proof is unavailable here. |
| 23. Desktop recovery/self-repair | PARTIAL | Recovery status, boot history/agenda routes, bounded runtime restart logic, migration failure paths, backup failure injection, and desktop contracts exist. The current open recovery agenda and missing packaged runtime prevent a complete recovery-to-live proof. |
| 24. Actionable system health | PARTIAL | Console cards and connection health models explain failure, availability, blocked work, automatic recovery, and owner action. Live health is degraded, and the complete authenticated reconnection path is not proven. |
| 25. Final UX consolidation | PARTIAL | Current Console has the intended Today/Ask/Work/Systems/Settings direction alongside legacy/advanced route surfaces; Android remains focused. Authenticated navigation and removal/relocation of all technical clutter are not fully validated. |

**Whole-phase COMPLETE:** none. Narrow contracts are complete and passing in many areas, but the PDF explicitly rejects
completion based only on those contracts, screens, stubs, or documentation.

## Constitutional and safety assessment

| Boundary | Result |
|---|---|
| Event Log append-only protection | PASS at the database trigger boundary; current continuity proof FAILS with 16 gaps |
| Recovery fail-closed writes | PASS at the live guard: write scripts receive HTTP 423 with the recovery proof |
| CIL authority/no local fallback | PASS in protocol/API-first tests; live CIL unavailable and no silent model bypass observed |
| CerbaSeal consequential gate | PASS in focused approval/execution tests; live CerbaSeal availability is not proven |
| Fact/Interpretation separation | PASS in hostile ledger contracts; write-side live proof was gated by recovery |
| Provider isolation | PASS in normalized contracts and adapters; current source scan regression fails |
| Bootstrap secret exclusion | PASS in controlled boundary tests; current project-bootstrap timeline assertion fails |
| Internal route protection | Public aliases and CORS privacy checks pass; registered-service happy path was recovery-gated |
| Credential privacy | Passes focused email, internal-route, provider, and bridge tests; universal log/model audit is not claimed |
| Identity before Constitution | Passes the tested request-pipeline contract; universal scheduled/engine enforcement is not claimed |
| No silent failures | Recovery, CIL unavailability, provider errors, and approval holds are visible in tested paths; not universal |

## Deliberate deviations and non-claims

- **No new product scope:** this audit did not add file-picker capability, new connectors, autonomous writing, voice providers,
  or extra Android surfaces.
- **No macOS release claim:** the active desktop release contract targets Windows and Linux. Stale macOS wording in
  `postgres-runtime-contract.test.mjs` is recorded as a documentation/test-maintenance concern, not treated as macOS support.
- **No hosted release claim:** no tagged GitHub Actions run with target-repository access and signing material was available.
- **No production-scale claim:** controlled fixtures and isolated test databases do not prove long-horizon provider/event volume.
- **No database identity bypass:** the development API was not forced into a fake verified state merely to make write tests pass.
- **No restore overclaim:** checksum/isolated restore success is not called a complete machine-loss reconstruction.
- **No Android arbitrary-file claim:** file capture remains deliberately deferred.

## Follow-up candidates

Only these non-overlapping regressions are candidates for follow-up work; existing recovery, Android file, timestamp, release,
and connection tasks already visible in the project task list are not duplicated here:

1. Repair the provider-boundary scan so provider-specific endpoint references remain confined to the approved adapter boundary.
2. Restore Project Bootstrap’s persisted `project_bootstrapped` timeline evidence for a completed real-repository run.
3. Restore Operational Intelligence’s controlled critical-item projection into `changedItems` without weakening significance rules.
