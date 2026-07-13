# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Version 11.0 — 65 Tasks · July 13, 2026*

---

## Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff — she doesn't replace your thinking, she protects it. She doesn't replace your decisions, she prepares them. She doesn't replace your memory, she preserves it.

The primary asset is the accumulated knowledge, governance, memory, relationships, timelines, and operational state — not the specific model answering questions. The model could change. Lee continues to grow.

---

## The Lamont Labs Operating Stack

```
LEE                    — operating intelligence
  ↓ calls                   ↓ calls
CIL                    CerbaSeal
(reusable reasoning)   (execution governance)
```

**LEE** knows. She owns context, projects, people, timelines, facts, interpretations, operational priorities, provider routing, and orchestration.

**CIL** remembers reusable reasoning. Three tiers: trigram reuse, vector similarity reuse, frontier escalation.

**CerbaSeal** decides whether execution may proceed. ALLOW / HOLD / REJECT with reason codes, decision envelope, evidence bundle.

---

## Request Processing Order (v11.0)

Every request — human or machine-initiated — flows through this sequence:

```
Identity    →  who am I and how do I operate?
Constitution →  what am I allowed to do?
Intent       →  what is being asked?
Context      →  what is relevant?
CIL          →  do we have reusable reasoning?
CerbaSeal    →  is this action authorized to proceed? (consequential only)
```

The Identity Engine is first. It is the center. Everything asks Identity before anything else.

---

## Architecture Principles (v11.0)

**1–22.** All v10.0 principles remain unchanged.

**23. LEE never stops running.** The Executive Loop is the operational heartbeat — Observe → Understand → Prioritize → Decide → Prepare → Wait → Review → Repeat.

**24. LEE knows how much to trust herself.** Operational Confidence is a composite, time-aware score.

**25. Projects have direction, not just status.** Project Momentum: Explosive / Rising / Stable / Declining / Dormant / Stalled.

**26. LEE looks for leverage.** The Opportunity Engine finds cross-project reuse, strategic alignment, and operational leverage.

**27. Capacity shapes presentation, not content.** Operational Capacity Awareness infers operational load from observed signals — not emotion.

**28. Some knowledge does not decay.** Strategic Anchors — founding rationales, rejected directions, architectural commitments — are intentionally durable.

**29. Lamont Labs is a portfolio, not a list.** The Portfolio Intelligence Engine maintains a model of shared infrastructure, customers, technology, risks, and resource allocation.

**30. Identity is the center.** The Identity Engine defines who LEE is, why she exists, what she is responsible for, and how she operates. Everything asks Identity before Constitution. Identity and Constitution are distinct responsibilities: Identity answers "what kind of operating partner am I?"; Constitution answers "what am I allowed to do?".

**31. Objectives are operational, not project-bound.** Executive Objectives are ongoing operational goals that span projects, people, and time. Every recommendation, observation, and surfaced item is weighted against active objectives.

**32. Organizations exist independently of their projects.** Organizational Memory models Lamont Labs as a first-class entity — infrastructure ownership, people categories, technology ownership, shared services. The organization is not a project.

**33. Decision patterns are observable.** Decision Memory infers operational heuristics from observed behavior — not self-reported preferences. Every recommendation is evaluated against established patterns. LEE can say "I think you'll probably reject this" before you do.

**34. The future can be simulated.** The Simulation Engine runs structured what-if scenarios against the full knowledge model. Simulations are stored, their assumptions are tracked, and when reality matches a stored scenario, LEE surfaces the prediction.

**35. History can be reconstructed.** The Time Machine reconstructs the complete operational state at any past moment via event log re-projection. Every past state is navigable, comparable, and usable as a simulation starting point.

**36. Confidence and uncertainty are distinct signals.** Confidence measures how well-grounded a belief is in available evidence. Uncertainty measures how unstable a situation is regardless of what we know. High confidence and high uncertainty can coexist.

**37. Attention is a limited resource that must be allocated.** The Resource Allocation Engine continuously computes where time and attention should go across the portfolio — not declared, but calculated from objectives, momentum, readiness, and dependencies.

**38. Projects have readiness, not just status.** Execution Readiness measures a project's readiness across named dimensions (architecture, documentation, security, demo, pilot, pitch) rather than a single status field.

**39. Dependencies define blast radius.** The Portfolio Dependency Graph models directional dependencies across all projects and shared services. One change surfaces every downstream impact automatically.

---

