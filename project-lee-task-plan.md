# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 5.0 — 41 Tasks*

---

## Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff — she doesn't replace your thinking, she protects it. She doesn't replace your decisions, she prepares them. She doesn't replace your memory, she preserves it.

The primary asset is the accumulated knowledge, governance, memory, relationships, timelines, and operational state — not the specific model answering questions. The model could change. Lee continues to grow.

---

## Architecture Principles (v5.0)

**1. The Constitution sits above everything.** Every engine consults the Constitution before acting. Absolute provisions cannot be overridden — not even by governance approval.

**2. Event Sourcing is the foundation.** Almost nothing mutates directly. State changes are typed Domain Events. Current state is a projection. Re-projection from the Event Log alone must produce a consistent database.

**3. Facts and Interpretations are never mixed.** The Fact Ledger holds what is verifiable. The Interpretation Ledger holds what Lee reasons. They have different canon rules, different confidence rules, and different decay rates.

**4. The Query Engine is the universal access layer.** No intelligence engine reads from storage directly. All reads go through the Query Engine. One retrieval policy, one ranking algorithm, one cache, one authorization layer.

**5. Intent is a first-class typed object.** Every request — human or machine-initiated — classifies its intent before retrieval or reasoning begins. All downstream decisions use the Intent record.

**6. Context competes.** The Context Economy formula replaces static tier weights. Every object scores against eight dimensions. The highest-scoring objects within the token budget always win, regardless of which memory tier they came from.

**7. Intelligence is independent of presentation.** Every capability must work without any UI. The Console, Android app, CLI, API, and future desktop app all consume identical services via the Internal API surface. Nothing exists "because the web UI needs it."

**8. Resource-aware scheduling.** The Orchestration Engine reads the Resource Engine before every dispatch. No heavy jobs run blindly into a constrained system.

**9. Brain Versioning for safe migrations.** A Brain Version (YYYY.M.minor) covers Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together. Every backup is tagged with its Brain Version.

**10. Confidence flows. Trust is earned.** Confidence degrades through each inference step at defined rates. Trust is a per-subsystem score that decays without activity and rises with accurate, verified performance. They are different constructs and are never conflated.

**11. Every output has a Why Chain.** No recommendation without reasoning. No observation without grounded steps. Every inference chain is navigable. Provenance is an ABSOLUTE constitutional provision.

**12. Assumptions are tracked.** Every simulation and strategy names its assumptions. Invalidated assumptions trigger review of all conclusions built on them.

**13. Domain Events are typed contracts.** Every significant state change emits a typed Domain Event with a defined schema. No generic log entries. The event catalog is the language that re-projection speaks — ambiguous events make re-projection fragile; typed events make it reliable.

**14. Every engine has a lifecycle.** Every engine declares its dependencies, exposes standard lifecycle methods (Initialize → Boot → Recover → Pause → Resume → Shutdown), and declares a recovery policy. The Orchestration Engine manages engines, not just jobs.

**15. Lee can describe herself.** The System Manifest is always current. The Capability Registry is always accurate. The Self-Test Framework can verify every claim. Lee is not a black box — she is a system that knows what she is.

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
| 11 | Improves itself | Tasks #17, #34 (behavioral learning, not code mutation) |

---

## Layer Hierarchy

Dependencies flow downward only. No upward references. No circular dependencies.

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
│  6. INTERFACES & OBSERVABILITY                                  │
│  Console · Android App · Connectors                            │
│  Cost Engine · Backup & Migration                              │
│  Context Economy · Brief Engine · Model Router                 │
│  Self-Test Framework · System Manifest                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

Every user or machine request follows this path:

```
Input
  ↓
Intent Engine          (classify intent → typed Intent record)
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
Subscribers react      (Confidence re-propagation, Strategy invalidation,
                        Semantic Index update, State transitions…)
  ↓
Reflection             (on schedule — pattern recognition across outputs)
```

---

## Governance Stack

