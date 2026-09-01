# Project LEE — Master Breakdown
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Version 12.1 — 69 Tasks · September 1, 2026*

---

## The Vision (v12.1)

> Project LEE is evolving into a founder operating system whose most valuable asset is not its language model, but its continuously refined understanding of reality, accumulated experience, and ability to help its owner make consistently better decisions over time.

She doesn't replace your thinking — she protects it.
She doesn't replace your decisions — she prepares them.
She doesn't replace your memory — she preserves it.
She doesn't replace your judgment — she informs it with everything she has learned.

The primary asset is the accumulated knowledge, governance, memory, experience, and institutional wisdom — not the specific model answering questions. The model could change. Lee continues to grow.

---

## The Lamont Labs Operating Stack

```
┌──────────────────────────────────────────────────────────────┐
│                         Project LEE                          │
│                   Operating Intelligence                     │
│                                                              │
│ Identity · Brain · Knowledge · Event Log · Projects          │
│ People · Decisions · Objectives · Portfolio · Timeline       │
│ Operational Intelligence · Readiness · Allocation            │
└──────────────┬──────────────────────┬────────────────────────┘
               │ Runtime service plane│ Management / control plane
               │                      │
     ┌─────────▼─────────┐   ┌────────▼───────────────────────┐
     │ CIL API            │   │ MCP Project Bridge             │
     │ Cognitive authority│   │ Inspect · read · modify · test │
     └─────────┬─────────┘   │ coordinate project work         │
               │             └────────┬───────────────────────┘
     ┌─────────▼─────────┐            │
     │ LEE Model Router  │            ▼
     │ Execution only    │   Replit projects / Lamont Labs code
     └─────────┬─────────┘
               │
     ┌─────────▼─────────┐   ┌────────────────────────────────┐
     │ Replit AI Bridge  │   │ Universal Systems API           │
     │ Execute selected  │   │ Independent service contracts  │
     │ provider/model    │   │ and normalized transport        │
     └────────────────────┘   └────────────────────────────────┘

     ┌────────────────────┐
     │ CerbaSeal API      │
     │ Governance authority│
     │ ALLOW/HOLD/REJECT  │
     └────────────────────┘

CIL, CerbaSeal, Replit AI Bridge, and the MCP Project Bridge are connected
systems with independent ownership, deployments, credentials, and databases.
LEE calls them through authenticated versioned contracts; it does not duplicate
their authority or access their databases directly.
```

---

## Request Processing Order (v12.1)

```
1. Identity     →  who am I, how do I operate, when do I speak?
2. Constitution  →  what is LEE allowed to do?
3. Intent        →  what is being asked and what is its risk?
4. Query Engine  →  what knowledge and evidence are relevant?
5. Context Economy → what fits the bounded context packet?
6. CIL API       →  T1 reuse, T2 reuse, or a CIL-selected T3 route
7. Model Router  →  execute the exact CIL-selected model route, if required
8. CerbaSeal     →  may a consequential action execute?
```

The Identity Engine is first. Every request — from a human, from a scheduled engine, from the Executive Loop — passes through Identity before anything else.

For normal model-backed reasoning, CIL is mandatory. If CIL is unavailable, LEE
may continue with local, context-only, extraction, and recovery operations, but
it must not independently select or call a frontier model. If a CIL-selected
execution route fails, LEE returns the failure to CIL and executes only the new
route CIL returns.

---

## Architecture Principles (v12.1 — 46 principles)

**1–22.** Foundations (v9.0).

**23.** LEE never stops running. The Executive Loop is the operational heartbeat.

**24.** LEE knows how much to trust herself. Operational Confidence is composite and time-aware.

**25.** Projects have direction, not just status.

**26.** LEE looks for leverage. The Opportunity Engine finds cross-project reuse and strategic alignment.

**27.** Capacity shapes presentation, not content.

**28.** Some knowledge does not decay. Strategic Anchors are intentionally durable.

**29.** Lamont Labs is a portfolio, not a list.