## Capability Levels (v11.0)

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
| 24 | Knows who she is | #56 |
| 25 | Pursues objectives, not just projects | #57 |
| 26 | Understands the organization | #58 |
| 27 | Knows how you decide | #59 |
| 28 | Simulates the future | #60 |
| 29 | Reconstructs the past | #61 |
| 30 | Distinguishes confidence from uncertainty | #62 |
| 31 | Allocates attention across the portfolio | #63 |
| 32 | Knows what each project is ready to do | #64 |
| 33 | Sees ripple effects before they happen | #65 |

---

## Layer Hierarchy (v11.0)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 0 — IDENTITY [v11]                                       │
│  Identity Engine — the center; asked before everything else     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1 — FOUNDATIONS                                          │
│  Constitution Engine · Event Log · Domain Events                │
│  Foundation DB · Brain Versioning · Core Schema                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — KNOWLEDGE                                            │
│  Fact Ledger · Interpretation Ledger · Data Ownership           │
│  Intelligence Graph · Assumption Ledger · Knowledge Aging       │
│  Why Chain & Provenance · Digital Twin Timeline                 │
│  Strategic Anchors — Anchor Ledger (never ages)                 │
│  Decision Memory — Decision Heuristic Ledger [v11]              │
│  Organizational Memory [v11]                                    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — RETRIEVAL                                            │
│  Query Engine · Semantic Index (local embeddings)               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — INTELLIGENCE                                         │
│  Intent Engine · Understanding Pipeline                         │
│  Curiosity Engine · Strategy Engine                             │
│  Reflection Engine · Explanation Engine                         │
│  Confidence Propagation · Uncertainty Tracking [v11]            │
│  Simulation Engine [v11]                                        │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — COORDINATION                                         │
│  Orchestration Engine & Scheduler Calendar                      │
│  Policy Engine · Governance Engine                              │
│  Resource Engine · State Engine                                 │
│  Operating Modes · Engine Lifecycle & Recovery Policies         │
│  Recovery Modes · Capability Registry                           │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6 — OPERATIONAL CONTEXT                                  │
│  World State Engine · Operational Memory                        │
│  Operational Capacity Awareness                                 │
│  Initiative Engine · Operational Intelligence Engine            │
│  Executive Loop — the operational heartbeat                     │
│  Operational Confidence                                         │
│  Executive Objectives Engine [v11]                              │
│  Resource Allocation Engine [v11]                               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6b — PORTFOLIO INTELLIGENCE                              │
│  Project Momentum Engine                                        │
│  Opportunity Engine                                             │
│  Portfolio Intelligence Engine                                  │
│  Portfolio Dependency Graph [v11]                               │
│  Execution Readiness [v11]                                      │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — INTERNAL CAPABILITY SERVICES                         │
│  Reasoning Services (CIL) · Governance Services (CerbaSeal)    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 8 — PROVIDER LAYER (External Services)                   │
│  Provider Abstraction Layer · Project Bootstrap Engine          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 9 — INTERFACES & OBSERVABILITY                           │
│  Console (+ Portfolio View + Objectives + Org + Simulate +      │
│            Time Machine) · Android App                          │
│  Cost Engine · Backup & Migration                               │
│  Context Economy · Brief Engine · Self-Test · System Manifest   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task Index (65 tasks)

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
| 56 | Identity Engine | 1, 19, 29 |
| 57 | Executive Objectives Engine | 16, 26, 44, 45 |
| 58 | Organizational Memory | 1, 3, 13, 14 |
| 59 | Decision Memory | 16, 22, 24 |
| 60 | Simulation Engine | 16, 23, 26, 45 |
| 61 | Time Machine | 25, 35 |
| 62 | Uncertainty Tracking | 20, 23, 26, 50 |
| 63 | Resource Allocation Engine | 45, 51, 55, 57, 64 |
| 64 | Execution Readiness | 13, 26, 47 |
| 65 | Portfolio Dependency Graph | 13, 47, 55 |

---

## Task Descriptions

### Tasks 1–55
All v10.0 task descriptions remain authoritative. The following notes capture v11.0 cross-task effects:

- **Task 1** — Core schema adds Identity Profile table, Executive Objective table, Decision Heuristic Ledger table, Organizational Profile table
- **Task 2** — Console navigation adds: Objectives, Organization, Simulate, Time Machine pages
- **Task 4** — Brief Engine: after #56, Brief opening checks Identity Profile behavioral dimensions; after #57, Brief includes active Executive Objectives summary; after #62, high-uncertainty items flagged distinctly
- **Task 16** — Strategy Engine: after #56, strategy recommendations check Identity behavioral profile; after #59, recommendations include Pattern Alignment field; after #62, recommendations include Uncertainty levels for key assumptions
- **Task 19** — Constitution Engine: after #56, a new ABSOLUTE provision added: "The Identity Engine is consulted before the Constitution on every request"; the Constitution does not override Identity — they are complementary
- **Task 22** — Why Chain: after #59, heuristic conflict explanations included in Why Chain when a recommendation contradicts a Decision Memory heuristic
- **Task 25** — Digital Twin Timeline: after #61, Time Machine snapshots can be launched from Timeline date markers
- **Task 35** — Domain Events: v11.0 additions listed below
- **Task 37** — Self-Test: v11.0 additions — Identity Suite, Executive Objectives Suite, Organizational Memory Suite, Decision Memory Suite, Simulation Suite, Time Machine Suite, Uncertainty Suite, Resource Allocation Suite, Execution Readiness Suite, Portfolio Dependency Graph Suite
- **Task 41** — System Manifest: v11.0 additions — Identity Profile summary, active Executive Objectives, Organizational Profile summary, Resource Allocation current distribution, Execution Readiness portfolio summary, Portfolio Dependency Graph alert count
- **Task 45** — OIE: after #57, OIE weights all surfaced items against active Executive Objectives; after #63, OIE consumes Resource Allocation as a signal

---

### Task 56 — Identity Engine
**Depends on:** 1, 19, 29

The center. Everything asks Identity first. Request processing order: Identity → Constitution → Intent → Context → CIL → CerbaSeal.

Identity and Constitution are distinct: Identity answers "what kind of operating partner am I?"; Constitution answers "what am I allowed to do?"

Twelve behavioral dimensions in the Identity Profile: who am I, why do I exist, what am I responsible for, what will I never do, what must I protect, what are my priorities, what constitutes success, when to interrupt, when to remain silent, when to escalate, when to ask, when to observe.

Profile is versioned — every change creates a new version with a Why Chain. Changes require owner confirmation. New installations begin with a structured identity-onboarding conversation.

---

### Task 57 — Executive Objectives Engine
**Depends on:** 16, 26, 44, 45

Ongoing operational goals that span projects, people, and time. Not projects (deliverables). Not OKRs (planning documents). Operational intelligence objects with purpose, priority, progress, evidence, blockers, success metrics, related projects, expected completion, confidence, and owner.

Health states: On Track / At Risk / Stalled / Achieved / Abandoned. Progress computed automatically — not manually updated — from contributing project signals in the Event Log. Every recommendation and surfaced item weighted against active objectives.

---

### Task 58 — Organizational Memory
**Depends on:** 1, 3, 13, 14

Lamont Labs as a first-class entity. Structural dimensions: departments, current team, future roles. People categories: employees, partners, investors, advisors, clients, pilot partners, competitors. Infrastructure ownership map. Technology ownership. Revenue model. Legal footprint.

Updated automatically from Relationship Engine changes, Bootstrap Engine discoveries, and connector events. The key capability: "how does this affect the organization?" not just "how does this affect this project?"

---

### Task 59 — Decision Memory
**Depends on:** 16, 22, 24

Operational heuristics inferred from observed decision patterns — not self-reported. Sources: Decision Impact Graph entries, rejected Strategy recommendations, deferred governance actions, abandoned assumptions.

Heuristics have confidence (rises with consistent evidence, decays with exceptions). Strategy Engine adds a Pattern Alignment field to every recommendation. When a recommendation contradicts a high-confidence heuristic, LEE surfaces it proactively: "I think you'll probably reject this — here is why."

Different from Strategic Anchors: Anchors are declared commitments; Decision Memory heuristics are inferred from behavior.

---

### Task 60 — Simulation Engine
**Depends on:** 16, 23, 26, 45

Structured what-if scenarios evaluated against the full knowledge model. "What happens if CerbaSeal gets funded?" "What if Replit shuts down?" "What if Olivia replies tomorrow?"

Simulations are stored. Their assumptions are linked to the Assumption Ledger. When real-world events match a stored simulation scenario, LEE surfaces the stored prediction. Simulations can be compared. Simulations are always read-only — they never trigger actions or CerbaSeal calls. Can be launched from a Time Machine past state.

---

### Task 61 — Time Machine
**Depends on:** 25, 35

