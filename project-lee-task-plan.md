# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 9.0 — 48 Tasks*

---

## Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff — she doesn't replace your thinking, she protects it. She doesn't replace your decisions, she prepares them. She doesn't replace your memory, she preserves it.

The primary asset is the accumulated knowledge, governance, memory, relationships, timelines, and operational state — not the specific model answering questions. The model could change. Lee continues to grow.

What makes LEE fundamentally different from existing tools:

- ChatGPT stores conversations.
- Claude stores projects.
- Notion stores documents.
- GitHub stores code.
- Google Calendar stores events.

None of them maintain an evolving operational model of you. LEE does.

---

## The Lamont Labs Operating Stack

```
LEE                    — operating intelligence
  ↓ calls                   ↓ calls
CIL                    CerbaSeal
(reusable reasoning)   (execution governance)
```

**LEE** knows. She owns context, projects, people, timelines, facts, interpretations, operational priorities, provider routing, and orchestration. She decides what problem is being solved and what support is needed.

**CIL** remembers reusable reasoning. It resolves queries through three tiers — trigram reuse, vector similarity reuse, and frontier escalation — reducing frontier dependency and cost. LEE calls CIL to answer: "Do we already have approved, reusable reasoning for this?"

**CerbaSeal** decides whether execution may proceed. It evaluates a governed request and returns ALLOW, HOLD, or REJECT with reason codes, a decision envelope, and an evidence bundle. LEE calls CerbaSeal to answer: "Is this consequential action authorized to proceed?"

The three systems remain independent. LEE is the primary client that knows when to call each one. CIL and CerbaSeal are never embedded in LEE's codebase — they are called through versioned API contracts.

---

## Architecture Principles (v9.0)

**1. The Constitution sits above everything.** Every engine consults the Constitution before acting. Absolute provisions cannot be overridden — not even by governance approval.

**2. Event Sourcing is the foundation.** Almost nothing mutates directly. State changes are typed Domain Events. Current state is a projection. Re-projection from the Event Log alone must produce a consistent database.

**3. Facts and Interpretations are never mixed.** The Fact Ledger holds what is verifiable. The Interpretation Ledger holds what Lee reasons. They have different canon rules, different confidence rules, and different decay rates.

**4. The Query Engine is the universal access layer.** No intelligence engine reads from storage directly. All reads go through the Query Engine. One retrieval policy, one ranking algorithm, one cache, one authorization layer.

**5. Intent is a first-class typed object.** Every request — human or machine-initiated — classifies its intent before retrieval or reasoning begins. All downstream decisions use the Intent record.

**6. Context competes.** The Context Economy formula replaces static tier weights. Every object scores against eight dimensions. The highest-scoring objects within the token budget always win, regardless of which memory tier they came from.

**7. Intelligence is independent of presentation.** Every capability must work without any UI. The Console, Android app, CLI, API, and future desktop app all consume identical services via the Internal API surface.

**8. Resource-aware scheduling.** The Orchestration Engine reads the Resource Engine before every dispatch. No heavy jobs run blindly into a constrained system.

**9. Brain Versioning for safe migrations.** A Brain Version (YYYY.M.minor) covers Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together. Every backup is tagged with its Brain Version.

**10. Confidence flows. Trust is earned.** Confidence degrades through each inference step at defined rates. Trust is a per-subsystem score that decays without activity and rises with accurate, verified performance. They are different constructs and are never conflated.

**11. Every output has a Why Chain.** No recommendation without reasoning. No observation without grounded steps. Every inference chain is navigable.

**12. Assumptions are tracked.** Every simulation and strategy names its assumptions. Invalidated assumptions trigger review of all conclusions built on them.

**13. Domain Events are typed contracts.** Every significant state change emits a typed Domain Event with a defined schema. No generic log entries. The event catalog is the language that re-projection speaks.

**14. Every engine has a lifecycle.** Every engine declares its dependencies, exposes standard lifecycle methods, and declares a recovery policy. The Orchestration Engine manages engines, not just jobs.

**15. Lee can describe herself.** The System Manifest is always current. The Capability Registry is always accurate. The Self-Test Framework can verify every claim.