**30.** Identity is the center. Everything asks Identity before Constitution. Identity answers "what kind of operating partner am I?"; Constitution answers "what am I allowed to do?".

**31.** Objectives are operational, not project-bound. Every recommendation is weighted against active Executive Objectives.

**32.** Organizations exist independently of their projects. Organizational Memory models Lamont Labs as a first-class entity.

**33.** Decision patterns are observable. Decision Memory infers operational heuristics from behavior. LEE can say "I think you'll probably reject this" before you do.

**34.** The future can be simulated. Stored simulations are matched against reality when events resolve.

**35.** History can be reconstructed. The Time Machine rebuilds the complete operational state at any past moment.

**36.** Confidence and uncertainty are distinct signals. High confidence and high uncertainty can coexist.

**37.** Attention is a limited resource that must be allocated. The Resource Allocation Engine calculates, not declares.

**38.** Projects have readiness, not just status.

**39.** Dependencies define blast radius.

**40.** New capabilities must earn their own engine. Before adding a new engine, ask: "Is this a distinct responsibility, or a capability of an existing engine?" Engines are intentional. Capabilities built on existing engines preserve architectural clarity.

**41.** History is not enough. Experience, Lesson, Pattern, and Institutional Knowledge are distinct knowledge types that exist above Facts and Interpretations. Reality must test a belief before it becomes Institutional Knowledge.

**42.** LEE must learn from herself. Operational Self-Improvement tracks what works and adapts LEE's operational behaviors accordingly — transparently, conservatively, and reversibly.

**43.** Every operation has an economic cost. System Economics provides a complete, unified accounting of what every capability costs to operate, and whether the value produced justifies it.

**44.** CIL owns normal cognitive routing. LEE may prepare context and execute a
CIL decision, but it never duplicates reuse, escalation, provider, model, or
post-failure route-selection logic.

**45.** Runtime service access and project management are different planes.
LEE uses service APIs to consume independent capabilities; it uses the MCP
Project Bridge to inspect, change, test, and coordinate project repositories.

**46.** External authorities remain external. CIL owns cognitive routing,
CerbaSeal owns consequential governance, and the MCP Project Bridge owns its
scoped project-management contract. LEE never bypasses or reimplements them.

---

## Constitutional ABSOLUTE Provisions (v12.0 — 13 provisions)

1. Provenance is non-negotiable
2. The /internal/ namespace is never exposed externally
3. Semantic Index embeddings are stored locally — never sent external
4. No silent failures
5. The Event Log is append-only
6. Facts and Interpretations are never mixed
7. No engine above the Provider Abstraction Layer references a specific service by name
8. The Bootstrap Engine never reads secret values
9. CerbaSeal is fail-closed
10. CIL and CerbaSeal databases are never accessed directly by LEE
11. Credentials for CIL and CerbaSeal are never logged, stored in LEE's DB, or sent to a model
12. Strategic Anchors are never silently contradicted
13. The Identity Engine is consulted before the Constitution on every request

---

## Knowledge Taxonomy (v12.0)

LEE distinguishes five types of knowledge. They are never conflated.

| Type | What it represents | Tested by | Stored in |
|---|---|---|---|
| Fact | An asserted truth, confidence-weighted | Provenance | Fact Ledger |
| Interpretation | A conclusion drawn from facts | Reasoning | Interpretation Ledger |
| Strategic Anchor | An explicitly declared commitment | Owner declaration | Anchor Ledger |
| Decision Heuristic | An inferred pattern from observed decisions | Repeated behavior | Decision Heuristic Ledger |
| Institutional Knowledge | A lesson reality has repeatedly validated | Repeated outcomes | Institutional Knowledge Ledger |

Institutional Knowledge is the highest epistemic tier. It cannot be asserted — only earned through repeated real-world validation.

---

## Key Epistemic Signals (v12.0)

