# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 8.0 — 47 Tasks*

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

## Architecture Principles (v8.0)

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

**21. The owner should not reconstruct reality manually if the evidence already exists.** When a repository is connected, LEE reads its structure, documentation, dependencies, and APIs to bootstrap an initial knowledge model automatically. She then asks only for the judgments the evidence cannot answer. This principle extends beyond repositories — any structured external artifact should be a starting point for understanding, not a request for the owner to re-explain what already exists.

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
│  Provider Abstraction Layer · Project Bootstrap Engine         │
│  Communication · Document · Development Intelligence           │
│  Scheduling · Storage                                          │
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

```
External services
  Gmail   Proton Bridge   Outlook   GitHub   GitLab   Google Calendar ...
    ↓           ↓            ↓        ↓        ↓             ↓
  Provider Adapters  (translate service APIs into standard types)
    ↓
  Provider Interfaces
    CommunicationProvider · DocumentProvider
    DevelopmentProvider (Intelligence) · SchedulingProvider · StorageProvider
    ↓
  Standardized Domain Events
    EmailReceived · ThreadUpdated · WaitingLoopResolved
    CommitPushed · IssueOpened · PRMerged · BuildFailed
    RepoFirstConnected · RepoStructureChanged
    CalendarEventCreated · MeetingWithPersonDetected · TravelDetected
    DocumentCreated · DocumentUpdated · FileCreated ...
    ↓
  Event Log  →  Subscribed engines
    (Understanding Pipeline, Bootstrap Engine,
     Relationship Engine, Initiative Engine, ...)
```

**Proton Mail path (desktop phase):**
```
Proton Mail → Proton Bridge (local IMAP) → ProtonBridgeAdapter
            → CommunicationProvider interface → EmailReceived
            → [zero changes to any engine above]
```

---

## Project Bootstrap Flow

```
Repository connected (any DevelopmentProvider adapter)
  ↓
RepoFirstConnected domain event emitted
  ↓
Project Bootstrap Engine triggered automatically
  ↓
File tree read via DevelopmentProvider.get_file_tree()
  ↓
Extractors run in parallel:
  Technology Stack · Repository Map · Architecture Graph
  Dependency Inventory · API Inventory · Documentation Inventory
  Configuration Inventory · Security Observations
  ↓
Understanding Pipeline processes README + documentation files
  ↓
Fact Ledger entries created (created_by: project_bootstrap_engine)
Interpretation Ledger entries created (requires_verification: true)
Intelligence Graph nodes + edges created
  ↓
Cross-project relationship detection runs across all bootstrapped projects
  ↓
Confirmation conversation presented to owner:
  "I believe this is an AI governance platform. Is that correct?"
  What I found · Questions for you · Issues I noticed
  ↓
Owner confirms / corrects / dismisses each item
  ↓
Verified items → confidence boosted, verified_by: owner
Corrected items → Fact/Interpretation updated, owner-verified
  ↓
BootstrapCompleted domain event emitted
  ↓
Continuous monitoring begins:
  CommitPushed → RepoStructureChanged → structural change Curiosity items
  Documentation freshness → staleness Curiosity items
```

---

## Execution Flow

