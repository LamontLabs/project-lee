# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Version 10.0 — 55 Tasks · July 13, 2026*

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

## Architecture Principles (v10.0)

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

**23. LEE never stops running.** The Executive Loop is the operational heartbeat — a continuous seven-phase cycle (Observe → Understand → Prioritize → Decide → Prepare → Wait → Review → Repeat) that drives everything LEE does. It is not a scheduled job. It is the rhythm of the system.

**24. LEE knows how much to trust herself.** Operational Confidence is a composite, time-aware score reflecting the quality of the current operational picture — not a status indicator. When connectors are stale, assumptions are overdue, or capability services are degraded, LEE surfaces the degradation honestly.

**25. Projects have direction, not just status.** Project Momentum captures the velocity and trajectory of each project from the signals LEE already observes. Momentum is distinct from status — it is a trajectory, not a snapshot.

**26. LEE looks for leverage.** The Opportunity Engine scans the portfolio for cross-project reuse, strategic alignment, and operational leverage. It answers "what have we already solved?" before recommending that anything be built again.

**27. Capacity shapes presentation, not content.** Operational Capacity Awareness infers the owner's current operational load from observed behavioral signals — not emotion or psychology. Presentation adapts. Intelligence does not change. The owner can always override.

**28. Some knowledge does not decay.** Strategic Anchors — founding rationales, rejected directions, and architectural commitments — are intentionally durable. They do not enter the Knowledge Aging cycle. Recommendations that contradict them are flagged, not blocked.

**29. Lamont Labs is a portfolio, not a list.** The Portfolio Intelligence Engine maintains a model of shared infrastructure, shared customers, shared technology, shared risks, and resource allocation across all projects. Portfolio-level intelligence is distinct from project-level intelligence.

---

## Capability Levels

| Level | Capability | Unlocked By |
|-------|-----------|-------------|
| 1 | Records | #1, #2 |
| 2 | Organizes | #3, #4 |
| 3 | Understands | #5, #6, #12, #13 |
| 4 | Retrieves intelligently | #26, #28, #31 |
| 5 | Predicts | #14, #16, #23 |
| 6 | Explains | #19–#22, #24, #27 |
| 7 | Collaborates | #7, #8, #18 |
| 8 | Advises | #11, #17, #29 |
| 9 | Coordinates | #10, #15, #30, #32, #33 |
| 10 | Self-manages | #35–#41 |
| 11 | Contextualizes the world | #42, #43 |
| 12 | Initiates | #44 |
| 13 | Continuously prioritizes | #45 |
| 14 | Connects to anything | #46 |
| 15 | Bootstraps understanding from evidence | #47 |
| 16 | Reasons cheaply; governs execution | #48 |
| 17 | Never stops running | #49 |
| 18 | Knows how much to trust herself | #50 |
| 19 | Sees project velocity | #51 |
| 20 | Finds leverage across the portfolio | #52 |
| 21 | Adapts to operational capacity | #53 |
| 22 | Remembers what must not be forgotten | #54 |
| 23 | Sees the portfolio, not just the projects | #55 |

---