| Signal | Measures | Range | Example |
|---|---|---|---|
| Confidence | Evidence quality for one object | 0–1 | "CerbaSeal's pilot model is well-documented" (0.88) |
| Trust | Subsystem reliability over time | 0–100 | "GitHub adapter has been reliable" (91) |
| Operational Confidence | Quality of today's overall picture | 0–100 | "All connectors current, assumptions healthy" (94) |
| Uncertainty | Situational instability | LOW/MEDIUM/HIGH/VERY HIGH | "Nobody knows whether the funding decision is made" (HIGH) |

---

## Layer Hierarchy (v12.0)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 0 — IDENTITY                                             │
│  Identity Engine                                                │
│  Asked before everything else on every request                  │
│  Identity Profile — versioned, 12 behavioral dimensions         │
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
│  Decision Memory — Decision Heuristic Ledger                    │
│  Organizational Memory                                          │
│  Institutional Knowledge Ledger [v12]                           │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3 — RETRIEVAL                                            │
│  Query Engine · Semantic Index                                  │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4 — INTELLIGENCE                                         │
│  Intent Engine · Understanding Pipeline                         │
│  Curiosity Engine · Strategy Engine                             │
│  Reflection Engine · Explanation Engine                         │
│  Confidence Propagation · Uncertainty Tracking                  │
│  Simulation Engine                                              │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 5 — COORDINATION                                         │
│  Orchestration Engine & Scheduler Calendar                      │
│  Policy Engine · Governance Engine                              │
│  Resource Engine · State Engine                                 │
│  Operating Modes · Engine Lifecycle · Recovery Modes            │
│  Capability Registry                                            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6 — OPERATIONAL CONTEXT                                  │
│  World State Engine · Operational Memory                        │
│  Operational Capacity Awareness                                 │
│  Initiative Engine · Operational Intelligence Engine            │
│  Executive Loop — the operational heartbeat                     │
│  Operational Confidence                                         │
│  Executive Objectives Engine                                    │
│  Resource Allocation Engine                                     │
│  Operational Review Engine [v12]                                │
│  Operational Self-Improvement [v12]                             │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 6b — PORTFOLIO INTELLIGENCE                              │
│  Project Momentum Engine                                        │
│  Opportunity Engine                                             │
│  Portfolio Intelligence Engine                                  │
│  Portfolio Dependency Graph                                     │
│  Execution Readiness                                            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 7 — INTERNAL CAPABILITY SERVICES                         │
│  CIL (ReasoningService) · CerbaSeal (GovernanceService)        │
│  Separate DBs · Versioned APIs · HMAC auth · Fail-closed        │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 8 — PROVIDER LAYER                                       │
│  Provider Abstraction Layer · Project Bootstrap Engine          │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 9 — INTERFACES & OBSERVABILITY                           │
│  Console · Android App · Brief Engine                           │
│  System Economics [v12] (supersedes Cost Engine)               │
│  Backup & Migration · Context Economy                           │
│  Self-Test · System Manifest                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Capability Levels (v12.0)

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
| 34 | Produces institutional history | #66 |
| 35 | Learns from what reality has proven | #67 |
| 36 | Improves her own operational behavior | #68 |
| 37 | Knows what everything costs and whether it's worth it | #69 |

---

## The Experience Pathway (v12.0)

```
Event
(something happened — a failure, a resolution, a validated outcome)
  ↓
Experience
(this event is significant and worth learning from)
  ↓
Lesson
(what this event teaches — a preliminary, unvalidated conclusion)
  ↓
Pattern
(the same lesson reinforced by 3+ independent events)
  ↓
Institutional Knowledge
(reality has tested this repeatedly; operationally reliable)
```

**Institutional Knowledge is not asserted. It is earned.**

Examples after years of operation:
- "Investor follow-ups sent after 5pm on Fridays: 0% response rate across 9 attempts"
- "CerbaSeal deployment failures have occurred during dependency version bumps — 7 of 7"
- "Recommendations citing cost reduction: accepted 81% of the time"

These are different from Facts (asserted), Interpretations (reasoned), Anchors (declared), and Decision Heuristics (behavioral pattern). They are lessons that reality has confirmed.

---

