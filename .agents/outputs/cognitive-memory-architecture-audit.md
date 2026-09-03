# Project LEE Cognitive Runtime + Long-Term Memory
## Section-by-section conformance and acceptance audit

**Audit date:** 2026-09-03  
**Source:** `attached_assets/Project_LEE_Cognitive_Runtime_Long_Term_Memory_Architecture_1788412751441.pdf`  
**Source shape:** 21 pages, 58 numbered sections, text layer extracted page-by-page with PyMuPDF.  
**Audit mode:** read-only. No canonical data was reset, deleted, rewritten, or migrated. No Event Log history was changed.

## Executive decision

**Not acceptance-complete.**

LEE has substantial executable foundations: PostgreSQL-backed canonical records, an append-only Event Log trigger, separate epistemic ledgers, bounded Working Memory, persisted cognitive-runtime model snapshots, auditable consolidation phases, structured evidence contracts, source-specific retention policy, portable backup verification, and fail-closed governed execution.

The architecture is not yet proven as the complete long-running cognition and memory system described by the PDF. The acceptance blockers are:

1. **Live CIL authority is unavailable.** The protocol and fail-closed behavior are tested, but live model routing and frontier-reduction cannot be accepted.
2. **Event Log reconstruction is incomplete.** The log is durable and append-only, but replay coverage is narrow and the current protected installation returns HTTP 423 for mutation-dependent replay tests.
3. **Restore is verification, not a complete replacement-install restore.** Checksums, required payloads, isolated physical-table restore, and corruption rejection are tested; full canonical-state rebuild and comparison are not.
4. **Recovery continuity is incomplete.** Recovery mode correctly blocks writes, but continuity/reconciliation across recovery, restart, restore, and historical repair is not accepted. Task #228 remains proposed.
5. **The integrated end-state “Welcome back” experience is not implemented as one observable flow.** Its ingredients exist across multiple engines, but no single flow produces the PDF’s complete narrative.

This report deliberately treats interfaces, type definitions, metadata, route presence, and roadmap entries as **not sufficient** evidence of working behavior.

## Result vocabulary

- **PASS (focused):** executable behavior has a reproducible test or persisted evidence, but the PDF’s broader product claim may still be unproven.
- **WARN:** meaningful implementation exists, but coverage, lifecycle, integration, or end-to-end evidence is incomplete.
- **FAIL:** the requested acceptance behavior is absent or cannot be safely accepted in the current environment.
- **Blocked:** the behavior is protected or depends on a missing external/system prerequisite. A blocked check is not counted as a pass.

## 20 original cognitive capabilities

