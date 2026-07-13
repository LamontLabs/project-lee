# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Version 12.0 — 69 Tasks · July 13, 2026*

---

## Vision

> Project LEE is evolving into a founder operating system whose most valuable asset is not its language model, but its continuously refined understanding of reality, accumulated experience, and ability to help its owner make consistently better decisions over time.

She is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system.

---

## The Lamont Labs Operating Stack

```
LEE                    — operating intelligence
  ↓ calls                   ↓ calls
CIL                    CerbaSeal
(reusable reasoning)   (execution governance)
```

---

## Request Processing Order

```
Identity → Constitution → Intent → Context → CIL → CerbaSeal
```

---

## Architecture Principles (v12.0 — 43 principles)

**1–39.** All v11.0 principles remain.

**40.** New capabilities must earn their own engine. Ask first: "Is this a distinct responsibility, or a capability of an existing engine?" Engines are intentional.

**41.** History is not enough. Experience, Lesson, Pattern, and Institutional Knowledge are distinct knowledge types above Facts and Interpretations. Reality must test a belief before it becomes Institutional Knowledge.

**42.** LEE must learn from herself. Operational Self-Improvement tracks what works and adapts LEE's operational behaviors transparently, conservatively, and reversibly.

**43.** Every operation has an economic cost. System Economics provides unified accounting of what every capability costs and whether the value produced justifies it.

---

## Capability Levels (v12.0)

| Level | Capability | Unlocked By |
|-------|-----------|-------------|
| 1–33 | (v11.0 levels — all unchanged) | #1–#65 |
| 34 | Produces institutional history | #66 |
| 35 | Learns from what reality has proven | #67 |
| 36 | Improves her own operational behavior | #68 |
| 37 | Knows what everything costs and whether it's worth it | #69 |

---

## Layer Hierarchy (v12.0)

```
LAYER 0 — IDENTITY
  Identity Engine

LAYER 1 — FOUNDATIONS
  Constitution Engine · Event Log · Domain Events
  Foundation DB · Brain Versioning · Core Schema

LAYER 2 — KNOWLEDGE
  Fact Ledger · Interpretation Ledger · Data Ownership
  Intelligence Graph · Assumption Ledger · Knowledge Aging
  Why Chain & Provenance · Digital Twin Timeline
  Strategic Anchors · Decision Memory · Organizational Memory
  Institutional Knowledge Ledger [v12]

LAYER 3 — RETRIEVAL
  Query Engine · Semantic Index

LAYER 4 — INTELLIGENCE
  Intent Engine · Understanding Pipeline · Curiosity Engine
  Strategy Engine · Reflection Engine · Explanation Engine
  Confidence Propagation · Uncertainty Tracking · Simulation Engine

LAYER 5 — COORDINATION
  Orchestration Engine · Policy Engine · Governance Engine
  Resource Engine · State Engine · Operating Modes
  Engine Lifecycle · Recovery Modes · Capability Registry

LAYER 6 — OPERATIONAL CONTEXT
  World State Engine · Operational Memory
  Operational Capacity Awareness
  Initiative Engine · Operational Intelligence Engine
  Executive Loop · Operational Confidence
  Executive Objectives Engine · Resource Allocation Engine
  Operational Review Engine [v12]
  Operational Self-Improvement [v12]

LAYER 6b — PORTFOLIO INTELLIGENCE
  Project Momentum Engine · Opportunity Engine
  Portfolio Intelligence Engine · Portfolio Dependency Graph
  Execution Readiness

LAYER 7 — INTERNAL CAPABILITY SERVICES
  CIL (ReasoningService) · CerbaSeal (GovernanceService)

LAYER 8 — PROVIDER LAYER
  Provider Abstraction Layer · Project Bootstrap Engine

LAYER 9 — INTERFACES & OBSERVABILITY
  Console · Android App · Brief Engine
  System Economics [v12] (supersedes Cost Engine #8)
  Backup & Migration · Context Economy
  Self-Test · System Manifest
```

---

## Task Index (69 tasks)