```
Input
  ↓
Intent Engine → Operational Intelligence Engine → Query Engine
  ↓
Context Economy → Model Router → Explanation Engine
  ↓
Output → Domain Event → Subscribers react
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
| 47 | Project Bootstrap Engine | 3, 6, 13, 21, 46 |

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

Ingestion and comprehension layer. Accepts text, URLs, files, voice notes. Extraction → enrichment → entity detection → classification → importance scoring → storage. Entry point for all new knowledge, including Bootstrap Engine document processing.

---

### Task 4 — Brief Engine
**Depends on:** 3, 5

Daily briefing generator. Assembles context packet, calls Model Router, renders structured document. Briefs are immutable after generation. After Task #45, Brief opening derived from Operational Intelligence Engine's active priority.

---

### Task 5 — Model Router & Context Engine
**Depends on:** 1

Tiered model selection, token budget enforcement, Context Packet Preview, CIL reuse.

---

### Task 6 — Connector Engine
**Depends on:** 1, 3

First provider adapters: Gmail, Google Calendar, Google Drive, GitHub, Replit. All read-only. After Task #46, refactored to emit standardized typed Domain Events through the provider interface. The refactor changes nothing above the adapter layer — which proves the abstraction works.

---

### Task 7 — Android App
**Depends on:** 2, 4

Expo React Native. Presentation only. Today screen powered by Task #45 after it is built.

---

### Task 8 — Cost Engine
**Depends on:** 1, 5

Tracks every token and model call. Hard limits trigger governance holds. Spend breakdown by engine and purpose.

---

### Task 9 — Backup, Migration & Brain Versioning
**Depends on:** 1

Brain Version (YYYY.M.minor). Daily automated backup. Verify Archive and Test Restore functional. Migration framework between Brain Versions.

---

### Task 10 — Orchestration Engine & Scheduler Calendar
**Depends on:** 1

Priority queue (CRITICAL/HIGH/NORMAL/LOW). Engine registration, concurrency, retry. Scheduler Calendar at Settings → System → Schedule.

---

### Task 11 — Governance Engine
**Depends on:** 1, 10

LOW (auto-approve), MEDIUM (notify + approve), HIGH (explicit confirmation), CRITICAL (full review). Full audit trail.

---

### Task 12 — Memory Architecture
**Depends on:** 1, 3

Six-tier hierarchy: Working → Short-term → Long-term → Reference → Archive → Semantic (Stage 6 = Task #28). Promotion, demotion, compression.

---

### Task 13 — Intelligence Graph
**Depends on:** 1, 3

Typed nodes and edges. Automatic edge creation from Understanding Pipeline and Bootstrap Engine. Pattern detection. Cross-project relationship nodes created by Bootstrap Engine.

---

### Task 14 — Identity & Relationship Engine
**Depends on:** 1, 6, 13

People layer. Relationship strength, interaction history, follow-up states, waiting loops. Trust tiers: Close/Professional/Extended/Peripheral.

---

### Task 15 — Curiosity Engine
**Depends on:** 3, 12, 13

Proactive question-asking. Scans for staleness, gaps, conflicts. Consumes Bootstrap Engine's missing documentation flags. Does not ask questions Lee could answer herself.

---

### Task 16 — Strategy Engine
**Depends on:** 13, 14, 15

OKRs, option evaluation, recommendations with confidence and Why Chain, prioritization. Strategies update when underlying facts change via Event Log subscription.

---

### Task 17 — Reflection Engine
**Depends on:** 12, 13, 16

Period comparison, trend identification, lesson surfacing, structural gap detection. Feeds Curiosity Engine.

---

### Task 18 — Operating Modes
**Depends on:** 10, 11

FOCUS, TRAVEL, DEEP_WORK, REVIEW, EMERGENCY. Every engine reads current mode parameters at dispatch time.

---

### Task 19 — Constitution Engine
**Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. ABSOLUTE provisions block unconditionally.

**ABSOLUTE provisions include:** Provenance non-negotiable. /internal/ never exposed externally. Semantic Index embeddings stored locally. No silent failures. Event Log append-only. Facts and Interpretations never mixed. No engine above the Provider Abstraction Layer references a specific service by name. Bootstrap Engine never reads secret values — environment variable names only.

---

### Task 20 — Confidence Propagation
**Depends on:** 1, 12, 13

Confidence degrades per inference hop. Bootstrap-extracted facts have confidence based on source quality (package.json = 0.95, README = 0.7, inferred from folder names = 0.4).

---

### Task 21 — Fact/Interpretation Separation
**Depends on:** 1, 3, 13

Two permanent, separate ledgers. Bootstrap Engine writes technology stack, dependency inventory, and API inventory to Fact Ledger; project summaries and architecture descriptions to Interpretation Ledger.

---

### Task 22 — Why Chain & Provenance
**Depends on:** 1, 5, 20, 21

Every recommendation has a navigable Why Chain. Bootstrap-created Fact Ledger entries include source_refs pointing to the specific repository files they were extracted from.

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

Operational history as scrollable, zoomable, filterable timeline. Bootstrap Engine creates the first Timeline entry for each imported project (repository creation, first commit, most recent commit).

---

### Task 26 — Query Engine
**Depends on:** 1, 12, 13, 21

Universal data access layer. Single retrieval policy, ranking, cache, authorization. Every result includes why_included. "Show me everything related to authentication" searches LEE's understanding across all bootstrapped projects — not GitHub directly.

---

### Task 27 — Explanation Engine
**Depends on:** 5, 22, 26

Audience-aware translation: Developer, Investor, Founder, Executive, Legal, Technical, General. Explanations cached until source objects change.

---

### Task 28 — Semantic Index
**Depends on:** 3, 12, 26

Vector embedding store over all Lee's knowledge. Discovery-mode fuzzy search. Stage 6 of Memory Compression Roadmap. Embeddings stored locally — ABSOLUTE.

---

### Task 29 — Policy Engine
**Depends on:** 1, 19

Cost, Privacy, Retention, Notification, Relationship, Backup, Connector policies. All versioned. Rollback available.

---

### Task 30 — Resource Engine
**Depends on:** 1, 10

CPU, RAM, disk, token budgets, API quotas, network quality, battery. HEALTHY/CONSTRAINED/CRITICAL. Orchestration Engine reads before every dispatch.

---

### Task 31 — Intent Engine
**Depends on:** 1, 26

Every request produces a typed Intent record. Corrections feed Learning Engine.

---

### Task 32 — State Engine
**Depends on:** 1, 10

Booting, Learning, Idle, Thinking, Briefing, Importing, Synchronizing, Waiting, Recovering, Offline, Degraded. Exactly one primary state. Visible everywhere.

---

### Task 33 — Internal API Contracts & Capability Registry
**Depends on:** 1, 10

Every engine exposes a versioned, typed REST API at /internal/[engine-name]. Zod-validated. /internal/ never exposed externally — ABSOLUTE.

---

### Task 34 — Context Economy
**Depends on:** 5, 12, 20, 26

```
Context Value =
  (Goal_Match × W_goal) × (Recency × W_recency) × (Importance × W_importance)