| # | Capability | Result | Observable evidence and limitation |
|---:|---|---|---|
| 1 | Persistent situational awareness | WARN | `artifacts/api-server/src/lib/cognitive-runtime.ts` reads World, Project, Relationship, Self, Uncertainty, Goal, Attention, and Memory snapshots and persists cycles. `test:cognitive-runtime` proves reader isolation, not continuous multi-source operation or long-horizon accuracy. |
| 2 | Temporal awareness | WARN | Temporal runtime readers, Waiting Loops, briefs, and Time Machine routes exist. `test:time-machine-hostile` could not run its intended assertions because recovery mode returned 423; complete historical reconstruction and approaching-event cognition remain unproven. |
| 3 | Attention | PASS (focused) | Operational Intelligence and Attention snapshots rank evidence-backed priorities; `test:operational-intelligence-evidence` passes its controlled multi-project and upstream-failure cases. Portfolio-wide attention allocation is not proven. |
| 4 | Owner model | WARN | Identity profile, founder identity, decision heuristics, and runtime Owner model exist. There is no dedicated owner-model lifecycle test proving explicit owner truth cannot be presented as inference or that all owner categories are enforced. |
| 5 | Self-model | WARN | Runtime Self reads operational state and engine health and records degraded engines. A unified historical self-memory query for failures, outages, accuracy, spend, and capability change is absent. |
| 6 | Metacognition | WARN | Self-Test, operational confidence, prediction records, and self-improvement records exist. `test:self-test-diagnostics` was blocked by HTTP 423 in recovery mode; persisted diagnostics are not proof of metacognitive evaluation quality. |
| 7 | Prediction | WARN | `recordPrediction`/`resolvePrediction` preserve horizon, evidence, confidence, outcome, accuracy, and lesson fields in `epistemic-history.ts`. Prediction lifecycle exists, but periodic calibration across historical predictions is not demonstrated. |
| 8 | Counterfactual reasoning | WARN | Simulation and strategy records/routes exist. No dedicated executable counterfactual acceptance test proves scenario execution, comparison, or predictive accuracy. |
| 9 | Goal awareness | WARN | Cognitive Runtime reads executive and strategic objectives and Operational Intelligence uses objective context. Every recommendation’s objective alignment is not tested end to end. |
| 10 | Initiative | PASS (focused) | Initiative and Operational Intelligence engines persist evidence-backed observations and controlled prioritization; `test:operational-intelligence-evidence` passes. Deduplication, outcome quality, and long-running initiative learning remain WARN. |
| 11 | Long-running thought | WARN | Persisted Executive Loop phases, interruption, review, and scheduled jobs exist; `test:executive-loop-proof` passes its harness. Continuous production operation and durable multi-day investigation behavior are not proven. |
| 12 | Relationship cognition | WARN | Relationship records, health scores, commitments, questions, and runtime Relationship snapshots exist. No longitudinal aggregator test demonstrates topics, cadence deviations, documents, and decisions becoming a safe relationship conclusion. |
| 13 | Cross-system causal reasoning | WARN | Graph, impact, portfolio dependency, and causal-claim structures exist. The Reality Graph integration test was skipped in recovery mode; complete causal integrity, alternatives, and replay are unproven. |
| 14 | Learning from outcomes | PASS (focused) | Consolidation outcome learning and Institutional Knowledge promotion have executable tests; `test:institutional-knowledge` passes its independent-evidence gate. Long-horizon learning quality remains unproven. |
| 15 | Cognitive specialization | WARN | The Cognitive Runtime registers 13 separate model readers (World, Owner, Lab, Project, Relationship, Temporal, Self, Uncertainty, Goal, Authority, Attention, Experience, Memory). Registry/read isolation does not prove independent specialization influences decisions. |
| 16 | Internal reflection cycles | PASS (focused) | Memory consolidation has persisted phases, checkpoints, failures, and resume behavior in `memory-consolidation.ts`; the focused test is currently skipped when resources are constrained, so the behavior is not fully re-proven in this run. |
| 17 | Curiosity / uncertainty-driven seeking | WARN | Knowledge gaps and curiosity queueing exist with next-action metadata. No dedicated test proves a gap triggers safe search, owner question, project/provider inspection, waiting, and resolution. |
| 18 | Governed self-improvement | PASS (boundary) | `self-improvement.ts` and `test:self-improvement-boundary` prove adaptation is limited to approved output parameters and retains rollback evidence. Evaluation breadth and production change approval remain incomplete. |
| 19 | Multiple time horizons | WARN | Runtime readers have distinct cadence/freshness policies, but no behavioral test proves weekly, monthly, quarterly, and annual horizons interact correctly. |
| 20 | Persistent cognitive runtime | WARN | Cognitive Runtime cycles, model snapshots, continuity fingerprints, recovery blocking, and scheduler registration exist; `test:cognitive-runtime` passes focused continuity/isolation cases. Database-backed restart continuity and scheduler execution remain unproven. |

## Conformance matrix: numbered PDF sections 21–58

