# Project LEE — Master Breakdown
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Version 10.0 — 55 Tasks · July 13, 2026*

---

## The Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff.

She doesn't replace your thinking — she protects it.
She doesn't replace your decisions — she prepares them.
She doesn't replace your memory — she preserves it.

The primary asset is the accumulated knowledge, governance, memory, relationships, timelines, and operational state. Not the specific model answering questions. The model could change. Lee continues to grow.

**What makes LEE different:**

- ChatGPT stores conversations.
- Claude stores projects.
- Notion stores documents.
- GitHub stores code.
- Google Calendar stores events.

None of them maintain an evolving operational model of you. LEE does.

---

## The Lamont Labs Operating Stack

```
┌──────────────────────────────────────────────────────────┐
│                    Project LEE                           │
│              Operating Intelligence                      │
│                                                          │
│  Context · Projects · People · Timelines · Facts        │
│  Interpretations · Priorities · Provider Routing        │
│  Orchestration · Executive Loop · Portfolio             │
└──────────────────┬───────────────────┬───────────────────┘
                   │                   │
         calls via │                   │ calls via
     ReasoningService             GovernanceService
                   │                   │
    ┌──────────────▼──┐     ┌──────────▼────────────┐
    │      CIL        │     │      CerbaSeal         │
    │                 │     │                        │
    │ Reusable        │     │ Execution Governance   │
    │ Reasoning       │     │                        │
    │ Runtime         │     │ Returns:               │
    │                 │     │ ALLOW / HOLD / REJECT  │
    │ T1: Trigram     │     │ + decision envelope    │
    │ T2: Semantic    │     │ + evidence bundle      │
    │ T3: Frontier    │     │ + audit entry          │
    └─────────────────┘     └────────────────────────┘

Endpoint: cognitive-infrastructure-layer.replit.app
Endpoint: cerbaseal.replit.app
Auth: Bearer + HMAC-SHA256 signatures on both
```

**LEE knows. CIL remembers reusable reasoning. CerbaSeal decides whether execution may proceed.**

---

## Architecture Principles (v10.0)

**1 — The Constitution sits above everything.**
Every engine consults the Constitution before acting. ABSOLUTE provisions block unconditionally — not even governance approval overrides them.

**2 — Event Sourcing is the foundation.**
Almost nothing mutates directly. State changes are typed Domain Events. Current state is a projection. Re-projection from the Event Log alone must produce a consistent database.

**3 — Facts and Interpretations are never mixed.**
Two permanent, separate ledgers enforced at schema, API, and constitutional layers. No API that accepts one will accept the other.

**4 — The Query Engine is the universal access layer.**
No intelligence engine reads from storage directly. All reads go through the Query Engine. One retrieval policy, one ranking algorithm, one cache, one authorization layer.

**5 — Intent is a first-class typed object.**
Every request — human or machine-initiated — classifies its intent before retrieval or reasoning begins.

**6 — Context competes.**
The Context Economy formula replaces static tier weights. Every object scores against eight dimensions. The highest-scoring objects within the token budget win, regardless of memory tier.

**7 — Intelligence is independent of presentation.**
Every capability must work without any UI. Console, Android, CLI, API, and future desktop all consume identical services.

**8 — Resource-aware scheduling.**
The Orchestration Engine reads the Resource Engine before every dispatch.

**9 — Brain Versioning for safe migrations.**
Brain Version (YYYY.M.minor) covers Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together.

**10 — Confidence flows. Trust is earned.**
Confidence degrades through each inference step at defined rates. Trust is a per-subsystem score that decays without activity. They are different constructs and are never conflated.

**11 — Every output has a Why Chain.**
No recommendation without reasoning. No observation without grounded steps.

**12 — Assumptions are tracked.**
Every simulation and strategy names its assumptions. Invalidated assumptions trigger review of all conclusions built on them.

**13 — Domain Events are typed contracts.**
Every significant state change emits a typed Domain Event with a defined schema. No generic log entries.

**14 — Every engine has a lifecycle.**
initialize() → boot() → health_check() → pause() → resume() → recover() → shutdown().

**15 — Lee can describe herself.**
The System Manifest is always current. The Capability Registry is always accurate. The Self-Test Framework can verify every claim LEE makes about herself.

**16 — Lee knows the outside world.**
The World State Engine maintains an active model of external context: time, calendar, market signals, technical deprecations, and owner-configured monitoring topics.