Reconstructs the complete operational state at any past moment via Event Log re-projection. "Show me Lamont Labs on March 3rd." "Show me CerbaSeal before Olivia." "Show me Project LEE at Version 6."

Snapshot covers: project states, relationship states, active decisions, active objectives, active anchors, active assumptions, portfolio state. Read-only — no actions from a past state. Named snapshots can be saved. A Time Machine snapshot can be used as the starting state for a Simulation Engine run.

---

### Task 62 — Uncertainty Tracking
**Depends on:** 20, 23, 26, 50

Uncertainty is distinct from confidence. Confidence measures evidence quality. Uncertainty measures situational instability — regardless of what is known.

Example: CerbaSeal funding — Confidence 72 (evidence of interest), Uncertainty HIGH (outcome is unknown). These can coexist.

Three dimensions: outcome uncertainty, timing uncertainty, scope uncertainty. Computed from: open waiting loops, externally-dependent assumptions, unresolved simulation scenarios. Uncertainty depresses Operational Confidence when elevated. Rendered distinctly from confidence in all views.

---

### Task 63 — Resource Allocation Engine
**Depends on:** 45, 51, 55, 57, 64

Continuous computation of where time and attention should go across the portfolio. Not declared — calculated from: Executive Objectives priority, Project Momentum, Execution Readiness, Portfolio Dependency Graph position, Operational Capacity state, World State time sensitivity.

Displayed as percentages, implied hours, and opportunity cost narrative. Divergence detection: when observed attention (from Operational Memory) diverges from recommended allocation beyond a threshold, an Initiative item is surfaced. Manual overrides with expiry dates. Updated every Executive Loop cycle.

---

### Task 64 — Execution Readiness
**Depends on:** 13, 26, 47

Multi-dimensional readiness score replacing the single "project status" field. Standard dimensions (all projects): architecture, documentation, repository, security, testing. Product dimensions (when applicable): demo, website, pricing, legal. Commercial dimensions: pilot, client. Growth dimensions: pitch, investment.

Technical dimensions populated automatically from Bootstrap Engine outputs. Non-technical dimensions populated from owner-created facts. The query "Is CerbaSeal pilot-ready?" evaluates only pilot-relevant dimensions and surfaces blocking gaps. Readiness feeds the Resource Allocation Engine as a bonus signal for nearly-ready projects.

---

### Task 65 — Portfolio Dependency Graph
**Depends on:** 13, 47, 55

Directional dependency structure across the entire portfolio. Dependency types: service, data, infrastructure, commercial, knowledge, team.

Populated automatically from Bootstrap Engine inventories. When any node changes (breaking change, shutdown risk, version deprecation), blast radius is computed and surfaced as a Portfolio alert. "What is affected if CIL changes its API?" returns an ordered impact list with dependency chain. Includes a visual diagram from Console → Portfolio → Dependency Graph.

---

## v11.0 Domain Event Additions

- `IdentityProfileUpdated` — dimension, previous_value, new_value, confirmed_by
- `ExecutiveObjectiveCreated` — objective_id, priority, related_projects
- `ExecutiveObjectiveHealthChanged` — objective_id, previous_health, new_health, evidence_refs
- `ExecutiveObjectiveAchieved` — objective_id, achieved_at, success_metric_refs
- `OrganizationalProfileUpdated` — dimension, change_summary
- `DecisionHeuristicEstablished` — heuristic_id, statement, confidence, evidence_refs
- `DecisionHeuristicRevised` — heuristic_id, confidence_delta, exception_or_reinforcement
- `SimulationCreated` — simulation_id, trigger_question, named_assumptions
- `SimulationScenarioMatched` — simulation_id, matching_event_id, match_confidence
- `TimeMachineSnapshotGenerated` — target_timestamp, snapshot_id, dimensions_included
- `UncertaintyLevelChanged` — object_id, previous_level, new_level, driving_signals
- `ResourceAllocationUpdated` — allocation_distribution, divergence_detected, cycle_number
- `ExecutionReadinessUpdated` — project_id, dimension, previous_score, new_score
- `PortfolioDependencyGraphUpdated` — change_type, affected_nodes, blast_radius_size

---

*Version 11.0 · 65 Tasks · July 13, 2026*
*v10.0 (55 tasks) → v11.0 (65 tasks): Tasks #56–#65 added*
*New architecture principles: #30–#39*
*New layer: Layer 0 (Identity)*
*New capability levels: 24–33*
*Request processing order established: Identity → Constitution → Intent → Context → CIL → CerbaSeal*