**16. Lee knows the outside world.** The World State Engine maintains an active model of external context: time, calendar, market signals, technical deprecations, and owner-configured monitoring topics.

**17. Lee knows how you work.** Operational Memory observes the owner's demonstrated behavioral patterns from existing signals. Not declared preferences. Observed operational rhythm.

**18. Lee initiates.** The Initiative Engine surfaces proactive operational observations without being asked. Not reminders. Not alerts. Operational awareness delivered when it is actionable.

**19. Continuous prioritization is the heart.** The Operational Intelligence Engine is the always-on signal that answers "what deserves attention right now?" It synthesizes everything into a live operational answer.

**20. Providers are replaceable. The operating intelligence is not.** The Provider Abstraction Layer sits between every external service and Lee's internal engines. No engine above the adapter layer references Gmail, GitHub, or Google Calendar by name. Switching from Gmail to Proton Mail Bridge is an adapter swap — zero engine changes.

**21. The owner should not reconstruct reality manually if the evidence already exists.** When a repository is connected, LEE reads its structure, documentation, dependencies, and APIs to bootstrap an initial knowledge model automatically. She then asks only for the judgments the evidence cannot answer.

**22. LEE coordinates. CIL reasons cheaply. CerbaSeal governs execution. They are separate services, not embedded subsystems.** CIL and CerbaSeal are Lamont Labs internal capability services — not external providers, not internal engines. LEE calls them through versioned, authenticated API contracts. Their databases are never shared. CIL degrades gracefully when unavailable. CerbaSeal is fail-closed: no consequential action executes without a valid ALLOW verdict. These behaviors are architectural invariants, not configuration options.

---

## Capability Levels

| Level | Capability | Unlocked By |
|-------|-----------|-------------|
| 1 | Records | Tasks #1–#2 |
| 2 | Organizes | Tasks #3–#4 |
| 3 | Understands | Tasks #5–#6, #12–#13 |
| 4 | Retrieves intelligently | Tasks #26, #28, #31 |
| 5 | Predicts | Tasks #14, #16, #23 |
| 6 | Explains | Tasks #19–#22, #24, #27 |
| 7 | Collaborates | Tasks #7–#8, #18 |
| 8 | Advises | Tasks #11, #17, #29 |
| 9 | Coordinates | Tasks #10, #15, #30, #32, #33 |
| 10 | Self-manages | Tasks #35–#41 |
| 11 | Contextualizes the world | Tasks #42–#43 |
| 12 | Initiates | Task #44 |
| 13 | Continuously prioritizes | Task #45 |
| 14 | Connects to anything | Task #46 |
| 15 | Bootstraps understanding from evidence | Task #47 |
| 16 | Reasons cheaply; governs execution | Task #48 |

---

## Layer Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  1. FOUNDATIONS                                                 │
│  Constitution Engine · Event Log · Domain Events               │
│  Foundation DB · Memory Architecture · Brain Versioning        │
├─────────────────────────────────────────────────────────────────┤
│  2. KNOWLEDGE                                                   │
│  Fact Ledger · Interpretation Ledger · Data Ownership          │
│  Intelligence Graph · Assumption Ledger · Knowledge Aging      │
│  Why Chain & Provenance · Digital Twin Timeline                │
├─────────────────────────────────────────────────────────────────┤
│  3. RETRIEVAL                                                   │
│  Query Engine · Semantic Index                                  │
├─────────────────────────────────────────────────────────────────┤
│  4. INTELLIGENCE                                                │
│  Intent Engine · Understanding Pipeline                        │
│  Curiosity Engine · Strategy Engine                            │
│  Reflection Engine · Explanation Engine                        │
│  Confidence Propagation · Simulation                           │
├─────────────────────────────────────────────────────────────────┤
│  5. COORDINATION                                                │
│  Orchestration Engine & Scheduler Calendar                     │
│  Policy Engine · Governance Engine                             │
│  Resource Engine · State Engine · Recovery Modes               │
│  Operating Modes · Engine Lifecycle & Recovery Policies        │
│  Capability Registry · Health Engine                           │
├─────────────────────────────────────────────────────────────────┤
│  6. OPERATIONAL CONTEXT                                         │
│  World State Engine · Operational Memory                       │
│  Initiative Engine · Operational Intelligence Engine           │
├─────────────────────────────────────────────────────────────────┤
│  7. INTERNAL CAPABILITY SERVICES                                │
│  ┌─────────────────────┐  ┌────────────────────────────────┐  │
│  │ Reasoning Services  │  │ Governance Services            │  │
│  │ CIL (ReasoningService)│  │ CerbaSeal (GovernanceService) │  │
│  │ Model Router        │  │ Future policy evaluators       │  │
│  └─────────────────────┘  └────────────────────────────────┘  │
│  Separate databases · Versioned APIs · Strict auth boundary    │
│  CIL: graceful degradation · CerbaSeal: fail-closed           │
├─────────────────────────────────────────────────────────────────┤
│  8. PROVIDER LAYER (External Services)                          │
│  Provider Abstraction Layer · Project Bootstrap Engine         │
│  Communication · Document · Development Intelligence           │
│  Scheduling · Storage                                          │
│  Gmail Adapter · Google Calendar Adapter · Google Drive Adapter│
│  GitHub Adapter · [Proton Bridge Adapter — desktop phase]      │
├─────────────────────────────────────────────────────────────────┤
│  9. INTERFACES & OBSERVABILITY                                  │
│  Console · Android App · Connectors                            │
│  Cost Engine · Backup & Migration                              │
│  Context Economy · Brief Engine · Self-Test · System Manifest  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Request Flow

