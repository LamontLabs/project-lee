# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 6.0 — 45 Tasks*

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

## Architecture Principles (v6.0)

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

**16. Lee knows the outside world.** The World State Engine maintains an active model of external context: time, calendar, market signals, technical deprecations, and owner-configured monitoring topics. Lee's reasoning is never context-blind to external reality.

**17. Lee knows how you work.** Operational Memory observes the owner's demonstrated behavioral patterns — routines, attention windows, response cadence, work session types — from existing signals. Not declared preferences. Observed operational rhythm.

**18. Lee initiates.** The Initiative Engine surfaces proactive operational observations without being asked. Not reminders. Not alerts. Operational awareness delivered when it is actionable.

**19. Continuous prioritization is the heart.** The Operational Intelligence Engine is the always-on signal that answers "what deserves attention right now?" It synthesizes everything — knowledge, external context, behavioral patterns, initiative observations, strategy — into a live operational answer. This is what makes LEE a Chief of Staff rather than an assistant.

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
│  7. INTERFACES & OBSERVABILITY                                  │
│  Console · Android App · Connectors                            │
│  Cost Engine · Backup & Migration                              │
│  Context Economy · Brief Engine · Model Router                 │
│  Self-Test Framework · System Manifest                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

```
Input
  ↓
Intent Engine          (classify intent → typed Intent record)
  ↓
Operational Intelligence Engine   (what is the current focus?)
  ↓
Query Engine           (retrieve candidates using intent spec)
  ↓
Context Economy        (score candidates → select within token budget)
  ↓
Model Router           (select model tier → assemble final packet)
  ↓
Explanation Engine     (translate output for audience, if applicable)
  ↓
Output
  ↓
Domain Event emitted   (typed event → Event Log)
  ↓
Subscribers react      (Confidence re-propagation, Initiative Engine,
                        Operational Intelligence refresh, State transitions…)
```

---

## Governance Stack

```
Constitution Engine    (immutable — ABSOLUTE provisions block unconditionally)
  ↓
Policy Engine          (mutable standing rules)
  ↓
Governance Engine      (case-by-case approvals)
  ↓
Orchestration Engine   (scheduling and resource-aware dispatch)
  ↓
Resource Engine        (live resource state)
  ↓
State Engine           (current operational state)
  ↓
Capability Registry    (registered engines and their capabilities)
  ↓
Internal APIs          (versioned contracts)
  ↓
Engines
```

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

---

## Task Descriptions

---

### Task 1 — Foundation & Core Schema
**Depends on:** nothing

Base layer for everything. Node.js + TypeScript + Express server, PostgreSQL + Drizzle ORM, core database schema, event sourcing infrastructure.

**Event Sourcing constraint:** Re-projection from the Event Log alone must produce a consistent database state.

**Done when:** Server starts and responds to health check. Core tables created via Drizzle migrations. Event Log append-only. OpenAPI spec valid and Orval codegen runs.

---

### Task 2 — Console (Web App)
**Depends on:** 1

Primary desktop interface. Dark-mode-first React web app. No business logic client-side. No emojis anywhere.

**Done when:** App loads with dark mode. Layout shell complete. Today page renders. Settings scaffold in place.

---

### Task 3 — Understanding Pipeline
**Depends on:** 1

Ingestion and comprehension layer. Accepts text, URLs, files, voice notes. Extraction → enrichment → entity detection → classification → importance scoring → storage.

**Done when:** Text input accepted via API. Extraction produces typed objects to Fact/Interpretation Ledgers. Source archived to App Storage.

---

### Task 4 — Brief Engine
**Depends on:** 3, 5

Daily briefing generator. Assembles context packet, calls Model Router, renders structured document. Briefs are immutable after generation.

**Done when:** Morning Brief generated on schedule with all sections. Briefs immutable and history-browsable.

---

### Task 5 — Model Router & Context Engine
**Depends on:** 1