```
Constitution Engine    (immutable — ABSOLUTE provisions block unconditionally)
  ↓
Policy Engine          (mutable standing rules — Cost, Privacy, Retention…)
  ↓
Governance Engine      (case-by-case approvals — LOW/MEDIUM/HIGH/CRITICAL)
  ↓
Orchestration Engine   (scheduling and resource-aware dispatch)
  ↓
Resource Engine        (live resource state — CPU/RAM/quotas/battery)
  ↓
State Engine           (current operational state — Idle/Thinking/Offline…)
  ↓
Capability Registry    (registered engines, their capabilities, health)
  ↓
Internal APIs          (versioned contracts between all engines)
  ↓
Engines                (execute within the constraints above)
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

---

## Task Descriptions

---

### Task 1 — Foundation & Core Schema

**Depends on:** nothing

The base layer every other task builds on. Node.js + TypeScript + Express server, PostgreSQL + Drizzle ORM, core database schema, and event sourcing infrastructure.

**Event Sourcing constraint:** The Event Log is append-only. Re-projection from the Event Log alone must produce a consistent database state. This is the primary acceptance criterion — not merely "events are written" but "the DB can be rebuilt from them."

**Done when:** Server starts and responds to health check. All core tables created via Drizzle migrations: Projects, People, Sources, Events (Event Log — append-only), Costs, AuditLog, Users. Event Log re-projection utility works. OpenAPI spec valid and Orval codegen runs. Schema versioned with migration history. pnpm monorepo structure correct.

---

### Task 2 — Console (Web App)

**Depends on:** 1

The primary desktop interface. Dark-mode-first React web app. The Console is a consumer of API services — no business logic in the frontend. No data transformation client-side beyond display formatting.

**Intelligence/Presentation principle:** The Console consumes services. It does not implement them.

**Done when:** App loads with dark mode. Layout shell: top status bar (Lee name, version, last-backup indicator, current state badge), left navigation, main content area. Today page renders with empty state. Settings scaffold in place. Navigation works. No emojis anywhere.

---

### Task 3 — Understanding Pipeline

**Depends on:** 1

The ingestion and comprehension layer. Accepts text, URLs, files, voice notes, paste dumps. Runs extraction → enrichment → entity detection → classification → importance scoring → storage. Entry point for all new knowledge.

**Done when:** Text input accepted via API. Extraction produces typed objects to Fact/Interpretation Ledgers. Entity detection fuzzy-matches known projects and people. Importance score assigned. Source archived to App Storage. All objects linked back to source_id. Processing logged to Event Log.

---

### Task 4 — Brief Engine

**Depends on:** 3, 5

The daily briefing generator. Assembles a context packet, calls the Model Router, renders a structured document. Briefs are immutable after generation — regeneration requires explicit confirmation.

**Done when:** Morning Brief generated on schedule. Brief sections: priorities, decisions pending, risks, relationships to tend, financial snapshot, schedule awareness, closing observation. Briefs rendered in Console. Briefs immutable after generation. Briefs history page functional.

---

### Task 5 — Model Router & Context Engine

**Depends on:** 1

Routing intelligence between Lee and external models. Classifies requests by complexity, routes to cheap/mid-tier/strong model tier. Assembles context packets. Context Packet Preview shows exactly what will be sent. CIL (Compressed Instruction Layer) for reusable context segments.

**Done when:** Requests routed to correct model tier. Token budget respected. Cost estimate displayed before strong-model calls. CIL reuse functional. Context Packet Preview accurate with objects, tiers, relevance scores, and cost.

---

### Task 6 — Connector Engine

**Depends on:** 1, 3

Bridge between Lee and external data sources. Connectors for Gmail (read-only), Google Calendar (read-only), Google Drive (read-only), GitHub. Scheduled syncs. No write access to any external service.

**Done when:** All 4 connectors sync without errors. Ingested data flows through Understanding Pipeline. Freshness indicators accurate. Connector health visible in Settings. Connector errors create health alerts, not silent failures.

---

### Task 7 — Android App

**Depends on:** 2, 4

Mobile surface for Lee. Expo React Native. Consumes the same API as the Console. No business logic in the app — presentation only. Screens: Today, Capture, People, Settings. Brief delivered as push notification.

**Done when:** App builds and runs on Android. Today, Capture, People, Settings screens functional. Brief push notification delivered. Offline capture queue works — captures stored locally, synced on reconnect.

---

### Task 8 — Cost Engine

**Depends on:** 1, 5

Financial accountability layer. Tracks every token consumed and every model call made. Hard limits trigger governance holds, not silent failures. Budget projections prevent surprises.

**Done when:** Every model call logged with model_id, purpose, token count, cost_usd. Daily/weekly/monthly spend visible in Console. Budget limits enforced — approaching limit creates MEDIUM governance hold; hitting limit creates HIGH hold and blocks spend. Spend breakdown by engine and purpose.

---

### Task 9 — Backup, Migration & Brain Versioning

**Depends on:** 1

Portability and durability layer. Lee Brain must always be ownable. Encrypted, verifiable snapshots. Brain Versioning: a logical version (YYYY.M.minor) covering Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together — tagged on every backup, used by migration scripts.

**Done when:** Daily automated backup runs and verifies. Backup downloadable. Verify Archive and Test Restore functional. Migration Readiness score computed. Brain Version recorded in every manifest. Migration framework between Brain Versions defined and validated.

---

### Task 10 — Orchestration Engine & Scheduler Calendar

**Depends on:** 1

Scheduler and dispatcher for all background work. Priority queue (CRITICAL/HIGH/NORMAL/LOW). Engine registration, concurrency management, retry with exponential backoff, resource-aware dispatch. Reads the Resource Engine (Task #30) and State Engine (Task #32) before every dispatch.

**Scheduler Calendar:** A Calendar view at Settings → System → Schedule showing every scheduled background job on a 24-hour timeline (Morning Brief, Connector Syncs, Memory Compression, Backup, Health Scan, Reflection, etc.). Each job tile shows engine name, scheduled time, last run result, next run time, and estimated duration. Jobs with resource conflicts or deferrals shown with an amber indicator. Read-only — schedules are configured in Settings per engine.

**Done when:** Priority queue operational. All engines register jobs. Concurrency limits respected. Retries working. Job history in Health page. Scheduler Calendar renders in Console. Resource and State checks integrated once Tasks #30 and #32 exist.

---

### Task 11 — Governance Engine

**Depends on:** 1, 10

Approval and oversight layer. Every significant action routes through governance. Risk levels: LOW (auto-approve + log), MEDIUM (notify + approve), HIGH (explicit confirmation), CRITICAL (full review). Full audit trail.

**Done when:** All risk-rated actions route through governance. Approval queue visible in Console. MEDIUM and HIGH actions block until approved. Budget limit breaches and policy violations create governance holds. Audit trail complete.

---

### Task 12 — Memory Architecture

**Depends on:** 1, 3

Structured memory hierarchy. Six tiers: Working → Short-term → Long-term → Reference → Archive → Semantic (Stage 6, implemented by Task #28). Promotion, demotion, and compression rules. Memory Compression Roadmap: Stages 1–6. Stage 2 output format must be validated for Stage 3 compatibility before Stage 2 is deployed.

**Done when:** All six tiers defined. Promotion/demotion rules implemented. Stages 1–3 compression functional. Stage 6 hooks present. Memory tier visible on all object detail pages. Compression jobs run via Orchestration Engine at LOW priority.

---

### Task 13 — Intelligence Graph

**Depends on:** 1, 3

Knowledge graph layer. Typed nodes (Project, Person, Organization, Concept, Event, Decision, Risk, Opportunity) and typed edges. Automatic edge creation from Understanding Pipeline. Pattern detection: clusters, weak links, orphaned nodes. Explicitly separate from Decision Impact Graph (Task #24).

**Done when:** Nodes and edges persisted. Automatic edges created on ingestion. Graph visualization renders. Orphaned node detection runs. Pattern insights surfaced as Curiosity items.

---

### Task 14 — Identity & Relationship Engine

**Depends on:** 1, 6, 13

The people layer. Relationship strength, interaction history, communication patterns, follow-up states, waiting loops tied to people. Trust tier per person: Close/Professional/Extended/Peripheral.

**Done when:** People entities tracked with full profile. Trust tiers assigned. Follow-up states tracked. Waiting loops visible on person pages. People referenced correctly in briefs and strategy outputs.

---

### Task 15 — Curiosity Engine

**Depends on:** 3, 12, 13

Proactive question-asking layer. Scans memory and the knowledge graph for staleness, gaps, conflicts, and missing connections. Does not ask questions Lee could answer herself. Trust Score per curiosity item type tracked independently.

**Done when:** Staleness, gap, and conflict detection runs. Curiosity items generated and ranked. Questions appear in Morning Brief. Trust Score tracked and displayed in Settings.

---

### Task 16 — Strategy Engine

**Depends on:** 13, 14, 15

Forward-looking intelligence layer. Manages OKRs, evaluates strategic options, generates recommendations with confidence and risk assessments, runs prioritization. Strategies update when underlying facts change via Event Log subscription.

**Done when:** OKRs tracked. Recommendations generated with confidence and Why Chain. Prioritization across objectives runs. Strategy page renders. Strategies update on fact changes.

---

### Task 17 — Reflection Engine

**Depends on:** 12, 13, 16

Pattern recognition and retrospective layer. Compares periods, identifies trends, summarizes what changed and why, surfaces lessons. Weekly and monthly reflections. Feeds Curiosity Engine with structural gaps.

**Done when:** Period comparison runs. Trends identified. Reflection summaries generated and stored as Interpretation Ledger records. Reflection page renders. Gaps feed Curiosity Engine.

---

### Task 18 — Operating Modes

**Depends on:** 10, 11

System-wide behavioral configurations. Modes: FOCUS, TRAVEL, DEEP_WORK, REVIEW, EMERGENCY. Every engine reads the current mode's parameters at dispatch time. Current mode visible in status bar.

**Done when:** All modes defined with per-engine behavior parameters. Mode switch triggers reconfiguration across all engines. Current mode visible in status bar. Mode history logged to Event Log.

---

### Task 19 — Constitution Engine

**Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. Constitution is a versioned document of ABSOLUTE provisions (unconditional blocks) and CONFIGURABLE provisions (owner-adjustable). Constitution Engine enforces ABSOLUTE provisions before every significant action, before governance evaluation. Amendments require a 72-hour quorum process.

**ABSOLUTE provisions include:** Provenance is non-negotiable. Internal APIs not exposed externally. Semantic Index embeddings stored locally. No silent failures. Event Log is append-only. Facts and Interpretations never mixed.

**Done when:** Constitution versioned in DB. ConstitutionEngine.check() called before every significant action. ABSOLUTE violations block unconditionally and log. Amendment process defined and enforced. Constitution version visible in Settings and every Brain Version.

---

### Task 20 — Confidence Propagation

**Depends on:** 1, 12, 13

Epistemic integrity layer. Every fact, interpretation, and recommendation carries a confidence score. Confidence degrades through inference chains at defined degradation factors per hop. Always visible in Why Chain and on object detail pages.

**Done when:** All objects carry confidence and propagated_confidence. Propagated confidence computed through Why Chains. Confidence displayed on detail pages with color coding. Low-confidence objects flagged in briefs. Degradation factor configurable in Settings.

---

### Task 21 — Fact/Interpretation Separation

**Depends on:** 1, 3, 13

Epistemic ledger layer. Two permanent, separate ledgers enforced at schema, API, and constitutional layers. Facts: directly observable, sourced, immutable. Interpretations: derived, source-referenced, revision-tracked. No API that accepts one will accept the other.

**Done when:** Two separate DB tables with enforced constraints. Understanding Pipeline writes to correct ledger. All API endpoints typed for fact or interpretation exclusively. Ledger type badge visible on all detail pages. Constitution ABSOLUTE provision wired.

---

### Task 22 — Why Chain & Provenance

**Depends on:** 1, 5, 20, 21

Reasoning transparency layer. Every recommendation and interpretation has a navigable Why Chain. Provenance is an ABSOLUTE constitutional provision — no recommendation surfaces without a traceable chain to evidence. Why Chain UI in Console with source links and confidence at each step.

**Done when:** Why Chains created for all recommendations and interpretations. Why Chain UI renders. Every surfaced recommendation has a traceable chain. Confidence shown at each step. Constitution blocks any recommendation without a Why Chain.

---

### Task 23 — Assumption Ledger

**Depends on:** 12, 20, 21, 22

Assumption tracking layer. Full lifecycle: active → under_review → invalidated. When an assumption is invalidated, all conclusions built on it are flagged for review. Invalidation is a Domain Event that triggers re-evaluation of all dependent objects.

**Done when:** Assumption records created with linked conclusions. Invalidation propagates to all dependent conclusions. Assumptions page renders. Invalidation events logged. Strategies and simulations always name their assumptions.

---

### Task 24 — Decision Impact Graph

**Depends on:** 13, 16, 22

Consequence tracking layer. A separate graph tracking which decisions led to which outcomes. Counterfactuals recorded. Separate from the Intelligence Graph — Impact Graph tracks historical consequence; Intelligence Graph tracks structural relationship.

**Done when:** Decision nodes created on governance-approved decisions. Consequence edges recorded. Impact Graph visualization renders in Console. Most impactful decisions surfaced in Reflection summaries.

---

### Task 25 — Digital Twin Timeline

**Depends on:** 1, 12, 13, 22, 24

Operational history layer. The founder's full operational record as a scrollable, zoomable, filterable timeline. Events sourced from Event Log, connector syncs, briefs, governance decisions, and state changes. Filters by project, person, date range, event type.

**Done when:** Timeline renders with events from all sources. Filters working. Events click through to full object detail. Timeline scrollable and zoomable with density management at all zoom levels.

---

### Task 26 — Query Engine

**Depends on:** 1, 12, 13, 21

Universal data access layer beneath all intelligence engines. No intelligence engine reads from storage directly. All reads go through the Query Engine. Single retrieval policy, single ranking algorithm (importance × freshness × confidence × relevance), single cache, single authorization layer, single confidence aggregation system.

**Result format:** Every result includes why_included — a ranking factor breakdown that makes retrieval transparent and feeds the Why Chain.

**Done when:** All intelligence engines refactored to use Query Engine exclusively. Ranking algorithm applied consistently. Cache operational with event-driven invalidation. Query telemetry logged. Context Engine and Brief Engine retrieval refactored to use Query Engine calls.

---

### Task 27 — Explanation Engine

**Depends on:** 5, 22, 26

Audience-aware translation layer. Translates Lee's internal state into explanations tailored to a specified audience: Developer, Investor, Founder, Executive, Legal, Technical, General. Explanations stored as Interpretation Ledger records and reused until source objects change.

**Done when:** All audience profiles defined. Explanation Engine callable from Ask Lee, Brief Engine, Strategy page. Explanations cached and reused. Why Chain attached to every explanation. Quality feedback routes to Learning Engine.

---

### Task 28 — Semantic Index

**Depends on:** 3, 12, 26

Discovery layer. Vector embedding store indexed over all Lee's knowledge. Enables fuzzy semantic search ("What was that conversation six months ago where Olivia mentioned pilots?"). Not storage — all data lives in its primary store. Stage 6 of the Memory Compression Roadmap.

**Privacy constraint (ABSOLUTE):** Semantic Index embeddings stored locally. Never transmitted externally without governance approval.

**Done when:** Embedding model configured. Index covers all knowledge object types. Semantic search callable from Query Engine for discovery-mode queries. Index freshness tracked in Health page. Full rebuild utility functional. Index included in backups.

---

### Task 29 — Policy Engine

**Depends on:** 1, 19

Mutable operational policy layer. Between the immutable Constitution and case-by-case Governance. Manages: Cost Policy, Privacy Policy, Retention Policy, Notification Policy, Relationship Policy, Backup Policy, Connector Policy. Policies are versioned. Policy violations create governance holds, not constitution violations.

**Done when:** All built-in policy types defined with defaults. All engines wire PolicyEngine.check() calls. Policy violations create governance holds. Policy history browsable in Settings. Rollback to previous policy version available.

---

### Task 30 — Resource Engine

**Depends on:** 1, 10

Resource awareness layer. Continuously tracks CPU, RAM, disk space, token budgets, API quotas per connector, network quality, Android battery (when paired). Exposes current state to Orchestration Engine before every job dispatch. HEALTHY/CONSTRAINED/CRITICAL per dimension.

**Done when:** All resource dimensions sampled and stored. Orchestration Engine reads resource state before dispatch. CONSTRAINED defers LOW/NORMAL jobs. CRITICAL defers all but CRITICAL priority. Resource health card in Health page. CRITICAL alerts created.

---

### Task 31 — Intent Engine

**Depends on:** 1, 26

Intent classification layer. Every request produces a typed Intent record before anything else happens. Intent types: question_factual, question_exploratory, explanation_seeking, recommendation_request, simulation_request, strategy_request, draft_request, capture_input, approval_action, and others. All downstream decisions use the Intent record.

**Done when:** All Ask Lee requests classified into Intent records before retrieval. Intent shown in Ask Lee ("Understood as: [type] about [entities]") with correction option. Corrections feed Learning Engine. Scheduled jobs produce synthetic Intent records. Intent history browsable.

---

### Task 32 — State Engine

**Depends on:** 1, 10

Lee's operational state at every moment. Defined finite states: Booting, Learning, Idle, Thinking, Briefing, Importing, Synchronizing, Waiting, Recovering, Offline, Degraded. Exactly one primary state at all times. State visible on all UI surfaces. Orchestration Engine reads state before dispatch.

**Done when:** State transitions defined and enforced. All transitions logged to Event Log. Status bar shows current state with appropriate styling (Thinking: pulse, Offline: disconnected icon, Recovering/Degraded: amber). Orchestration Engine uses state for deferral decisions. State history in Health page.

---

### Task 33 — Internal API Contracts & Capability Registry

**Depends on:** 1, 10

Engine modularity layer. Every engine exposes a versioned, typed REST API at /internal/[engine-name]. Zod-validated on every request and response. Capability Registry: every engine registers capabilities, dependencies, inputs, outputs, version, health, and owner on startup. Heartbeats keep the registry current.

**Constitutional constraint (ABSOLUTE):** Internal APIs are not exposed externally. The /internal/ namespace is never accessible outside Lee.

**Done when:** All engines expose versioned internal APIs with Zod validation. Capability Registry populated by all engines on startup. Heartbeat timeout detection marks unavailable engines. Orchestration Engine routes via registry. Engines panel in Health page shows all engines with status and capabilities.

---

### Task 34 — Context Economy

**Depends on:** 5, 12, 20, 26

Dynamic context relevance layer. Replaces static tier-based weights with a continuous scoring formula applied to every object competing for a context packet.

**Formula:**
```
Context Value =
  (Goal_Match × W_goal)