× (Relationship × W_relationship) × (Project_Activity × W_project)
× (Confidence × W_confidence) × (Trust × W_trust) × (Mode_Relevance × W_mode)
```

Multiplicative. Any zero eliminates the object. Weights configurable per intent type.

---

### Task 35 — Domain Events
**Depends on:** 1

Typed event contract system. Every state change emits a typed, versioned, schema-validated Domain Event. Full catalog includes all provider events plus BootstrapCompleted, RepoFirstConnected, RepoStructureChanged.

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies
**Depends on:** 10, 33

initialize() → boot() → health_check() → pause() → resume() → recover() → shutdown(). AUTO_RESTART, AUTO_FALLBACK, GRACEFUL_DISABLE, MANUAL_RECOVERY. Layer-ordered startup.

---

### Task 37 — Self-Test Framework
**Depends on:** 33, 36

"Run Full System Check." Test suites include Provider Abstraction Suite (verifies no engine above adapters imports provider-specific types) and Bootstrap Suite (verifies extraction quality, cross-project relationship detection, confirmation conversation generation).

---

### Task 38 — Recovery Modes
**Depends on:** 10, 32

Cold Boot · Warm Restart · Safe Mode · Recovery Mode · Migration Mode · Read Only.

---

### Task 39 — Data Ownership
**Depends on:** 1, 3

created_by, modified_by, verified_by, imported_from, generated_by, current_owner on every object. Bootstrap-created objects: created_by = "project_bootstrap_engine". Owner-confirmed objects: verified_by = owner.

---

### Task 40 — Knowledge Aging
**Depends on:** 12, 26

Fresh → Current → Old → Historical → Stale → Expired. Stale triggers Curiosity item. Expired excluded from context. Documentation freshness tracked by Bootstrap Engine's continuous monitoring.

---

### Task 41 — System Manifest
**Depends on:** 9, 19, 29, 33

Auto-generated, always current, under 2 seconds. Connectors section drawn from Provider Registry. JSON and Markdown exports. Included in every Brain backup.

---

### Task 42 — World State Engine
**Depends on:** 1, 6, 10

Active model of external reality: time/timezone/holidays/market hours (always maintained) + location context (opt-in) + technical deprecation monitoring + owner-configured topic monitoring (all explicit opt-in).

---

### Task 43 — Operational Memory
**Depends on:** 1, 3, 12, 25

Behavioral pattern learning from observed signals. Pattern types: routine detection, attention patterns, response cadence, work session patterns, project attention cycles, decision making patterns. Confidence lifecycle: candidate → established → strong.

---

### Task 44 — Initiative Engine
**Depends on:** 10, 15, 42, 43

Proactive operational observations. Drift, relationship, financial, technical health, assumption health, knowledge drift, data health, world state triggers, operational rhythm breaks. Quality over quantity — configurable daily limits and deduplication.

---

### Task 45 — Operational Intelligence Engine
**Depends on:** 16, 26, 34, 42, 43, 44

Always-on: "What deserves attention right now?" Operational Context: Active Priority, What Changed, What is Drifting, What is Waiting, What is Blocked, What is at Risk, What Can Wait, What Should Be Ignored Today. Powers Today page, Morning Brief opening, Ask Lee context, Android Today screen.

---

### Task 46 — Provider Abstraction Layer
**Depends on:** 1, 6, 35

The boundary between external services and Lee's operating intelligence. Five provider categories:

| Category | Interface | Current Adapters | Future Adapters |
|----------|-----------|-----------------|-----------------|
| Communication | CommunicationProvider | Gmail | Proton Bridge (desktop), Outlook, Fastmail, IMAP |
| Document | DocumentProvider | Google Drive, Google Docs | OneDrive, Notion, local filesystem |
| Development Intelligence | DevelopmentProvider | GitHub | GitLab, Replit (desktop), local Git |
| Scheduling | SchedulingProvider | Google Calendar | Outlook Calendar, Calendly |
| Storage | StorageProvider | Google Drive, App Storage | OneDrive, Dropbox, local disk |

**DevelopmentProvider — richer than basic GitHub access.** Every adapter must implement: `list_repos()`, `get_repo_metadata()`, `get_file_tree()` (for Bootstrap Engine), `get_file_content()` (for Bootstrap Engine), `fetch_commits()`, `fetch_issues()`, `fetch_pull_requests()`, `fetch_releases()`, `fetch_deployments()`, `get_build_status()`, `get_dependency_alerts()`.

**Key bootstrap events:** `RepoFirstConnected` → triggers Project Bootstrap Engine automatically. `RepoStructureChanged` (in CommitPushed payload) → triggers structural change Curiosity items.

**Constitutional enforcement (ABSOLUTE):** No engine above the adapter layer may reference a specific service by name. Verified by Provider Abstraction Suite in Self-Test.

---

### Task 47 — Project Bootstrap Engine
**Depends on:** 3, 6, 13, 21, 46

When a repository is connected, Lee reads all available evidence and builds an initial knowledge model — automatically, without the owner having to explain what already exists.

**What Bootstrap Engine extracts:**

| Artifact | Output | Ledger |
|----------|--------|--------|
| Technology stack | Languages, frameworks, runtime, package manager | Fact Ledger |
| Repository map | Folder structure, file counts, inferred directory purpose | Fact Ledger |
| Project summary | One-paragraph description from README + docs | Interpretation Ledger |
| Architecture graph | Application layers, modules, external dependencies | Intelligence Graph nodes + edges |
| Dependency inventory | All packages with category and security advisory flags | Fact Ledger |
| API inventory | Documented endpoints from OpenAPI/route files | Fact Ledger |
| Documentation inventory | All doc files with freshness scores | Fact Ledger |
| Configuration inventory | Config file types, env var names (never values) | Fact Ledger |
| Security observations | Static analysis flags — exposed secrets, deprecated patterns | Curiosity items / Governance holds |
| Missing documentation | Gaps between repo map and documentation inventory | Curiosity items |
| Initial Timeline entry | Repository creation, first commit, most recent commit | Timeline |

**Confirmation conversation:**
```
Bootstrap complete: CerbaSeal