Routing intelligence between Lee and external models. Tiered model selection. Context Packet Preview shows exactly what will be sent.

**Done when:** Requests routed to correct model tier. Token budget respected. CIL reuse functional. Cost estimate shown before strong-model calls.

---

### Task 6 — Connector Engine
**Depends on:** 1, 3

Bridge to external data sources. Gmail, Google Calendar, Google Drive, GitHub. Scheduled syncs. Read-only. Connector errors create health alerts — never silent failures.

**Done when:** All 4 connectors sync without errors. Ingested data flows through Understanding Pipeline. Connector health visible in Settings.

---

### Task 7 — Android App
**Depends on:** 2, 4

Mobile surface for Lee. Expo React Native. Presentation only — no business logic. Screens: Today, Capture, People, Settings.

**Done when:** App builds on Android. All screens functional. Brief push notification delivered. Offline capture queue works.

---

### Task 8 — Cost Engine
**Depends on:** 1, 5

Financial accountability layer. Tracks every token and every model call. Hard limits trigger governance holds, not silent failures.

**Done when:** Every model call logged with cost. Daily/weekly/monthly spend visible. Budget limits enforced with governance holds.

---

### Task 9 — Backup, Migration & Brain Versioning
**Depends on:** 1

Portability and durability layer. Brain Version (YYYY.M.minor) covers Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index. Tagged on every backup.

**Done when:** Daily automated backup runs and verifies. Backup downloadable. Verify Archive and Test Restore functional. Brain Version recorded in every manifest.

---

### Task 10 — Orchestration Engine & Scheduler Calendar
**Depends on:** 1

Scheduler and dispatcher for all background work. Priority queue (CRITICAL/HIGH/NORMAL/LOW). Engine registration, concurrency management, retry with exponential backoff.

**Scheduler Calendar:** Settings → System → Schedule shows every background job on a 24-hour timeline with last result, next run time, and estimated duration. Amber indicator for deferred jobs. Read-only.

**Done when:** Priority queue operational. All engines register jobs. Scheduler Calendar renders in Console.

---

### Task 11 — Governance Engine
**Depends on:** 1, 10

Approval and oversight layer. Risk levels: LOW (auto-approve + log), MEDIUM (notify + approve), HIGH (explicit confirmation), CRITICAL (full review). Full audit trail.

**Done when:** All risk-rated actions route through governance. Approval queue in Console. Budget breaches and policy violations create governance holds.

---

### Task 12 — Memory Architecture
**Depends on:** 1, 3