× (Recency × W_recency)
× (Importance × W_importance)
× (Relationship × W_relationship)
× (Project_Activity × W_project)
× (Confidence × W_confidence)
× (Trust × W_trust)
× (Mode_Relevance × W_mode)
```

All factors [0, 1]. Multiplicative — any zero factor eliminates the object. Weights configurable per intent type via Policy Engine.

**Done when:** Formula replaces tier-based assembly in Context Engine. All 8 factors implemented and tested. Context Packet Preview shows scores and breakdown. Excluded objects visible with competition scores. Feedback signal routed to Learning Engine. Cold-start defaults for new objects functional.

---

### Task 35 — Domain Events

**Depends on:** 1

Typed event contract system. Every significant state change in Lee emits a typed Domain Event with a defined schema. No engine emits generic log entries. Every event has: event_id, event_type (enum), event_version, occurred_at, caused_by (causal chain), source_engine, payload (type-specific Zod schema), session_id, brain_version.

**Event catalog includes:** KnowledgeCreated, KnowledgeUpdated, KnowledgeInvalidated, FactAccepted, FactInvalidated, InterpretationCreated, PersonCreated, InteractionRecorded, StrategyGenerated, StrategyInvalidated, BriefGenerated, ConnectorSynced, ConnectorFailed, ObjectPromoted, ObjectDemoted, ConfidenceChanged, ConfidencePropagated, AssumptionRecorded, AssumptionInvalidated, ConstitutionAmended, ConstitutionCheckFailed, PolicyChanged, PolicyViolationDetected, BrainVersionChanged, BackupCompleted, BackupFailed, ModeChanged, StateChanged, EngineRegistered, EngineUnavailable, SelfTestCompleted, IntentClassified, IntentCorrected, ExplanationGenerated, OwnerVerified, KnowledgeStale, KnowledgeAged, BootStarted, BootCompleted, ManifestGenerated.

**Caused-by chain:** Every event records the event_id that triggered it. Full causal chains are browsable in the Event Log viewer.

**Done when:** EventBus.emit() validates all events against their Zod schemas before writing. All engines emit typed events — no direct Event Log inserts. Subscription system wires: Confidence re-propagation, Assumption invalidation cascade, Strategy invalidation, Context cache invalidation, Semantic Index update queuing. Event Log viewer in Console shows filter-by-type, full payloads, causal chain trace. Re-projection projection handlers exist for every event type in the catalog.

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies

**Depends on:** 10, 33

Standard engine lifecycle interface, automated startup dependency validation, and per-engine recovery behavior.

**Lifecycle interface (all engines implement):** initialize(), boot() → BootResult, health_check() → HealthStatus, pause(reason), resume(), recover(recovery_policy), shutdown().

**Dependency validation:** On boot, Orchestration Engine validates every engine's required_dependencies against the Capability Registry. Missing required dependency → engine enters DEGRADED mode automatically. Missing optional dependency → degraded_capabilities list published.

**Recovery Policies:** AUTO_RESTART (transient failures, with backoff), AUTO_FALLBACK (redirect to declared fallback capability), GRACEFUL_DISABLE (mark capabilities unavailable; continue reduced), MANUAL_RECOVERY (CRITICAL alert + governance hold; data-sensitive engines only).

**Startup sequence:** Foundations → Knowledge → Retrieval → Intelligence → Coordination → Interfaces. Each layer waits for the previous layer's boot() to complete.

**Done when:** All engines implement the EngineLifecycle interface. Dependency declarations in Capability Registry. Auto-degraded mode on missing optional dependencies. Recovery policies declared and executed. Layer-ordered startup enforced. Lifecycle state visible in Health page Engines panel.

---

### Task 37 — Self-Test Framework

**Depends on:** 33, 36

Comprehensive system diagnostics. One action — "Run Full System Check" — tests every engine, every API, every connector, every policy, every query, every backup, and every migration path. Aircraft diagnostics for Lee.

**Test suites:** Engine Suite (lifecycle, API health, synthetic request), API Suite (all internal endpoints respond and validate), Connector Suite (auth valid, test sync, quota state), Policy Suite (check() returns correct results for known permitted/denied actions), Query Suite (end-to-end: seed fact → query → verify → update → verify cache invalidation), Event Log Suite (append-only constraint, re-projection consistency, causal chain traversal), Backup Suite (verify archive, freshness, test restore, Brain Version), Constitution Suite (ABSOLUTE provisions enforced), Semantic Index Suite, Domain Events Suite, Context Economy Suite.

**Results:** PASS / WARN / FAIL per test. Overall result is worst of all tests. Evidence attached to every test result. Full history stored and browsable.

**Done when:** Run Full System Check functional from Settings → System. All test suites implemented. SelfTestReport stored after every run. Scheduled weekly self-test operational. Self-test automatically triggered after every backup restore. SelfTestCompleted domain event emitted.

---

### Task 38 — Recovery Modes

**Depends on:** 10, 32

Defines how Lee starts or restarts — distinct from what she does while running (State Engine). Six recovery modes with precise semantics:

- **Cold Boot:** Full initialization from scratch. All checks. Used after crash, after restore, or after major schema migration.
- **Warm Restart:** Preserved in-memory state where safe. Requires a clean_shutdown marker. Fastest restart mode.
- **Safe Mode:** Only Foundations layer boots. All other engines UNAVAILABLE. Full Console and Health page accessible. Intelligence capabilities disabled. Used when an engine is suspected of causing a failure loop.
- **Recovery Mode:** Repair agenda from previous session drives startup. Only engines needed for repair boot. All non-repair writes disabled. Owner confirms each repair step.
- **Migration Mode:** Brain Version migration framework active. Non-essential writes disabled. Migration scripts loaded and executable.
- **Read Only Mode:** All write operations disabled. All read operations available. Used for forensic investigation or during major schema migrations.

Boot mode selected automatically: explicit parameter → recovery_agenda present → clean_shutdown marker present → Cold Boot default.

**Done when:** All six modes defined and enforce their constraints. Boot mode determination logic runs on every startup. Clean shutdown marker written and consumed correctly. Recovery agenda created on crash detection. Safe Mode banner visible on all Console pages. Boot mode logged as BootStarted domain event. Status bar shows active mode during non-standard boots.

---

### Task 39 — Data Ownership

**Depends on:** 1, 3

Full provenance on every object. Six ownership fields on every fact, interpretation, project, person, assumption, decision, and relationship: created_by, modified_by, verified_by, imported_from, generated_by, current_owner. All fields populated automatically by the creation/modification path — never manually set by the implementer.

**Verification:** Owner can explicitly verify any object ("Mark as Verified") — resets the age clock (Task #40) and feeds the Trust Score system. Verification is informational, never required.

**Done when:** All ownership fields added to all knowledge object tables. Drizzle migration populates defaults for existing records. All creation and modification paths auto-populate applicable fields. Ownership section on every object detail page in Console. "Mark as Verified" action functional. Ownership visible in Context Packet Preview and Why Chain UI. OwnerVerified domain event emitted on verification.

---

### Task 40 — Knowledge Aging

**Depends on:** 12, 26

Temporal freshness dimension, orthogonal to confidence and memory tier. Six age states per object: Fresh, Current, Old, Historical, Stale, Expired. Age windows configured per object type via Retention Policy (Policy Engine). Verification resets the age clock.

**Age state effects:**
- **Stale:** Curiosity item created automatically ("This fact about X is N days old and may no longer be current")
- **Expired:** Object excluded from context packets entirely (Goal_Match forced to 0 in Context Economy)
- **Stale in Context Economy:** Recency factor halved regardless of computed decay

**Default age windows:** Project status: Stale at 180d / Expired at 365d. Market facts: Stale at 365d / Expired at 730d. Relationship interactions: Stale at 730d / Expired never. Personal/biographical facts: Stale never / Expired never.

**Done when:** Age state field on all knowledge objects. Daily aging scan job runs at LOW priority. Verification resets age clock. Curiosity Engine integration creates Stale curiosity items. Context Economy excludes Expired objects. Age badge on all object detail pages. Aging summary in Health page.

---

### Task 41 — System Manifest

**Depends on:** 9, 19, 29, 33

Auto-generated living document of Lee's complete operational state. One document. Always current. Generated fresh on every request.

**Manifest sections:** Identity (Lee Version, Brain Version, generated_at), Constitution (version, ratified_at, provision counts, pending amendments), Policies (active version per type, key values, last changed), Brain State (object counts by type, Event Log count, date range, memory tier distribution), Capabilities (all registered engines with lifecycle state, version, degraded capabilities), Connectors (status, last_synced_at, object count, quota state), Schemas (DB schema version, Brain Version component versions, last migration), Indexes (Semantic Index coverage and staleness, Query cache hit rate), Statistics (model calls, briefs, curiosity items, governance items last 30 days), Storage (DB size, App Storage size, backup count, last backup age), Health (current State, overall health, alert counts, last self-test result), Dependencies (full dependency graph — satisfied, degraded, missing).

**Exports:** JSON (full manifest, downloadable) and Markdown (human-readable, shareable). Both expire after 24 hours from App Storage.

**Backup integration:** manifest_at_backup.json included in every Brain backup. After restore, current manifest compared to backup manifest — differences shown to owner.

**Done when:** GET /internal/manifest returns full ManifestDocument in under 2 seconds. System Manifest page in Console Settings renders all sections with collapsible accordion. JSON and Markdown exports downloadable. Weekly snapshot stored in App Storage. Manifest comparison view functional. ManifestGenerated domain event emitted after every generation.

---

## Architecture Notes

### Confidence vs. Trust — Never Conflate

| | Confidence | Trust |
|---|---|---|
| Measures | Epistemic certainty of a specific object | Reliability of a subsystem over time |
| Range | 0–1 | 0–100 (starts at 50) |
| Decay | Per inference hop (configurable degradation factor) | 0.5/day without activity |
| Rises when | Source quality is high; chain is short | Owner verifies accuracy of subsystem outputs |
| Used in | Why Chain, Brief filtering, Context Economy (Confidence factor) | Context Economy (Trust factor), Curiosity item weighting |

### Context Packet Assembly Order (v5.0)

```
1. Classify request  → Intent record (Intent Engine)
2. Query candidates  → Query Engine with intent spec
3. Score candidates  → Context Economy formula (8 factors)
4. Select within budget → ContextBudget greedy selection
5. Assemble packet   → scores and factor breakdowns in Context Packet Preview
6. Route to model    → Model Router with Intent record + assembled packet
7. Post-process      → Explanation Engine if intent.explanation_type is set
8. Emit event        → Typed Domain Event to Event Log
```

### Brain Version vs. Lee Version

| | Lee Version | Brain Version (YYYY.M.minor) |
|---|---|---|
| What it tracks | Software version | Owner's accumulated knowledge state |
| Changes when | Code is updated | Memory schema, Constitution, Policies, Semantic Index, or Knowledge graph structure changes |
| Used by | Deployments, changelogs | Backup manifests, migration scripts, System Manifest |

### Recovery Mode vs. Operational State

| | Recovery Modes (Task #38) | Operational States (Task #32) |
|---|---|---|
| Describes | How Lee starts or restarts | What Lee is doing right now |
| Examples | Cold Boot, Safe Mode, Recovery Mode | Idle, Thinking, Importing, Offline |
| Set by | Boot mode determination logic at startup | Orchestration Engine during runtime |
| Visible | Status bar during non-standard boot | Status bar always |

---

*Plan version: 5.0 · Task count: 41 · Date: July 2, 2026*

*New in v5.0: Tasks #35–#41 (Domain Events, Engine Lifecycle & Recovery Policies, Self-Test Framework, Recovery Modes, Data Ownership, Knowledge Aging, System Manifest) · Task #10 updated with Scheduler Calendar · 2 new Architecture Principles (Domain Events as typed contracts, Engine lifecycle, Lee can describe herself) · Governance Stack diagram added · Execution Flow diagram formalized · Recovery Mode vs. Operational State distinction added*