I believe this is an AI governance platform with a deterministic
execution layer built with TypeScript, Node.js, and PostgreSQL.
Is that correct?

What I found: technology stack confirmed · 847 files · 34 API
endpoints documented · 3 cross-project relationships detected

Questions for you:
  1. Is this intended for external customers or internal use?
  2. The /governance/ directory appears incomplete — active development?
  3. README references "pilot customers" but no CRM data found.

Issues I noticed:
  ⚠ No CHANGELOG · 6 undocumented API endpoints
  ⚠ README last updated 47 days ago; 312 commits since
```

**Cross-project intelligence:** After bootstrapping, Intelligence Graph queried for structural similarities across all projects. Observations surfaced as Initiative items: "CerbaSeal and Project LEE both implement governance approval patterns."

**Continuous monitoring:** CommitPushed events trigger structural change detection (new directory → Curiosity item), documentation freshness decay (README age vs. commit age → staleness Curiosity item), new major dependency detection (Dependency Inventory updated).

**Re-bootstrap:** preserves owner-verified facts; updates only what changed; shows diff summary.

**Done when:** Bootstrap auto-triggers on RepoFirstConnected. All 9 extractors functional. Confirmation conversation presented after bootstrap. Cross-project relationship detection runs. Continuous monitoring wired to CommitPushed events. BootstrapCompleted domain event emitted. Bootstrap History in project detail pages.

---

## Architecture Reference Notes

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

### Recovery Mode vs. Operational State

| | Recovery Modes (#38) | Operational States (#32) |
|---|---|---|
| Describes | How Lee starts or restarts | What Lee is doing right now |

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

---

*Plan version: 8.0 · Task count: 47 · Date: July 2, 2026*

*New in v8.0: Task #47 (Project Bootstrap Engine) · Task #46 DevelopmentProvider expanded to Development Intelligence Provider with get_file_tree(), get_file_content(), fetch_releases(), fetch_deployments(), get_build_status(), get_dependency_alerts(), RepoFirstConnected event, RepoStructureChanged event · Architecture Principle #21 added (owner should not reconstruct reality manually if evidence already exists) · Project Bootstrap Flow diagram added · Bootstrap confidence table added · Capability Level 15 added*