Six-tier memory hierarchy: Working → Short-term → Long-term → Reference → Archive → Semantic (Stage 6, implemented by Task #28). Promotion, demotion, and compression rules.

**Done when:** All six tiers defined. Stages 1–3 compression functional. Memory tier visible on all object detail pages.

---

### Task 13 — Intelligence Graph
**Depends on:** 1, 3

Knowledge graph layer. Typed nodes and typed edges. Automatic edge creation from Understanding Pipeline. Pattern detection: clusters, weak links, orphaned nodes.

**Done when:** Nodes and edges persisted. Automatic edges created on ingestion. Graph visualization renders.

---

### Task 14 — Identity & Relationship Engine
**Depends on:** 1, 6, 13

People layer. Relationship strength, interaction history, follow-up states, waiting loops. Trust tiers: Close/Professional/Extended/Peripheral.

**Done when:** People entities tracked with full profile. Trust tiers assigned. Follow-up and waiting states visible.

---

### Task 15 — Curiosity Engine
**Depends on:** 3, 12, 13

Proactive question-asking layer. Scans for staleness, gaps, and conflicts. Does not ask questions Lee could answer herself. Trust Score per curiosity item type tracked.

**Done when:** Detection runs. Curiosity items generated and ranked. Questions appear in Morning Brief.

---

### Task 16 — Strategy Engine
**Depends on:** 13, 14, 15

Forward-looking intelligence layer. OKRs, strategic option evaluation, recommendations with confidence and risk assessments, prioritization. Strategies update when underlying facts change.

**Done when:** OKRs tracked. Recommendations with Why Chain generated. Strategy page renders.

---

### Task 17 — Reflection Engine
**Depends on:** 12, 13, 16

Pattern recognition and retrospective layer. Period comparison, trend identification, lesson surfacing, structural gap detection. Feeds Curiosity Engine.

**Done when:** Period comparison runs. Reflection summaries generated and stored as Interpretation Ledger records.

---

### Task 18 — Operating Modes
**Depends on:** 10, 11

System-wide behavioral configurations: FOCUS, TRAVEL, DEEP_WORK, REVIEW, EMERGENCY. Every engine reads current mode parameters at dispatch time.

**Done when:** All modes defined. Mode switch triggers reconfiguration. Current mode visible in status bar.

---

### Task 19 — Constitution Engine
**Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. ABSOLUTE provisions block unconditionally. CONFIGURABLE provisions are owner-adjustable. Amendment requires 72-hour quorum process.

**ABSOLUTE provisions include:** Provenance non-negotiable. Internal APIs not exposed externally. Semantic Index embeddings stored locally. No silent failures. Event Log append-only. Facts and Interpretations never mixed.

**Done when:** ConstitutionEngine.check() called before every significant action. ABSOLUTE violations block and log. Constitution version in Settings and every Brain Version.

---

### Task 20 — Confidence Propagation
**Depends on:** 1, 12, 13

Epistemic integrity layer. Every object carries a confidence score. Confidence degrades through inference chains at defined degradation factors per hop.

**Done when:** Propagated confidence computed through Why Chains. Displayed on detail pages with color coding. Low-confidence objects flagged in briefs.

---

### Task 21 — Fact/Interpretation Separation
**Depends on:** 1, 3, 13

Two permanent, separate ledgers enforced at schema, API, and constitutional layers. No API that accepts one will accept the other.

**Done when:** Two separate DB tables with enforced constraints. Ledger type badge on all detail pages. Constitution ABSOLUTE provision wired.

---

### Task 22 — Why Chain & Provenance
**Depends on:** 1, 5, 20, 21

Reasoning transparency layer. Every recommendation and interpretation has a navigable Why Chain. Provenance is an ABSOLUTE constitutional provision.

**Done when:** Why Chains created for all recommendations. UI renders with source links and confidence at each step.

---

### Task 23 — Assumption Ledger
**Depends on:** 12, 20, 21, 22

Assumption lifecycle: active → under_review → invalidated. Invalidation propagates to all dependent conclusions as a Domain Event.

**Done when:** Assumption records created with linked conclusions. Invalidation cascades. Assumptions page renders.

---

### Task 24 — Decision Impact Graph
**Depends on:** 13, 16, 22

Consequence tracking layer. Separate from Intelligence Graph — Impact Graph tracks historical consequence; Intelligence Graph tracks structural relationship.

**Done when:** Decision nodes created on governance-approved decisions. Consequence edges recorded. Impact Graph visualization renders.

---

### Task 25 — Digital Twin Timeline
**Depends on:** 1, 12, 13, 22, 24

Operational history as a scrollable, zoomable, filterable timeline. Events sourced from Event Log, connector syncs, briefs, governance decisions, and state changes.

**Done when:** Timeline renders with events from all sources. Filters working. Click-through to object detail.

---

### Task 26 — Query Engine
**Depends on:** 1, 12, 13, 21

Universal data access layer. No intelligence engine reads from storage directly. Single retrieval policy, ranking algorithm (importance × freshness × confidence × relevance), cache, authorization layer. Every result includes why_included.

**Done when:** All intelligence engines use Query Engine exclusively. Cache operational with event-driven invalidation. Query telemetry logged.

---

### Task 27 — Explanation Engine
**Depends on:** 5, 22, 26

Audience-aware translation layer. Explains Lee's outputs for: Developer, Investor, Founder, Executive, Legal, Technical, General. Explanations cached and reused until source objects change.

**Done when:** All audience profiles defined. Explanations callable from Ask Lee, Brief Engine, Strategy page. Why Chain attached to every explanation.

---

### Task 28 — Semantic Index
**Depends on:** 3, 12, 26

Discovery layer. Vector embedding store over all Lee's knowledge. Enables fuzzy semantic search. Stage 6 of Memory Compression Roadmap.

**Privacy constraint (ABSOLUTE):** Semantic Index embeddings stored locally. Never transmitted externally without governance approval.

**Done when:** Index covers all knowledge object types. Semantic search callable from Query Engine. Full rebuild utility functional.

---

### Task 29 — Policy Engine
**Depends on:** 1, 19

Mutable operational policy layer. Manages: Cost Policy, Privacy Policy, Retention Policy, Notification Policy, Relationship Policy, Backup Policy, Connector Policy. All versioned.

**Done when:** All policy types defined with defaults. All engines wire PolicyEngine.check() calls. Policy history browsable with rollback.

---

### Task 30 — Resource Engine
**Depends on:** 1, 10

Resource awareness layer. Tracks CPU, RAM, disk, token budgets, API quotas, network quality, battery. HEALTHY/CONSTRAINED/CRITICAL per dimension. Orchestration Engine reads before every dispatch.

**Done when:** All dimensions sampled. CONSTRAINED defers LOW/NORMAL. CRITICAL defers all but CRITICAL. Resource health card in Health page.

---

### Task 31 — Intent Engine
**Depends on:** 1, 26

Intent classification layer. Every request produces a typed Intent record before anything else happens. Corrections feed Learning Engine.

**Done when:** All Ask Lee requests classified into Intent records. Intent shown with correction option. Intent history browsable.

---

### Task 32 — State Engine
**Depends on:** 1, 10

Operational state: Booting, Learning, Idle, Thinking, Briefing, Importing, Synchronizing, Waiting, Recovering, Offline, Degraded. Exactly one primary state at all times. Visible on all surfaces.

**Done when:** State transitions defined and enforced. All transitions logged. Status bar shows current state. Orchestration Engine uses state for deferral decisions.

---

### Task 33 — Internal API Contracts & Capability Registry
**Depends on:** 1, 10

Every engine exposes a versioned, typed REST API at /internal/[engine-name]. Zod-validated on every request and response. Capability Registry populated by all engines on startup with heartbeats.

**Constitutional constraint (ABSOLUTE):** /internal/ namespace never accessible outside Lee.

**Done when:** All engines expose versioned internal APIs. Registry populated. Heartbeat timeout detection marks unavailable engines. Engines panel in Health page complete.

---

### Task 34 — Context Economy
**Depends on:** 5, 12, 20, 26

Dynamic context relevance formula:

```
Context Value =
  (Goal_Match × W_goal) × (Recency × W_recency) × (Importance × W_importance)
× (Relationship × W_relationship) × (Project_Activity × W_project)
× (Confidence × W_confidence) × (Trust × W_trust) × (Mode_Relevance × W_mode)
```

All factors [0, 1]. Multiplicative — any zero eliminates the object. Weights configurable per intent type via Policy Engine.

**Done when:** Formula replaces tier-based assembly. Context Packet Preview shows scores and breakdown. Cold-start defaults functional.

---

### Task 35 — Domain Events
**Depends on:** 1

Typed event contract system. Every significant state change emits a typed Domain Event. No generic log entries. Every event: event_id, event_type (enum), event_version, occurred_at, caused_by, source_engine, payload (type-specific Zod schema), session_id, brain_version.

**Caused-by chain:** Every event records the event_id that triggered it. Causal chains are browsable.

**Event catalog includes:** KnowledgeCreated/Updated/Invalidated, FactAccepted/Invalidated, InterpretationCreated/Revised, PersonCreated, InteractionRecorded, StrategyGenerated/Invalidated, BriefGenerated, ConnectorSynced/Failed, ObjectPromoted/Demoted, ConfidenceChanged/Propagated, AssumptionRecorded/Invalidated, ConstitutionAmended/CheckFailed, PolicyChanged/ViolationDetected, BrainVersionChanged, BackupCompleted/Failed, ModeChanged, StateChanged, EngineRegistered/Unavailable, SelfTestCompleted, IntentClassified/Corrected, ExplanationGenerated, OwnerVerified, KnowledgeStale/Aged, BootStarted/Completed, ManifestGenerated, WorldStateUpdated, OperationalPatternEstablished/Broken, InitiativeItemCreated, OperationalContextUpdated.

**Done when:** EventBus.emit() validates all events before writing. All engines emit typed events — no direct Event Log inserts. Subscription system wires all cross-engine reactions. Event Log viewer in Console with filter, payload, and causal chain trace.

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies
**Depends on:** 10, 33

Standard lifecycle interface for all engines: initialize(), boot() → BootResult, health_check() → HealthStatus, pause(reason), resume(), recover(policy), shutdown().

**Recovery Policies:** AUTO_RESTART (transient failures), AUTO_FALLBACK (redirect to declared fallback), GRACEFUL_DISABLE (mark capabilities unavailable), MANUAL_RECOVERY (CRITICAL alert + governance hold — data-sensitive engines only).

**Startup sequence:** Foundations → Knowledge → Retrieval → Intelligence → Coordination → Operational Context → Interfaces. Each layer waits for the previous to complete boot.

**Done when:** All engines implement EngineLifecycle interface. Dependency declarations in Capability Registry. Auto-degraded mode on missing optional dependencies. Layer-ordered startup enforced. Lifecycle state in Health page.

---

### Task 37 — Self-Test Framework
**Depends on:** 33, 36

"Run Full System Check" — tests every engine, API, connector, policy, query, backup, and migration path. PASS / WARN / FAIL per test with evidence attached.

**Test suites:** Engine Suite, API Suite, Connector Suite, Policy Suite, Query Suite, Event Log Suite, Backup Suite, Constitution Suite, Semantic Index Suite, Domain Events Suite, Context Economy Suite, World State Suite, Operational Memory Suite.

**Done when:** Run Full System Check functional from Settings → System. All suites implemented. Weekly scheduled self-test operational. Full self-test auto-triggered after every restore.

---

### Task 38 — Recovery Modes
**Depends on:** 10, 32

How Lee starts or restarts — distinct from operational state (Task #32):

- **Cold Boot** — full initialization from scratch; all checks; used after crash or restore
- **Warm Restart** — preserved in-memory state where safe; requires clean_shutdown marker
- **Safe Mode** — Foundations layer only; all other engines UNAVAILABLE; intelligence disabled
- **Recovery Mode** — repair agenda from previous session drives startup; non-repair writes disabled; owner confirms each step
- **Migration Mode** — Brain Version migration framework active; non-essential writes disabled
- **Read Only Mode** — all write operations disabled; all read operations available

**Done when:** All six modes enforce their constraints. Boot mode determination logic runs on every startup. Safe Mode banner on all Console pages. Boot mode logged as BootStarted domain event.

---

### Task 39 — Data Ownership
**Depends on:** 1, 3

Six ownership fields on every knowledge object: created_by, modified_by, verified_by, imported_from, generated_by, current_owner. All populated automatically by creation/modification paths.

**Verification:** "Mark as Verified" resets the age clock (Task #40) and feeds Trust Score. Informational — never required.

**Done when:** All ownership fields on all knowledge object tables. All creation/modification paths auto-populate fields. Ownership section on every detail page. Why Chain UI includes ownership.

---

### Task 40 — Knowledge Aging
**Depends on:** 12, 26

Temporal freshness dimension, orthogonal to confidence and memory tier. Six age states: Fresh → Current → Old → Historical → Stale → Expired.

- **Stale:** Curiosity item created automatically
- **Expired:** Excluded from context packets entirely (Goal_Match forced to 0)
- **Stale in Context Economy:** Recency factor halved

Age windows configurable per object type via Retention Policy. Verification resets the age clock.

**Done when:** Age state on all knowledge objects. Daily aging scan at LOW priority. Curiosity Engine creates Stale items. Context Economy excludes Expired objects. Age badge on all detail pages.

---

### Task 41 — System Manifest
**Depends on:** 9, 19, 29, 33

Auto-generated living document. Always current. Generated fresh on every request. Sections: Identity, Constitution, Policies, Brain State, Capabilities, Connectors, Schemas, Indexes, Statistics, Storage, Health, Dependencies.

**Exports:** JSON and Markdown, 24-hour expiry. manifest_at_backup.json included in every Brain backup archive.

**Done when:** GET /internal/manifest returns full document in under 2 seconds. Manifest page in Console Settings with collapsible sections. Weekly snapshots stored. Manifest comparison view functional.

---

### Task 42 — World State Engine
**Depends on:** 1, 6, 10

Active model of external reality. Not general web search — a curated, structured model of external signals relevant to the owner's operational life.

**Universal signals (always maintained):** current date/time, timezone, upcoming holidays (next 30 days), market hours and open/closed status, fiscal period.

**Optional location context:** current city/region, local time, active travel window from Calendar connector.

**Technical dependency monitoring:** API version tracking, deprecation notice detection, breaking change alerts for connected services.

**Owner-configured monitoring topics (all explicit opt-in):** news areas, regulatory domains, competitor activity, software/platform changelogs.

**Done when:** Universal signals refresh hourly. Owner-configured topics refresh 1–4x/day. WorldStateUpdated domain events emitted on value change. World State readable by Brief Engine, Strategy Engine, Initiative Engine, and Operational Intelligence Engine. Settings → World State page functional.

---

### Task 43 — Operational Memory
**Depends on:** 1, 3, 12, 25

Behavioral pattern learning from observed signals — not declared preferences. Observes only from data Lee already has: Gmail open/read timestamps, GitHub commit timestamps, Console session activity, capture timestamps.

**Pattern types:** routine detection (daily/weekly sequences), attention patterns (what gets processed when), response cadence (latency by contact type), work session patterns (what type of work at what time), project attention cycles, decision making patterns.

**Pattern confidence lifecycle:** candidate (2 obs, conf 0.3) → established (5 consistent, conf 0.7) → strong (10+ consistent, conf 0.9). Contradictions reduce confidence. Pattern break creates OperationalPatternBroken event.

**Done when:** Behavioral signals ingested from existing connectors and session events. Pattern detection runs daily. Pattern confidence lifecycle enforced. Settings → Operational Memory page shows all patterns with evidence. Owner can dismiss, confirm, or add manual overrides.

---

### Task 44 — Initiative Engine
**Depends on:** 10, 15, 42, 43

Proactive operational observations without being asked. Not reminders. Not alerts. Operational awareness delivered when actionable.

**Observation types:** drift (project inactivity, relationship response latency, spending trajectory), relationship (contact gap on Close tier, reply received), financial (cost spike, budget trajectory), technical health (deprecations with active dependencies), assumption health (invalidated assumptions under unregenerated strategies), knowledge drift (Stale object concentrations), data health (backup freshness), world state triggers (deprecation announced, regulatory signal matched), operational rhythm breaks.

**Quality over quantity:** configurable daily limit (default: 5 HIGH/CRITICAL, 10 MEDIUM/LOW). Deduplication window per observation type + entity. Significance-ranked selection when limit reached.

**Done when:** All drift detectors implemented. World State and Operational Memory subscriptions wired. Deduplication and daily limit enforced. Initiatives page in Console. HIGH/CRITICAL items in Morning Brief. CRITICAL items trigger push notification.

---

### Task 45 — Operational Intelligence Engine
**Depends on:** 16, 26, 34, 42, 43, 44

Continuous prioritization engine. The always-on signal that answers: "What deserves attention right now?"

**Operational Context contains:**
- **Active priority** — highest-priority item given strategy, projects, and current operational window
- **What changed** — most significant changes since last review
- **What is drifting** — items trending toward concern without crossing a threshold
- **What is waiting** — pending actions, governance holds, follow-ups, unacknowledged observations
- **What is blocked** — dependencies and prerequisites that are unresolved
- **What is at risk** — flagged risks and items with invalidated assumptions
- **What can wait** — items present but not requiring attention today
- **What should be ignored today** — low-relevance items, explicitly labeled

**Scoring:** modified Context Economy formula with operational window weighting (from Operational Memory), world state weighting, initiative significance weighting, time sensitivity multiplier, recency bonus.

**Refresh:** every 15 minutes + immediately on HIGH/CRITICAL initiative item, governance hold creation, strategy invalidation, or explicit request.

**Done when:** Operational Context computed and stored every 15 minutes. GET /internal/operational-intelligence/context and /focus endpoints functional. Today page in Console powered entirely by Operational Intelligence Engine. Morning Brief opening derived from active priority. Ask Lee context packets include current Operational Context summary. Android Today screen shows current focus on every app open.

---

## Architecture Notes

### Confidence vs. Trust

| | Confidence | Trust |
|---|---|---|
| Measures | Epistemic certainty of a specific object | Reliability of a subsystem over time |
| Range | 0–1 | 0–100 (starts at 50) |
| Decay | Per inference hop (configurable rate) | 0.5/day without activity |
| Rises when | Source quality high; chain is short | Owner verifies accuracy of subsystem outputs |
| Used in | Why Chain, Brief filtering, Context Economy | Context Economy, Curiosity item weighting |

### Recovery Mode vs. Operational State

| | Recovery Modes (Task #38) | Operational States (Task #32) |
|---|---|---|
| Describes | How Lee starts or restarts | What Lee is doing right now |
| Examples | Cold Boot, Safe Mode, Recovery Mode | Idle, Thinking, Importing, Offline |
| Set by | Boot mode determination logic at startup | Orchestration Engine during runtime |

### Brain Version vs. Lee Version

| | Lee Version | Brain Version (YYYY.M.minor) |
|---|---|---|
| Tracks | Software | Owner's accumulated knowledge state |
| Changes when | Code is updated | Memory schema, Constitution, Policies, or Semantic Index structure changes |
| Used by | Deployments, changelogs | Backup manifests, migration scripts, System Manifest |

### Curiosity vs. Initiative vs. Operational Intelligence

| | Curiosity Engine (#15) | Initiative Engine (#44) | Operational Intelligence Engine (#45) |
|---|---|---|---|
| Type | Questions | Observations | Continuous prioritization |
| Trigger | Knowledge gaps, staleness, conflicts | Drifts, events, pattern breaks, world state signals | Always on — 15-min refresh + reactive |
| Output | Questions to ask | Observations to note | Ranked operational context |
| Action required? | Owner answers or defers | Owner acknowledges or dismisses | No action required — it is the signal |

---

*Plan version: 6.0 · Task count: 45 · Date: July 2, 2026*

*New in v6.0: Tasks #42–#45 (World State Engine, Operational Memory, Initiative Engine, Operational Intelligence Engine) · New architecture principles #16–#19 · Layer 6 (Operational Context) added · Curiosity vs. Initiative vs. Operational Intelligence distinction table added · Execution flow updated to include Operational Intelligence Engine*