| Section | Requirement | Result | Evidence, reproduction, and acceptance gap |
|---:|---|---|---|
| 21 | Memory must be tiered, not monolithic | WARN | `memory-architecture.ts` defines nine tiers, automatic classification, owner tier override, access updates, and `MemoryTierChanged` events. `memoryStatus` explicitly marks stages 3–6 planned. There is no fully separate durable-memory store versus active-context store; Context Economy and Working Memory provide the bounded projection. |
| 22 | Working Memory | PASS (focused) | `working-memory.ts` builds bounded, redacted, category-aware selected/excluded envelopes and persists them with audit events. `test:working-memory` passes deterministic and boundedness checks. An independent lifecycle for current conversation/objective/attention is not proven. |
| 23 | Structured Brain Memory | WARN | PostgreSQL-backed tables and backup inventory cover people, organizations/projects, facts, interpretations, assumptions, decisions/heuristics, commitments, objectives, institutional knowledge, provenance, operational state, and related records. There is no single structured-Brain lifecycle API or proof that every PDF concept is consistently modeled and reconstructed. |
| 24 | Episodic Memory | WARN | Event Log, time-machine reconstruction, timeline routes, and consolidation events preserve temporal records. `test:memory-consolidation` is skipped under resource pressure and `test:time-machine-hostile` is blocked by 423, so the multi-step autobiographical sequence is not accepted end to end. |
| 25 | Source Evidence Archive | WARN | `retention.ts` provides content-addressed archive representations, source-kind policies, hashes, provenance, timestamps, integrity, and retention state; `test:retention` passes policy and media-lineage cases. Object Storage placement and encryption are contract/metadata claims here, not independently verified archive durability. |
| 26 | Semantic Index | WARN | Local hash embeddings, persisted `semanticIndex` rows, semantic search, freshness checks, and rebuild functions exist. `test:query-architecture` and `test:memory-health` cover architecture/health, but search is capped and the delete-before-rebuild failure safety path is not proven. |
| 27 | Consolidated Long-Term Memory | WARN | Event-to-experience and outcome-to-lesson paths exist, and Stage 2 compression retains source references. Institutional Knowledge has an independent-evidence test, but general promotion from repeated experiences through lesson/pattern/knowledge and stages 3–6 remains partial/planned. |
| 28 | Memory Temperature | WARN | Automatic age/access/activity tiering, protected tiers, Working Memory temperature labels, and cooling phases exist. Temperature is not an independent persisted dimension separate from storage tier, and the PDF’s hot/warm/cold/permanent semantics are only approximated. |
| 29 | Memory Importance | WARN | Importance, confidence, access count, canonical level, freshness, relevance factors, contradiction, and provenance are represented across objects and evidence envelopes. No complete durable factor set and universal explainable ranker exists across every retrieval source. |
| 30 | Memory Consolidation Cycles | WARN | An explicit multi-phase cycle (observe, reconcile, dedupe, stale review, outcomes, learning, compress, cool, archive, reindex, briefing) has persisted run/phase/checkpoint records. The focused test was skipped under resource pressure; nightly trigger execution, throughput, and phase quality are not accepted. |
| 31 | Historical Belief State | PASS (focused) | `epistemic-history.ts` records revisions with prior links, evidence, timestamps, status, and events; `test:epistemic-history` passes distinct portable belief, prediction, causal, and gap records. This is a strong implementation match, but universal use by every reasoning path is not proven. |
| 32 | Memory Pollution Protection | WARN | Fact, interpretation, assumption, prediction, owner, lesson, and institutional ledgers are separate; epistemic writes require constitutional checks and evidence metadata. There is no database-level or universal route proof preventing every model output from being written as fact. |
| 33 | Owner Model Memory | WARN | Founder identity and decision-memory services persist owner-facing records and heuristics. Explicit truth, observed behavior, inferred preference, heuristic, anchor, and uncertain hypothesis are not demonstrated as one enforced category taxonomy; there is no dedicated owner-model test. |
| 34 | Self Memory | WARN | Brain versions, operational events, self-improvement records, engine health, costs, and prediction data are persisted in separate areas and included in backup coverage. A unified, queryable self-history with accuracy and failure conclusions is not implemented. |
| 35 | Relationship Memory | WARN | Relationship interactions, promises, commitments, questions, health scores, people, and relationship runtime snapshots are persisted and portable. A longitudinal synthesis of cadence, deviations, topics, documents, boundaries, and successful patterns is not proven. |
| 36 | Project Memory | WARN | Project Bootstrap, project momentum, universal objects, events, repairs, and operational records create useful project evidence. There is no single project stream that answers origin, decisions, rejected directions, repairs, lessons, assumptions, debt, dependencies, and current state. |
| 37 | Investigation Memory | WARN | Knowledge gaps persist question, importance, reason, objective, evidence-source candidates, investigation date, next action, and status. A dedicated Investigation object with hypothesis/conclusion history, contradictory evidence, research history, and automatic reconsideration is missing. |
| 38 | Prediction Memory | WARN | Prediction records persist horizon, evidence, reasoning, confidence range, variables, outcome, accuracy, and lesson; epistemic tests cover the record boundary. Periodic calibration/scoring across the prediction history is not evidenced. |
| 39 | Decision → Outcome Memory | WARN | Outcome learning, learning assets, decision heuristics, and prediction resolution exist. There is no universal first-class lifecycle linking every decision to expected outcome, observed outcome, difference, lesson, and candidate heuristic. |
| 40 | Causal Memory | WARN | Causal claims validate evidence, confidence, source, explicit/inferred status, and alternatives in `epistemic-history.ts`. A causal inference/alternative-analysis engine and independent protection against sequence-equals-causation are not proven. |
| 41 | Knowledge Gaps as Memory | PASS (focused) | Knowledge gaps are durable, typed, evidence-aware, importance-ranked, objective-linked, and next-action-aware; epistemic-history tests pass their separation from beliefs/predictions/causal claims. Automated investigation actions and resolution quality remain WARN. |
| 42 | Memory Garbage Collection | WARN | Retention has protected-record guards and a dry-run garbage-collection candidate report; duplicate/cache/transient candidates are identified without destructive mutation. The actual executor, deletion audit, duplicate reclamation, and compaction path are not implemented. |
| 43 | Source-Specific Retention | PASS (focused) | Gmail, GitHub, Drive, and local-capture policy ownership and source mapping are executable and pass `test:retention`. Provider synchronization and external canonical-source behavior are outside this focused proof. |
| 44 | Media Storage | WARN | Archive representation layers distinguish originals and derived objects and preserve lineage. There is no executable audio/video/voice ingestion, transcription, extraction, and structured-memory pipeline; arbitrary Android file capture is intentionally deferred. |
| 45 | Storage Expansion Transparent to LEE | WARN | Storage status, capacity/pressure stages, archive placement contracts, and health reporting exist. Actual large encrypted archive provisioning, migration, multi-device expansion, and transparent physical tier movement are not proven. |
| 46 | Memory Portability | WARN | Portable backup collection includes Brain/Event Log, ledgers, provenance, archive metadata, memory indexes/conflicts, Working Memory, consolidation, learning, relationship, experience, and required non-secret configuration metadata. Checksums, required tables, isolated physical-table restore, and corruption rejection pass focused tests; full replacement-install restoration and provider reauthorization are not end to end. |
| 47 | Memory Health | PASS (focused) | `memory-health.ts` evaluates 14 explicit canonical, continuity, archive, index, evidence, provenance, duplicate, backup, restore, capacity, corruption, consolidation, contradiction, and rebuild checks. `test:memory-health` passes healthy and fail-closed/derived-warning cases; the live endpoint reports the existing recovery-mode failure honestly. |
| 48 | Memory Pressure Management | PASS (focused) | Retention exposes staged pressure response and owner-confirmed protected-record decisions; `test:retention` passes escalation/protection cases. Automatic temporary/cache cleanup and capacity expansion are not implemented. |
| 49 | Retrieval should be multi-stage | WARN | Query Engine, Context Economy, Context Engine, graph traversal, temporal filters, semantic search, relevance factors, Working Memory, cache, and telemetry exist; `test:query-architecture` passes gateway/evidence checks. Universal adoption is not proven and several engines still have direct reads or separate rank paths. |
| 50 | Cognitive Memory Explainable | PASS (focused) | Ask LEE and Explanation Engine contracts return source IDs, epistemic labels, age/freshness, relevance factors, provenance, contradiction, validation, and conclusion-change metadata; `test:ask-lee-evidence` passes five evidence-contract cases. No proof shows every consequential recommendation invokes and exposes the full explanation lifecycle. |
| 51 | Memory and CIL should work together | WARN | Query/Context/Working Memory handoff, CIL route metadata, checksums, candidate categories, and request-pipeline governance exist. `test:cil-protocol` passes contract and fail-closed cases, but live CIL is unavailable and universal prevention of ungoverned generated-truth persistence is not proven. |
| 52 | Nightly Cognitive Consolidation | WARN | Consolidation is observable, persisted, checkpointed, failure-aware, resumable, and auditable through routes and scheduled-job registration. The focused test was skipped under resource pressure; actual nightly execution, institutionalization cadence, briefing persistence, and production throughput are not accepted. |
| 53 | Cognitive Continuity | WARN | Brain/Event Log/identity/owner/project/relationship/history portability, runtime continuity fingerprints, boot/recovery history, and durable event delivery exist. Complete continuity across model changes, updates, outages, desktop migration, K6 replacement, and full state restore is unproven; recovery continuity remains blocked and Task #228 is proposed. |
| 54 | Advanced Functional Awareness | WARN | A persisted Cognitive Runtime registry contains separate World, Owner, Lab, Project, Relationship, Temporal, Self, Uncertainty, Goal, Authority, Attention, Experience, and Memory models; focused runtime tests pass isolation. Cross-model influence and continuously updated accurate awareness are not demonstrated. |
| 55 | Advanced Self-Improvement Boundary | PASS (boundary) | `self-improvement.ts` and its test allow evidence-backed output-parameter adaptation while rejecting authority, identity, governance, security, audit, and memory-integrity changes; rollback evidence is retained. Complete evaluation inputs and proposal-to-approved-change lifecycle remain partial. |
| 56 | Memory Constitution | WARN | Database append-only protection, separate epistemic ledgers, provenance preservation, rebuildable-index policy, protected retention, owner confirmation, and fail-closed governance are tested in focused boundaries. The ten rules are distributed application/database guards, not one universal enforcement layer across every write and archive path. |
| 57 | What this makes possible | WARN | Bounded Context Packets, Working Memory caps, project/person/relationship/query services, evidence references, and objective/commitment/waiting records provide the building blocks. No 20–50-object Olivia-style cross-domain scenario or scale benchmark was executed. |
| 58 | End-state experience | FAIL | Components exist for event counts, changed objectives, relationship state, project repair/approval, CIL route telemetry, consolidation, operational confidence, memory health, backup status, and knowledge gaps. No single observable “Welcome back” flow combines them; live CIL and full recovery/restore continuity are also blockers. |

