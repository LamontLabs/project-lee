# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 7.0 — 46 Tasks*

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

## Architecture Principles (v7.0)

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

**20. Providers are replaceable. The operating intelligence is not.** The Provider Abstraction Layer sits between every external service and Lee's internal engines. No engine above the adapter layer references Gmail, GitHub, or Google Calendar by name. It references CommunicationProvider, DevelopmentProvider, SchedulingProvider. Switching from Gmail to Proton Mail Bridge is an adapter swap — zero engine changes. This principle applies to every external service Lee will ever connect to.

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
│  7. PROVIDER LAYER                                              │
│  Provider Abstraction Layer                                    │
│  Communication · Document · Development · Scheduling · Storage │
│  Gmail Adapter · Google Calendar Adapter · Google Drive Adapter│
│  GitHub Adapter · [Proton Bridge Adapter — desktop phase]      │
├─────────────────────────────────────────────────────────────────┤
│  8. INTERFACES & OBSERVABILITY                                  │
│  Console · Android App · Connectors                            │
│  Cost Engine · Backup & Migration                              │
│  Context Economy · Brief Engine · Model Router                 │
│  Self-Test Framework · System Manifest                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider Abstraction Model

The Provider Layer is the boundary between external services and Lee's operating intelligence. Nothing above this boundary references a specific service by name.

```
External services
  Gmail   Proton Bridge   Outlook   GitHub   GitLab   Google Calendar ...
    ↓           ↓            ↓        ↓        ↓             ↓
  Provider Adapters  (translate service APIs into standard types)
    ↓
  Provider Interfaces
    CommunicationProvider · DocumentProvider
    DevelopmentProvider · SchedulingProvider · StorageProvider
    ↓
  Standardized Domain Events
    EmailReceived · ThreadUpdated · WaitingLoopResolved
    CommitPushed · IssueOpened · PRMerged · BuildFailed
    CalendarEventCreated · MeetingWithPersonDetected · TravelDetected
    DocumentCreated · DocumentUpdated · FileCreated ...
    ↓
  Event Log  →  Subscribed engines
    (Understanding Pipeline, Relationship Engine,
     Initiative Engine, Operational Intelligence, ...)
```

**Proton Mail path (desktop phase):**
```
Proton Mail → Proton Bridge (local IMAP) → ProtonBridgeAdapter
            → CommunicationProvider interface
            → EmailReceived domain event
            → [zero changes to any engine above]
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
Subscribers react
```

---

## Governance Stack

