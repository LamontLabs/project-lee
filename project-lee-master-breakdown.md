# Project LEE — Master Breakdown
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Version 9.0 — 48 Tasks · July 11, 2026*

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
│  Orchestration · User Interaction                       │
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

## Architecture Principles (v9.0)

**1 — The Constitution sits above everything.**
Every engine consults the Constitution before acting. ABSOLUTE provisions block unconditionally — not even governance approval overrides them.

**2 — Event Sourcing is the foundation.**
Almost nothing mutates directly. State changes are typed Domain Events. Current state is a projection. Re-projection from the Event Log alone must produce a consistent database.

**3 — Facts and Interpretations are never mixed.**
Two permanent, separate ledgers enforced at schema, API, and constitutional layers. No API that accepts one will accept the other. Different canon rules, confidence rules, and decay rates.

**4 — The Query Engine is the universal access layer.**
No intelligence engine reads from storage directly. All reads go through the Query Engine. One retrieval policy, one ranking algorithm, one cache, one authorization layer.

**5 — Intent is a first-class typed object.**
Every request — human or machine-initiated — classifies its intent before retrieval or reasoning begins. All downstream decisions use the Intent record. Intent history is browsable.

**6 — Context competes.**
The Context Economy formula replaces static tier weights. Every object scores against eight dimensions. The highest-scoring objects within the token budget win, regardless of memory tier.

**7 — Intelligence is independent of presentation.**
Every capability must work without any UI. The Console, Android app, CLI, API, and future desktop all consume identical services via the Internal API surface.

**8 — Resource-aware scheduling.**
The Orchestration Engine reads the Resource Engine before every dispatch. No heavy jobs run blindly into a constrained system.

**9 — Brain Versioning for safe migrations.**
Brain Version (YYYY.M.minor) covers Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together. Every backup is tagged with its Brain Version.

**10 — Confidence flows. Trust is earned.**
Confidence degrades through each inference step at defined rates. Trust is a per-subsystem score that decays without activity. They are different constructs and are never conflated.

**11 — Every output has a Why Chain.**
No recommendation without reasoning. No observation without grounded steps. Every inference chain is navigable to its source.

**12 — Assumptions are tracked.**
Every simulation and strategy names its assumptions. Invalidated assumptions trigger review of all conclusions built on them, propagating through the Event Log.

**13 — Domain Events are typed contracts.**
Every significant state change emits a typed Domain Event with a defined schema. No generic log entries. The event catalog is the language re-projection speaks.

**14 — Every engine has a lifecycle.**
initialize() → boot() → health_check() → pause() → resume() → recover() → shutdown(). The Orchestration Engine manages engines, not just jobs.

**15 — Lee can describe herself.**
The System Manifest is always current. The Capability Registry is always accurate. The Self-Test Framework can verify every claim LEE makes about herself.

**16 — Lee knows the outside world.**
The World State Engine maintains an active model of external context: time, calendar, market signals, technical deprecations, and owner-configured monitoring topics. LEE's reasoning is never context-blind to external reality.

**17 — Lee knows how you work.**
Operational Memory observes demonstrated behavioral patterns from existing signals — not declared preferences. Observed operational rhythm, not a user profile.

**18 — Lee initiates.**
The Initiative Engine surfaces proactive operational observations without being asked. Not reminders. Not alerts. Operational awareness delivered when it is actionable.

**19 — Continuous prioritization is the heart.**
The Operational Intelligence Engine answers "what deserves attention right now?" It synthesizes context, external signals, patterns, and strategy into a live operational answer. This is what makes LEE a Chief of Staff.

**20 — Providers are replaceable. The operating intelligence is not.**
The Provider Abstraction Layer sits between every external service and LEE's internal engines. No engine above the adapter layer references Gmail, GitHub, or Google Calendar by name. Switching from Gmail to Proton Mail is an adapter swap — zero engine changes.

**21 — The owner should not reconstruct reality manually if the evidence already exists.**
When a repository is connected, LEE reads its structure, documentation, dependencies, and APIs to bootstrap an initial knowledge model automatically. She asks only for judgments the evidence cannot answer.

**22 — LEE coordinates. CIL reasons cheaply. CerbaSeal governs execution. They are separate services, not embedded subsystems.**
CIL and CerbaSeal are Lamont Labs internal capability services. LEE calls them through versioned, authenticated API contracts. Their databases are never shared. CIL degrades gracefully when unavailable. CerbaSeal is fail-closed: no consequential action executes without a valid ALLOW verdict. These are architectural invariants.

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

---

## Layer Hierarchy (full)

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
│  Initiative Engine · Operational Intelligence Engine            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — INTERNAL CAPABILITY SERVICES                         │
│  ┌──────────────────────────┐  ┌─────────────────────────────┐ │
│  │   Reasoning Services     │  │   Governance Services       │ │
│  │                          │  │                             │ │
│  │ CIL → ReasoningService   │  │ CerbaSeal → GovernanceService│ │
│  │ Model Router             │  │ Future policy evaluators    │ │
│  │                          │  │                             │ │
│  │ Failure: graceful        │  │ Failure: fail-closed        │ │
│  │ degradation              │  │ (HOLD, never execute)       │ │
│  └──────────────────────────┘  └─────────────────────────────┘ │
│  Separate DBs · Versioned APIs · HMAC auth · Replay protection  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 8 — PROVIDER LAYER (External Services)                   │
│  Provider Abstraction Layer · Project Bootstrap Engine          │
│  CommunicationProvider  →  Gmail, [Proton Bridge desktop]       │
│  DocumentProvider       →  Google Drive, Google Docs            │
│  DevelopmentProvider    →  GitHub (Intelligence)                │
│  SchedulingProvider     →  Google Calendar                      │
│  StorageProvider        →  Google Drive, App Storage            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 9 — INTERFACES & OBSERVABILITY                           │
│  Console (web) · Android App · Connectors settings              │
│  Cost Engine · Backup & Migration                               │
│  Context Economy · Brief Engine                                 │
│  Self-Test Framework · System Manifest                          │
└─────────────────────────────────────────────────────────────────┘
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
Operational Intelligence Engine → current focus context injected
  ↓
Query Engine → retrieve: CerbaSeal facts + interpretations (scored by Context Economy)
  ↓
Context Economy → score candidates → select within token budget
  ↓
LEE builds scoped CILQueryRequest:
  query_text: "Explain CerbaSeal's pilot model in simple terms"
  semantic_domain: "governance"
  intent: { type: EXPLANATION, risk: LOW, project_id: cerbaseal }
  reuse_permitted: true
  frontier_escalation_permitted: true
  ↓
POST cognitive-infrastructure-layer.replit.app/api/query/lee
  Authorization: Bearer cil_lee_...
  X-LEE-Timestamp: <epoch>
  X-LEE-Signature: HMAC-SHA256(secret, correlation_id.timestamp.sha256(body))
  ↓
CIL evaluates:
  T1 → trigram match found? → return cached answer
  T2 → semantic match found? → return asset answer
  T3 → no match → escalate to frontier model
  ↓