**17 — Lee knows how you work.**
Operational Memory observes demonstrated behavioral patterns from existing signals — not declared preferences.

**18 — Lee initiates.**
The Initiative Engine surfaces proactive operational observations without being asked. Not reminders. Not alerts. Operational awareness delivered when it is actionable.

**19 — Continuous prioritization is the heart.**
The Operational Intelligence Engine answers "what deserves attention right now?" It synthesizes context, external signals, patterns, and strategy into a live operational answer.

**20 — Providers are replaceable. The operating intelligence is not.**
The Provider Abstraction Layer sits between every external service and LEE's internal engines. No engine above the adapter layer references Gmail, GitHub, or Google Calendar by name.

**21 — The owner should not reconstruct reality manually if the evidence already exists.**
When a repository is connected, LEE reads its structure, documentation, dependencies, and APIs to bootstrap an initial knowledge model automatically.

**22 — LEE coordinates. CIL reasons cheaply. CerbaSeal governs execution. They are separate services, not embedded subsystems.**
CIL and CerbaSeal are Lamont Labs internal capability services. LEE calls them through versioned, authenticated API contracts. Their databases are never shared. CIL degrades gracefully. CerbaSeal is fail-closed. These are architectural invariants.

**23 — LEE never stops running.**
The Executive Loop is the operational heartbeat — a continuous seven-phase cycle (Observe → Understand → Prioritize → Decide → Prepare → Wait → Review → Repeat) that drives everything LEE does. It is not a scheduled job. It is the rhythm of the system.

**24 — LEE knows how much to trust herself.**
Operational Confidence is a composite, time-aware score reflecting the quality of the current operational picture. When connectors are stale, assumptions are overdue, or capability services are degraded, LEE surfaces the degradation honestly with a plain-language explanation and an expandable Why breakdown.

**25 — Projects have direction, not just status.**
Project Momentum captures the velocity and trajectory of each project from signals LEE already observes. Momentum is a trajectory, not a snapshot. Explosive / Rising / Stable / Declining / Dormant / Stalled.

**26 — LEE looks for leverage.**
The Opportunity Engine scans the portfolio for cross-project reuse, strategic alignment, and operational leverage. It answers "what have we already solved?" before recommending that anything be built again. Code reuse, documentation reuse, governance reuse, strategic alignment — all are types of leverage.

**27 — Capacity shapes presentation, not content.**
Operational Capacity Awareness infers the owner's current operational load from observed behavioral signals — not emotion or psychology. When load is high, LEE surfaces fewer items at lower depth. The intelligence does not change. The owner can always override.

**28 — Some knowledge does not decay.**
Strategic Anchors — founding rationales, rejected directions, and architectural commitments — are intentionally durable. They do not enter the Knowledge Aging cycle. Recommendations that contradict them are flagged, not blocked. When a previously rejected direction is explored again, LEE surfaces the prior rejection reasoning automatically.

**29 — Lamont Labs is a portfolio, not a list.**
The Portfolio Intelligence Engine maintains a model of shared infrastructure, shared customers, shared technology, shared risks, and resource allocation across all projects. Portfolio-level intelligence is distinct from project-level intelligence and requires its own engine.

---

## Constitutional ABSOLUTE Provisions

These provisions cannot be overridden by governance approval, policy configuration, or any operational mode:

1. Provenance is non-negotiable — every fact, interpretation, and recommendation must have traceable sources
2. The /internal/ namespace is never exposed externally
3. Semantic Index embeddings are stored locally — never sent to an external service
4. No silent failures — every failure surfaces explicitly
5. The Event Log is append-only — no deletions, no overwrites
6. Facts and Interpretations are never mixed — schema-enforced, API-enforced, test-verified
7. No engine above the Provider Abstraction Layer references a specific service by name
8. The Bootstrap Engine never reads secret values — environment variable names only, never values
9. CerbaSeal is fail-closed — no consequential action executes without a valid ALLOW verdict from CerbaSeal
10. CIL and CerbaSeal databases are never accessed directly by LEE — all interaction through versioned APIs
11. Credentials for CIL and CerbaSeal are never logged, never stored in LEE's database, never included in any event payload, never sent to a model
12. Strategic Anchors are never silently contradicted — every contradiction must be flagged to the owner

---