## Layer Hierarchy (v10.0)

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
│  Strategic Anchors — Anchor Ledger [v10]                       │
├─────────────────────────────────────────────────────────────────┤
│  3. RETRIEVAL                                                   │
│  Query Engine · Semantic Index                                  │
├─────────────────────────────────────────────────────────────────┤
│  4. INTELLIGENCE                                                │
│  Intent Engine · Understanding Pipeline                        │
│  Curiosity Engine · Strategy Engine                            │
│  Reflection Engine · Explanation Engine                        │
│  Confidence Propagation                                        │
├─────────────────────────────────────────────────────────────────┤
│  5. COORDINATION                                                │
│  Orchestration Engine & Scheduler Calendar                     │
│  Policy Engine · Governance Engine                             │
│  Resource Engine · State Engine · Recovery Modes               │
│  Operating Modes · Engine Lifecycle & Recovery Policies        │
│  Capability Registry                                           │
├─────────────────────────────────────────────────────────────────┤
│  6. OPERATIONAL CONTEXT                                         │
│  World State Engine · Operational Memory                       │
│  Operational Capacity Awareness [v10]                          │
│  Initiative Engine · Operational Intelligence Engine           │
│  Executive Loop [v10]                                          │
│  Operational Confidence [v10]                                  │
├─────────────────────────────────────────────────────────────────┤
│  6b. PORTFOLIO INTELLIGENCE [v10]                               │
│  Project Momentum Engine                                        │
│  Opportunity Engine                                            │
│  Portfolio Intelligence Engine                                 │
├─────────────────────────────────────────────────────────────────┤
│  7. INTERNAL CAPABILITY SERVICES                                │
│  Reasoning Services (CIL) · Governance Services (CerbaSeal)   │
│  Separate databases · Versioned APIs · Strict auth boundary    │
│  CIL: graceful degradation · CerbaSeal: fail-closed           │
├─────────────────────────────────────────────────────────────────┤
│  8. PROVIDER LAYER (External Services)                          │
│  Provider Abstraction Layer · Project Bootstrap Engine         │
│  Communication · Document · Development Intelligence           │
│  Scheduling · Storage                                          │
├─────────────────────────────────────────────────────────────────┤
│  9. INTERFACES & OBSERVABILITY                                  │
│  Console (+ Portfolio View [v10]) · Android App                │
│  Cost Engine · Backup & Migration                              │
│  Context Economy · Brief Engine · Self-Test · System Manifest  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task Index (55 tasks)

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
| 49 | Executive Loop | 10, 32, 44, 45 |
| 50 | Operational Confidence | 20, 42, 43, 45 |
| 51 | Project Momentum Engine | 13, 25, 46, 47 |
| 52 | Opportunity Engine | 13, 16, 43, 47, 51 |
| 53 | Operational Capacity Awareness | 43, 44, 45 |
| 54 | Strategic Anchors & Long-Term Memory | 12, 16, 21, 22 |
| 55 | Portfolio Intelligence Engine | 13, 16, 45, 51, 52, 54 |

---

## Task Descriptions

### Task 1 — Foundation & Core Schema
**Depends on:** nothing

Base layer. Node.js + TypeScript + Express, PostgreSQL + Drizzle ORM, core schema, event sourcing infrastructure. Re-projection from the Event Log alone must produce a consistent database state.

---

### Task 2 — Console (Web App)
**Depends on:** 1

Primary desktop interface. Dark-mode-first React. No business logic client-side. No emojis anywhere. After Task #55, Console gains a Portfolio View page.

---

### Task 3 — Understanding Pipeline
**Depends on:** 1

Ingestion and comprehension layer. Accepts text, URLs, files, voice notes. Extraction → enrichment → entity detection → classification → importance scoring → storage. Entry point for all new knowledge.

---

### Task 4 — Brief Engine
**Depends on:** 3, 5

Daily briefing generator. After Task #45, opening derived from Operational Intelligence Engine's active priority. After Task #50, header includes Operational Confidence score. After Task #53, length and item count adapt to Operational Capacity state. After Task #55, includes a Portfolio section when portfolio-level items are active.

---

### Task 5 — Model Router & Context Engine
**Depends on:** 1

Tiered model selection, token budget enforcement, Context Packet Preview, CIL reuse. After Task #48, CIL is the first tier before frontier escalation.

---

### Task 6 — Connector Engine
**Depends on:** 1, 3

First provider adapters: Gmail, Google Calendar, Google Drive, GitHub, Replit. All read-only. After Task #46, refactored to emit standardized typed Domain Events through provider interfaces.

---

### Task 7 — Android App
**Depends on:** 2, 4

Expo React Native. Presentation only. After Task #45, Today screen powered by Operational Intelligence Engine. After Task #50, Today screen shows Operational Confidence score.

---

### Task 8 — Cost Engine
**Depends on:** 1, 5