CILQueryResponse received:
  resolution_tier, answer, cognitive_asset_id, confidence, cost_usd, drift_detected
  ↓
LEE records CILQueryResolved event in Event Log
  ↓
Explanation Engine → adapt answer for requested audience style
  ↓
Output delivered to owner
  ↓
CerbaSeal NOT consulted — nothing is being executed
```

### Consequential request

> "Send Olivia a CerbaSeal pilot follow-up."

```
Owner input received
  ↓
Intent Engine → classify: EXTERNAL_ACTION | action_class: EXTERNAL_COMMUNICATION | risk: HIGH
  ↓
Query Engine → retrieve: Olivia relationship state, pilot facts, waiting loop, timeline
  ↓
LEE calls CIL → "Do we have approved reasoning on follow-up structure?"
  ↓
LEE drafts the message using CIL answer or frontier model
  ↓
LEE explains why a follow-up is or is not appropriate → owner reviews
  ↓
Owner approves draft
  ↓
LEE constructs GovernedRequest:
  action_class: EXTERNAL_COMMUNICATION
  workflow_class: external_communication
  reversibility: irreversible
  data_sensitivity: confidential
  communication_recipient: olivia.chen@cerbaseal.com
  evidence_refs: [fact:cerbaseal-pilot-status, fact:olivia-last-contact, ...]
  ↓
POST cerbaseal.replit.app/govern/evaluate
  Authorization: Bearer cs-lee-...
  X-LEE-Timestamp: <epoch>
  X-LEE-Signature: HMAC-SHA256(secret, lee_request_id.timestamp.sha256(body))
  ↓
CerbaSeal evaluates against policy pack 2026.7.1:
  checks invariants, authority class, required approvals, reversibility
  ↓
GovernedResponse received:
  verdict: ALLOW | decision_id | evidence_bundle_ref | authorization_expiry
  ↓
ALLOW → send email → record ExecutionReleased event
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

All factors: 0–1. Multiplicative — any zero eliminates the object regardless of other scores. Weights are configurable per intent type via the Policy Engine. Objects compete for the token budget; the highest-scoring objects within budget always win.

**Default weight ranges by intent type:**

| Factor | Explanation | Analysis | Strategy | Brief |
|--------|-------------|----------|----------|-------|
| Goal_Match | 0.35 | 0.30 | 0.25 | 0.20 |
| Recency | 0.15 | 0.10 | 0.10 | 0.25 |
| Importance | 0.15 | 0.15 | 0.20 | 0.20 |
| Relationship | 0.10 | 0.10 | 0.10 | 0.10 |
| Project_Activity | 0.10 | 0.10 | 0.10 | 0.10 |
| Confidence | 0.05 | 0.10 | 0.10 | 0.05 |
| Trust | 0.05 | 0.10 | 0.10 | 0.05 |
| Mode_Relevance | 0.05 | 0.05 | 0.05 | 0.05 |

---

## Domain Events Catalog (complete)

### Foundation events
- `SystemBooted` — Lee started successfully
- `SystemShutdown` — Lee shut down cleanly
- `BrainVersionTagged` — a Brain Version milestone recorded
- `BackupCreated` — a full backup was written
- `MigrationCompleted` — a schema migration completed

### Knowledge events
- `FactCreated` — a new fact entered the Fact Ledger
- `FactUpdated` — an existing fact was revised
- `FactVerified` — an owner verified a fact (verified_by set)
- `FactExpired` — a fact passed its expiration threshold
- `InterpretationCreated` — a new interpretation entered the Interpretation Ledger
- `InterpretationRevised` — an interpretation was updated
- `InterpretationPromoted` — interpretation promoted to reference tier
- `AssumptionCreated` — a named assumption recorded
- `AssumptionInvalidated` — an assumption invalidated; downstream propagation triggered
- `KnowledgeObjectAged` — an object moved to a new freshness state
- `GraphNodeCreated` — a new node added to the Intelligence Graph
- `GraphEdgeCreated` — a new relationship edge created
- `CrossProjectRelationshipDetected` — Bootstrap Engine found cross-repo structural similarity

### Understanding events
- `SourceImported` — a document/URL/note entered the Understanding Pipeline
- `EntityDetected` — the pipeline identified a new entity
- `ConceptLinked` — a concept linked to an existing graph node
- `ImportanceScored` — an object received its importance score

### Bootstrap events
- `BootstrapStarted` — Bootstrap Engine began processing a repository
- `BootstrapCompleted` — all extractors finished; confirmation conversation ready
- `BootstrapConfirmed` — owner confirmed the bootstrap belief statement
- `RepoFirstConnected` — first time a repository was connected via DevelopmentProvider
- `RepoStructureChanged` — new directories detected in a CommitPushed event

### Provider events (Communication)
- `EmailReceived` — an email arrived via CommunicationProvider
- `ThreadUpdated` — an email thread received a reply
- `WaitingLoopResolved` — a reply resolved an open waiting loop
- `EmailSentDetected` — an outbound email was confirmed sent

### Provider events (Development Intelligence)
- `CommitPushed` — repo_id, commit_sha, author, message, files_changed_count, new_directories
- `IssueOpened` — repo_id, issue_id, title, labels, opened_at
- `IssueResolved` — repo_id, issue_id, closed_at, resolution_type
- `PROpened` — repo_id, pr_id, title, author, target_branch, opened_at
- `PRMerged` — repo_id, pr_id, merged_at, merged_by
- `ReleasePublished` — repo_id, release_id, tag_name, released_at
- `DeploymentCompleted` — repo_id, deployment_id, environment, deployed_at, status
- `BuildFailed` — repo_id, workflow, failed_at, error_summary
- `BuildRestored` — repo_id, workflow, restored_at
- `DependencyAlertRaised` — repo_id, package_name, severity
- `RepoInactive` — repo_id, last_commit_at, inactivity_days

### Provider events (Scheduling)
- `CalendarEventCreated` — a new calendar event was synced
- `CalendarEventUpdated` — an event was modified
- `CalendarEventCancelled` — an event was cancelled
- `TravelDetected` — a travel period detected from calendar
- `MeetingWithPersonDetected` — a meeting with a tracked person detected

### Provider events (Document / Storage)
- `DocumentCreated` — a new document appeared in a watched folder
- `DocumentUpdated` — an existing document was modified
- `DocumentShared` — a document was shared with the owner
- `FileCreated` — a file appeared in a watched storage location
- `FileUpdated` — a file was modified
- `FileDeleted` — a file was removed

### CIL events (LEE's internal record)
- `CILQueryRequested` — correlation_id, semantic_domain, project_id, risk_classification
- `CILQueryResolved` — correlation_id, resolution_tier, confidence, cost_usd, latency_ms
- `CILReuseHit` — correlation_id, cognitive_asset_id, asset_version, tier
- `CILFrontierEscalated` — correlation_id, escalation_reason
- `CILDriftDetected` — correlation_id, cognitive_asset_id, drift_description
- `CILContradictionDetected` — correlation_id, cognitive_asset_id
- `CILUnavailable` — timestamp, error_summary, fallback_used