## Ten Memory Constitution rules

| Rule | Result | Acceptance evidence and remaining boundary |
|---:|---|---|
| 1. History is not rewritten to match current belief | PASS (focused) | Historical belief revision retains prior interpretation, links, evidence, and events; `test:epistemic-history` passes. Universal event-sourced reconstruction remains incomplete. |
| 2. Model output is not automatically fact | WARN | Separate ledgers and governed epistemic writes exist. A universal negative test across every route and generated-output sink is missing. |
| 3. Provenance survives consolidation | PASS (focused) | Consolidation summaries, learning assets, institutional knowledge, and evidence contracts retain source/event references; focused consolidation/institutional tests cover this boundary. Full multi-stage promotion is incomplete. |
| 4. Archival is not deletion | PASS (focused) | Archive representations, retention decisions, original/derived lineage, and protected-record policy distinguish cold storage from deletion. Actual archival storage durability is not independently proven. |
| 5. Indexes are rebuildable | WARN | Semantic index rebuild and health freshness checks exist, and the index is not treated as canonical. Failure-safe rebuild and all derived-cache recovery paths remain unproven. |
| 6. Owner truth and inference remain distinct | WARN | Owner identity, heuristics, confidence, and evidence fields exist. Category-level enforcement and dedicated hostile tests are missing. |
| 7. Uncertainty is valid memory | PASS (focused) | Knowledge gaps, uncertainty states, predictions, and causal/interpretation separation are persisted and tested. Automatic uncertainty-resolution orchestration is incomplete. |
| 8. Old does not mean unimportant | PASS (focused) | Protected tiers, canonical levels, Strategic Anchors, constitutional records, and importance/freshness separation exist. Universal retrieval behavior for old protected records is not tested. |
| 9. Storage pressure must not cause silent forgetting | PASS (focused) | Staged pressure planning, protected-record guards, owner confirmation, and explicit retention decisions pass focused retention tests. Automatic cleanup execution is not implemented. |
| 10. Brain must outlive model and hardware | WARN | Portable backup, integrity metadata, credentials exclusion, isolated restore, and provider-reauthorization requirements exist. Full replacement-install restoration, cross-model continuity, and machine-loss end-to-end proof are incomplete. |