Tracks every token and model call. Hard limits trigger governance holds. After Task #48, CIL cost tracked separately from frontier cost; spend breakdown includes resolution tier distribution.

---

### Task 9 — Backup, Migration & Brain Versioning
**Depends on:** 1

Brain Version (YYYY.M.minor). Daily automated backup. Verify Archive and Test Restore functional. After Task #54, Anchor Ledger included in all Brain backups.

---

### Task 10 — Orchestration Engine & Scheduler Calendar
**Depends on:** 1

Priority queue (CRITICAL/HIGH/NORMAL/LOW). Engine registration, concurrency, retry. After Task #48, routes informational requests through ReasoningService and consequential actions through GovernanceService. After Task #49, the Executive Loop registers as a permanent engine, not a scheduled job.

---

### Task 11 — Governance Engine
**Depends on:** 1, 10

Internal governance: risk levels, approval flows, audit trail. After Task #48, coordinates with CerbaSeal for external execution authorization.

---

### Task 12 — Memory Architecture
**Depends on:** 1, 3

Six-tier hierarchy: Working → Short-term → Long-term → Reference → Archive → Semantic. Promotion, demotion, compression. After Task #54, Anchor Ledger added as a seventh non-aging ledger.

---

### Task 13 — Intelligence Graph
**Depends on:** 1, 3

Typed nodes and edges. Automatic edge creation from Understanding Pipeline and Bootstrap Engine. After Task #52, Opportunity Engine adds cross-project reuse edges. After Task #55, Portfolio Intelligence Engine adds cross-project customer and infrastructure edges.

---

### Task 14 — Identity & Relationship Engine
**Depends on:** 1, 6, 13

People layer. Relationship strength, interaction history, follow-up states, waiting loops. Trust tiers. After Task #55, people appearing across multiple projects flagged as cross-project relationships.

---

### Task 15 — Curiosity Engine
**Depends on:** 3, 12, 13

Proactive question-asking. Scans for staleness, gaps, conflicts. Does not ask questions Lee could answer herself.

---

### Task 16 — Strategy Engine
**Depends on:** 13, 14, 15

OKRs, option evaluation, recommendations with confidence and Why Chain, prioritization. After Task #54, checks recommendations against active Strategic Anchors; contradictions flagged inline.

---

### Task 17 — Reflection Engine
**Depends on:** 12, 13, 16

Period comparison, trend identification, lesson surfacing. After Task #53, uses Operational Capacity history to assess workload patterns in retrospectives.

---

### Task 18 — Operating Modes
**Depends on:** 10, 11

FOCUS, TRAVEL, DEEP_WORK, REVIEW, EMERGENCY. After Task #53, Operational Capacity state informs Operating Mode suggestion logic.

---

### Task 19 — Constitution Engine
**Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. ABSOLUTE provisions block unconditionally. After Task #54, an ABSOLUTE provision added: "Strategic Anchors are never silently contradicted — contradictions must always be flagged."

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

Universal data access layer. Single retrieval policy, ranking, cache, authorization. All engines — including Momentum, Opportunity, and Portfolio Intelligence — read through the Query Engine.

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

Mutable operational policy layer. After Task #49, Executive Loop phase durations and re-entry thresholds configurable here. After Task #50, Operational Confidence degradation thresholds configurable here. After Task #51, Momentum signal weights and classification thresholds configurable here. After Task #53, Operational Capacity state thresholds configurable here.

---

### Task 30 — Resource Engine
**Depends on:** 1, 10

Real-time system health: CPU, RAM, disk, token budgets, API rate limits. Orchestration Engine reads this before every dispatch.

---

### Task 31 — Intent Engine
**Depends on:** 1, 26

Every request produces a typed Intent record first. Intent record drives all downstream decisions including CerbaSeal routing.

---

### Task 32 — State Engine
**Depends on:** 1, 10

Operational state machine. After Task #49, Executive Loop's current phase surfaced alongside State Engine state — they are distinct (State: what is LEE doing; Executive Loop phase: where is LEE in her operational cycle).