### CerbaSeal events (LEE's internal record)
- `GovernedActionSubmitted` — lee_request_id, action_class, target_system, affected_project_id
- `GovernedActionAllowed` — lee_request_id, decision_id, authorization_expiry
- `GovernedActionHeld` — lee_request_id, decision_id, missing_approvals
- `GovernedActionRejected` — lee_request_id, decision_id, reason_codes
- `GovernanceEvidenceReceived` — lee_request_id, evidence_bundle_ref, audit_entry_ref
- `GovernanceServiceUnavailable` — timestamp, error_summary, action_class
- `ExecutionReleased` — lee_request_id, decision_id, executed_at
- `ExecutionCancelled` — lee_request_id, reason

### Operational context events
- `WorldStateUpdated` — an external context signal was updated
- `OperationalPatternEstablished` — a behavioral pattern reached "established" confidence
- `OperationalPatternBroken` — an established pattern deviated
- `InitiativeItemCreated` — Initiative Engine surfaced a proactive observation
- `OperationalContextUpdated` — Operational Intelligence Engine refreshed its context
- `BriefGenerated` — a Morning Brief was produced and sealed

### Governance events
- `ConstitutionConsulted` — an engine checked an ABSOLUTE provision
- `PolicyApplied` — a mutable policy rule was applied
- `GovernanceHoldCreated` — an internal action was placed on governance hold
- `GovernanceHoldResolved` — a held action was approved or rejected

### System health events
- `EngineBooted` — an engine completed its boot sequence
- `EngineDegraded` — an engine entered a degraded state
- `EngineRecovered` — a degraded engine returned to healthy
- `HealthCheckCompleted` — scheduled health check ran across all engines
- `ResourceThresholdBreached` — CPU/RAM/disk/token budget entered CRITICAL

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

**Authentication on every request to both services:**
- `Authorization: Bearer <key>`
- `X-LEE-Timestamp: <ISO 8601 UTC>`
- `X-LEE-Signature: HMAC-SHA256(secret, id + "." + timestamp + "." + sha256(body))`
- Replay protection: unique correlation_id / lee_request_id per request; reject duplicates

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
  governance_status?: "approved" | "nominated" | "unreviewed";
  confidence: number;
  freshness_state: "fresh" | "current" | "stale" | "expired";
  drift_detected: boolean;
  contradiction_detected: boolean;
  reuse_eligible: boolean;
  recommend_escalation: boolean;
  escalation_reason?: string;
  cost_usd: number;
  latency_ms: number;
  provenance: string[];
  semantic_domain: string;
}
```

**CIL failure:** LEE marks CIL DEGRADED → routes to frontier model directly → emits CILUnavailable → retries CIL after 5 minutes. CIL unavailability never blocks LEE from operating.

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
  authority_class: string;
  required_approvals: ApprovalSpec[];
  approvals_present: Approval[];
  reversibility: "reversible" | "partially_reversible" | "irreversible";
  data_sensitivity: "public" | "internal" | "confidential" | "restricted";
  expected_downstream_effect: string;
  communication_recipient?: string;
  intent_record_id: string;
  source_provenance: string;
  context_checksum: string;
  evidence_refs: string[];
  trust_state: "verified" | "nominal" | "degraded";
  requested_execution_window?: { not_before: string; not_after: string; };
}
```

### What CerbaSeal returns to LEE
```typescript
interface GovernedResponse {
  lee_request_id: string;
  decision_id: string;
  verdict: "ALLOW" | "HOLD" | "REJECT";
  reason_codes: string[];
  checked_invariants: InvariantResult[];
  missing_approvals?: ApprovalSpec[];
  remediation_requirements?: string[];
  decision_envelope: string;
  evidence_bundle_ref: string;
  audit_entry_ref: string;
  replay_checksum: string;
  policy_version: string;
  timestamp: string;
  authorization_expiry?: string;
  human_confirmation_required: boolean;
}
```

**CerbaSeal failure:** LEE places the action on HOLD → emits GovernanceServiceUnavailable → surfaces to owner: "The action is prepared, but governance verification is unavailable. Execution is on HOLD." No execution. No fallback path.

### Actions that require CerbaSeal
- Sending external email, message, or post
- Sharing a document externally
- Modifying a production repository or deployment
- Deleting or overwriting important LEE memory
- Financial transactions
- Changing a project's canonical status
- Granting or revoking connector permissions
- Exporting sensitive project data
- Contacting an investor or pilot partner
- Executing a workflow in another Lamont Labs system
- Any write action through an external provider

### Actions that do NOT require CerbaSeal
- Reading, searching, summarizing
- Organizing, drafting (a draft is not an action)
- Building context packets or generating internal briefs
- Identifying stale information or suggesting next actions
- Internal analysis, pattern detection, Initiative Engine observations
- Any read-only operation

---

## Project Bootstrap Flow

```
Repository connected (DevelopmentProvider adapter)
  ↓
RepoFirstConnected domain event emitted
  ↓
Bootstrap Engine triggered automatically
  ↓
BootstrapFileReader reads file tree via DevelopmentProvider.get_file_tree()
  ↓
Nine extractors run in parallel:
  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────┐
  │ Technology Stack │  │  Repository Map    │  │ Architecture     │
  │ package.json     │  │  folder structure  │  │ Graph (layers,   │
  │ Cargo.toml       │  │  file counts       │  │  modules, deps)  │
  │ go.mod etc.      │  │  inferred purpose  │  │                  │
  └──────────────────┘  └────────────────────┘  └──────────────────┘
  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────┐
  │ Dependency       │  │  API Inventory     │  │ Documentation    │
  │ Inventory        │  │  OpenAPI specs     │  │ Inventory        │
  │ all packages     │  │  route definitions │  │ freshness scores │
  └──────────────────┘  └────────────────────┘  └──────────────────┘
  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────┐
  │ Configuration    │  │  Security          │  │ Missing Docs     │
  │ Inventory        │  │  Observations      │  │ Detection        │
  │ env var names    │  │  static analysis   │  │ gap analysis     │
  │ (never values)   │  │                    │  │                  │
  └──────────────────┘  └────────────────────┘  └──────────────────┘
  ↓
Understanding Pipeline processes README + documentation files
  ↓
Fact Ledger entries created  (created_by: project_bootstrap_engine)
Interpretation candidates    (requires_verification: true)
Intelligence Graph nodes + edges
Initial Timeline entry
  ↓
Cross-project relationship detection across all bootstrapped repositories
  ↓
Confirmation conversation presented to owner:

  "I believe this is an AI governance platform with a deterministic
   execution layer built with TypeScript, Node.js, and PostgreSQL.
   Is that correct?"

  What I found · Questions for you · Issues I noticed

  ↓
Owner confirms / corrects / dismisses each item
  ↓
Verified → confidence ≥ 0.90, verified_by: owner
Corrected → Fact/Interpretation updated, owner-verified
  ↓
BootstrapCompleted domain event emitted
  ↓
Continuous monitoring begins:
  CommitPushed → new_directories detected → structural change Curiosity item
  Documentation freshness decay → staleness Curiosity item
  New major dependency → Dependency Inventory updated
```