## Layer Hierarchy (v10.0)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — FOUNDATIONS                                          │
│  Constitution Engine · Event Log (append-only) · Domain Events  │
│  Foundation DB · Brain Versioning · Core Schema                 │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2 — KNOWLEDGE                                            │
│  Fact Ledger · Interpretation Ledger · Data Ownership           │
│  Intelligence Graph · Assumption Ledger · Knowledge Aging       │
│  Why Chain & Provenance · Digital Twin Timeline                 │
│  Strategic Anchors — Anchor Ledger [v10] (never ages)           │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — RETRIEVAL                                            │
│  Query Engine · Semantic Index (local embeddings)               │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — INTELLIGENCE                                         │
│  Intent Engine · Understanding Pipeline                         │
│  Curiosity Engine · Strategy Engine                             │
│  Reflection Engine · Explanation Engine                         │
│  Confidence Propagation                                         │
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
│  Operational Capacity Awareness [v10]                           │
│  Initiative Engine · Operational Intelligence Engine            │
│  Executive Loop [v10] — the operational heartbeat               │
│  Operational Confidence [v10]                                   │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6b — PORTFOLIO INTELLIGENCE [v10]                        │
│  Project Momentum Engine                                        │
│  Opportunity Engine                                             │
│  Portfolio Intelligence Engine                                  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — INTERNAL CAPABILITY SERVICES                         │
│  ┌──────────────────────────┐  ┌─────────────────────────────┐ │
│  │   Reasoning Services     │  │   Governance Services       │ │
│  │ CIL → ReasoningService   │  │ CerbaSeal → GovernanceService│ │
│  │ Model Router             │  │ Future policy evaluators    │ │
│  │ Failure: graceful        │  │ Failure: fail-closed        │ │
│  └──────────────────────────┘  └─────────────────────────────┘ │
│  Separate DBs · Versioned APIs · HMAC auth · Replay protection  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 8 — PROVIDER LAYER (External Services)                   │
│  Provider Abstraction Layer · Project Bootstrap Engine          │
│  CommunicationProvider  →  Gmail                                │
│  DocumentProvider       →  Google Drive, Google Docs            │
│  DevelopmentProvider    →  GitHub (Intelligence)                │
│  SchedulingProvider     →  Google Calendar                      │
│  StorageProvider        →  Google Drive, App Storage            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 9 — INTERFACES & OBSERVABILITY                           │
│  Console (+ Portfolio View [v10]) · Android App                 │
│  Cost Engine · Backup & Migration                               │
│  Context Economy · Brief Engine                                 │
│  Self-Test Framework · System Manifest                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Executive Loop (v10.0)

The Executive Loop is the operational heartbeat of LEE. It is not a scheduled job. It is a permanent, typed, self-describing cycle that never stops running. The Operational Intelligence Engine is the intelligence substrate — the Executive Loop is the scheduling and phase-management wrapper around it.

```
┌─────────────────────────────────────────────────────────────┐
│                   EXECUTIVE LOOP                            │
│                                                             │
│   OBSERVE                                                   │
│   Read all incoming signals: events, connector updates,     │
│   world state changes, Initiative items, timer              │
│        ↓                                                    │
│   UNDERSTAND                                                │
│   OIE synthesizes current operational picture               │
│   Operational Confidence computed                           │
│        ↓                                                    │
│   PRIORITIZE                                                │
│   Rank everything: Active Priority, Drifting, Waiting,      │
│   Blocked, At Risk, Can Wait, Ignore Today                  │
│        ↓                                                    │
│   DECIDE                                                    │
│   What requires a governance decision or owner action?      │
│   What can proceed autonomously?                            │
│        ↓                                                    │
│   PREPARE                                                   │
│   Assemble context for surfacing: Console Today, Brief,     │
│   Android Today, Opportunity items, Momentum changes        │
│        ↓                                                    │
│   WAIT                                                      │
│   Listen: new events · time passing · external signals      │
│   owner interaction · CRITICAL interrupt → re-enter         │
│        ↓                                                    │
│   REVIEW                                                    │
│   Score the previous cycle quality                          │
│   Feed results back to Operational Memory pattern tracking  │
│   Update Operational Confidence history                     │
│        ↓                                                    │
│   REPEAT ──────────────────────────────────────────────────┘
│                                                             │
│  Phase transitions → ExecutiveLoopPhaseChanged events       │
│  Loop state persists across system restarts                 │
│  CRITICAL events interrupt any phase immediately            │
└─────────────────────────────────────────────────────────────┘
```

---

## Operational Confidence (v10.0)

LEE's self-assessment of the quality of her current operational picture. Displayed as a headline score with a plain-language explanation. Always expandable to a full Why breakdown.