---

### Task 33 — Internal API Contracts & Capability Registry
**Depends on:** 1, 10

Versioned, typed REST API at /internal/[engine-name]/v[N]. After Tasks #49–#55, each new engine registered in the Capability Registry.

---

### Task 34 — Context Economy
**Depends on:** 5, 12, 20, 26

Competitive scoring algorithm for context packet composition. After Task #54, active Strategic Anchors always included in context for Strategy and Recommendation intents — not subject to competitive scoring exclusion.

---

### Task 35 — Domain Events
**Depends on:** 1

Typed event contract system. v10.0 additions: ExecutiveLoopPhaseChanged, OperationalConfidenceUpdated, ProjectMomentumChanged, OpportunityDetected, OpportunityResolved, OperationalCapacityChanged, AnchorCreated, AnchorRetired, AnchorContradictionDetected, PortfolioStateUpdated, PortfolioRiskDetected, PortfolioOpportunityDetected.

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies
**Depends on:** 10, 33

Standard lifecycle for every engine. Layer-ordered startup. Dependency validation before boot.

---

### Task 37 — Self-Test Framework
**Depends on:** 33, 36

v10.0 test suite additions: Executive Loop Suite, Operational Confidence Suite, Momentum Suite, Opportunity Suite, Capacity Suite, Anchor Suite, Portfolio Suite.

---

### Task 38 — Recovery Modes
**Depends on:** 10, 32

Six boot modes. After Task #49, Executive Loop boot behavior defined per mode: Safe Mode = loop suspended; Recovery Mode = Observe-only phase until recovery completes.

---

### Task 39 — Data Ownership
**Depends on:** 1, 3

Six ownership fields on every knowledge object. After Task #54, Anchor Ledger entries carry the same ownership fields; verified_by required for portfolio-wide anchors.

---

### Task 40 — Knowledge Aging
**Depends on:** 12, 26

Freshness states: Fresh → Current → Old → Historical → Stale → Expired. After Task #54, Anchor Ledger entries explicitly excluded from Knowledge Aging — they do not age.

---

### Task 41 — System Manifest
**Depends on:** 9, 19, 29, 33

Auto-generated living document. v10.0 additions: Executive Loop (phase, cycle count, average cycle duration), Operational Confidence (score, last computed, factors), Project Momentum (all projects with classification), Active Strategic Anchors (portfolio-wide and per active project), Portfolio State (health score, shared infrastructure summary).

---

### Task 42 — World State Engine
**Depends on:** 1, 6, 10

Active model of external reality. After Task #52, Opportunity Engine subscribes to World State signals for cross-system insight detection. After Task #55, portfolio-wide world state risks surfaced in the Portfolio Intelligence Engine.

---

### Task 43 — Operational Memory
**Depends on:** 1, 3, 12, 25

Behavioral pattern learning from observed signals. After Task #53, also provides signal inputs for the Operational Capacity Awareness inference engine.

---

### Task 44 — Initiative Engine
**Depends on:** 10, 15, 42, 43

Proactive operational observations. After Task #49, Executive Loop triggers the Initiative Engine during the Observe phase rather than on a fixed schedule. After Task #53, in Low capacity state, non-CRITICAL observations are held.

---

### Task 45 — Operational Intelligence Engine
**Depends on:** 16, 26, 34, 42, 43, 44

Always-on synthesizer. After Task #49, becomes the intelligence substrate of the Executive Loop — the loop drives it, it doesn't schedule itself. After Task #50, output includes current Operational Confidence. After Task #51, consumes Momentum as a signal. After Task #53, adapts item count and depth based on Operational Capacity state.

---

### Task 46 — Provider Abstraction Layer
**Depends on:** 1, 6, 35

Five provider interfaces: CommunicationProvider, DocumentProvider, DevelopmentProvider (Intelligence), SchedulingProvider, StorageProvider. CIL and CerbaSeal are NOT in this layer. Enforced by Self-Test.