```
Constitution Engine → Policy Engine → Governance Engine
→ Orchestration Engine → Resource Engine → State Engine
→ Capability Registry → Internal APIs → Engines
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
| 46 | Provider Abstraction Layer | 1, 6, 35 |

---

## Task Descriptions

---

### Task 1 — Foundation & Core Schema
**Depends on:** nothing

Base layer for everything. Node.js + TypeScript + Express, PostgreSQL + Drizzle ORM, core database schema, event sourcing infrastructure. Re-projection from the Event Log alone must produce a consistent database state.

---

### Task 2 — Console (Web App)
**Depends on:** 1

Primary desktop interface. Dark-mode-first React web app. No business logic client-side. No emojis anywhere.

---

### Task 3 — Understanding Pipeline
**Depends on:** 1

Ingestion and comprehension layer. Accepts text, URLs, files, voice notes. Extraction → enrichment → entity detection → classification → importance scoring → storage. Entry point for all new knowledge.

---

### Task 4 — Brief Engine
**Depends on:** 3, 5

Daily briefing generator. Assembles context packet, calls Model Router, renders structured document. Briefs are immutable after generation. After Task #45, Brief opening derived from Operational Intelligence Engine's active priority.

---

### Task 5 — Model Router & Context Engine
**Depends on:** 1

Routing intelligence between Lee and external models. Tiered model selection. Token budget enforcement. Context Packet Preview shows exactly what will be sent. CIL for reusable context segments.

---

### Task 6 — Connector Engine
**Depends on:** 1, 3

First provider adapters: Gmail, Google Calendar, Google Drive, GitHub, Replit awareness. All read-only. All produce events rather than directly writing to the Lee Brain.

**Note:** These connectors are the first implementation of the Provider Abstraction Layer (Task #46). After Task #46 is built, they are refactored to emit standardized typed Domain Events through the provider interface (EmailReceived, CommitPushed, etc.) — zero changes to engines above the adapter layer. That refactor is the proof that the abstraction works.

---

### Task 7 — Android App
**Depends on:** 2, 4

Mobile surface for Lee. Expo React Native. Presentation only. Screens: Today (powered by Task #45 Operational Intelligence Engine after that task is built), Capture, People, Settings.

---

### Task 8 — Cost Engine
**Depends on:** 1, 5

Financial accountability layer. Tracks every token and model call. Hard limits trigger governance holds, not silent failures. Spend breakdown by engine and purpose.

---

### Task 9 — Backup, Migration & Brain Versioning
**Depends on:** 1

Portability and durability layer. Brain Version (YYYY.M.minor). Every backup tagged. Verify Archive and Test Restore functional. Migration framework between Brain Versions defined.

---

### Task 10 — Orchestration Engine & Scheduler Calendar
**Depends on:** 1

Scheduler and dispatcher for all background work. Priority queue (CRITICAL/HIGH/NORMAL/LOW). Engine registration, concurrency, retry with exponential backoff.

**Scheduler Calendar:** Settings → System → Schedule shows every background job on a 24-hour timeline. Read-only.

---

### Task 11 — Governance Engine
**Depends on:** 1, 10

Approval and oversight layer. Risk levels: LOW (auto-approve), MEDIUM (notify + approve), HIGH (explicit confirmation), CRITICAL (full review). Full audit trail.

---

### Task 12 — Memory Architecture
**Depends on:** 1, 3

Six-tier memory hierarchy: Working → Short-term → Long-term → Reference → Archive → Semantic (Stage 6 = Task #28). Promotion, demotion, and compression rules.

---

### Task 13 — Intelligence Graph
**Depends on:** 1, 3

Knowledge graph. Typed nodes and typed edges. Automatic edge creation from Understanding Pipeline. Pattern detection: clusters, weak links, orphaned nodes.

---

### Task 14 — Identity & Relationship Engine
**Depends on:** 1, 6, 13

People layer. Relationship strength, interaction history, follow-up states, waiting loops. Trust tiers: Close/Professional/Extended/Peripheral.

---

### Task 15 — Curiosity Engine
**Depends on:** 3, 12, 13

Proactive question-asking. Scans for staleness, gaps, and conflicts. Does not ask questions Lee could answer herself. Trust Score per curiosity item type.

---

### Task 16 — Strategy Engine
**Depends on:** 13, 14, 15

Forward-looking intelligence. OKRs, strategic option evaluation, recommendations with confidence and Why Chain, prioritization. Strategies update when underlying facts change via Event Log subscription.

---

### Task 17 — Reflection Engine
**Depends on:** 12, 13, 16

Period comparison, trend identification, lesson surfacing, structural gap detection. Feeds Curiosity Engine.

---

### Task 18 — Operating Modes
**Depends on:** 10, 11

System-wide behavioral configurations: FOCUS, TRAVEL, DEEP_WORK, REVIEW, EMERGENCY. Every engine reads current mode parameters at dispatch time. Current mode in status bar.

---

### Task 19 — Constitution Engine
**Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. ABSOLUTE provisions block unconditionally before governance evaluation. CONFIGURABLE provisions are owner-adjustable. 72-hour quorum for amendments.

**ABSOLUTE provisions include:** Provenance non-negotiable. /internal/ namespace never exposed externally. Semantic Index embeddings stored locally. No silent failures. Event Log append-only. Facts and Interpretations never mixed. Provider Abstraction Layer enforced (no engine above adapters references a specific service by name).

---

### Task 20 — Confidence Propagation
**Depends on:** 1, 12, 13

Every object carries a confidence score. Confidence degrades through inference chains at defined degradation factors per hop. Always visible in Why Chain and on object detail pages.

---

### Task 21 — Fact/Interpretation Separation
**Depends on:** 1, 3, 13

Two permanent, separate ledgers enforced at schema, API, and constitutional layers. No API that accepts one will accept the other.

---

### Task 22 — Why Chain & Provenance
**Depends on:** 1, 5, 20, 21

Every recommendation has a navigable Why Chain. Provenance is an ABSOLUTE constitutional provision. UI renders with source links and confidence at each step.

---

### Task 23 — Assumption Ledger
**Depends on:** 12, 20, 21, 22

Assumption lifecycle: active → under_review → invalidated. Invalidation propagates to all dependent conclusions as a Domain Event.

---

### Task 24 — Decision Impact Graph
**Depends on:** 13, 16, 22

Consequence tracking. Separate from Intelligence Graph. Tracks historical consequence, not structural relationship.

---

### Task 25 — Digital Twin Timeline
**Depends on:** 1, 12, 13, 22, 24

Operational history as a scrollable, zoomable, filterable timeline. Events from Event Log, connectors, briefs, governance, state changes.

---

### Task 26 — Query Engine
**Depends on:** 1, 12, 13, 21

Universal data access layer. No intelligence engine reads storage directly. Single retrieval policy, ranking (importance × freshness × confidence × relevance), cache, authorization. Every result includes why_included.

---

### Task 27 — Explanation Engine
**Depends on:** 5, 22, 26

Audience-aware translation: Developer, Investor, Founder, Executive, Legal, Technical, General. Explanations cached and reused until source objects change.

---

### Task 28 — Semantic Index
**Depends on:** 3, 12, 26

Vector embedding store over all Lee's knowledge. Discovery-mode fuzzy search. Stage 6 of Memory Compression Roadmap. Embeddings stored locally — ABSOLUTE constitutional provision.

---

### Task 29 — Policy Engine
**Depends on:** 1, 19

Mutable operational policy layer. Cost, Privacy, Retention, Notification, Relationship, Backup, Connector policies. All versioned. Rollback available.

---

### Task 30 — Resource Engine
**Depends on:** 1, 10

Tracks CPU, RAM, disk, token budgets, API quotas, network quality, battery. HEALTHY/CONSTRAINED/CRITICAL per dimension. Orchestration Engine reads before every dispatch.

---

### Task 31 — Intent Engine
**Depends on:** 1, 26

Every request produces a typed Intent record before anything else happens. Corrections feed Learning Engine. Intent history browsable.

---

### Task 32 — State Engine
**Depends on:** 1, 10

Operational state: Booting, Learning, Idle, Thinking, Briefing, Importing, Synchronizing, Waiting, Recovering, Offline, Degraded. Exactly one primary state at all times. Visible everywhere.

---

### Task 33 — Internal API Contracts & Capability Registry
**Depends on:** 1, 10

Every engine exposes a versioned, typed REST API at /internal/[engine-name]. Zod-validated. /internal/ namespace never exposed externally — ABSOLUTE constitutional provision.

---

### Task 34 — Context Economy
**Depends on:** 5, 12, 20, 26

```
Context Value =
  (Goal_Match × W_goal) × (Recency × W_recency) × (Importance × W_importance)