```
Operational Confidence: 97

"All connectors synced in the last 2 hours, CIL and CerbaSeal
 are healthy, and assumption health across active projects is good."

Contributing factors (expandable):
  Connector sync freshness    ████████████  Healthy
  Stale knowledge ratio       ████████████  Low
  Assumption health           ███████████░  6 active, 0 overdue
  CIL health                  ████████████  Healthy
  CerbaSeal health            ████████████  Healthy
  World state freshness       ████████████  Current
  Semantic Index freshness    ███████████░  Last updated 4h ago
  Expired high-importance     ████████████  None
```

When confidence is low:
```
Operational Confidence: 43

"GitHub hasn't synced in 4 days, 3 key facts are Stale, and
 CerbaSeal health is DEGRADED."
```

---

## Project Momentum (v10.0)

Per-project velocity classification from signals LEE already captures:

| Project | Momentum | Direction |
|---|---|---|
| Project LEE | Explosive | Rising fast |
| CerbaSeal | Rising | Accelerating |
| Greyline | Stable | Holding |
| QuantraCore | Dormant | No activity |

Classifications: Explosive / Rising / Stable / Declining / Dormant / Stalled

Signal inputs (all from existing LEE data — no new collection):
- Commits pushed (7-day rolling, from DevelopmentProvider)
- Documentation updates
- Captures tagged to the project
- Decisions recorded
- External responses received
- Waiting loops resolved

---

## Opportunity Engine (v10.0)

Cross-portfolio leverage identification. The fourth proactive engine alongside Curiosity, Initiative, and Operational Intelligence.

| Type | Example |
|---|---|
| Code reuse | "This auth pattern in CerbaSeal could be extracted for Project LEE" |
| Documentation reuse | "CerbaSeal and Greyline share identical setup docs — unify them" |
| Governance reuse | "This policy rule appears in three projects — one source of truth" |
| Strategic alignment | "CerbaSeal pilot prep directly advances LEE's governance layer" |
| Cross-system insight | "This external discussion matches an open BuilderTerms problem" |
| Resource leverage | "Effort on CIL yields disproportionate value across all projects" |

Quality controls: evidence required for every item; 14-day deduplication; daily limit of 3; Why Chain mandatory.

---

## Strategic Anchors (v10.0)

The Anchor Ledger stores intentionally durable knowledge that does not enter the Knowledge Aging cycle.

**Three anchor categories:**

| Category | Example |
|---|---|
| Founding rationale | "CerbaSeal exists because execution without governance is the root cause of most AI system failures in enterprise contexts" |
| Rejected direction | "We rejected embedding governance logic inside LEE because it creates coupling that prevents each system from evolving independently" |
| Architectural commitment | "All Lamont Labs systems must be portable — no vendor lock-in that prevents migration to a self-hosted environment" |

When the Strategy Engine or Opportunity Engine produces a recommendation that contradicts an active anchor, the contradiction is flagged inline — not blocked.

When LEE detects a direction being explored that matches a rejected_direction anchor, she surfaces the prior reasoning automatically: *"We considered this before — here is why it was set aside."*

---

## Portfolio Intelligence (v10.0)

```
PORTFOLIO VIEW

Momentum Distribution
  Explosive  ▓▓▓  Project LEE
  Rising     ▓▓░  CerbaSeal
  Stable     ▓░░  Greyline
  Dormant    ░░░  QuantraCore

Shared Infrastructure
  CIL ────── Project LEE · CerbaSeal · QuantraCore
  CerbaSeal ─ Project LEE (client)
  Auth pattern ─ CerbaSeal · Greyline

Resource Attention (observed, not declared)
  CerbaSeal      ████████░░  78%
  Project LEE    █████░░░░░  47%
  Greyline       ██░░░░░░░░  18%
  QuantraCore    █░░░░░░░░░   9%

Portfolio Alerts
  CIL breaking change → affects 3 projects (Project LEE, CerbaSeal, QuantraCore)
  Olivia Chen appears in 2 active projects — cross-project relationship
```

---

## Complete Request Flows

### Informational request

> "Explain CerbaSeal's pilot model in simple terms."