---

### Task 47 — Project Bootstrap Engine
**Depends on:** 3, 6, 13, 21, 46

Nine parallel extractors. Confirmation conversation. Continuous monitoring. After Task #52, cross-project structural similarity output feeds the Opportunity Engine's code reuse detection.

---

### Task 48 — Internal Capability Services Layer — CIL + CerbaSeal
**Depends on:** 1, 5, 10, 11, 31, 33, 35, 46

CIL endpoint: https://cognitive-infrastructure-layer.replit.app/api/query/lee
CerbaSeal evaluate endpoint: https://cerbaseal.replit.app/govern/evaluate
Bearer + HMAC-SHA256 auth on every request. CIL: graceful degradation. CerbaSeal: fail-closed.

---

### Task 49 — Executive Loop
**Depends on:** 10, 32, 44, 45

The operational heartbeat. Seven phases: Observe → Understand → Prioritize → Decide → Prepare → Wait → Review → Repeat. Never stops. Phase transitions are typed Domain Events. Current phase visible in Console status bar. Survives system restarts. CRITICAL events interrupt mid-cycle. Registered with the Orchestration Engine as a permanent engine.

---

### Task 50 — Operational Confidence
**Depends on:** 20, 42, 43, 45

Composite time-aware score reflecting the quality of the current operational picture. Headline number with plain-language explanation. Expandable Why breakdown. Contributing factors: connector sync freshness, stale knowledge ratio, assumption health, CIL health, CerbaSeal health, world state freshness. Recomputed every Executive Loop cycle. Displayed on Console Today, Android Today, and Morning Brief header.

---

### Task 51 — Project Momentum Engine
**Depends on:** 13, 25, 46, 47

Per-project velocity: Explosive / Rising / Stable / Declining / Dormant / Stalled. Computed from: commits, documentation updates, captures, decisions, external responses, waiting loop resolution rate. Visible on Projects list and project detail pages with 30-day sparkline history.

---

### Task 52 — Opportunity Engine
**Depends on:** 13, 16, 43, 47, 51

Cross-portfolio leverage identification. Opportunity types: code reuse, documentation reuse, governance reuse, pricing reuse, strategic alignment, cross-system insight, resource leverage. Evidence required for every item. Deduplication window: 14 days. Daily limit: 3. Surfaces in Console Today, Morning Brief, and Android push for HIGH-confidence items.

---

### Task 53 — Operational Capacity Awareness
**Depends on:** 43, 44, 45

Operational load inference — not emotion detection. States: High / Nominal / Constrained / Low / Recovery. Inferred from: session duration, capture frequency, completion rate, waiting loop count, decision backlog, late-night patterns. Influences Brief Engine, OIE, and Initiative Engine surfacing. Owner can manually override.

---

### Task 54 — Strategic Anchors & Long-Term Memory
**Depends on:** 12, 16, 21, 22

Anchor Ledger storing intentionally durable knowledge: founding rationale, rejected directions, architectural commitments. Anchors never enter the Knowledge Aging cycle. Contradiction detection in Strategy Engine and Opportunity Engine. Rejected direction memory surfaces prior reasoning when a similar direction is re-explored.

---

### Task 55 — Portfolio Intelligence Engine
**Depends on:** 13, 16, 45, 51, 52, 54

Lamont Labs as a portfolio. Dimensions: shared infrastructure, shared customers, shared technology, shared risks, shared opportunities, resource attention distribution, strategic alignment, momentum distribution. Portfolio View page in the Console. Portfolio section in Morning Brief when active. Portfolio health score. Resource attention derived from Operational Memory patterns — not declared.

---

*Version 10.0 · 55 Tasks · July 13, 2026*
*v9.0 (48 tasks) → v10.0 (55 tasks): Tasks #49–#55 added based on architectural review*
*New architecture principles: #23–#29*
*New layer: 6b Portfolio Intelligence*
*New capability levels: 17–23*