## Operational Self-Improvement — What LEE Adapts

LEE tracks her own effectiveness across six categories and adapts her output behaviors accordingly. All adaptations are transparent, reversible, and conservative (minimum 5 observations before firing).

| Category | What Is Measured | Example Adaptation |
|---|---|---|
| Recommendation effectiveness | Acceptance rates by type, timing, domain | Surface recommendations at higher-capacity states |
| Simulation accuracy | Projection accuracy when scenarios resolve | Increase uncertainty flagging for historically inaccurate domains |
| Assumption reliability | Failure rates by source and domain | Auto-flag certain assumption categories as HIGH uncertainty |
| Brief effectiveness | Completion rates by length, item type, timing | Reduce Brief item ceiling from 10 to 7 |
| Curiosity quality | Follow-up rate after questions surfaced | Deprioritize question types with low follow-up rates |
| Initiative signal quality | Owner action rate after surfacing | Raise surfacing threshold for consistently dismissed initiative types |

**What LEE never adapts:** Identity Profile · Constitutional provisions · Knowledge Layer facts · Strategic Anchors · Governance rules.

---

## System Economics — What Gets Measured

System Economics supersedes the Cost Engine (Task #8) and unifies all operational accounting.

| Category | Metrics |
|---|---|
| CIL usage | T1/T2/T3 distribution · Reuse rate · Escalation rate · Per-engine cost |
| Model Router | Model selection distribution · Tokens per request · Cost per call |
| Embeddings | Vector generation cost · Index size · Reuse rate |
| Storage | DB growth rate · Event Log volume · Semantic Index size · Backup storage |
| Background processing | CPU/memory per engine per cycle · Scheduled job cost |
| Network | Connector sync volume · CIL request volume · CerbaSeal evaluation volume |
| Latency | Per-stage breakdown · Engine cycle time distribution · Cache hit vs. miss |
| Value ratios | Cost per accepted recommendation · Cost per Brief item completed · Cost per simulation · Cost per Institutional Knowledge item established |

The System Budget answers: "What does LEE cost to operate this month, where is the cost going, and is it producing value?"

---

## Operational Review Cadences (v12.0)

| Cadence | Scope | Key Questions |
|---|---|---|
| Weekly | What moved this week | Momentum, waiting loops, Brief completion, active objectives progress |
| Monthly | Pattern analysis | Assumption performance, simulation accuracy, OKR progress, effort vs. value |
| Quarterly | Strategic perspective | Portfolio velocity, decision pattern evolution, institutional themes, momentum trends |
| Annual | Full narrative | What LEE believed at year start vs. what reality proved · Major decision retrospective · Strategic evolution · Institutional Knowledge accumulated |

Reviews are stored permanently, indexed in the Intelligence Graph, and retrievable via the Query Engine. They feed the Experience engine — lessons appearing consistently across reviews are candidates for Institutional Knowledge promotion.

---

## Runtime Service Plane vs. Management / Control Plane

LEE has two intentionally separate kinds of external connectivity.

### Runtime service plane

This is how LEE consumes another system as a capability:

- CIL API — cognitive reuse and route selection
- CerbaSeal API — consequential-action governance
- Gmail API — normalized email evidence and events
- Google Drive and other storage/document APIs
- GitHub and other development-provider APIs
- Future Lamont Labs systems such as Greyline and QuantraCore
- Replit AI Bridge — execution of the route CIL selected

The runtime service plane uses provider-neutral adapters or authenticated
Universal Systems API contracts. A service call must never turn into a project
management operation.

### Management / control plane

This is how LEE works on the projects themselves:

- Inspect a registered project
- Read allowed project files
- Preview a change
- Apply an exact confirmed change
- Run allowlisted checks
- Inspect logs and service state
- Restart approved services
- Coordinate dependent work across projects
- Prepare deployment work for owner review

The multi-project MCP bridge belongs here. It is for working on CIL, CerbaSeal,
LEE, K6, and other Lamont Labs projects as projects. It is not the way LEE uses
CIL reasoning. Normal reasoning is always `LEE → CIL API`.

The bridge is scoped, authenticated, preview-first, workspace-relative, and
does not expose arbitrary shell, secrets, deletion, silent synchronization, or
unreviewed consequential writes.

## Layered Readiness

LEE does not have one binary ready/not-ready state. Each capability surface has
its own readiness state so an external outage does not hide a healthy local
foundation.

### CORE READY

- Database healthy
- Event Log healthy
- Brain loaded
- System Contract available
- API running
- Console available
- Local knowledge available

### AI READY

- CIL API reachable
- CIL can return T1/T2 resolution or an approved T3 route
- At least one approved execution provider is healthy
- LEE Model Router can execute only CIL-selected routes

### GOVERNANCE READY

- CerbaSeal API reachable
- Policy/version checks pass
- Authenticated governance requests are valid
- Consequential ALLOW releases can be verified

### LAB READY

- MCP Project Bridge connected
- Required project agents connected
- Selected Lamont Labs systems healthy
- Provider connections healthy

The Console should communicate this as separate signals, for example:

```
LEE Core           Ready
AI                 Ready
Governed Actions   Unavailable — CerbaSeal offline
Project Operations Degraded — project bridge unavailable
```

The system remains quiet when each surface is healthy and becomes prominent
only when an owner action or meaningful degradation exists.

## K6 Host Model

During transition, K6 may be discovered through the approved local contract at
`127.0.0.1:6420`. Once LEE Desktop runs as the K6-hosted system, the conceptual
model becomes:

```
LEE Host → K6
K6 → individually registered local specialist services
```

K6 is then the physical/runtime host, not merely another provider. Individual
local K6 services still use the owner-controlled local contract registry and
remain bounded by loopback-only discovery and owner review.

## Connection Center

The Connection Center is a core product subsystem, not merely a settings page.
It is the owner-facing control surface for:

- Accounts: Google, GitHub, and future accounts
- Lamont Labs systems: CIL, CerbaSeal, QuantraCore, Greyline, and others
- Replit projects through the MCP management bridge
- Local systems and K6 service contracts
- Universal Systems API contracts
- Files and folders
- Webhooks and event sources
- Provider adapters and authorization state

Every connection should answer, without exposing technical details by default:

- Is it connected?
- Is it healthy?
- What can LEE do with it?
- What authority does LEE have?
- Does anything need the owner's attention?

Tokens, URLs, scopes, ports, raw contracts, and diagnostics remain available
under Advanced rather than being the default experience.

## Gmail Provider Boundary

Email-specific behavior belongs in the provider layer:

```
LEE → EmailProvider → GmailProvider → Gmail API
```

Today, People, Projects, Waiting, and Operational Intelligence consume
normalized email events and evidence. They do not contain Gmail-specific logic.
Moving LEE from Replit to the K6 host therefore does not change the email
architecture.

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

## Complete Task Index (69 tasks)

| # | Title | Depends On | Layer |
|---|---|---|---|
| 1 | Foundation & Core Schema | — | 1 |
| 2 | Console (Web App) | 1 | 9 |
| 3 | Understanding Pipeline | 1 | 4 |
| 4 | Brief Engine | 3, 5 | 9 |
| 5 | Model Router & Context Engine | 1 | 7 |
| 6 | Connector Engine | 1, 3 | 8 |
| 7 | Android App | 2, 4 | 9 |
| 8 | Cost Engine | 1, 5 | 9 (superseded by #69) |
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
| 56 | Identity Engine | 1, 19, 29 | 0 |
| 57 | Executive Objectives Engine | 16, 26, 44, 45 | 6 |
| 58 | Organizational Memory | 1, 3, 13, 14 | 2 |
| 59 | Decision Memory | 16, 22, 24 | 2 |
| 60 | Simulation Engine | 16, 23, 26, 45 | 4 |
| 61 | Time Machine | 25, 35 | 2 |
| 62 | Uncertainty Tracking | 20, 23, 26, 50 | 4 |
| 63 | Resource Allocation Engine | 45, 51, 55, 57, 64 | 6 |
| 64 | Execution Readiness | 13, 26, 47 | 6b |
| 65 | Portfolio Dependency Graph | 13, 47, 55 | 6b |
| 66 | Operational Review Engine | 25, 35, 45, 49, 57 | 6 |
| 67 | Experience & Institutional Knowledge | 17, 22, 24, 35, 66 | 2 |
| 68 | Operational Self-Improvement | 4, 16, 43, 44, 45, 49 | 6 |
| 69 | System Economics | 5, 8, 35, 48 | 9 |

---

## What Changed: v9.0 → v10.0 → v11.0 → v12.0

| Item | v9.0 | v10.0 | v11.0 | v12.0 |
|---|---|---|---|---|
| Tasks | 48 | 55 | 65 | 69 |
| Architecture principles | 22 | 29 | 39 | 43 |
| Constitutional ABSOLUTE provisions | 11 | 12 | 13 | 13 |
| Layers | 9 | 10 (+6b) | 11 (+Layer 0) | 11 |
| Capability levels | 16 | 23 | 33 | 37 |
| Knowledge ledgers | 2 | 3 (+Anchor) | 5 (+Heuristic, Org) | 6 (+Institutional) |
| Epistemic signals | 3 | 3 | 4 (+Uncertainty) | 4 |
| Request processing order | implicit | implicit | explicit | explicit |
| Experience pathway | — | — | — | Event→Experience→Lesson→Pattern→Wisdom |
| Self-improvement | — | — | — | 6-category operational adaptation |
| Operational reviews | — | — | — | Weekly/Monthly/Quarterly/Annual |
| System Economics | partial (Cost Engine) | partial | partial | unified (supersedes #8) |

---

## Architectural Guideline (v12.0)

> "Does this require a new engine, or is it a capability of an existing engine?"

Every new capability must answer this question before it earns a separate component. Engines are intentional. The number of distinct engines should grow only when a capability has a genuinely distinct responsibility — its own domain, its own data, its own lifecycle.

Examples of this principle in v12.0:
- **Institutional Knowledge** → not a new engine; a new knowledge tier and ledger built on the existing Knowledge Layer, with promotion logic extending the Reflection Engine
- **Operational Self-Improvement** → extends the Reflection Engine's mandate; distinct enough in scope (LEE's own operational behavior) to warrant a dedicated task, but shares infrastructure with the Reflection and Executive Loop engines
- **Operational Review Engine** → earns its own engine because it has a completely distinct responsibility: periodic retrospective narrative, not continuous monitoring
- **System Economics** → earns its own engine because it unifies three currently separate systems into one coherent accounting model

---

## Foundational Completeness Assessment (v12.1)

After v12.1, LEE has all architectural components to function as a founder operating system that compounds in value over years:

**Complete:**
- Foundation & Governance (Layer 0–1)
- Knowledge, Experience & Institutional Wisdom (Layer 2)
- Retrieval & Intelligence (Layers 3–4)
- Coordination & Operational Context (Layers 5–6)
- Portfolio Intelligence (Layer 6b)
- Internal Capability Services (Layer 7)
- Provider Layer (Layer 8)
- Interfaces, Economics & Observability (Layer 9)

**The knowledge progression is complete:**
Facts → Interpretations → Anchors → Decision Heuristics → Institutional Knowledge

**The operational progression is complete:**
Observe → Understand → Prioritize → Simulate → Decide → Review → Learn → Improve → Repeat

---

*Master Breakdown — Version 12.1 · 69 Tasks · September 1, 2026*
*v12.0 added: Operational Review Engine · Experience & Institutional Knowledge · Operational Self-Improvement · System Economics*
*v12.1 clarifies: CIL authority · external service boundaries · MCP control plane · layered readiness*
*New architecture principles: #40–#46*
*Task #8 (Cost Engine) superseded by Task #69 (System Economics)*
*All production endpoints configured · CIL and CerbaSeal credentials stored*