```
Owner input received
  ↓
Intent Engine → classify: EXPLANATION | domain: governance | risk: LOW | project: cerbaseal
  ↓
Executive Loop: already in Understand phase → routed directly
  ↓
Operational Intelligence Engine → current focus context injected
  ↓
Query Engine → retrieve: CerbaSeal facts + interpretations (scored by Context Economy)
  Strategic Anchors for CerbaSeal included unconditionally
  ↓
LEE builds scoped CILQueryRequest → POST to CIL endpoint
  ↓
CIL: T1 (trigram reuse) / T2 (semantic reuse) / T3 (frontier escalation)
  ↓
CILQueryResolved recorded in Event Log
  ↓
Explanation Engine → adapt answer for General audience
  ↓
Output delivered · CerbaSeal NOT consulted
```

### Consequential request

> "Send Olivia a CerbaSeal pilot follow-up."

```
Owner input received
  ↓
Intent Engine → EXTERNAL_ACTION | action_class: EXTERNAL_COMMUNICATION | risk: HIGH
  ↓
Executive Loop advances to Decide phase
  ↓
Query Engine → retrieve: Olivia relationship state, pilot facts, waiting loop, timeline
  ↓
Opportunity Engine checked: any portfolio alignment with sending this now?
  ↓
Strategic Anchors checked: any anchor contradiction?
  ↓
LEE calls CIL → "Do we have approved reasoning on follow-up structure?"
  ↓
LEE drafts message · explains why follow-up is appropriate · owner reviews
  ↓
Owner approves draft
  ↓
LEE constructs GovernedRequest → POST to CerbaSeal evaluate endpoint
  ↓
CerbaSeal evaluates against policy pack 2026.7.1
  ↓
ALLOW → send email → ExecutionReleased event
HOLD  → surface missing_approvals to owner → do not execute
REJECT → surface reason_codes to owner → do not execute
  ↓
All outcomes recorded in LEE's Event Log
Detailed audit record stays in CerbaSeal
```

---

## Context Economy Formula

```
Context Value =
  (Goal_Match      × W_goal)
× (Recency         × W_recency)
× (Importance      × W_importance)
× (Relationship    × W_relationship)
× (Project_Activity× W_project)
× (Confidence      × W_confidence)
× (Trust           × W_trust)
× (Mode_Relevance  × W_mode)
```

All factors: 0–1. Multiplicative — any zero eliminates the object regardless of other scores.

**v10.0 addition:** Active Strategic Anchors are always included in context for Strategy and Recommendation intent types — they are not subject to competitive scoring exclusion.

---

## Domain Events Catalog (v10.0)

### Foundation events
- `SystemBooted`, `SystemShutdown`, `BrainVersionTagged`, `BackupCreated`, `MigrationCompleted`

### Knowledge events
- `FactCreated`, `FactUpdated`, `FactVerified`, `FactExpired`
- `InterpretationCreated`, `InterpretationRevised`, `InterpretationPromoted`
- `AssumptionCreated`, `AssumptionInvalidated`
- `KnowledgeObjectAged`
- `GraphNodeCreated`, `GraphEdgeCreated`, `CrossProjectRelationshipDetected`

### Strategic Anchor events (v10)
- `AnchorCreated` — new Strategic Anchor added to the Anchor Ledger
- `AnchorRetired` — an anchor marked inactive (never deleted)
- `AnchorContradictionDetected` — a recommendation contradicts an active anchor

### Bootstrap events
- `BootstrapStarted`, `BootstrapCompleted`, `BootstrapConfirmed`
- `RepoFirstConnected`, `RepoStructureChanged`

### Provider events (Communication)
- `EmailReceived`, `ThreadUpdated`, `WaitingLoopResolved`, `EmailSentDetected`

### Provider events (Development Intelligence)
- `CommitPushed`, `IssueOpened`, `IssueResolved`, `PROpened`, `PRMerged`
- `ReleasePublished`, `DeploymentCompleted`, `BuildFailed`, `BuildRestored`
- `DependencyAlertRaised`, `RepoInactive`

### Provider events (Scheduling)
- `CalendarEventCreated`, `CalendarEventUpdated`, `CalendarEventCancelled`
- `TravelDetected`, `MeetingWithPersonDetected`

### Provider events (Document / Storage)
- `DocumentCreated`, `DocumentUpdated`, `DocumentShared`
- `FileCreated`, `FileUpdated`, `FileDeleted`

### CIL events
- `CILQueryRequested`, `CILQueryResolved`, `CILReuseHit`, `CILFrontierEscalated`
- `CILDriftDetected`, `CILContradictionDetected`, `CILUnavailable`