## Cross-cutting invariant audit

| Invariant | Result | Finding |
|---|---|---|
| Canonical PostgreSQL and Event Log authority | WARN | Canonical tables and database append-only protection are real. Event Log replay is not complete system event sourcing, and recovery-mode protection prevented mutation-dependent replay checks. |
| Provenance and epistemic separation | WARN | Facts, interpretations, assumptions, beliefs, predictions, causal claims, gaps, and evidence are distinct and richly labeled. Universal write-path enforcement and complete legacy cleanup are not proven. |
| CIL routing authority | FAIL for live acceptance | Protocol tests prove validation, drift/contradiction/provenance visibility, and unavailability blocking. The configured live authority is unavailable, so normal AI-ready routing/frontier-reduction cannot be claimed. |
| Governance and CerbaSeal | PASS (focused), WARN system-wide | Consequential execution tests prove only a unique, unexpired ALLOW reaches the provider writer and all other responses block. Every public, mobile, scheduled, and proactive consequential route is not covered by one integration test. |
| Rebuildability | WARN | Derived Working Memory, indexes, caches, and projections are labeled rebuildable; corruption/restore failure evidence is explicit. Complete automated rebuild without canonical overwrite is not accepted. |
| Portability | WARN | Payload breadth, checksum correctness, credential exclusion, isolated schema/table restore, and no-overwrite policy are present. Full installation replacement and external-account reauthorization are still policy-level. |
| Owner control | PASS (focused) | Recovery/read-only guards, owner confirmation, approval envelopes, protected retention, and self-improvement boundaries are executable and tested. Live authenticated visual verification was unavailable at the owner setup gate. |
| Unsupported consciousness claims | PASS as boundary | The PDF and implementation frame advanced functional cognition only; this audit makes no claim of consciousness, subjective experience, or production readiness. |