| # | Title | Depends On |
|---|-------|------------|
| 1 | Foundation & Core Schema | — |
| 2 | Console (Web App) | 1 |
| 3 | Understanding Pipeline | 1 |
| 4 | Brief Engine | 3, 5 |
| 5 | Model Router & Context Engine | 1 |
| 6 | Connector Engine | 1, 3 |
| 7 | Android App | 2, 4 |
| 8 | Cost Engine *(superseded by #69)* | 1, 5 |
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
| 66 | Operational Review Engine | 25, 35, 45, 49, 57 |
| 67 | Experience & Institutional Knowledge | 17, 22, 24, 35, 66 |
| 68 | Operational Self-Improvement | 4, 16, 43, 44, 45, 49 |
| 69 | System Economics | 5, 8, 35, 48 |

---

## Task Descriptions

### Tasks 1–65
All v11.0 task descriptions remain authoritative. The following notes capture v12.0 cross-task effects:

- **Task 8** — Cost Engine is superseded by Task #69 (System Economics). All Task #8 capabilities are preserved and extended within System Economics. Task #8 remains in the build sequence to establish the cost data model before System Economics extends it.
- **Task 17** — Reflection Engine: after #67, Reflection Engine's pattern analysis is extended to extract candidate Lessons from Experience records; Reflection Engine becomes the primary lesson-extraction engine
- **Task 37** — Self-Test: v12.0 additions — Operational Review Suite, Experience & Institutional Knowledge Suite, Operational Self-Improvement Suite, System Economics Suite
- **Task 41** — System Manifest: v12.0 additions — System Economics summary, current Operational Self-Improvement adaptations, Institutional Knowledge item count and most recent items
- **Task 45** — OIE: after #68, Operational Self-Improvement adaptation parameters are applied to OIE surfacing behaviors
- **Task 49** — Executive Loop: after #66, each loop cycle checks scheduled review triggers; after #68, Executive Loop surfaces new adaptation notifications via Initiative items

---

### Task 66 — Operational Review Engine
**Depends on:** 25, 35, 45, 49, 57

The institutional historian. On a defined schedule — weekly, monthly, quarterly, annually — generates a structured narrative review of the operational period.

Each review answers: what improved, what regressed, what assumptions failed, what opportunities appeared, where effort went, what produced value, which decisions worked, what changed strategically, what is portfolio health. Reviews are stored permanently, indexed in the Intelligence Graph, and retrievable via the Query Engine.

Reviews feed Task #67: lessons appearing consistently across multiple reviews are escalated as candidates for Institutional Knowledge promotion.

Review narrative generated via CIL; cost tracked by System Economics. On-demand review available in addition to scheduled cadences.

---

### Task 67 — Experience & Institutional Knowledge
**Depends on:** 17, 22, 24, 35, 66

Not a new engine — a new knowledge tier built on the existing Knowledge Layer.

The pathway: Event → Experience → Lesson → Pattern → Institutional Knowledge.

Institutional Knowledge is the highest epistemic tier. It cannot be asserted — only earned through 3+ independent confirming events, no significant contradicting evidence, and a valid evidence window. High-confidence items require owner review before promotion.

The Reflection Engine is extended to extract Lessons from Experience records. Pattern detection runs across Lessons to identify convergent patterns. Strategy Engine adds a "Situational Resemblance" field when an active situation matches an established Institutional Knowledge pattern. Simulation Engine applies Institutional Knowledge as weighted priors.

Different from Decision Memory (behavioral patterns about the owner) and Strategic Anchors (declared commitments). Institutional Knowledge is what reality has proven about operational behavior.

---

### Task 68 — Operational Self-Improvement
**Depends on:** 4, 16, 43, 44, 45, 49

An extension of the Reflection Engine's mandate — applied to LEE's own operational effectiveness.

Tracks six effectiveness categories: recommendation acceptance, simulation accuracy, assumption reliability, brief completion, curiosity quality, initiative signal quality. Detects systematic patterns. Adapts output behaviors when evidence threshold reached (minimum 5 observations).

All adaptations: transparent (logged in Why Chain, visible in Console → Settings → Self-Improvement), reversible (owner can disable or reset), and conservative (adapts only output parameters — never Identity Profile, Constitutional provisions, Knowledge Layer facts, or Strategic Anchors).

When a new adaptation fires, an Initiative item is surfaced explaining the change and the evidence that drove it.

---

### Task 69 — System Economics
**Depends on:** 5, 8, 35, 48

Supersedes the Cost Engine (Task #8) by unifying all operational accounting into a single, coherent model.

Measures: CIL tier distribution and reuse rate, Model Router cost per call, embedding generation and reuse, database storage growth, background processing CPU/memory, network volume (connectors, CIL, CerbaSeal), per-stage request latency, and value ratios (cost per accepted recommendation, cost per Brief item completed, cost per simulation, cost per Institutional Knowledge item established).

The System Budget answers: "What does LEE cost to operate this month, and is it producing value?"

Surfaces: CIL reuse rate prominently (savings from T1/T2 cache); unusual cost concentration as Initiative observations; projected monthly cost with threshold alerts. Summary included in System Manifest and every Operational Review.

---

## v12.0 Domain Event Additions

- `OperationalReviewGenerated` — review_id, cadence, period_start, period_end, key_themes
- `ExperienceRecordCreated` — experience_id, source_event_id, significance_classification
- `LessonExtracted` — lesson_id, experience_ids, preliminary_conclusion
- `InstitutionalKnowledgeEstablished` — knowledge_id, statement, evidence_count, confidence
- `InstitutionalKnowledgeRevised` — knowledge_id, revision_type, exception_or_reinforcement
- `OperationalAdaptationApplied` — adaptation_id, category, parameter, previous_value, new_value, evidence_refs
- `SystemEconomicsUpdated` — accounting_cycle, total_cost, cil_reuse_rate, top_cost_category

---

## The Engine Test (v12.0)

Before any new capability is proposed as a new engine, it must pass this test:

1. Does it have a distinct, singular responsibility not owned by any existing engine?
2. Does it have its own data that no other engine owns?
3. Does it have its own lifecycle independent of other engines?

If the answer to any of these is no — it is a capability extension of an existing engine, not a new engine.

---

*Version 12.0 · 69 Tasks · July 13, 2026*
*v11.0 (65 tasks) → v12.0 (69 tasks): Tasks #66–#69 added*
*New architecture principles: #40–#43*
*Task #8 (Cost Engine) superseded by Task #69 (System Economics)*
*New capability levels: 34–37*
*Knowledge ledger count: 6 (Fact, Interpretation, Anchor, Decision Heuristic, Org Profile, Institutional Knowledge)*