### Informational request
> "Explain CerbaSeal's pilot model in simple terms."

```
LEE classifies intent → Explanation, project: CerbaSeal
  ↓
LEE builds scoped context packet (CerbaSeal facts + interpretations)
  ↓
LEE calls CIL via ReasoningService interface
  ↓
CIL: T1 (trigram reuse) / T2 (semantic reuse) / T3 (frontier escalation)
  ↓
LEE adapts answer via Explanation Engine (audience: General)
  ↓
LEE records: correlation_id, resolution_tier, cost_usd, cognitive_asset_id
  ↓
CerbaSeal not consulted — nothing is being executed
```

### Consequential request
> "Send Olivia a CerbaSeal pilot follow-up."

```
LEE retrieves: relationship state, pilot facts, waiting loop, timeline
  ↓
LEE calls CIL: "Do we have approved reasoning on follow-up structure?"
  ↓
LEE drafts the message · explains why follow-up is appropriate
  ↓
LEE constructs GovernedRequest → calls CerbaSeal via GovernanceService
  ↓
CerbaSeal returns: ALLOW / HOLD / REJECT + decision_id + evidence_bundle_ref
  ↓
ALLOW: message sent · send event recorded · waiting loop created
HOLD:  message held · owner notified · missing approvals surfaced
REJECT: message not sent · reason codes surfaced to owner
  ↓
BootstrapCompleted event → GovernedActionAllowed/Held/Rejected event
→ both recorded in LEE's Event Log
```

---

## Provider Abstraction Model

```
External services (Gmail, GitHub, Google Calendar, Google Drive, Proton Bridge ...)
    ↓
Provider Adapters  (translate service APIs into standard types)
    ↓
Provider Interfaces
  CommunicationProvider · DocumentProvider
  DevelopmentProvider (Intelligence) · SchedulingProvider · StorageProvider
    ↓
Standardized Domain Events → Event Log → Subscribed engines
```

Note: CIL and CerbaSeal are NOT in the Provider Layer. They are Internal Capability Services (Layer 7 above) with their own interfaces, authentication model, and failure policies.

---

## Task Index