## Reproducible validation record

Executed from the workspace on 2026-09-03. These checks are the evidence behind the matrix; route/type presence alone was not counted.

| Validation | Result | Observed result |
|---|---|---|
| `pnpm --dir artifacts/api-server run typecheck` | PASS | TypeScript check completed successfully. |
| `pnpm --dir artifacts/lee-console run typecheck` | PASS | Console TypeScript check completed successfully. |
| `test:cognitive-runtime` | PASS | 2 focused tests passed: continuity/config change and isolated model outage. |
| `test:memory-consolidation` | WARN | 1 test explicitly skipped because low-priority consolidation was deferred under resource constraints. |
| `test:memory-health` | PASS | 2 evaluator tests passed, including canonical fail-closed and derived-warning separation. |
| `test:retention` | PASS | 5 policy, media-lineage, pressure, protection, and archive-loss tests passed. |
| `test:working-memory` | PASS | 2 bounded/redaction/determinism tests passed. |
| `test:epistemic-history` | PASS | Distinct historical belief, prediction, causal, gap, and portability test passed. |
| `test:query-architecture` | PASS | 3 gateway/evidence architecture tests passed. |
| `test:cil-protocol` | PASS (contract) | 5 protocol, malformed/replay, degradation, and no-local-fallback tests passed; this does not prove a live CIL. |
| `test:consequential-execution` | PASS (focused) | 11 allow/hold/reject/expired/replay/availability gate tests passed. |
| `test:event-replay` | BLOCKED/WARN | Both intended route checks returned HTTP 423 because the installation is in protected recovery mode. |
| `test:event-delivery` | PASS (harness) | 2 restart-redelivery/idempotency and bounded-retry/dead-letter tests passed. |
| `test:backup-restore` | PASS (focused) | Isolated physical-table restore/no-overwrite test passed. |
| `test:backup-restore-failure-injection` | PASS | Corrupt, incompatible, partial, and unavailable archive rejection passed. |
| `test:self-test-diagnostics` | BLOCKED/WARN | Intended diagnostic creation returned HTTP 423 in recovery mode. |
| `test:executive-loop-proof` | PASS (harness) | Persisted phases, resume, interrupt, integration, and review-learning harness passed. |
| `test:operational-intelligence-evidence` | PASS (focused) | 2 controlled evidence-priority/failure-visibility tests passed. |
| `test:institutional-knowledge` | PASS (focused) | Independent repeated evidence and lifecycle preservation test passed. |
| `test:self-improvement-boundary` | PASS (boundary) | Approved output adaptation and rollback boundary passed. |
| `test:ask-lee-evidence` | PASS (contract) | 5 cross-domain evidence, bounded retrieval, redaction, route provenance, and stale-context tests passed. |
| `test:connection-health` | PASS (projection) | 5 provider-neutral/redaction/degradation/reauthorization/local-availability tests passed. |
| `test:approval-envelope` | PASS (contract) | 4 review, expiry, CerbaSeal-state, and deduplication tests passed. |
| `test:project-repair` | PASS (contract) | 3 read-only/manage-level/failure-evidence tests passed. |
| `test:time-machine-hostile` | BLOCKED/WARN | Both intended checks returned HTTP 423 in recovery mode instead of exercising 400/200 behavior. |
| `test:reality-graph-integration` | BLOCKED/WARN | Integration test explicitly skipped because the API is in protected recovery mode. |
| `test:ledger-boundary` | BLOCKED/WARN | Hostile ledger write returned HTTP 423 before the intended 201/guard assertions. |