### Bootstrap confidence by source
| Source | Confidence |
|---|---|
| package.json, Cargo.toml, go.mod | 0.95 |
| OpenAPI spec, Prisma schema, Drizzle config | 0.90 |
| README documented facts | 0.70 |
| Inferred from folder naming conventions | 0.40 |
| Owner-confirmed after bootstrap | ≥ 0.90 |

---

## Complete Task Index (48 tasks)

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

---

## Task Details (all 48)

### Task 1 — Foundation & Core Schema
**Layer:** 1 — Foundations | **Depends on:** nothing

The base on which everything is built. Node.js 24 + TypeScript 5.9 + Express 5, PostgreSQL + Drizzle ORM, Zod v4 schema validation, Orval codegen from OpenAPI spec, esbuild. Core database schema including the Event Log (append-only), project table, person table, and base knowledge object tables. Event sourcing infrastructure: re-projection from the Event Log alone must produce a consistent database state.

---

### Task 2 — Console (Web App)
**Layer:** 9 — Interfaces | **Depends on:** 1

Primary desktop interface. Dark-mode-first React web application. No business logic client-side — the Console is a presentation layer only. All data comes from the Internal API. No emojis anywhere in the UI. Pages: Today, Ask Lee, Projects, People, Timeline, Connectors, Settings (System, Policies, Connectors, Internal Services). Status bar visible on every page showing: current State Engine state, active Operating Mode, CIL health, CerbaSeal health.

---

### Task 3 — Understanding Pipeline
**Layer:** 4 — Intelligence | **Depends on:** 1

Ingestion and comprehension engine. Accepts text, URLs, files, voice notes, documents. Stages: extraction → cleaning → enrichment → entity detection → concept linking → classification → importance scoring → storage. Entry point for all new knowledge entering LEE. After Task #46, consumes standardized provider Domain Events (EmailReceived, DocumentUpdated, etc.) rather than service-specific data. After Task #47, processes repository documents during the bootstrap sequence.

---

### Task 4 — Brief Engine
**Layer:** 9 — Interfaces | **Depends on:** 3, 5