| # | Title | Depends On |
|---|-------|------------|
| 1 | Foundation & Core Schema | — |
| 2 | Console (Web App) | 1 |
| 3 | Understanding Pipeline | 1 |
| 4 | Brief Engine | 3, 5 |
| 5 | Model Router & Context Engine | 1 |
| 6 | Connector Engine | 1, 3 |
| 7 | Android App | 2, 4 |
| 8 | Cost Engine | 1, 5 |
| 9 | Backup, Migration & Brain Versioning | 1 |
| 10 | Orchestration Engine & Scheduler Calendar | 1 |
| 11 | Governance Engine | 1, 10 |
| 12 | Memory Architecture | 1, 3 |
| 13 | Intelligence Graph | 1, 3 |
| 14 | Identity & Relationship Engine | 1, 6, 13 |
| 15 | Curiosity Engine | 3, 12, 13 |
| 16 | Strategy Engine | 13, 14, 15 |
| 17 | Reflection Engine | 12, 13, 16 |
| 18 | Operating Modes | 10, 11 |
| 19 | Constitution Engine | 1, 2, 3, 4, 5 |
| 20 | Confidence Propagation | 1, 12, 13 |
| 21 | Fact/Interpretation Separation | 1, 3, 13 |
| 22 | Why Chain & Provenance | 1, 5, 20, 21 |
| 23 | Assumption Ledger | 12, 20, 21, 22 |
| 24 | Decision Impact Graph | 13, 16, 22 |
| 25 | Digital Twin Timeline | 1, 12, 13, 22, 24 |
| 26 | Query Engine | 1, 12, 13, 21 |
| 27 | Explanation Engine | 5, 22, 26 |
| 28 | Semantic Index | 3, 12, 26 |
| 29 | Policy Engine | 1, 19 |
| 30 | Resource Engine | 1, 10 |
| 31 | Intent Engine | 1, 26 |
| 32 | State Engine | 1, 10 |
| 33 | Internal API Contracts & Capability Registry | 1, 10 |
| 34 | Context Economy | 5, 12, 20, 26 |
| 35 | Domain Events | 1 |
| 36 | Engine Lifecycle, Dependency Validation & Recovery Policies | 10, 33 |
| 37 | Self-Test Framework | 33, 36 |
| 38 | Recovery Modes | 10, 32 |
| 39 | Data Ownership | 1, 3 |
| 40 | Knowledge Aging | 12, 26 |
| 41 | System Manifest | 9, 19, 29, 33 |
| 42 | World State Engine | 1, 6, 10 |
| 43 | Operational Memory | 1, 3, 12, 25 |
| 44 | Initiative Engine | 10, 15, 42, 43 |
| 45 | Operational Intelligence Engine | 16, 26, 34, 42, 43, 44 |
| 46 | Provider Abstraction Layer | 1, 6, 35 |
| 47 | Project Bootstrap Engine | 3, 6, 13, 21, 46 |
| 48 | Internal Capability Services Layer — CIL + CerbaSeal | 1, 5, 10, 11, 31, 33, 35, 46 |

---

## Task Descriptions

---

### Task 1 — Foundation & Core Schema
**Depends on:** nothing

Base layer. Node.js + TypeScript + Express, PostgreSQL + Drizzle ORM, core schema, event sourcing infrastructure. Re-projection from the Event Log alone must produce a consistent database state.

---

### Task 2 — Console (Web App)
**Depends on:** 1

Primary desktop interface. Dark-mode-first React. No business logic client-side. No emojis anywhere.

---

### Task 3 — Understanding Pipeline
**Depends on:** 1

Ingestion and comprehension layer. Accepts text, URLs, files, voice notes. Extraction → enrichment → entity detection → classification → importance scoring → storage. Entry point for all new knowledge.

---

### Task 4 — Brief Engine
**Depends on:** 3, 5

Daily briefing generator. After Task #45, Brief opening derived from Operational Intelligence Engine's active priority.

---

### Task 5 — Model Router & Context Engine
**Depends on:** 1

Tiered model selection, token budget enforcement, Context Packet Preview, CIL reuse. After Task #48, CIL is the first tier before frontier escalation. The Model Router calls CIL via the ReasoningService interface.

---

### Task 6 — Connector Engine
**Depends on:** 1, 3

First provider adapters: Gmail, Google Calendar, Google Drive, GitHub, Replit. All read-only. After Task #46, refactored to emit standardized typed Domain Events through provider interfaces.

---

### Task 7 — Android App
**Depends on:** 2, 4

Expo React Native. Presentation only. Today screen powered by Task #45 after it is built.

---

### Task 8 — Cost Engine
**Depends on:** 1, 5

Tracks every token and model call. Hard limits trigger governance holds. After Task #48, CIL cost tracked separately from frontier cost. Spend breakdown includes CIL resolution tier distribution.