## Known blockers and safety impact

### B1 — Live CIL authority unavailable

**Impact:** No acceptance claim may be made for normal model-backed reasoning, reuse rates, frontier-model avoidance, live routing latency/cost, or CIL-derived answer quality. The safe behavior is to block or degrade rather than locally choose a replacement model.  
**Evidence still required:** reachable authenticated CIL JSON service; one live request proving Query Engine → Context Economy → CIL → route/reuse/escalation → structured result; persisted route/cost/provenance evidence; outage and recovery proof.

### B2 — Recovery mode and Event Log continuity

**Impact:** Protected 423 responses are correct for unsafe writes, but they prevent acceptance of mutation-dependent replay, Time Machine, Reality Graph, and ledger-hostile flows. Existing Event Log continuity/orphan/corruption findings remain unresolved.  
**Evidence still required:** explicit reconciliation plan, append-only-safe repair, complete replay/checkpoint proof, recovery exit criteria, and a clean post-recovery run of the blocked tests. This is related to proposed Task #228, not replaced by this audit.

### B3 — Portable restore is not a complete replacement-install restore

**Impact:** A valid checksum and isolated table copy do not prove that a new installation can rebuild the live Brain, satisfy every foreign key/invariant, reconstruct projections, or compare canonical state before release.  
**Evidence still required:** new empty installation restore, schema/migration validation, all-table invariant checks, canonical-state hash comparison, projection rebuild, interrupted restore resume, and proof that existing installations are never overwritten.