### CerbaSeal events
- `GovernedActionSubmitted`, `GovernedActionAllowed`, `GovernedActionHeld`, `GovernedActionRejected`
- `GovernanceEvidenceReceived`, `GovernanceServiceUnavailable`
- `ExecutionReleased`, `ExecutionCancelled`

### Operational context events
- `WorldStateUpdated`, `OperationalPatternEstablished`, `OperationalPatternBroken`
- `InitiativeItemCreated`, `OperationalContextUpdated`, `BriefGenerated`

### Executive Loop events (v10)
- `ExecutiveLoopPhaseChanged` — phase, previous_phase, cycle_number, timestamp

### Operational Confidence events (v10)
- `OperationalConfidenceUpdated` — score, explanation, contributing_factors, degradation_detected

### Project Momentum events (v10)
- `ProjectMomentumChanged` — project_id, previous_classification, new_classification, signal_breakdown

### Opportunity Engine events (v10)
- `OpportunityDetected` — opportunity_type, projects_involved, evidence_refs, confidence
- `OpportunityResolved` — opportunity_id, resolution: acted_on | dismissed | deferred

### Operational Capacity events (v10)
- `OperationalCapacityChanged` — previous_state, new_state, inferred_from_signals

### Portfolio events (v10)
- `PortfolioStateUpdated` — health_score, momentum_distribution, shared_infrastructure_summary
- `PortfolioRiskDetected` — risk_type, affected_projects, evidence_refs
- `PortfolioOpportunityDetected` — opportunity_type, affected_projects, confidence

### Governance events
- `ConstitutionConsulted`, `PolicyApplied`, `GovernanceHoldCreated`, `GovernanceHoldResolved`

### System health events
- `EngineBooted`, `EngineDegraded`, `EngineRecovered`, `HealthCheckCompleted`, `ResourceThresholdBreached`

---

## Configured Environment

### CIL (Reasoning Service)
| Variable | Type | Value |
|---|---|---|
| `CIL_LEE_API_KEY` | Secret | stored |
| `CIL_LEE_HMAC_SECRET` | Secret | stored |
| `CIL_LEE_ENDPOINT` | Config | `https://cognitive-infrastructure-layer.replit.app/api/query/lee` |

### CerbaSeal (Governance Service)
| Variable | Type | Value |
|---|---|---|
| `CERBASEAL_API_KEY` | Secret | stored |
| `CERBASEAL_HMAC_SECRET` | Secret | stored |
| `CERBASEAL_BASE_URL` | Config | `https://cerbaseal.replit.app` |
| `CERBASEAL_EVALUATE_ENDPOINT` | Config | `https://cerbaseal.replit.app/govern/evaluate` |
| `CERBASEAL_POLICY_VERSION_ENDPOINT` | Config | `https://cerbaseal.replit.app/policy/current-version` |
| `CERBASEAL_HEALTH_ENDPOINT` | Config | `https://cerbaseal.replit.app/health` |
| `CERBASEAL_POLICY_PACK_VERSION` | Config | `2026.7.1` |

---

## CIL Integration (Request / Response)

### What LEE sends to CIL
```typescript
interface CILQueryRequest {
  correlation_id: string;
  lee_brain_version: string;
  source_context_checksum: string;
  query_text: string;
  semantic_domain: string;
  intent: { intent_type: string; risk_classification: RiskLevel; project_id?: string; };
  context_asset_refs: string[];
  freshness_requirement: "any" | "current" | "verified";
  reuse_permitted: boolean;
  frontier_escalation_permitted: boolean;
  desired_format: "concise" | "detailed" | "structured" | "narrative";
  cost_ceiling_usd?: number;
}
```

### What CIL returns to LEE
```typescript
interface CILQueryResponse {
  correlation_id: string;
  resolution_tier: "T1_TRIGRAM" | "T2_SEMANTIC" | "T3_FRONTIER";
  answer: string;
  cognitive_asset_id?: string;
  asset_version?: string;
  confidence: number;
  freshness_state: "fresh" | "current" | "stale" | "expired";
  drift_detected: boolean;
  contradiction_detected: boolean;
  reuse_eligible: boolean;
  recommend_escalation: boolean;
  cost_usd: number;
  latency_ms: number;
  provenance: string[];
}
```

**CIL failure:** LEE marks CIL DEGRADED → routes to frontier model directly → emits CILUnavailable → retries after 5 minutes. CIL unavailability never blocks LEE from operating.

---

## CerbaSeal Integration (Request / Response)