---

### Task 9 — Backup, Migration & Brain Versioning
**Depends on:** 1

Brain Version (YYYY.M.minor). Daily automated backup. Verify Archive and Test Restore functional.

---

### Task 10 — Orchestration Engine & Scheduler Calendar
**Depends on:** 1

Priority queue (CRITICAL/HIGH/NORMAL/LOW). Engine registration, concurrency, retry. After Task #48, Orchestration Engine routes informational requests through ReasoningService and all consequential actions through GovernanceService before execution.

---

### Task 11 — Governance Engine
**Depends on:** 1, 10

Internal governance: risk levels LOW/MEDIUM/HIGH/CRITICAL, approval flows, audit trail. After Task #48, the Governance Engine coordinates with CerbaSeal via the GovernanceService interface for consequential external actions. The Governance Engine remains the internal policy layer; CerbaSeal is the external execution authorization boundary.

---

### Task 12 — Memory Architecture
**Depends on:** 1, 3

Six-tier hierarchy: Working → Short-term → Long-term → Reference → Archive → Semantic. Promotion, demotion, compression.

---

### Task 13 — Intelligence Graph
**Depends on:** 1, 3

Typed nodes and edges. Automatic edge creation from Understanding Pipeline and Bootstrap Engine. Cross-project relationship nodes created by Bootstrap Engine.

---

### Task 14 — Identity & Relationship Engine
**Depends on:** 1, 6, 13

People layer. Relationship strength, interaction history, follow-up states, waiting loops. Trust tiers: Close/Professional/Extended/Peripheral.

---

### Task 15 — Curiosity Engine
**Depends on:** 3, 12, 13

Proactive question-asking. Scans for staleness, gaps, conflicts. Does not ask questions Lee could answer herself.

---

### Task 16 — Strategy Engine
**Depends on:** 13, 14, 15

OKRs, option evaluation, recommendations with confidence and Why Chain, prioritization.

---

### Task 17 — Reflection Engine
**Depends on:** 12, 13, 16

Period comparison, trend identification, lesson surfacing, structural gap detection.

---

### Task 18 — Operating Modes
**Depends on:** 10, 11

FOCUS, TRAVEL, DEEP_WORK, REVIEW, EMERGENCY.

---

### Task 19 — Constitution Engine
**Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. ABSOLUTE provisions block unconditionally.

**ABSOLUTE provisions include:** Provenance non-negotiable. /internal/ never exposed externally. Semantic Index embeddings stored locally. No silent failures. Event Log append-only. Facts and Interpretations never mixed. No engine above the Provider Abstraction Layer references a specific service by name. Bootstrap Engine never reads secret values. CerbaSeal is fail-closed — no consequential action executes without a valid ALLOW verdict. CIL and CerbaSeal databases are never accessed directly by LEE.

---

### Task 20 — Confidence Propagation
**Depends on:** 1, 12, 13

Confidence degrades per inference hop. CIL-resolved answers carry their returned confidence score directly.

---

### Task 21 — Fact/Interpretation Separation
**Depends on:** 1, 3, 13

Two permanent, separate ledgers. Bootstrap Engine writes facts to Fact Ledger and summaries to Interpretation Ledger.

---

### Task 22 — Why Chain & Provenance
**Depends on:** 1, 5, 20, 21

Every recommendation has a navigable Why Chain. CIL-resolved answers include cognitive_asset_id and asset_version in the provenance chain.

---

### Task 23 — Assumption Ledger
**Depends on:** 12, 20, 21, 22

Assumption lifecycle: active → under_review → invalidated. Invalidation propagates as a Domain Event.

---

### Task 24 — Decision Impact Graph
**Depends on:** 13, 16, 22

Consequence tracking. Separate from Intelligence Graph.

---

### Task 25 — Digital Twin Timeline
**Depends on:** 1, 12, 13, 22, 24

Operational history as scrollable, zoomable, filterable timeline. Bootstrap Engine creates the first Timeline entry per imported project.

---

### Task 26 — Query Engine
**Depends on:** 1, 12, 13, 21