× (Relationship × W_relationship) × (Project_Activity × W_project)
× (Confidence × W_confidence) × (Trust × W_trust) × (Mode_Relevance × W_mode)
```

All factors [0, 1]. Multiplicative. Weights configurable per intent type via Policy Engine.

---

### Task 35 — Domain Events
**Depends on:** 1

Typed event contract system. Every state change emits a typed, versioned, schema-validated Domain Event. EventBus validates before writing. Caused-by chain browsable. Full event catalog including provider events: EmailReceived, ThreadUpdated, WaitingLoopResolved, CommitPushed, IssueOpened, PRMerged, CalendarEventCreated, MeetingWithPersonDetected, TravelDetected, DocumentCreated, WorldStateUpdated, OperationalPatternEstablished, InitiativeItemCreated, OperationalContextUpdated, and all system events.

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies
**Depends on:** 10, 33

Standard lifecycle: initialize() → boot() → health_check() → pause() → resume() → recover() → shutdown(). Recovery Policies: AUTO_RESTART, AUTO_FALLBACK, GRACEFUL_DISABLE, MANUAL_RECOVERY. Layer-ordered startup.

---

### Task 37 — Self-Test Framework
**Depends on:** 33, 36

"Run Full System Check." PASS / WARN / FAIL per test with evidence. Test suites include: Engine, API, Connector, Policy, Query, Event Log, Backup, Constitution, Semantic Index, Domain Events, Context Economy, World State, Operational Memory, Provider Abstraction (verifies no engine above adapters imports provider-specific types).

---

### Task 38 — Recovery Modes
**Depends on:** 10, 32

Cold Boot · Warm Restart · Safe Mode · Recovery Mode · Migration Mode · Read Only. Boot mode determination logic runs on every startup. Safe Mode banner on all Console pages.

---

### Task 39 — Data Ownership
**Depends on:** 1, 3

Six ownership fields on every knowledge object: created_by, modified_by, verified_by, imported_from, generated_by, current_owner. Auto-populated. "Mark as Verified" resets age clock and feeds Trust Score.

---

### Task 40 — Knowledge Aging
**Depends on:** 12, 26

Fresh → Current → Old → Historical → Stale → Expired. Stale triggers Curiosity item. Expired objects excluded from context (Goal_Match forced to 0). Age windows configurable per object type.

---

### Task 41 — System Manifest
**Depends on:** 9, 19, 29, 33

Auto-generated living document. Generated fresh on every request in under 2 seconds. Sections: Identity, Constitution, Policies, Brain State, Capabilities, Connectors (drawn from Provider Registry), Schemas, Indexes, Statistics, Storage, Health, Dependencies. JSON and Markdown exports. Included in every Brain backup.

---

### Task 42 — World State Engine
**Depends on:** 1, 6, 10

Active model of external reality. Not web search — curated, structured, time-aware signals:

- **Universal (always maintained):** current date/time/timezone, upcoming holidays, market hours, fiscal period
- **Location context (opt-in):** city/region, travel window from Calendar connector
- **Technical dependency monitoring:** API deprecation notices, breaking change alerts for connected services
- **Owner-configured topics (all explicit opt-in):** news areas, regulatory domains, competitor activity, software changelogs

WorldStateUpdated domain events consumed by Initiative Engine and Brief Engine.

---

### Task 43 — Operational Memory
**Depends on:** 1, 3, 12, 25

Behavioral pattern learning from observed signals — not declared preferences. Observed from data Lee already has: Gmail timestamps, GitHub commit times, Console session activity, capture timestamps. Never additional tracking.

Pattern types: routine detection, attention patterns, response cadence, work session patterns, project attention cycles, decision making patterns. Pattern confidence lifecycle: candidate → established → strong. Pattern breaks emit OperationalPatternBroken events consumed by Initiative Engine.

---

### Task 44 — Initiative Engine
**Depends on:** 10, 15, 42, 43

Proactive operational observations without being asked. Observation types: drift, relationship, financial, technical health, assumption health, knowledge drift, data health, world state triggers, operational rhythm breaks. Quality over quantity — configurable daily limits and deduplication window. HIGH/CRITICAL items in Morning Brief. CRITICAL items trigger push notification.

---

### Task 45 — Operational Intelligence Engine
**Depends on:** 16, 26, 34, 42, 43, 44

Always-on signal: "What deserves attention right now?" Operational Context contains: Active Priority, What Changed, What is Drifting, What is Waiting, What is Blocked, What is at Risk, What Can Wait, What Should Be Ignored Today. Refreshes every 15 minutes and reactively on significant events. Powers the Console Today page, Morning Brief opening, Ask Lee context, and Android Today screen.

---

### Task 46 — Provider Abstraction Layer
**Depends on:** 1, 6, 35

The boundary between external services and Lee's operating intelligence. Five provider categories with standardized interfaces:

| Category | Interface | Adapters (current) | Adapters (future) |
|----------|-----------|-------------------|------------------|
| Communication | CommunicationProvider | Gmail | Proton Bridge (desktop), Outlook, Fastmail, IMAP |
| Document | DocumentProvider | Google Drive, Google Docs | OneDrive, Notion, local filesystem |
| Development | DevelopmentProvider | GitHub | GitLab, Replit (desktop), local Git |
| Scheduling | SchedulingProvider | Google Calendar | Outlook Calendar, Calendly, iCloud |
| Storage | StorageProvider | Google Drive, App Storage | OneDrive, Dropbox, local disk |

**Standardized Domain Events per category:**
- **Communication:** EmailReceived, ThreadUpdated, WaitingLoopResolved, EmailSentDetected
- **Document:** DocumentCreated, DocumentUpdated, DocumentShared
- **Development:** CommitPushed, IssueOpened, IssueResolved, PROpened, PRMerged, BuildFailed, RepoInactive
- **Scheduling:** CalendarEventCreated, CalendarEventUpdated, CalendarEventCancelled, TravelDetected, MeetingWithPersonDetected
- **Storage:** FileCreated, FileUpdated, FileDeleted

**Constitutional enforcement (ABSOLUTE):** No engine above the adapter layer may reference a specific service by name. This is verified by the Provider Abstraction Suite in the Self-Test Framework.

**Proton Mail desktop path:** `Proton Mail → Proton Bridge (local IMAP) → ProtonBridgeAdapter implements CommunicationProvider → EmailReceived → [zero engine changes above]`

**Done when:** All four existing connectors refactored as typed provider adapters. Understanding Pipeline and Relationship Engine consume standardized Domain Events, not service-specific types. Provider Registry in Capability Registry. Connector settings page redesigned by provider category. Self-Test Provider Abstraction Suite passes.

---

## Architecture Reference Notes

### Confidence vs. Trust

| | Confidence | Trust |
|---|---|---|
| Measures | Epistemic certainty of a specific object | Reliability of a subsystem over time |
| Range | 0–1 | 0–100 (starts at 50) |
| Decay | Per inference hop | 0.5/day without activity |
| Rises when | Source quality high; chain is short | Owner verifies subsystem outputs |

### Recovery Mode vs. Operational State

| | Recovery Modes (#38) | Operational States (#32) |
|---|---|---|
| Describes | How Lee starts or restarts | What Lee is doing right now |
| Examples | Cold Boot, Safe Mode, Recovery Mode | Idle, Thinking, Importing, Offline |

### Curiosity vs. Initiative vs. Operational Intelligence

| | Curiosity (#15) | Initiative (#44) | Operational Intelligence (#45) |
|---|---|---|---|
| Type | Questions | Observations | Continuous prioritization |
| Trigger | Knowledge gaps, staleness | Drifts, events, pattern breaks | Always on — 15-min + reactive |
| Output | Questions to ask | Observations to note | Ranked operational context |

### Provider Abstraction — Email Path Options

| Option | Status | Notes |
|--------|--------|-------|
| Gmail → GmailAdapter | Current | First implementation of CommunicationProvider |
| Proton Bridge → ProtonBridgeAdapter | Desktop phase | Plug-in adapter swap; zero engine changes |
| Outlook → OutlookAdapter | Future | CommunicationProvider + SchedulingProvider |
| IMAP generic → IMAPAdapter | Future | Fallback for any IMAP-compatible mail service |

---

*Plan version: 7.0 · Task count: 46 · Date: July 2, 2026*

*New in v7.0: Task #46 (Provider Abstraction Layer) · Architecture Principle #20 added (Providers are replaceable; the operating intelligence is not) · Provider Layer added to Layer Hierarchy · Provider Abstraction Model diagram added · Provider Abstraction Suite added to Self-Test (#37) · Provider Abstraction enforcement added to Constitution ABSOLUTE provisions (#19) · Provider Registry added to System Manifest Connectors section (#41) · Task #6 updated to note provider adapter refactor relationship with Task #46 · Email path options reference table added*