### What LEE sends to CerbaSeal
```typescript
interface GovernedRequest {
  lee_request_id: string;
  policy_pack_version: string;
  proposed_action: string;
  action_class: ActionClass;
  workflow_class: string;
  actor_identity: string;
  target_system: string;
  affected_project_id?: string;
  reversibility: "reversible" | "partially_reversible" | "irreversible";
  data_sensitivity: "public" | "internal" | "confidential" | "restricted";
  evidence_refs: string[];
  intent_record_id: string;
}
```

### What CerbaSeal returns to LEE
```typescript
interface GovernedResponse {
  lee_request_id: string;
  decision_id: string;
  verdict: "ALLOW" | "HOLD" | "REJECT";
  reason_codes: string[];
  missing_approvals?: ApprovalSpec[];
  evidence_bundle_ref: string;
  audit_entry_ref: string;
  authorization_expiry?: string;
  human_confirmation_required: boolean;
}
```

**CerbaSeal failure:** LEE places the action on HOLD → emits GovernanceServiceUnavailable → surfaces to owner. No execution. No fallback path.

---

## Complete Task Index (55 tasks)

| # | Title | Depends On | Layer |
|---|---|---|---|
| 1 | Foundation & Core Schema | — | 1 |
| 2 | Console (Web App) | 1 | 9 |
| 3 | Understanding Pipeline | 1 | 4 |
| 4 | Brief Engine | 3, 5 | 9 |
| 5 | Model Router & Context Engine | 1 | 7 |
| 6 | Connector Engine | 1, 3 | 8 |
| 7 | Android App | 2, 4 | 9 |
| 8 | Cost Engine | 1, 5 | 9 |
| 9 | Backup, Migration & Brain Versioning | 1 | 1 |
| 10 | Orchestration Engine & Scheduler Calendar | 1 | 5 |
| 11 | Governance Engine | 1, 10 | 5 |
| 12 | Memory Architecture | 1, 3 | 2 |
| 13 | Intelligence Graph | 1, 3 | 2 |
| 14 | Identity & Relationship Engine | 1, 6, 13 | 2 |
| 15 | Curiosity Engine | 3, 12, 13 | 4 |
| 16 | Strategy Engine | 13, 14, 15 | 4 |
| 17 | Reflection Engine | 12, 13, 16 | 4 |
| 18 | Operating Modes | 10, 11 | 5 |
| 19 | Constitution Engine | 1, 2, 3, 4, 5 | 1 |
| 20 | Confidence Propagation | 1, 12, 13 | 2 |
| 21 | Fact/Interpretation Separation | 1, 3, 13 | 2 |
| 22 | Why Chain & Provenance | 1, 5, 20, 21 | 2 |
| 23 | Assumption Ledger | 12, 20, 21, 22 | 2 |
| 24 | Decision Impact Graph | 13, 16, 22 | 2 |
| 25 | Digital Twin Timeline | 1, 12, 13, 22, 24 | 2 |
| 26 | Query Engine | 1, 12, 13, 21 | 3 |
| 27 | Explanation Engine | 5, 22, 26 | 4 |
| 28 | Semantic Index | 3, 12, 26 | 3 |
| 29 | Policy Engine | 1, 19 | 5 |
| 30 | Resource Engine | 1, 10 | 5 |
| 31 | Intent Engine | 1, 26 | 4 |
| 32 | State Engine | 1, 10 | 5 |
| 33 | Internal API Contracts & Capability Registry | 1, 10 | 5 |
| 34 | Context Economy | 5, 12, 20, 26 | 4 |
| 35 | Domain Events | 1 | 1 |
| 36 | Engine Lifecycle, Dependency Validation & Recovery Policies | 10, 33 | 5 |
| 37 | Self-Test Framework | 33, 36 | 9 |
| 38 | Recovery Modes | 10, 32 | 5 |
| 39 | Data Ownership | 1, 3 | 2 |
| 40 | Knowledge Aging | 12, 26 | 2 |
| 41 | System Manifest | 9, 19, 29, 33 | 9 |
| 42 | World State Engine | 1, 6, 10 | 6 |
| 43 | Operational Memory | 1, 3, 12, 25 | 6 |
| 44 | Initiative Engine | 10, 15, 42, 43 | 6 |
| 45 | Operational Intelligence Engine | 16, 26, 34, 42, 43, 44 | 6 |
| 46 | Provider Abstraction Layer | 1, 6, 35 | 8 |
| 47 | Project Bootstrap Engine | 3, 6, 13, 21, 46 | 8 |
| 48 | Internal Capability Services Layer — CIL + CerbaSeal | 1, 5, 10, 11, 31, 33, 35, 46 | 7 |
| 49 | Executive Loop | 10, 32, 44, 45 | 6 |
| 50 | Operational Confidence | 20, 42, 43, 45 | 6 |
| 51 | Project Momentum Engine | 13, 25, 46, 47 | 6b |
| 52 | Opportunity Engine | 13, 16, 43, 47, 51 | 6b |
| 53 | Operational Capacity Awareness | 43, 44, 45 | 6 |
| 54 | Strategic Anchors & Long-Term Memory | 12, 16, 21, 22 | 2 |
| 55 | Portfolio Intelligence Engine | 13, 16, 45, 51, 52, 54 | 6b |