Universal data access layer. Single retrieval policy, ranking, cache, authorization. "Show me everything related to authentication" searches LEE's understanding across all bootstrapped projects — not GitHub or CIL directly.

---

### Task 27 — Explanation Engine
**Depends on:** 5, 22, 26

Audience-aware translation: Developer, Investor, Founder, Executive, Legal, Technical, General.

---

### Task 28 — Semantic Index
**Depends on:** 3, 12, 26

Vector embedding store over all Lee's knowledge. Discovery-mode fuzzy search. Embeddings stored locally — ABSOLUTE.

---

### Task 29 — Policy Engine
**Depends on:** 1, 19

Cost, Privacy, Retention, Notification, Relationship, Backup, Connector policies. All versioned. Rollback available.

---

### Task 30 — Resource Engine
**Depends on:** 1, 10

CPU, RAM, disk, token budgets, API quotas, network quality, battery. HEALTHY/CONSTRAINED/CRITICAL per dimension.

---

### Task 31 — Intent Engine
**Depends on:** 1, 26

Every request produces a typed Intent record. After Task #48, the Intent record's risk_classification determines whether GovernanceService must be consulted.

---

### Task 32 — State Engine
**Depends on:** 1, 10

Booting, Learning, Idle, Thinking, Briefing, Importing, Synchronizing, Waiting, Recovering, Offline, Degraded.

---

### Task 33 — Internal API Contracts & Capability Registry
**Depends on:** 1, 10

Every engine exposes a versioned, typed REST API at /internal/[engine-name]. /internal/ never exposed externally — ABSOLUTE. After Task #48, the Capability Registry includes a ServiceRegistry section for CIL and CerbaSeal with health state and credential status.

---

### Task 34 — Context Economy
**Depends on:** 5, 12, 20, 26

```
Context Value =
  (Goal_Match) × (Recency) × (Importance) × (Relationship)
× (Project_Activity) × (Confidence) × (Trust) × (Mode_Relevance)
```

Multiplicative. Any zero eliminates the object. Weights configurable per intent type.

---

### Task 35 — Domain Events
**Depends on:** 1

Typed event contract system. Full catalog includes all provider events, bootstrap events, CIL events, and CerbaSeal events:
- CIL: CILQueryRequested, CILQueryResolved, CILReuseHit, CILFrontierEscalated, CILDriftDetected, CILContradictionDetected, CILUnavailable
- CerbaSeal: GovernedActionSubmitted, GovernedActionAllowed, GovernedActionHeld, GovernedActionRejected, GovernanceEvidenceReceived, GovernanceServiceUnavailable, ExecutionReleased, ExecutionCancelled

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies
**Depends on:** 10, 33

Standard lifecycle: initialize() → boot() → health_check() → pause() → resume() → recover() → shutdown(). AUTO_RESTART, AUTO_FALLBACK, GRACEFUL_DISABLE, MANUAL_RECOVERY.

---

### Task 37 — Self-Test Framework
**Depends on:** 33, 36

"Run Full System Check." Test suites include: Provider Abstraction Suite, Bootstrap Suite, Internal Capability Services Suite (verifies CIL graceful degradation behavior; verifies CerbaSeal fail-closed behavior; verifies no consequential action routes to execution without a GovernedActionAllowed event; verifies CIL and CerbaSeal database isolation).

---

### Task 38 — Recovery Modes
**Depends on:** 10, 32

Cold Boot · Warm Restart · Safe Mode · Recovery Mode · Migration Mode · Read Only.

---

### Task 39 — Data Ownership
**Depends on:** 1, 3

created_by, modified_by, verified_by, imported_from, generated_by, current_owner on every object.

---

### Task 40 — Knowledge Aging
**Depends on:** 12, 26

Fresh → Current → Old → Historical → Stale → Expired.

---

### Task 41 — System Manifest
**Depends on:** 9, 19, 29, 33

Auto-generated, always current, under 2 seconds. After Task #48, System Manifest includes an Internal Capability Services section showing CIL and CerbaSeal health, last call, resolution tier distribution (CIL), verdict distribution (CerbaSeal), and credential status (valid/expiring/missing — never the credential value).

---

### Task 42 — World State Engine
**Depends on:** 1, 6, 10