Daily briefing generator. Assembles context packet via Query Engine, calls Model Router (which calls CIL first after Task #48), renders a structured, immutable brief document. Briefs are sealed after generation — they cannot be edited, only superseded. After Task #45, the Brief opening statement is derived directly from the Operational Intelligence Engine's current Active Priority rather than being generated fresh.

---

### Task 5 — Model Router & Context Engine
**Layer:** 7 — Internal Capability Services (Reasoning) | **Depends on:** 1

Routing intelligence between LEE and language models. Tiered model selection based on complexity, cost ceiling, and intent classification. Token budget enforcement — hard limits, never silent overruns. Context Packet Preview: shows exactly what will be sent to the model before dispatch. CIL (Cognitive Infrastructure Layer) is the first-call tier after Task #48 — only escalates to frontier if CIL returns no reusable asset or recommends escalation. Spend tracked per engine and purpose by Cost Engine.

---

### Task 6 — Connector Engine
**Layer:** 8 — Provider Layer | **Depends on:** 1, 3

First provider adapters: Gmail, Google Calendar, Google Drive, GitHub, Replit. All adapters are read-only on their first implementation. All produce typed Domain Events rather than directly writing to the LEE Brain. After Task #46, all connectors are refactored as typed provider adapters implementing the standardized provider interfaces — the first proof that the Provider Abstraction Layer works correctly.

---

### Task 7 — Android App
**Layer:** 9 — Interfaces | **Depends on:** 2, 4

Mobile surface for LEE. Expo React Native. Presentation only — all data from Internal API. Screens: Today (powered by Operational Intelligence Engine after Task #45), Capture (voice, text, photo, screenshot), People, Waiting Loops, Settings. Paired via device token stored in Settings. POST /android/capture, POST /android/ask (low-cost model route), GET /android/brief, GET /android/waiting, GET /android/alerts, POST /android/approve.

---

### Task 8 — Cost Engine
**Layer:** 9 — Interfaces | **Depends on:** 1, 5

Financial accountability layer. Tracks every token, every model call, every CIL call, every frontier escalation. Spend breakdown by engine, purpose, resolution tier (after Task #48: CIL T1/T2/T3 vs. direct frontier). Hard limits trigger governance holds — not silent failures. Budget dashboard in Settings. Cost per Brief, cost per Ask Lee session, cost per background job. Monthly budget rollup. Alert thresholds configurable via Policy Engine.

---

### Task 9 — Backup, Migration & Brain Versioning
**Layer:** 1 — Foundations | **Depends on:** 1

Portability and durability layer. Brain Version (YYYY.M.minor) tags: Memory schema + Knowledge graph + Learning assets + Constitution + Policies + Semantic Index together as a cohesive version. Every backup tagged with its Brain Version. Verify Archive (cryptographic integrity check) and Test Restore (spin-up in isolation and verify re-projection) are functional operations, not just checkboxes. Migration framework for schema changes between Brain Versions. System Manifest included in every backup.

---

### Task 10 — Orchestration Engine & Scheduler Calendar
**Layer:** 5 — Coordination | **Depends on:** 1

Scheduler and dispatcher for all background work. Priority queue: CRITICAL / HIGH / NORMAL / LOW. Engine registration, concurrency limits, retry with exponential backoff, dead-letter handling. After Task #48, routing logic added: before dispatching any action, Orchestration Engine classifies whether it is consequential (requires GovernanceService/CerbaSeal) or informational (routes through ReasoningService/CIL first). Scheduler Calendar: Settings → System → Schedule shows every background job on a 24-hour timeline — read-only view.

---

### Task 11 — Governance Engine
**Layer:** 5 — Coordination | **Depends on:** 1, 10

Internal governance and approval layer. Risk tiers: LOW (auto-approve), MEDIUM (notify + approve within window), HIGH (explicit owner confirmation), CRITICAL (full review with evidence). Full audit trail of all governance decisions. After Task #48, the Governance Engine coordinates with CerbaSeal for consequential external actions — Governance Engine handles internal policy evaluation; CerbaSeal is the external execution authorization boundary. They are complementary, not redundant: Governance Engine answers "does LEE's internal policy allow this?"; CerbaSeal answers "is this action authorized to proceed?".

---

### Task 12 — Memory Architecture
**Layer:** 2 — Knowledge | **Depends on:** 1, 3

Six-tier memory hierarchy with defined promotion, demotion, and compression rules:
1. Working Memory — active session context (ephemeral)
2. Short-term Memory — recent captures and active projects (days)
3. Long-term Memory — sustained importance (weeks to months)
4. Reference Memory — stable, verified facts (indefinite until invalidated)
5. Archive Memory — compressed historical record
6. Semantic Memory — vector embedding index (Task #28)

Promotion requires sustained importance score above threshold. Demotion occurs via Knowledge Aging (Task #40). Compression produces summaries at defined intervals.

---

### Task 13 — Intelligence Graph
**Layer:** 2 — Knowledge | **Depends on:** 1, 3

Knowledge graph with typed nodes and typed edges. Node types: Project, Person, Concept, Decision, Assumption, Repository, Document, API, Technology, Organization. Edge types: RELATES_TO, DEPENDS_ON, DECIDED_BY, CONTRADICTS, SUPPORTS, SHARES_PATTERN_WITH, IMPLEMENTS. Automatic edge creation from Understanding Pipeline entity linking. Bootstrap Engine creates Repository, Technology, and API nodes with DEPENDS_ON and IMPLEMENTS edges. Cross-project relationship edges added by Bootstrap Engine when structural similarity exceeds threshold.

---

### Task 14 — Identity & Relationship Engine
**Layer:** 2 — Knowledge | **Depends on:** 1, 6, 13

People layer. Relationship types: Close / Professional / Extended / Peripheral. Interaction history with recency weighting. Follow-up states and open waiting loops. Response cadence tracking (days to reply, typical response length). Relationship strength score updated on each interaction. People nodes linked to projects, decisions, meetings, and email threads in the Intelligence Graph. Trust tiers govern how much context LEE shares about a person in different recommendation contexts.

---

### Task 15 — Curiosity Engine
**Layer:** 4 — Intelligence | **Depends on:** 3, 12, 13

Proactive question-asking. Scans for: knowledge staleness, documentation gaps, assertion conflicts, relationship drift, missing coverage. Does not ask questions LEE could answer herself. Quality constraints: configurable daily limit on questions per type, deduplication window prevents repeating the same question within 7 days. Trust Score per curiosity item type: types with consistent owner engagement get higher priority. After Task #47, consumes Bootstrap Engine missing documentation flags and structural change detections as Curiosity triggers.

---

### Task 16 — Strategy Engine
**Layer:** 4 — Intelligence | **Depends on:** 13, 14, 15

Forward-looking intelligence. Maintains OKRs and strategic objectives. Evaluates strategic options with confidence, Why Chain, and identified assumptions. Produces recommendations — not just summaries. Strategies automatically invalidate and flag for review when underlying facts change, via Event Log subscription to FactUpdated and AssumptionInvalidated events. Priority scoring that feeds the Operational Intelligence Engine.

---

### Task 17 — Reflection Engine
**Layer:** 4 — Intelligence | **Depends on:** 12, 13, 16

Periodic retrospective analysis. Compares current state against prior periods. Identifies: trends in project activity, relationship engagement patterns, decision quality over time, recurring gaps. Surfaces structural lessons — not just summaries of what happened. Reflection outputs feed the Curiosity Engine with higher-confidence staleness signals. Reflection cadence: weekly by default, configurable.

---

### Task 18 — Operating Modes
**Layer:** 5 — Coordination | **Depends on:** 10, 11

System-wide behavioral configurations. Modes: FOCUS (reduce interruptions, prioritize single project), TRAVEL (mobile-optimized, reduced background jobs, offline tolerance), DEEP_WORK (no interruptions, batch notifications), REVIEW (full context, elevated reflection), EMERGENCY (CRITICAL priority only, maximum resource allocation). Every engine reads current mode parameters at dispatch time — not at configuration time. Current mode visible in Console status bar and Android Today screen.

---

### Task 19 — Constitution Engine
**Layer:** 1 — Foundations | **Depends on:** 1, 2, 3, 4, 5

Immutable governance kernel. Two-tier provision structure:
- ABSOLUTE — block unconditionally before any governance evaluation; cannot be overridden by any operational mechanism
- CONFIGURABLE — owner-adjustable within defined bounds; require 72-hour quorum for amendments

Constitution is consulted by every engine before acting. Consultation is logged as ConstitutionConsulted events. Constitutional violations produce hard errors, not warnings. The Constitution Engine exposes a /internal/constitution/check endpoint that any engine can call synchronously before a consequential action.

ABSOLUTE provisions (full list): see Constitutional ABSOLUTE Provisions section above.

---

### Task 20 — Confidence Propagation
**Layer:** 2 — Knowledge | **Depends on:** 1, 12, 13

Every knowledge object carries a confidence score (0–1). Confidence degrades through inference chains at defined degradation factors per hop. Default degradation factor: 0.85 per hop (a 3-hop chain from a 0.9-confidence source produces 0.9 × 0.85 × 0.85 × 0.85 = 0.55). Confidence always visible in Why Chain and on object detail pages. CIL-resolved answers carry their returned confidence score directly. Bootstrap-extracted facts carry confidence based on source type (see Bootstrap confidence table).

---

### Task 21 — Fact/Interpretation Separation
**Layer:** 2 — Knowledge | **Depends on:** 1, 3, 13

Two permanent, separate ledgers enforced at schema, API, and constitutional layers. The Fact Ledger holds what is verifiable — sourced from direct observation, documents, or owner-verified statements. The Interpretation Ledger holds what LEE reasons — generated by engines, marked with generated_by, confidence, and requires_verification flag. No API that accepts a fact accepts an interpretation. No API that accepts an interpretation accepts a fact. Bootstrap Engine writes technology stacks and dependency inventories to Facts; project summaries and architecture descriptions to Interpretations.

---

### Task 22 — Why Chain & Provenance
**Layer:** 2 — Knowledge | **Depends on:** 1, 5, 20, 21

Every recommendation, every interpretation, every suggestion has a navigable Why Chain. Provenance is an ABSOLUTE constitutional provision. Why Chain UI: expandable tree showing each reasoning step, its confidence, its source objects, and its degradation from the source. Source links open the original document, fact, or event. CIL-resolved answers include cognitive_asset_id and asset_version in the provenance chain. Bootstrap-created facts include source_refs pointing to the specific repository files they were extracted from.

---

### Task 23 — Assumption Ledger
**Layer:** 2 — Knowledge | **Depends on:** 12, 20, 21, 22

Assumption lifecycle: active → under_review → invalidated → archived. Every strategy and simulation explicitly names its assumptions. Invalidated assumptions propagate via AssumptionInvalidated domain event — every conclusion built on an invalidated assumption is flagged for review automatically. Assumption health browsable in project detail. Stale assumptions (active but not reviewed in > 30 days) generate Curiosity items.

---

### Task 24 — Decision Impact Graph
**Layer:** 2 — Knowledge | **Depends on:** 13, 16, 22

Consequence tracking — separate from the Intelligence Graph. Tracks historical consequences of decisions, not structural relationships. Decision nodes link to their observed outcomes over time. Impact scores updated as downstream effects are confirmed. Used by the Reflection Engine to assess decision quality in retrospectives. "What decisions led to the current state of CerbaSeal?" is answerable from this graph.

---

### Task 25 — Digital Twin Timeline
**Layer:** 2 — Knowledge | **Depends on:** 1, 12, 13, 22, 24

Operational history as a scrollable, zoomable, filterable timeline. Sources: Event Log entries, connector events (commits, emails, meetings), briefs, governance decisions, state changes, bootstrap events, world state signals. Filter by: project, person, event type, time range, importance threshold. Bootstrap Engine creates the first Timeline entry for each imported project (repository creation date, first commit, most recent commit — from git history).

---

### Task 26 — Query Engine
**Layer:** 3 — Retrieval | **Depends on:** 1, 12, 13, 21

Universal data access layer. No intelligence engine reads from storage directly — all reads go through the Query Engine. Single retrieval policy, single ranking algorithm (importance × freshness × confidence × relevance), single cache, single authorization layer. Every result includes a why_included field explaining why it was selected. "Show me everything related to authentication" queries LEE's understanding across all bootstrapped projects — not GitHub or CIL directly.

---

### Task 27 — Explanation Engine
**Layer:** 4 — Intelligence | **Depends on:** 5, 22, 26

Audience-aware translation layer. Audiences: Developer, Investor, Founder, Executive, Legal, Technical, General. Each audience profile has a vocabulary ceiling, preferred structure, and detail level. Explanations cached and reused until the source objects change. The Explanation Engine never fabricates — it translates what the Why Chain already contains, not beyond it. After Task #48, CIL is called first for explanation tasks before frontier escalation.

---

### Task 28 — Semantic Index
**Layer:** 3 — Retrieval | **Depends on:** 3, 12, 26

Stage 6 of the Memory Compression Roadmap. Vector embedding store over all of LEE's knowledge. Discovery-mode fuzzy search — finds semantically related content even without keyword matches. Embeddings generated locally using a local embedding model — never sent to an external service (ABSOLUTE constitutional provision). Query Engine uses Semantic Index for discovery queries. Semantic Index updated incrementally as new knowledge enters.

---

### Task 29 — Policy Engine
**Layer:** 5 — Coordination | **Depends on:** 1, 19

Mutable operational policy layer, distinct from the immutable Constitution. Policy categories: Cost (model tiers allowed, spend limits), Privacy (what can be shared with which service), Retention (how long different object types are kept), Notification (thresholds for surfacing items), Relationship (trust tier thresholds), Backup (frequency, retention), Connector (sync frequency, allowed scopes). All policies versioned. Full rollback available. Policy changes require Governance Engine approval at risk level appropriate to the change scope.

---

### Task 30 — Resource Engine
**Layer:** 5 — Coordination | **Depends on:** 1, 10

Real-time system health tracking: CPU, RAM, disk, token budgets, CIL call quota, CerbaSeal call quota, API rate limits (GitHub, Google), network quality, battery (mobile). Per-dimension status: HEALTHY / CONSTRAINED / CRITICAL. Orchestration Engine reads Resource Engine state before every dispatch — CRITICAL resources gate heavy jobs. Resource thresholds configurable via Policy Engine. ResourceThresholdBreached domain event triggers Operational State transition and potential Operating Mode suggestion.

---

### Task 31 — Intent Engine
**Layer:** 4 — Intelligence | **Depends on:** 1, 26

Every request — human or machine-initiated — produces a typed Intent record before anything else happens. Intent fields: intent_type, semantic_domain, project_id, risk_classification, urgency, desired_format, context_scope. Intent record drives all downstream decisions: which Context Economy weights apply, whether CIL is appropriate, whether CerbaSeal must be consulted, which Explanation Engine audience applies. Intent corrections from owner feed a Learning Engine that improves future classification. After Task #48, the risk_classification from the Intent record is what determines whether GovernanceService must be consulted.

---

### Task 32 — State Engine
**Layer:** 5 — Coordination | **Depends on:** 1, 10

Operational state with exactly one primary state active at all times. States: Booting, Learning (initial knowledge import), Idle, Thinking (processing a request), Briefing (generating a Brief), Importing (Understanding Pipeline active), Synchronizing (provider sync running), Waiting (awaiting governance or owner input), Recovering (after failure), Offline, Degraded (partial capability). State visible in Console status bar, System Manifest, and Android status area. State transitions emit Operational State change events.

---

### Task 33 — Internal API Contracts & Capability Registry
**Layer:** 5 — Coordination | **Depends on:** 1, 10

Every LEE engine exposes a versioned, typed REST API at /internal/[engine-name]/v[N]. Zod-validated request and response schemas. The /internal/ namespace is never exposed externally — ABSOLUTE constitutional provision. Capability Registry: central catalog of all registered engines (name, version, health, API base path, supported events, recovery policy) and all registered internal capability services (CIL, CerbaSeal — with health state, last call, failure_policy, credential_env_key). After Task #48, the ServiceRegistry section added to the Capability Registry for CIL and CerbaSeal.

---

### Task 34 — Context Economy
**Layer:** 4 — Intelligence | **Depends on:** 5, 12, 20, 26

The competitive scoring algorithm that decides which knowledge objects enter a context packet. See Context Economy Formula section above. Weights configurable per intent type via Policy Engine. Any dimension scoring zero eliminates the object from consideration regardless of all other scores. After Task #40 (Knowledge Aging), Expired objects have Goal_Match forced to 0. After Task #43 (Operational Memory), Mode_Relevance weights adapt to observed behavioral patterns.

---

### Task 35 — Domain Events
**Layer:** 1 — Foundations | **Depends on:** 1

Typed event contract system. Every state change emits a typed, versioned, schema-validated Domain Event. EventBus validates schema before writing to Event Log. No generic log entries — every event has a defined type with a defined payload. Caused-by chain: every event records the event_id of the event that triggered it. Full event catalog browsable from Settings → System → Event Catalog. See Domain Events Catalog section above for complete listing.

---

### Task 36 — Engine Lifecycle, Dependency Validation & Recovery Policies
**Layer:** 5 — Coordination | **Depends on:** 10, 33

Standard lifecycle for every engine: initialize() → boot() → health_check() → pause() → resume() → recover() → shutdown(). Recovery Policies per engine: AUTO_RESTART (restart automatically on failure), AUTO_FALLBACK (switch to a degraded capability), GRACEFUL_DISABLE (stop accepting new work, complete in-flight), MANUAL_RECOVERY (requires owner intervention). Layer-ordered startup sequence: Foundations → Knowledge → Retrieval → Intelligence → Coordination → Operational Context → Internal Capability Services → Provider Layer. Dependency validation before boot: an engine cannot start if its declared dependencies have not successfully booted.

---

### Task 37 — Self-Test Framework
**Layer:** 9 — Interfaces | **Depends on:** 33, 36

"Run Full System Check" available from Settings → System. Results: PASS / WARN / FAIL per test with evidence. Test suites:
- Engine Suite — all engines respond to health_check()
- API Suite — all /internal/ endpoints return valid responses
- Connector Suite — all provider adapters connect and emit a test event
- Policy Suite — Policy Engine returns current active policies
- Query Suite — Query Engine returns results for a synthetic query
- Event Log Suite — Event Log is append-only and re-projection produces consistent state
- Backup Suite — most recent backup is valid and Verify Archive passes
- Constitution Suite — all ABSOLUTE provisions are enforced
- Semantic Index Suite — embedding search returns plausible results
- Domain Events Suite — all declared event types have valid schemas
- Context Economy Suite — scoring formula produces expected output for known inputs
- World State Suite — World State Engine returns current time-aware context
- Operational Memory Suite — at least one behavioral pattern exists or candidate is forming
- **Provider Abstraction Suite** — verifies no engine above the adapter layer imports provider-specific types; verifies each adapter emits its declared supported_events on a synthetic sync
- **Bootstrap Suite** — verifies extraction quality, cross-project detection, confirmation conversation generation
- **Internal Capability Services Suite** — verifies CIL graceful degradation behavior; verifies CerbaSeal fail-closed behavior; verifies no consequential action routes to execution without a GovernedActionAllowed event; verifies CIL and CerbaSeal database isolation (no direct DB access from LEE)

---

### Task 38 — Recovery Modes
**Layer:** 5 — Coordination | **Depends on:** 10, 32

Six boot modes determined at startup:
- Cold Boot — fresh start, no prior state
- Warm Restart — prior state intact, resuming from last checkpoint
- Safe Mode — minimal engines only; no background jobs; no provider syncs; Safe Mode banner on all Console pages
- Recovery Mode — prior state partially corrupted; re-projection from Event Log underway
- Migration Mode — Brain Version upgrade in progress; read-only until complete
- Read Only — external write actions disabled; CerbaSeal calls skipped (no execution possible); surfaced to owner

Boot mode determination logic runs on every startup. Current mode part of System Manifest.

---

### Task 39 — Data Ownership
**Layer:** 2 — Knowledge | **Depends on:** 1, 3

Six ownership fields on every knowledge object: created_by, modified_by, verified_by, imported_from, generated_by, current_owner. Auto-populated. "Mark as Verified" action available on any fact — sets verified_by = owner, resets freshness clock, contributes to Trust Score for the engine that created the object. Bootstrap Engine objects: created_by = "project_bootstrap_engine", source_refs = [repository files used]. Owner-confirmed bootstrap objects: verified_by = owner.

---

### Task 40 — Knowledge Aging
**Layer:** 2 — Knowledge | **Depends on:** 12, 26

Freshness states: Fresh → Current → Old → Historical → Stale → Expired. Age windows configurable per object type via Policy Engine (defaults: facts age faster than interpretations; verified facts age slower than unverified). Stale objects: Curiosity Engine generates a question item. Expired objects: Goal_Match forced to 0 in Context Economy — excluded from all context packets. After Task #47, Bootstrap Engine's documentation freshness monitoring uses Knowledge Aging thresholds to determine when to generate staleness Curiosity items.

---

### Task 41 — System Manifest
**Layer:** 9 — Interfaces | **Depends on:** 9, 19, 29, 33

Auto-generated living document, always current, generated fresh on every request in under 2 seconds. Sections: Identity (LEE version, Brain Version, owner), Constitution (ABSOLUTE provisions list, CONFIGURABLE provisions current state), Policies (all active policy values), Brain State (memory tier counts, graph node count, event log size), Capabilities (Capability Registry — all engines and their health), Internal Capability Services (CIL and CerbaSeal: health, last call, resolution tier distribution, verdict distribution, credential status — valid/expiring/missing, never credential values), Connectors (Provider Registry — all adapters by category), Schemas (current schema versions), Indexes (Semantic Index stats), Statistics (total facts, interpretations, events, people, projects), Storage (disk usage, backup status), Health (last Self-Test results), Dependencies (engine dependency graph). JSON and Markdown exports. Included in every Brain backup.

---

### Task 42 — World State Engine
**Layer:** 6 — Operational Context | **Depends on:** 1, 6, 10

Active model of external reality — not a web search, but curated, structured, time-aware signals:

**Universal (always maintained, no opt-in required):**
- Current date, time, timezone
- Upcoming holidays and observances relevant to the owner's locale
- Market hours for configured financial markets
- Current fiscal period (configurable: calendar year, fiscal year)
- Day of week context (Monday urgency vs. Friday wind-down)

**Location context (opt-in):**
- Current city/region (from Calendar or manual setting)
- Travel windows detected from Calendar connector

**Technical dependency monitoring (auto, based on connected services):**
- API deprecation notices for all connected provider services
- Breaking change alerts for runtime dependencies (Node.js, TypeScript, etc.)
- Security advisories for major dependencies

**Owner-configured topics (all explicit opt-in):**
- News areas (e.g. "AI governance regulation", "enterprise SaaS")
- Regulatory domains (e.g. "SOC 2", "GDPR")
- Software changelogs (e.g. "Drizzle ORM releases")

WorldStateUpdated events consumed by: Initiative Engine, Brief Engine, Operational Intelligence Engine.

---

### Task 43 — Operational Memory
**Layer:** 6 — Operational Context | **Depends on:** 1, 3, 12, 25

Behavioral pattern learning from observed signals — not declared preferences. Sources: Gmail send/receive timestamps, GitHub commit times, Console session start/end times, capture timestamps from Android. Never additional tracking — only data LEE already has.

**Pattern types:**
- Routine detection — recurring time-of-day patterns (morning review, evening capture)
- Attention patterns — which projects receive the most captures and interactions
- Response cadence — how quickly the owner typically replies to specific people
- Work session patterns — duration and frequency of focused work periods
- Project attention cycles — how project focus shifts over weeks and months
- Decision-making patterns — time between problem identification and decision

**Pattern confidence lifecycle:** candidate (detected but unconfirmed) → established (consistent over ≥ 3 weeks) → strong (consistent over ≥ 2 months). Pattern breaks emit OperationalPatternBroken events consumed by Initiative Engine.

---

### Task 44 — Initiative Engine
**Layer:** 6 — Operational Context | **Depends on:** 10, 15, 42, 43

Proactive operational observations surfaced without being asked. Not reminders — operational awareness.

**Observation types:**
- Drift — a project's state has drifted from its last confirmed position
- Relationship — a key relationship has been dormant longer than expected
- Financial — spend trending toward a limit
- Technical health — build failure, dependency alert, repo inactivity
- Assumption health — an active assumption is approaching its review threshold
- Knowledge drift — significant new commits with no corresponding documentation update
- Data health — a key fact is approaching Stale
- World state trigger — a configured monitoring topic has a significant new signal
- Operational rhythm break — an established pattern was broken

**Quality controls:** configurable daily observation limit (default: 5), deduplication window (same observation not surfaced within 7 days), HIGH and CRITICAL items included in Morning Brief, CRITICAL items trigger push notification to Android.

---

### Task 45 — Operational Intelligence Engine
**Layer:** 6 — Operational Context | **Depends on:** 16, 26, 34, 42, 43, 44

Always-on signal answering "what deserves attention right now?" Refreshes every 15 minutes and reactively on significant events (OperationalPatternBroken, GovernedActionAllowed, InitiativeItemCreated, WorldStateUpdated).

**Operational Context output:**
- Active Priority — the single most important thing right now
- What Changed — since last refresh, what is new and significant
- What is Drifting — projects or relationships moving in the wrong direction
- What is Waiting — open waiting loops by age and importance
- What is Blocked — items that need a decision or action to proceed
- What is at Risk — items with declining health or approaching deadlines
- What Can Wait — important but not urgent; not surfaced today
- What Should Be Ignored Today — explicitly deprioritized items

**Powers:** Console Today page, Morning Brief opening statement, Ask Lee context injection, Android Today screen.

---

### Task 46 — Provider Abstraction Layer
**Layer:** 8 — Provider Layer | **Depends on:** 1, 6, 35

The boundary between external services and LEE's internal engines. Five provider categories:

| Interface | Current Adapters | Future Adapters |
|---|---|---|
| CommunicationProvider | Gmail | Proton Bridge (desktop), Outlook, IMAP generic |
| DocumentProvider | Google Drive, Google Docs | OneDrive, Notion, local filesystem |
| DevelopmentProvider | GitHub (Intelligence) | GitLab, local Git (desktop) |
| SchedulingProvider | Google Calendar | Outlook Calendar, Calendly |
| StorageProvider | Google Drive, App Storage | OneDrive, Dropbox, local disk |

**DevelopmentProvider (Intelligence) full interface:**
`list_repos()`, `get_repo_metadata()`, `get_file_tree()`, `get_file_content()`, `fetch_commits()`, `fetch_issues()`, `fetch_pull_requests()`, `fetch_releases()`, `fetch_deployments()`, `get_build_status()`, `get_dependency_alerts()`

**Not in this layer:** CIL and CerbaSeal. They are Internal Capability Services (Task #48) with their own layer, interfaces, authentication model, and failure policies. This is enforced by the Provider Abstraction Suite in the Self-Test Framework.

**ABSOLUTE enforcement:** No engine above the adapter layer may reference a specific service by name. Verified by Self-Test.

---

### Task 47 — Project Bootstrap Engine
**Layer:** 8 — Provider Layer | **Depends on:** 3, 6, 13, 21, 46

When a repository is connected, LEE reads all available evidence and builds an initial knowledge model automatically — without the owner having to explain what already exists.

**Nine extractors run in parallel:**

| Extractor | Input | Output | Ledger |
|---|---|---|---|
| Technology Stack | package.json, Cargo.toml, go.mod | Languages, framework, runtime, package manager | Fact |
| Repository Map | File tree | Folder structure, file counts, inferred directory purpose | Fact |
| Project Summary | README.md, docs/ index | One-paragraph project description | Interpretation |
| Architecture Graph | Folder structure, config files, OpenAPI spec | Application layers, modules, external deps | Intelligence Graph |
| Dependency Inventory | Package files | All packages with category + security advisory flags | Fact |
| API Inventory | OpenAPI spec, route files | Documented endpoints, HTTP methods, inferred purpose | Fact |
| Documentation Inventory | All doc files | Doc types, freshness scores vs. last commit | Fact |
| Configuration Inventory | .env.example, CI config, Docker | Config file types, env var names (never values) | Fact |
| Security Observations | Static analysis | Exposed secrets, deprecated patterns, missing .gitignore | Curiosity items / Governance holds |

**Missing Documentation Detection:** compares repository map against documentation inventory. Flags: no README, README missing Architecture section, no CONTRIBUTING, no API docs for detected endpoints, no CHANGELOG.

**Cross-project intelligence:** after bootstrapping, Intelligence Graph queried for structural similarities across all bootstrapped repositories. Cross-project edges created where similarity exceeds threshold. Observations surfaced as Initiative items.

**Continuous monitoring:** CommitPushed → new_directories detected → structural change Curiosity item. Documentation freshness drop → staleness Curiosity item. New major dependency → Dependency Inventory updated.

---

### Task 48 — Internal Capability Services Layer — CIL + CerbaSeal
**Layer:** 7 — Internal Capability Services | **Depends on:** 1, 5, 10, 11, 31, 33, 35, 46

The versioned API contracts, typed request/response schemas, authentication boundary, routing logic, failure behavior, and domain events that let LEE call CIL and CerbaSeal cleanly.

**Configured endpoints:**
- CIL: `https://cognitive-infrastructure-layer.replit.app/api/query/lee`
- CerbaSeal evaluate: `https://cerbaseal.replit.app/govern/evaluate`
- CerbaSeal policy version: `https://cerbaseal.replit.app/policy/current-version`
- CerbaSeal health: `https://cerbaseal.replit.app/health`

**Authentication (both services):**
- Bearer token + HMAC-SHA256 request signatures
- X-LEE-Timestamp + X-LEE-Signature on every request
- Replay protection via unique correlation_id / lee_request_id
- Credentials loaded from environment secrets at startup — never from DB, never logged

**CIL (ReasoningService):** see CIL Integration section above
**CerbaSeal (GovernanceService):** see CerbaSeal Integration section above

**ServiceRegistry:** both services registered in Capability Registry with health state, last call, failure_policy, credential_env_key (key name only). Health checks every 2 minutes. Surfaced in System Manifest and Settings → Internal Services.

**Self-Test Internal Capability Services Suite:** verifies CIL graceful degradation, CerbaSeal fail-closed behavior, no consequential action routes without GovernedActionAllowed event, CIL and CerbaSeal DB isolation.

---

## Capability Levels

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

---

## Reference: Key Distinctions

### Confidence vs. Trust
| | Confidence | Trust |
|---|---|---|
| Measures | Epistemic certainty of one object | Reliability of one subsystem over time |
| Range | 0–1 | 0–100 (starts at 50) |
| Decay | Per inference hop (factor: 0.85) | 0.5/day without activity |
| Rises when | Source quality high; chain is short | Owner verifies subsystem outputs |

### Recovery Modes vs. Operational States
| | Recovery Modes (#38) | Operational States (#32) |
|---|---|---|
| Describes | How LEE started up | What LEE is doing right now |
| Examples | Cold Boot, Safe Mode | Idle, Thinking, Importing |
| Changes | At startup only | Continuously |

### Curiosity vs. Initiative vs. Operational Intelligence
| | Curiosity (#15) | Initiative (#44) | Operational Intelligence (#45) |
|---|---|---|---|
| Type | Questions | Observations | Continuous prioritization |
| Trigger | Knowledge gaps, staleness | Drifts, events, pattern breaks | Always on (15-min + reactive) |
| Output | Questions for owner to answer | Proactive observations to note | Ranked operational context |

### Governance Engine vs. CerbaSeal
| | Governance Engine (#11) | CerbaSeal (#48) |
|---|---|---|
| Scope | LEE's internal policy layer | External execution authorization |
| Answers | "Does LEE's policy allow this?" | "Is this action authorized to proceed?" |
| Verdict | Internal hold, approval flow | ALLOW / HOLD / REJECT |
| Failure | Blocks internally | Fail-closed — action never executes |

### Three-Tier Service Architecture
| Tier | Systems | Interface | Failure policy |
|---|---|---|---|
| Internal Capability Services | CIL, CerbaSeal | ReasoningService, GovernanceService | CIL: graceful degradation; CerbaSeal: fail-closed |
| External Providers | Gmail, GitHub, Google Calendar | CommunicationProvider, DevelopmentProvider | Graceful degradation; read from cache |
| Internal Engines | Query Engine, Understanding Pipeline... | /internal/[engine-name] | Per-engine Recovery Policy |

---

*Master Breakdown — Version 9.0 · 48 Tasks · July 11, 2026*
*Environment: CIL and CerbaSeal credentials configured · Replit-hosted · Migration path to desktop documented*