---

## Capability Levels (v10.0)

| Level | Capability | Unlocked By |
|---|---|---|
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

## Key Distinctions

### Confidence vs. Trust vs. Operational Confidence
| | Confidence | Trust | Operational Confidence |
|---|---|---|---|
| Measures | Certainty of one knowledge object | Reliability of one subsystem | Quality of today's overall operational picture |
| Range | 0–1 | 0–100 | 0–100 |
| Decay | Per inference hop (0.85/hop) | 0.5/day without activity | Recomputed every Executive Loop cycle |

### The Four Proactive Engines
| Engine | Type | Output | Scope |
|---|---|---|---|
| Curiosity (#15) | Questions | Things LEE doesn't know | Single knowledge gaps |
| Initiative (#44) | Observations | Drifts, events, pattern breaks | Current operational state |
| Opportunity (#52) | Leverage | Cross-project reuse and alignment | Portfolio-wide |
| Operational Intelligence (#45) | Prioritization | What deserves attention right now | Continuous synthesis |

### Executive Loop vs. Operational Intelligence Engine
| | Executive Loop (#49) | Operational Intelligence Engine (#45) |
|---|---|---|
| Role | Heartbeat and cycle management | Intelligence substrate |
| Schedules | OIE when to run | Does not schedule itself |
| Phases | 7 named phases | Runs during Understand + Prioritize |
| Output | Phase transitions, cycle metrics | Active Priority, ranked context |

### Curiosity vs. Initiative vs. Opportunity vs. OIE
| | Curiosity | Initiative | Opportunity | OIE |
|---|---|---|---|---|
| Type | Questions | Observations | Leverage | Prioritization |
| Trigger | Knowledge gaps | Drifts + events | Portfolio scan | Always on |
| Output | Questions to answer | Things to note | Leverage to capture | Ranked operational context |

### Governance Engine vs. CerbaSeal
| | Governance Engine (#11) | CerbaSeal (#48) |
|---|---|---|
| Answers | "Does LEE's internal policy allow this?" | "Is this action authorized to proceed?" |
| Failure | Blocks internally | Fail-closed |

### Three-Tier Service Architecture
| Tier | Systems | Failure Policy |
|---|---|---|
| Internal Capability Services | CIL, CerbaSeal | CIL: graceful degradation; CerbaSeal: fail-closed |
| External Providers | Gmail, GitHub, Google Calendar | Graceful degradation; read from cache |
| Internal Engines | Query Engine, OIE, Executive Loop... | Per-engine Recovery Policy |

---

## Reference: What Changed in v10.0

| Item | v9.0 | v10.0 |
|---|---|---|
| Task count | 48 | 55 |
| Architecture principles | 22 | 29 |
| Constitutional ABSOLUTE provisions | 11 | 12 |
| Layer 6 engines | 4 | 6 (+Executive Loop, +Operational Confidence, +Capacity Awareness) |
| New layer | — | 6b: Portfolio Intelligence |
| Capability levels | 16 | 23 |
| Domain event categories | 10 | 14 |
| Knowledge ledgers | Fact + Interpretation | Fact + Interpretation + Anchor (non-aging) |
| Proactive engines | 3 (Curiosity, Initiative, OIE) | 4 (+Opportunity) |

---

*Master Breakdown — Version 10.0 · 55 Tasks · July 13, 2026*
*v9.0 → v10.0: Executive Loop · Operational Confidence · Project Momentum · Opportunity Engine · Operational Capacity Awareness · Strategic Anchors · Portfolio Intelligence*
*Environment: CIL and CerbaSeal credentials configured · All production endpoints set · Replit-hosted*