Active model of external reality: time/timezone/holidays/market hours (always maintained) + location context (opt-in) + technical deprecation monitoring + owner-configured topic monitoring (all explicit opt-in).

---

### Task 43 — Operational Memory
**Depends on:** 1, 3, 12, 25

Behavioral pattern learning from observed signals. Pattern confidence lifecycle: candidate → established → strong.

---

### Task 44 — Initiative Engine
**Depends on:** 10, 15, 42, 43

Proactive operational observations. Quality over quantity — configurable daily limits and deduplication.

---

### Task 45 — Operational Intelligence Engine
**Depends on:** 16, 26, 34, 42, 43, 44

Always-on: "What deserves attention right now?" Powers Today page, Morning Brief opening, Ask Lee context, Android Today screen.

---

### Task 46 — Provider Abstraction Layer
**Depends on:** 1, 6, 35

The boundary between external services and Lee's internal engines. Five provider categories: CommunicationProvider, DocumentProvider, DevelopmentProvider (Intelligence), SchedulingProvider, StorageProvider.

**Not in this layer:** CIL and CerbaSeal. They are Internal Capability Services (Task #48) with their own layer, interfaces, authentication model, and failure policies. This distinction is enforced in the Self-Test Framework.

DevelopmentProvider (Intelligence) includes: `get_file_tree()` and `get_file_content()` for Bootstrap Engine; `fetch_releases()`, `fetch_deployments()`, `get_build_status()`, `get_dependency_alerts()` for health signals; `RepoFirstConnected` event that triggers Project Bootstrap Engine.

---

### Task 47 — Project Bootstrap Engine
**Depends on:** 3, 6, 13, 21, 46

When a repository is connected, LEE reads all available evidence and builds an initial knowledge model automatically. Nine parallel extractors: Technology Stack, Repository Map, Architecture Graph, Dependency Inventory, API Inventory, Documentation Inventory, Configuration Inventory, Security Observations, Missing Documentation Detection. Writes typed Fact Ledger entries, Interpretation candidates, Intelligence Graph nodes. Runs cross-project relationship detection across all bootstrapped repositories. Presents a structured confirmation conversation. Monitors ongoing structural changes via CommitPushed events.

---

### Task 48 — Internal Capability Services Layer — CIL + CerbaSeal
**Depends on:** 1, 5, 10, 11, 31, 33, 35, 46

The versioned API contracts, typed request/response schemas, authentication boundary, routing logic, failure behavior, and domain events that let LEE call CIL and CerbaSeal cleanly — without coupling to their internal implementations or sharing their databases.

**ReasoningService interface (CIL):**
- LEE sends: correlation_id, query_text, semantic_domain, intent record, project_id, context_asset_refs, freshness_requirement, risk_classification, reuse_permitted, frontier_escalation_permitted, cost_ceiling_usd, lee_brain_version, source_context_checksum
- CIL returns: resolution_tier (T1/T2/T3), answer, cognitive_asset_id, confidence, cost_usd, latency_ms, drift_detected, contradiction_detected, provenance, governance_status, freshness_state
- Failure: graceful degradation — mark CIL DEGRADED, route to frontier tier, emit CILUnavailable event, retry after 5 minutes

**GovernanceService interface (CerbaSeal):**
- LEE sends: proposed_action, action_class, workflow_class, actor_identity, target_system, affected_project_id, authority_class, required_approvals, approvals_present, reversibility, data_sensitivity, communication_recipient, evidence_refs, policy_pack_version
- CerbaSeal returns: verdict (ALLOW/HOLD/REJECT), reason_codes, checked_invariants, missing_approvals, decision_id, decision_envelope, evidence_bundle_ref, audit_entry_ref, authorization_expiry, human_confirmation_required
- Failure: fail-closed — action placed on HOLD, GovernanceServiceUnavailable event emitted, no execution without a valid ALLOW verdict

**Authentication:** service identities, short-lived signed JWT tokens (TTL ≤ 5 min), HMAC request signatures, strict allowlists, encrypted transport, replay protection, rate limits, scoped permissions (CIL: query + nomination; CerbaSeal: evaluate only — no policy modification)

**Database isolation:** LEE never accesses CIL's or CerbaSeal's databases directly. All interaction through versioned APIs. This is an ABSOLUTE constitutional provision.

**Actions requiring CerbaSeal:** sending external email/message/post, sharing a document, modifying production repos or deployments, deleting important LEE memory, financial transactions, granting connector permissions, exporting sensitive data, contacting investors or pilot partners, executing workflows in other Lamont Labs systems.

**Actions NOT requiring CerbaSeal:** reading, searching, summarizing, organizing, drafting, building context packets, generating internal briefs, identifying stale information, suggesting next actions, any read-only operation.

**ServiceRegistry:** CIL and CerbaSeal registered in Capability Registry with health state (healthy/degraded/unavailable), last health check, last call, failure_policy, credential_env_key (name only — never value). Health checks every 2 minutes. Surfaced in System Manifest and Settings → Internal Services.

---

## Architecture Reference Notes

### The three-tier service distinction

| Tier | Systems | Interface | Failure policy |
|------|---------|-----------|---------------|
| Internal Capability Services | CIL, CerbaSeal | ReasoningService, GovernanceService | CIL: graceful degradation; CerbaSeal: fail-closed |
| External Providers | Gmail, GitHub, Google Calendar | CommunicationProvider, DevelopmentProvider, SchedulingProvider | Graceful degradation; Lee reads from cache |
| Internal Engines | Query Engine, Understanding Pipeline, Initiative Engine ... | /internal/[engine-name] versioned API | Per-engine Recovery Policy |

### Confidence at bootstrap time

| Source | Confidence |
|--------|-----------|
| package.json, Cargo.toml, go.mod | 0.95 |
| OpenAPI spec, Prisma schema | 0.90 |
| README documented facts | 0.70 |
| Inferred from folder naming | 0.40 |
| Owner-confirmed after bootstrap | Boosted to ≥ 0.90 |

### Confidence vs. Trust

| | Confidence | Trust |
|---|---|---|
| Measures | Epistemic certainty of a specific object | Reliability of a subsystem over time |
| Range | 0–1 | 0–100 (starts at 50) |
| Decay | Per inference hop | 0.5/day without activity |

### Curiosity vs. Initiative vs. Operational Intelligence

| | Curiosity (#15) | Initiative (#44) | Operational Intelligence (#45) |
|---|---|---|---|
| Type | Questions | Observations | Continuous prioritization |
| Trigger | Gaps, staleness | Drifts, events | Always on |
| Output | Questions to ask | Observations to note | Ranked operational context |

### Provider email path options

| Option | Status |
|--------|--------|
| Gmail → GmailAdapter | Current |
| Proton Bridge → ProtonBridgeAdapter | Desktop phase — adapter swap, zero engine changes |
| Outlook → OutlookAdapter | Future |
| IMAP generic → IMAPAdapter | Future fallback |

### CerbaSeal verdict behavior

| Verdict | LEE behavior |
|---------|-------------|
| ALLOW | Execute action · record GovernedActionAllowed · record execution |
| HOLD | Surface missing_approvals to owner · wait · do not execute |
| REJECT | Surface reason_codes to owner · do not execute · record GovernedActionRejected |
| Unavailable | Place on HOLD · emit GovernanceServiceUnavailable · surface to owner · never execute |

---

*Plan version: 9.0 · Task count: 48 · Date: July 2, 2026*

*New in v9.0: Task #48 (Internal Capability Services Layer — CIL + CerbaSeal) · Architecture Principle #22 added (LEE coordinates; CIL reasons cheaply; CerbaSeal governs execution; they are separate services) · Lamont Labs Operating Stack section added · Complete Request Flow diagrams (informational + consequential) added · Layer 7 (Internal Capability Services) added to hierarchy · Three-tier service distinction table added · CerbaSeal verdict behavior table added · Task #46 updated to explicitly exclude CIL/CerbaSeal · Tasks #5, #8, #10, #11, #19, #22, #31, #33, #37, #41 updated to reflect CIL/CerbaSeal integration · CIL and CerbaSeal ABSOLUTE constitutional provisions added to Task #19 · Internal Capability Services Suite added to Self-Test (#37) · System Manifest Internal Capability Services section added (#41)*