### B4 — No integrated end-state flow

**Impact:** The project cannot claim the PDF’s complete operational continuity narrative, even though individual ingredients exist.  
**Evidence still required:** one owner-authenticated, read-safe scenario that combines processed events, objective changes, relationship update, repair approval state, CIL route telemetry, consolidation outcome, backup/restore health, storage, and largest knowledge gap with source-backed explanation.

### B5 — External provider, storage, and release prerequisites

**Impact:** Provider synchronization, archive durability/encryption, external-account reauthorization, and hosted packaging evidence cannot be inferred from local contracts.  
**Evidence still required:** live provider-neutral sync and recovery flows, archive/object-storage integrity evidence, provider reauthorization after restore, and the hosted Linux release proof in proposed Task #246. macOS is intentionally out of scope for the current product and is not an acceptance blocker.

## Dependency-aware acceptance checklist

### Can proceed in parallel now

- Expand focused Memory Health failure-injection coverage across missing/corrupt archives, stale indexes, provenance gaps, and interrupted restore. Proposed Task #247 covers this without weakening recovery.
- Add dedicated owner-model, investigation, prediction calibration, decision-outcome, relationship-memory, project-memory, and counterfactual behavioral tests using isolated fixtures.
- Unify retrieval ranking and prove the full Query Engine → Context Economy → Working Memory path without changing canonical authority.
- Add an integrated authenticated read-safe end-state briefing once the data contract is defined; it can be developed against deterministic fixture data without claiming live CIL.
- Continue UI/API route-contract and narrow-screen coverage, including Memory Health visual verification after the owner setup gate is available. Existing tasks #223 and #226–#232 cover adjacent client proof and should not be duplicated.
- Complete media/archive and storage-pressure observability as non-destructive, owner-gated work.

### Must remain blocked until prerequisites are satisfied

- **Recovery-dependent:** Event Log continuity reconciliation, full replay, Time Machine mutation-dependent tests, Reality Graph integration, and any development-data reset. Do not bypass HTTP 423 or weaken recovery guards.
- **CIL-dependent:** live frontier-reduction, normal model-backed Ask LEE acceptance, live cost/savings claims, and any route that would treat CIL unavailability as successful reasoning.
- **CerbaSeal/governance-dependent:** provider mutation, repair execution, approval release, and live desktop/Android consequential flows. The fail-closed adapter is not permission to accept an unavailable service.
- **Storage/restore-dependent:** machine-loss continuity, replacement-install restore, archive recovery, and provider reauthorization after restore.
- **Hosted release-dependent:** packaged Linux acceptance and signed release/update claims until the hosted tagged run and target-repository/signing prerequisites exist. Do not reintroduce macOS acceptance after the product decision removed it.

## Final audit conclusion

The implementation is a credible, safety-conscious foundation for the architecture, not proof that the architecture is complete. The strongest accepted boundaries are bounded Working Memory, epistemic history separation, source-specific retention policy, Memory Health evaluation, focused consolidation/provenance, append-only database enforcement, portable-backup integrity checks, provider-neutral connection health, and fail-closed consequential execution.

The correct next state is to preserve the current fail-closed recovery behavior, resolve the canonical Event Log/recovery findings, restore a reachable CIL authority, prove replacement-install restoration, and then run one integrated owner-authenticated continuity scenario. Until those steps have reproducible evidence, sections 53 and 58 and the broader “LEE continues across machine/model/outage” claim remain unaccepted.