# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 3.0 — 25 Tasks*

---

## Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff — she doesn't replace your thinking, she protects it. She doesn't replace your decisions, she prepares them. She doesn't replace your memory, she preserves it.

The primary asset is the accumulated knowledge, governance, memory, relationships, timelines, and operational state — not the specific model answering questions. The model could change. Lee continues to grow.

---

## Architecture Principles (v3.0)

**1. The Constitution sits above everything.** Every engine consults the Constitution before acting. Absolute provisions cannot be overridden — not even by governance approval.

**2. Event Sourcing is the foundation.** Almost nothing mutates directly. State changes are events. Current state is a projection. Re-projection from the Event Log alone must produce a consistent database.

**3. Facts and Interpretations are never mixed.** The Fact Ledger holds what is verifiable. The Interpretation Ledger holds what Lee reasons. They have different canon rules, different confidence rules, and different decay rates.

**4. Confidence flows.** Every derived object carries a confidence lineage. The user always knows how certainty degraded from source to recommendation.

**5. Every output has a Why Chain.** No recommendation without reasoning. No observation without grounded steps. Every inference chain is navigable.

**6. Provenance is non-negotiable.** Nothing appears without origin. One click to the source, always.

**7. Assumptions are tracked.** Every simulation and strategy names its assumptions. Invalidated assumptions trigger review of all conclusions built on them.

**8. The model is interchangeable.** Lee's value is the brain. The LLM is a reasoning service. Swap the model, Lee keeps growing.

---

## Capability Levels

Lee is designed to grow through defined capability levels. Each level unlocks the next.

| Level | Capability | Unlocked By |
|-------|-----------|-------------|
| 1 | Records | Tasks #1–#2 |
| 2 | Organizes | Tasks #3–#4 |
| 3 | Understands | Tasks #5–#6, #12–#13 |
| 4 | Predicts | Tasks #14, #16, #23 |
| 5 | Explains | Tasks #19–#22, #24 |
| 6 | Collaborates | Tasks #7–#8, #18 |
| 7 | Advises | Tasks #11, #17 |
| 8 | Coordinates | Tasks #10, #15 |
| 9 | Improves itself | Task #17 (behavioral learning, not code mutation) |

---

## Engine Dependency Order

```
Constitution (#19)
        ↓
Event Log / Foundation (#1)
        ↓
Fact Ledger + Interpretation Ledger (#21)
        ↓
Memory Architecture (#12)
        ↓
Intelligence Graph (#13)
        ↓
Understanding Pipeline (#3)
        ↓
Confidence Propagation (#20)
        ↓
Why Chain + Provenance (#22)
        ↓
Assumption Ledger (#23)
        ↓
Identity Engine (#11)
        ↓
Learning Engine (#17)
        ↓
Curiosity + Opportunity (#14)     Decision Impact Graph (#24)
        ↓
Strategy + Simulation + Reflection (#16)
        ↓
Orchestration (#10)               Health Engine + Trust Score (#15)
        ↓
Operating Modes / Workspace (#18)     Digital Twin Timeline (#25)
        ↓
Console (#2)                      Android (#7)
```

---

## Full Task Map (25 Tasks)

| # | Task | Depends On |
|---|------|-----------|
| 1 | Foundation — Data Layer, API Server, Event Sourcing | — |
| 2 | Console — Private Web Interface | #1 |
| 3 | Understanding Pipeline — Imports & Extraction | #1, #2 |
| 4 | Time Engine & Daily Briefs | #3 |
| 5 | Model Router & Cost Engine | #1, #2 |
| 6 | Real Connectors — Gmail, Calendar, Drive, GitHub, Replit | #1, #3, #5 |
| 7 | Android Companion App | #6 |
| 8 | Governance Layer | #2, #5 |
| 9 | Backup & Migration System | #1 |
| 10 | Orchestration Engine | #1, #4 |
| 11 | Identity Engine & Founder Profile | #3, #5 |
| 12 | Tiered Memory Architecture + Compression Roadmap | #1, #3 |
| 13 | Intelligence Graph & Personal Knowledge Map | #3, #12 |
| 14 | Curiosity Engine & Opportunity Engine | #3, #4, #13 |
| 15 | Health Engine, Self Monitoring & Trust Score | #1, #4, #10 |
| 16 | Strategy, Simulation & Reflection Engines | #5, #11, #13 |
| 17 | Learning Engine | #3, #11, #13 |
| 18 | Adaptive Workspace, Operating Modes & Relationship Intelligence | #2, #6, #11, #14 |
| 19 | Constitution Engine | #1 |
| 20 | Confidence Propagation System | #1, #3, #12 |
| 21 | Fact/Interpretation Separation | #1, #3 |
| 22 | Why Chain & Provenance System | #1, #5 |
| 23 | Assumption Ledger | #1, #16 |
| 24 | Decision Impact Graph | #1, #13 |
| 25 | Digital Twin Timeline | #2, #13 |

---

## Task #1 — Lee Foundation — Data Layer, API Server & Event Sourcing

### What & Why
Build the durable core of Project LEE: the database schema, API server, authentication, object storage, and all foundational data structures. This version incorporates Event Sourcing as a first-class architectural principle. Almost nothing mutates directly — state changes are expressed as immutable events, and current state is a projection of those events. This makes restoration near-perfect, debugging dramatically easier, and every object's history inspectable at any depth.

### Done looks like
- Private Lee API server (Express, TypeScript) with health check and versioning
- **Event Sourcing foundation** — Event Log is append-only and immutable; all significant state changes are events first; current state is a projection; re-projection from event_id 0 must produce a consistent database; causation_id and correlation_id on every event for full trace
- **Projection layer** — idempotent projectors maintaining current-state tables by consuming events in order; replay_from(event_id) utility; full re-projection verified before Task #1 is complete
- **Universal Object Model schema** — all Lee object types with full standard field set including confidence_lineage, propagated_confidence, why_chain, memory_tier, last_accessed_at, compression_stage, version
- **Fact Ledger** — fact_ledger table; fact types: observed, extracted, declared, verified; source_evidence required; confidence, propagated_confidence, confidence_lineage, canon_level; database-level type constraints preventing interpretation types from appearing
- **Interpretation Ledger** — interpretation_ledger table; interpretation types: pattern, prediction, observation, opportunity, strategy, simulation_result, inference; at least one linked input fact required; database-level type constraints preventing fact types from appearing
- **Assumption Ledger** — assumption_ledger and assumption_uses tables
- **Constitution schema** — constitution_provisions (tier: ABSOLUTE / GOVERNED / CONFIGURABLE, machine_readable_rule, applies_to_engines, consultation_count) and constitution_versions; seed script with ~20 initial provisions
- **Decision Impact Graph schema** — impact_nodes and impact_edges tables; separate from Intelligence Graph tables
- Source Vault, Connector metadata, Cost ledger, Audit log, Waiting loops, Notifications tables — all defined with full fields
- Private single-user session auth; Zod validation on all routes; Drizzle ORM throughout
- OpenAPI spec updated; codegen verified
- **Re-projection test must pass** — this is the acceptance criterion for Task #1

### Out of scope
- AI model calls (Task #5), file parsing (Task #3), connector auth (Task #6), UI (Task #2), scheduled jobs (Task #4), Constitution Engine logic (Task #19 — schema only here)

### Steps
1. Auth layer — single-user session; env-based credentials; session timeout; secure cookie handling
2. Event Sourcing infrastructure — append-only Event Log schema; event emitter utility; emit-before-mutate rule established throughout
3. Projection layer — projector framework; idempotent event handlers; replay_from(event_id) utility; verified pass
4. Universal Object Model schema — all types, all standard fields including all v3.0 additions
5. Fact Ledger and Interpretation Ledger — both tables with full type vocabulary; database-level constraints on type fields
6. Assumption Ledger schema — assumption_ledger and assumption_uses
7. Constitution schema and seed — provisions and versions tables; ~20 starter provisions seeded
8. Source Vault + object storage — sources table; Replit App Storage integration; raw files preserved untouched
9. Decision Impact Graph schema — impact_nodes and impact_edges; separate from graph_nodes/graph_edges
10. Remaining tables — connector_configs, cost_ledger, audit_log, waiting_loops, notifications; CRUD endpoints for all
11. Core API routes — CRUD for all entity types; every state-changing route emits event before mutation
12. OpenAPI spec — update and run codegen
13. Database push + seed — push schema; seed constitution provisions; seed starter canonical facts in Fact Ledger
14. Re-projection test — verified pass required before completion

---

## Task #2 — Lee Console — Private Web Interface

*Depends on: Task #1*

### What & Why
The Lee Console is Lee's primary control surface. Calm, structured, evidence-backed, alive. Dark mode. The user should open this every morning and feel oriented without rebuilding context manually.

### Done looks like
- React + Vite web app at the root path (`/`) on Replit
- Login wall protecting the entire console; only the owner can access
- **Top status bar** always visible: Lee name, date/time, system health, Operating Mode indicator and override, cost today, pending approvals, notification count, backup status
- **Left navigation**: Today, Ask Lee, Timeline, Knowledge Map, Projects, People, Decisions, Assumptions, Waiting, Evidence (Fact Ledger / Interpretation Ledger), Observations, Imports, Connectors, Costs, Governance, Health, Backups, Settings
- **Right context rail**: current context packet, related sources, confidence distribution, trust advisory, freshness indicator, Why Chain, action buttons, evidence links
- **Today page**: Lee's Brief, top priority, what changed, waiting loops, upcoming meetings, freshness warnings, active risks, open approvals, Operating Mode card, health summary, backup status, high-relevance Observations
- **Ask Lee page**: conversation, mode selector, cost estimate, context packet preview with confidence distribution and trust advisory, Why Chain for every answer, all action buttons
- **Context Packet Preview**: detected intent, active project, relevant people, context tier distribution, confidence distribution, trust advisory, active assumptions, selected model, estimated cost, risk level; Run / Use Cheaper Model / Packet Only / Edit Packet / Cancel
- **Evidence page split** — Fact Ledger tab and Interpretation Ledger tab as distinct views; Fact/Interpretation badge on every surface; Assumption Ledger browsable from Evidence or Governance
- **Provenance indicators** — every card shows source indicator; one click to provenance panel with navigable chain
- All remaining pages (Projects, People, Decisions, Waiting, Imports, Connectors, Costs, Governance, Backups, Settings) as specified in v2.0; updated to reflect v3.0 additions throughout
- Dark mode first; no emojis anywhere; status badges consistent; all data from generated React Query hooks

### Out of scope
- AI model calls wired end-to-end (Task #5), real connector auth (Task #6), scheduler (Task #4), Android (Task #7)

### Steps
1. Create react-vite artifact at path `/`; dark-mode-first theme with Lee color system
2. Authentication wall — gate entire app; session cookie; no public routes except `/login`
3. Shell layout — top status bar with Operating Mode indicator, left navigation, main workspace, right context rail
4. Today page — all sections including Operating Mode card, health summary, Observations
5. Ask Lee page — conversation, mode selector, context packet preview with confidence/trust, Why Chain panel
6. Projects pages — list with card grid; full detail with all tabs including Fact/Interpretation evidence
7. People pages — list; full person detail with all sections
8. Decisions page — full decision ledger with all views and actions
9. Waiting, Evidence (Fact/Interpretation split), Observations, Assumptions, Imports pages
10. Connectors, Costs, Governance, Backups, Settings pages
11. Right context rail — context packet, confidence chain, trust advisory, provenance links
12. Polish — typography, spacing, color system, provenance indicators, Fact/Interpretation badges consistent throughout

---

## Task #3 — Lee Understanding Pipeline — Imports & Extraction

*Depends on: Task #1, Task #2*

### What & Why
Transforms raw uploads into operational understanding. This pipeline writes exclusively to the Fact Ledger — extracted, observed, and declared facts only. It never creates interpretations. Interpretation is the job of the Curiosity, Strategy, and Simulation Engines.

### Done looks like
- Background worker processing uploaded files through the full pipeline
- Parser support: ChatGPT JSON export, PDF, DOCX, Markdown, TXT, email thread paste, screenshot (OCR), transcript, manual note
- **Chunking engine** — semantically coherent chunks with source_id, chunk_index, char_range, token_estimate
- **Entity extraction** — project, person, decision, task, risk detection; fuzzy-name-matched against existing records
- **Fact Ledger writes** — extracted facts written to fact_ledger with fact_type = extracted; source_evidence populated; propagated_confidence computed via Confidence Propagation system; confidence_lineage attached
- **Contradiction detection** — new facts compared against locked/canonical facts; contradictions surface to needs-review queue, never silently resolved
- **Evidence Graph links** — relationship links after extraction: projects ↔ documents, documents ↔ facts, people ↔ emails, meetings ↔ action items
- **Needs-review queue** — low-confidence facts queued for owner review; approve, reject, or edit
- **Canon protection** — pipeline never auto-promotes to Locked or Canonical
- **Duplicate detection** — checksum deduplication; near-duplicate chunk detection
- **Event emission** — every pipeline stage emits events to the Event Log

### Out of scope
- Vector/semantic embeddings, live connector ingestion (Task #6), model routing for extraction (Task #5), writing to Interpretation Ledger (other engines handle that)

### Steps
1. Worker process — job queue; polls pending sources; sequential processing
2. Parsers — all import types; returns structured text + metadata
3. Chunker — paragraph-aware, max-token chunks; stored with metadata
4. Entity detector — matchers for projects, people, decisions, risks, tasks
5. Fact writer — write extracted facts to fact_ledger; populate confidence_lineage via Confidence Propagation; enforce fact_type = extracted
6. Contradiction detector — compare new facts against locked/canonical; surface conflicts to needs-review
7. Evidence Graph writer — relationship records linking source to detected entities and facts
8. Needs-review queue — queue API and UI integration
9. Duplicate guard — checksum deduplication; chunk-level near-duplicate detection
10. Event emission — every pipeline stage emits appropriate Event Log events with full payload

---

## Task #4 — Lee Time Engine & Daily Briefs

*Depends on: Task #3*

### What & Why
Build Lee's temporal awareness and its signature daily artifacts. Every fact has an age, every wait has a duration, every context has a freshness. The Brief Engine generates the documents that make Lee useful every single day. Every brief item carries a Why Chain and provenance link.

### Done looks like
- **Time Engine** — temporal fields on all objects: age, staleness, wait_duration, deadline_distance, follow_up_window, freshness_score (0–100, decays by object type)
- **Freshness decay rules** by type: project status (~7 days), relationship context (~14 days), decisions (no decay until superseded), facts (decay by source type)
- **Waiting Engine** — tracks open loops; computes days_waiting; risk escalation (amber at expected window, red past); notification events at thresholds
- **Freshness Engine** — scheduled scan; re-scores all objects; marks fresh / aging / stale / critical
- **Scheduler** — named cron jobs: morning_brief, evening_reflection, weekly_review, backup_check, cost_check, stale_context_scan, connector_health_scan
- **Brief Engine** — generates: Today's Brief, Evening Reflection, Weekly Review, CerbaSeal Pilot Brief, Project Brief, Person Brief, Decision Brief, Meeting Brief; each brief item carries a Why Chain and provenance link
- **Brief personalization** — Founder Profile voice dimensions applied once available (noted dependency on Task #11)
- **Brief storage** — persisted as objects; history browsable in console
- **Notifications center** — by level: silent_log / digest / in_app / push / sms; push only for high-impact; SMS for critical

### Steps
1. Time Engine utilities — age_of, days_waiting, freshness_score, deadline_distance, follow_up_window, is_stale
2. Freshness decay config — per-type decay rates; tunable via Settings
3. Waiting Engine — real-time days_waiting, risk level, recommended_action per loop
4. Freshness Engine — scheduled scan; stale_context events to Event Log
5. Scheduler — cron job runner; all named jobs; error handling; Event Log emission on failure
6. Brief Engine (core) — Today's Brief and Evening Reflection; each item uses Why Chain builder; provenance links
7. Brief Engine (specialized) — Pilot Brief, Project Brief, Person Brief, Decision Brief, Meeting Brief
8. Brief storage and history — persist briefs; make history browsable
9. Notifications Engine — notification decision logic; notification objects by level; notification API
10. Wire Today page to live data — real brief, real freshness warnings, real waiting escalations

---

## Task #5 — Lee Model Router & Cost Engine

*Depends on: Task #1, Task #2*

### What & Why
Wire Lee's AI brain end-to-end. Real model providers, cost-aware routing, the Context Packet system, and the full Ask Lee conversation interface. Lee can reason with real intelligence while never spending money silently. Every answer includes a Why Chain and provenance.

### Done looks like
- **Model Router** — cheapest sufficient path: (1) No model, (2) Cached, (3) CIL reuse, (4) Cheap (GPT-4o-mini / Haiku), (5) Mid-tier (GPT-4o / Sonnet), (6) Strong frontier (o1 / Opus), (7) Human review; routing decision always logged; reads current Operating Mode's model_routing_override
- **Provider adapters** — OpenAI, Anthropic, Gemini; consistent interface; interchangeable via Settings
- **Context Packet system** — assembles: detected intent, active project, relevant people, context by memory tier, confidence distribution, trust advisory for primary engine, active assumptions, constitution provisions, Founder Profile dimensions; packets stored and reusable
- **Context Packet Preview** — full preview with confidence distribution, trust advisory, active assumptions, active constitution provisions before any run
- **Why Chain generation** — every Ask Lee answer includes a Why Chain section based on Lee's actual knowledge; not post-hoc model explanation
- **Provenance in answers** — every answer cites which facts and interpretations were consulted
- **Cost estimation** — pre-call estimate shown before every model call
- **Strong-model gate** — cost exceeding threshold creates governance hold
- **Ask Lee fully wired** — sends messages, builds packets, routes, streams responses, stores history, detects projects/people, extracts candidate facts (queued to Fact Ledger via needs-review), shows Why Chain and evidence links
- **Conversation modes** — Normal, Deep Think, Build, Write, Review, Pilot, Low Cost, Private, No Model, Governed Action
- **Budget enforcement** — hard daily/weekly/monthly limits; auto-switch to Low Cost; logged

### Steps
1. Provider adapters — OpenAI, Anthropic, Gemini; API keys from environment secrets
2. Model routing logic — evaluates request type, Operating Mode override, cost sensitivity, budget state; logs every decision
3. Context Packet builder — assembles by memory tier; includes confidence distribution, trust advisory, active assumptions, constitution provisions, Founder Profile dimensions
4. CIL-style packet cache — cache by intent fingerprint; invalidate on source changes
5. Cost estimation and display — pre-call estimate; display in Context Packet Preview
6. Strong-model gate — configurable threshold; governance hold above threshold
7. Budget enforcement — hard limits; auto-switch to Low Cost; notify user
8. Ask Lee conversation endpoint — streaming; build packet; route; stream response; store turn; extract candidate facts; build and attach Why Chain; link evidence
9. Wire Ask Lee UI — connect full Ask Lee page to live conversation API
10. Cost Engine aggregations — aggregation queries; Costs page; cache and avoided-call savings tracking

---

## Task #6 — Lee Real Connectors

*Depends on: Task #1, Task #3, Task #5*

### What & Why
Connect Lee to the live services where your real work happens. Every connector is read-only first, produces events (never directly mutates the Lee Brain), and respects the Constitution and governance boundary — Lee observes, reasons, and recommends; humans approve consequential actions.

### Done looks like
- **Connector framework** — connector produces events → Understanding Pipeline processes events → Fact Ledger updated; no connector directly writes to any Lee object; ConstitutionEngine consulted before any write-adjacent action
- **Gmail connector** — OAuth2, read-only, poll tracked labels, update waiting loops on reply, import threads, draft creation (send always requires governance HOLD)
- **Google Calendar connector** — OAuth2, sync 14 days of events, detect meetings with tracked people, feed Today page, trigger Meeting Brief
- **Google Drive connector** — OAuth2, watch specified folders, import changed documents, detect staleness vs. GitHub commits
- **GitHub connector** — personal access token, import repos, track commit activity, detect README drift
- **Replit connector** — API token, track repls linked to Lee projects, monitor deployment status
- **Android capture API** — POST /android/capture, POST /android/ask, GET /android/brief, GET /android/waiting, GET /android/alerts, POST /android/approve; device pairing token auth
- **Connector health monitoring** — last_sync, error_state, consecutive_failure_count; visible in Connectors page with reconnect option
- **Connector audit log** — every sync, event produced, and error logged

### Steps
1. Connector Engine framework — ConnectorEngine with registration, scheduling, health tracking, constitution consultation, audit logging
2. OAuth2 infrastructure — Google OAuth2 flow; token storage encrypted; token refresh
3. Gmail connector — poll tracked senders; emit events; draft creation; governance gate on send; constitution check
4. Google Calendar connector — sync events; emit meeting_detected; trigger Meeting Brief generation
5. Google Drive connector — watch folders; emit document_changed; detect staleness
6. GitHub connector — import repos; track commits; detect drift
7. Replit connector — link repls to Lee projects; poll deployment status
8. Android capture API — all endpoints; device pairing auth; captures queued to Understanding Pipeline immediately
9. Connector health monitoring + UI — health tracking; Connectors page real health state; reconnect/reauthorize flows
10. End-to-end event flow test — Gmail reply from tracked person → event → Understanding Pipeline → Fact Ledger → waiting loop updated → Today page reflects change → notification created

---

## Task #7 — Lee Android Companion App

*Depends on: Task #6*

### What & Why
Lee in your pocket. Not a miniature desktop app — briefs, captures, waiting loops, alerts, quick questions, and approvals. Simple, fast, Operating Mode-aware.

### Done looks like
- Expo React Native app targeting Android
- Device pairing — URL + pairing token; all calls use this token
- **Brief tab** — Operating Mode-aware content; today's summary; pull-to-refresh; offline cache
- **Capture tab** — voice note, text note, photo/screenshot; local queue with sync-on-connect; processing status
- **Waiting tab** — color-coded risk list; Snooze / Resolve / Prepare Follow-up actions
- **Alerts tab** — push-level notifications with action buttons; critical alerts in red
- **Ask tab** — quick question UI; low-cost default; streaming response; Why Chain accessible; escalation option with cost estimate
- **Approvals tab** — governance items; Approve / Hold / Reject with confirmation; tap-and-hold for HIGH/CRITICAL
- **Push notifications (FCM)** — brief_ready, alert, waiting_escalation, approval_required, cost_warning
- **Offline resilience** — brief tab caches last brief; capture tab queues locally; cached data shows stale indicator
- Dark mode matching console palette; no emojis; bottom tab bar

### Steps
1. Create Expo artifact; dark-mode theme with Lee color system
2. Device pairing screen — URL + token input; verification call to API; stored in AsyncStorage
3. API client — typed client; auth token; retry; offline detection
4. Brief tab — mode-aware content ordering; pull-to-refresh; offline cache
5. Capture tab — voice recording, text note, photo/screenshot; local queue with sync-on-connect
6. Waiting tab — color-coded risk list; action buttons
7. Alerts tab — action buttons; critical accent styling
8. Ask tab — streaming response; Why Chain section in answer; escalation with cost estimate
9. Approvals tab — tap-and-hold for HIGH/CRITICAL; updates propagate to console
10. Push notifications (FCM) — register device token on pairing; handle receipt and tap navigation

---

## Task #8 — Lee Governance Layer

*Depends on: Task #2, Task #5*

### What & Why
Build the governance system that enforces Lee's operating rules. Lee prepares, drafts, summarizes, and recommends — but she never sends, publishes, shares, deletes, or permanently marks canon without passing through ALLOW / HOLD / REJECT. The Constitution Engine provides the layer above this (ABSOLUTE provisions block before governance); governance handles GOVERNED provisions and all high-risk actions.

### Done looks like
- **Governance Engine** — intercepts all consequential actions; evaluates ALLOW / HOLD / REJECT; Constitution consulted first (ABSOLUTE violations blocked before governance queue)
- **ALLOW / HOLD / REJECT logic** with evidence display (required for HIGH/CRITICAL before action buttons appear); verdict actions: Approve, Hold, Reject, Edit, Ask Why
- **Governance queue** — action, risk level, reason, evidence, Why Chain (for Ask Why flow), recommended verdict, time waiting
- **Risk classification** — LOW / MEDIUM / HIGH / CRITICAL; fail-closed for unknown types
- **Standing rules** — always allow X / always reject X / always hold X; versioned and logged
- **Audit trail** — every governance decision logged: action_id, verdict, actor, timestamp, reason, evidence_shown, was_edited
- **Session expiry** — HIGH items expire after 48h; MEDIUM after 7 days; auto-rejected and logged; user notified before expiry
- **Governance integrated across all engines** — model router, Gmail send, Drive share, GitHub create, source delete, belief promotion, project status change

### Steps
1. Governance Engine core — GovernanceEngine: register_action(), evaluate() → ALLOW/HOLD/REJECT; constitution.check() called first
2. Risk classifier — action type + payload → risk level; fail-closed for unknown
3. Governance queue DB — governance_items table; CRUD API
4. Standing rules system — governance_rules table; rules management UI in Settings/Governance
5. Governance page — queue with filters; evidence display; verdict buttons; bulk actions; standing rules manager
6. Audit log UI — searchable by action type, verdict, actor, date; full detail per decision
7. Governance gate integration — wire into: model router, Gmail send, Drive share, GitHub create, source delete, belief promote-to-canonical, project status change
8. Session expiry and notifications — expiry logic; in-app notifications before expiry; auto-reject and log
9. Ask Why flow — builds context packet explaining Lee's reasoning; Why Chain included; model call; response inline without executing action
10. Android Approvals tab integration — verify tap-and-hold for HIGH/CRITICAL; verify approved actions execute correctly

---

## Task #9 — Lee Backup & Migration System

*Depends on: Task #1*

### What & Why
A backup that cannot restore is not a backup. Event Sourcing makes restoration near-perfect — the Event Log alone can rebuild the full database state. Build the durable backup and migration system that makes Lee permanently portable.

### Done looks like
- **Backup Engine** — complete, verifiable snapshots: Event Log (primary recovery primitive), full database dump (secondary fast path), all object storage files, Fact Ledger, Interpretation Ledger, Assumption Ledger, Decision Impact Graph, Constitution with all versions, Trust Score history, memory tier classifications, all other ledgers
- **Event Log primary** — always included first; re-projection verification always runs as part of backup verification
- **Backup manifest** — manifest.json: backup_id, timestamp, lee_version, db_schema_version, event_log_event_count, object_count by type, checksums for every file, backup_format_version
- **AES-256 encrypted ZIP** with plaintext manifest; unencrypted ZIP for migration
- **Manual backup + Scheduled backup (daily 02:00) + Backup verification + Restore test** — as specified; restore test provisions a temporary DB and runs re-projection; pass required
- **Re-projection verification** — part of every backup verification; if re-projection doesn't produce consistent state, backup flagged as degraded
- **Export, Import, Migration readiness indicator** — as previously specified; import flow validates constitution presence

### Steps
1. Backup Engine core — assemble_backup(): Event Log first, then all tables, then object storage; checksums
2. Manifest builder — manifest.json with event_log_event_count and all version fields
3. Encryption layer — AES-256; passphrase-based; decryption for restore and verification
4. Backup storage + retention — Replit App Storage; 7 daily, 4 weekly, 12 monthly; auto-pruning
5. Manual backup + download — Backup Now endpoint with progress streaming; 1-hour expiring download link; Backups page UI
6. Scheduled backup — register backup_check in scheduler; emit events on success/failure
7. Backup verification — validate checksums AND run re-projection test; report both results; flag as degraded if either fails
8. Restore test — temporary DB; restore data; re-projection pass required; report pass/fail; does not affect live Lee Brain
9. Import Lee Brain — validate manifest; schema migration if needed; import preview; constitution presence validated; confirmation required; governance approval
10. Migration readiness + UI — compute score; Backups page display; Today page status indicator

---

## Task #10 — Lee Orchestration Engine

*Depends on: Task #1, Task #4*

### What & Why
The conductor. Coordinates all background engines, prioritizes work, resolves contention, enforces cost-aware scheduling, and ensures coherence across the entire system. No engine calls another directly — all work is submitted through the Orchestration Engine. The Constitution is consulted before dispatching actions that touch external systems.

### Done looks like
- **Engine registry** — every engine self-registers with name, capabilities, priority class, run frequency, resource consumption, dependencies; DB-persisted for restart recovery
- **Priority work queue** — CRITICAL / HIGH / NORMAL / LOW; DB-persisted; survives restarts
- **Competing priority resolution** — CRITICAL always wins; within class, recency and urgency determine order; starved LOW tasks get a boost after configurable time
- **Cost-aware scheduling gate** — before dispatching model-calling jobs, checks current cost state; if daily budget >80%, delays non-CRITICAL model calls and logs
- **Constitution consultation** — before dispatching actions touching external systems, consults constitution.check()
- **Connector sync staggering** — spaces out syncs; adds jitter; respects schedules
- **Engine health tracking** — last_success, error_count, backoff_state, avg_duration per engine; feeds Health Engine; exponential backoff
- **Shutdown/resume** — SIGTERM flushes queue state to DB; startup reloads and resumes
- **Orchestration log** — every scheduling decision emitted to Event Log
- **Health page visibility** — queue depth by priority class, engine health scores, current delays, conflicts

### Steps
1. Engine registry — self-registration; DB-persisted for restart recovery
2. Priority queue — CRITICAL / HIGH / NORMAL / LOW; DB-persisted; survives restarts
3. Orchestration scheduler — core scheduling loop; competing priority resolution; dispatch
4. Cost-aware scheduling gate — check budget state before model-calling jobs; delay and log
5. Constitution consultation — check before dispatching external-touching actions
6. Connector sync staggering — spaces syncs; adds jitter
7. Engine health tracking — last_success, error_count, backoff_state, avg_duration; exponential backoff
8. Shutdown and resume — SIGTERM flush; startup reload and resume
9. Orchestration log — emit orchestration events to Event Log for every significant decision
10. Wire all existing engines — update all engines to register with and submit work through the Orchestration Engine

---

## Task #11 — Lee Identity Engine & Founder Profile

*Depends on: Task #3, Task #5*

### What & Why
Lee understands projects, people, and decisions. This task makes Lee understand you — operationally. Thinking style, decision style, writing voice, risk tolerance, energy patterns, recurring friction. Learned from corrections and evidence, never assumed.

### Done looks like
- **Identity Engine** — builds and maintains the Founder Profile; learns from corrections (highest-weight signal), behavioral patterns, and explicit declarations; never infers; never hard-codes
- **Profile dimensions** — thinking style, decision style, writing voice, technical depth by domain, documentation preferences, risk tolerance by domain, current goals, current priorities, energy patterns, preferred models, current learning goals, recurring friction
- **Correction integration** — every correction to Lee's output updates the relevant dimension immediately and sends a trust signal to the Trust Score Engine for the generating subsystem
- **Profile confidence tracking** — each dimension has confidence (low/medium/high/confirmed) and source log; low-confidence dimensions excluded from context packets
- **Profile applied in context packets** — high-confidence dimensions included; packet preview shows which dimensions applied
- **Founder Profile Settings UI** — all dimensions with current value, confidence, source summary, last-updated date; Edit button for explicit correction
- **Profile history** — every version kept; browsable in Settings; shows how Lee's understanding has evolved
- **Profile in backups** — full profile with all versions in every Lee Brain export

### Steps
1. Founder Profile schema — founder_profile table; all dimensions with confidence, source_log, correction_count, last_updated per dimension
2. Identity Engine core — IdentityEngine: update_dimension(), apply_corrections(), get_profile_for_context(); register with Orchestration Engine at LOW priority
3. Correction listener — wire into all surfaces; send trust signal to Trust Score Engine on every correction
4. Behavioral pattern scanner — conversation mode frequency, brief section engagement, recommendation follow-through; LOW priority via Orchestration Engine
5. Founder Profile Settings UI — all dimensions with current value, confidence, source summary, Edit button
6. Context packet integration — pull high-confidence dimensions; packet preview shows applied dimensions
7. Brief personalization — Brief Engine applies voice, density, prioritization from Founder Profile
8. Profile history — snapshot on every dimension change; history browsable in Settings
9. Profile export — full profile with all versions in Lee Brain backup

---

## Task #12 — Lee Tiered Memory Architecture + Compression Roadmap

*Depends on: Task #1, Task #3*

### What & Why
Information lives at the right tier, decays or consolidates appropriately, and surfaces at the right time. Stages 1 and 2 are implemented now. The full 6-stage Memory Compression Roadmap is documented and architecturally preserved — every decision made here must leave a clear path to Stages 3–6 without requiring a rewrite.

### Done looks like
- **Memory tiers** — Recent (7 days, full fidelity), Working (status-driven, age-independent), Reference (consulted regularly), Historical (resolved items, Stage 2 summaries), Archived (compressed essential fields), Dormant (excluded from automatic surfaces), Evergreen (never decays — Lee's Constitution, operating principles), Foundational (core identity facts), Canonical (user-confirmed ground truth)
- **Stage 2 consolidation** — Historical tier objects get model-generated summaries using cheap model; key entities preserved explicitly as named fields; raw sources retained in Source Vault; compression_stage = 2; summary format explicitly compatible with Stage 3 hierarchical summary input
- **Memory Compression Roadmap — 6 stages**:
  - Stage 1: Full storage (current — every object at full fidelity)
  - Stage 2: Summaries (implemented — model-generated summaries for Historical tier)
  - Stage 3: Hierarchical summaries (future — summaries of summaries; project-level and person-level)
  - Stage 4: Concept maps (future — structured key-concept extraction; concept nodes and links)
  - Stage 5: Knowledge Graph compression (future — Intelligence Graph becomes primary storage for Historical content)
  - Stage 6: Long-term semantic memory (future — vector embedding over concept map; semantic similarity retrieval)
- **Architecture preservation** — all objects carry compression_stage field initialized to 1; consolidation engine is a pluggable pipeline; Stage 2 summaries preserve entity_list, key_decisions, key_facts, original_object_ids, compression_stage, source_confidence to enable future stage transitions
- Tier badges, manual promote/demote controls, memory health metrics in Health page, backup integration

### Steps
1. Memory tier schema — memory_tier, last_accessed_at, access_count, relevance_score, consolidated_at, compression_stage on all Lee objects; indexes
2. Tier assignment rules — rule set with all thresholds, promotion/demotion conditions, protected tier rules
3. Memory Architecture Engine — MemoryArchitectureEngine: scan_and_reclassify(); register with Orchestration Engine; emit memory_tier_changed events
4. Historical consolidation (Stage 2) — summarize via cheap model; preserve key entities explicitly; compression_stage = 2; Stage 2 format validated against Stage 3 compatibility requirements; LOW priority via Orchestration Engine
5. Stage compatibility enforcement — Stage 2 output format validated: entity_list, key_decisions, key_facts, original_object_ids, compression_stage, source_confidence all required
6. Context Engine integration — apply tier-based retrieval weights; use Stage 2 summaries for Historical/Archived in context packets
7. Today page Working Memory — update Today page to use current Working Memory as primary operational surface
8. Object detail tier badge and controls — tier badge on every detail page; promote/demote controls; manual overrides flagged and logged
9. Memory health metrics — tier distribution, consolidation backlog, Stage 2 compression coverage, dormant object count → Health Engine; Health page display
10. Backup integration — tier classifications, consolidation states, compression_stage, access history in Lee Brain exports

---

## Task #13 — Lee Intelligence Graph & Personal Knowledge Map

*Depends on: Task #3, Task #12*

### What & Why
Every meaningful object in Lee becomes a node. Every meaningful relationship becomes a typed, weighted, directed edge. The Personal Knowledge Map makes that graph visible — navigable, zoomable, alive. Context Engine uses graph traversal instead of flat joins; traversal depth is configurable per Operating Mode.

### Done looks like
- **Intelligence Graph** — adjacency list + edge metadata in DB; all Universal Object Model types as nodes; typed, weighted, directed edges; edge weight and freshness tracked
- **Edge types** — involves, produced, references, contradicts, supports, depends_on, tracks, spawned_from, informs, supersedes; extensible
- **Context Engine uses graph traversal** — depth-limited traversal replaces flat JOIN-based context building; traversal depth reads current Operating Mode's graph_traversal_depth config
- **Personal Knowledge Map UI** — force-directed layout; nodes sized by importance and colored by type; edges colored by type, weighted by strength; click-to-detail, double-click-to-focus, pan/zoom; filters (node type, edge type, project, person, date range); timeline slider; search
- **Lamont Labs strategic view** — curated top-level view; default landing view of the Knowledge Map
- **Orphan detection** — regular scan; Health page metric; list with suggested connections
- **Separate from Decision Impact Graph** — different tables, different visualization, different purpose
- **Graph in backups** — included in Lee Brain exports; graph rebuild from Event Log as recovery path

### Steps
1. Graph schema — graph_nodes and graph_edges tables; all fields; indexes on source/target node ids and edge_type
2. Graph builder — GraphBuilder: add_node(), add_edge(), update_edge_weight(), mark_historical(); wired into Understanding Pipeline for automatic updates
3. Graph query API — REST endpoints: get_neighbors, find_path, get_cluster, get_most_connected, find_orphans, find_related
4. Context Engine graph traversal — update Context Engine to traverse graph from detected intent nodes; traversal depth reads Operating Mode config; weight results by edge weight and node freshness
5. Personal Knowledge Map page — integrate graph visualization library; render nodes and edges with type-based coloring and sizing; click-to-detail, double-click-to-focus, pan/zoom
6. Filters and search — node type toggles, edge type toggles, project filter, person filter, date range; node search that highlights and centers
7. Timeline slider — graph state snapshots stored periodically; slider to replay graph at any past date; powered by Event Log
8. Lamont Labs strategic view — curated top-level view; default landing
9. Orphan detection — orphan scanner as Health Engine metric; surface in Health page with suggested connections
10. Graph backup integration — nodes and edges in Lee Brain exports; implement graph rebuild from Event Log as recovery path

---

## Task #14 — Lee Curiosity Engine & Opportunity Engine

*Depends on: Task #3, Task #4, Task #13*

### What & Why
Notices things without being asked. The Curiosity Engine surfaces patterns, drift, contradictions, and signals from internal knowledge. The Opportunity Engine surfaces possibilities. All outputs are written to the Interpretation Ledger with at least two evidence links and a Why Chain attached.

### Done looks like
- **Observations written to Interpretation Ledger** — interpretation_type = observation; at least 2 linked input facts required; Why Chain attached; confidence propagated from input facts via Confidence Propagation System
- **Observation types** — cross-document pattern, architecture drift, recurring idea, avoidance signal, risk aging, contradictory assumption, stale anchor, momentum signal, strengthening relationship
- **Observation lifecycle** — Acknowledged, Acted On, Dismissed, Promoted (to task/risk/decision with one click)
- **No observation without at least two evidence links** — enforced at Curiosity Engine level before any observation is created; speculative observations labeled with reduced surfacing weight
- **Opportunities written to Interpretation Ledger** — interpretation_type = opportunity; potential_value (low/medium/high); action_suggestion
- **Calibration settings** — observations per day limit, minimum confidence threshold, observation type toggles
- **Today page and context rail integration** — high-relevance Observations on Today page; contextually relevant items in right context rail; dedicated Observations section in left nav
- **All observations and opportunities browsable** — history stored; input to Reflection Engine

### Steps
1. Observation and Opportunity schema — observations and opportunities as Interpretation Ledger records; additional metadata fields; indexes
2. Curiosity Engine core — CuriosityEngine: scan(); register with Orchestration Engine at NORMAL priority; enforces ≥2 evidence link requirement before creating any observation; uses Why Chain builder during scan
3. Cross-document pattern detector — find objects/chunks sharing unresolved topics across ≥3 sources; generate observation when threshold met
4. Drift detector — compare architecture descriptions in documents against repository structure; compare messaging in briefs against locked decisions; surface divergences
5. Recurring idea detector — concept co-occurrence across chunks; N+ appearances without formalization → observation
6. Avoidance and momentum signals — high-priority objects not accessed recently (avoidance); significant improvement in object quality/activity (momentum)
7. Opportunity Engine core — OpportunityEngine: scan(); register with Orchestration Engine at LOW priority; runs after Curiosity Engine scan completes
8. Opportunity detectors — reusable work, synthesizable context, solved problems, architecture opportunities, cross-project synergy
9. Today page and context rail integration — surface high-relevance Observations on Today page; contextually relevant in right context rail; dedicated section in left nav
10. Observation lifecycle UI — Acknowledge / Act On / Dismiss / Promote controls; Promote opens flow to convert to task, decision, or project; all lifecycle transitions logged
11. Calibration settings — add to Settings: observations per day limit, minimum confidence threshold, observation type toggles

---

## Task #15 — Lee Health Engine, Self Monitoring & Trust Score

*Depends on: Task #1, Task #4, Task #10*

### What & Why
Lee should know when she is sick before you do. The Health Engine monitors every subsystem. The Trust Score system adds a per-subsystem measure of earned reliability — separate from confidence — that tells you where Lee is strongest and where she still has to prove herself. Confidence says "I think this is true." Trust says "I have earned your confidence in this domain."

### Done looks like
- **Health page** — composite score (0–100); subsystem cards for: Database, Memory, Import Pipeline, API, Connectors, Cost, Backups, Model Providers, Queue, Brief Engine, Freshness, Intelligence Graph, Constitution Engine (consultation rate, violation count), Confidence Propagation (system-wide average propagated confidence), Fact/Interpretation Ledger health (orphaned interpretations without input facts, facts without source evidence)
- **Health Score** — composite weighted score; Database and Backup failures highest impact; Connector warnings lowest impact; average Trust Score across subsystems contributes 15%
- **Trust Score system** — per-subsystem score (0–100); separate from confidence; starting at 50 (neutral, unearned)
- **Trust Score by subsystem** — Understanding Engine (extraction accuracy, correction rate), Simulation Engine (prediction validation rate), Strategy Engine (recommendation follow-through), Curiosity Engine (observation acknowledgment vs. dismissal rate), Reflection Engine (report engagement), Brief Engine (section read rate, edit rate), Model Router (routing quality, override rate), Fact Ledger (fact validation rate), Interpretation Ledger (interpretation promotion vs. dismissal rate)
- **Trust signal weights** — corrections and invalidations: negative ×2; acted-on recommendations: positive ×1.5; dismissals: neutral negative ×0.5
- **Trust decay** — maximum −2 per month without activity; trust is earned, not banked indefinitely
- **Trust timeline** — per-subsystem trust history chart; trust events with reason and evidence links
- **Trust Score in context packets** — low-trust advisory shown in packet preview for the primary generating subsystem
- **Trust Score dashboard on Health page** — all subsystems with score, trend (improving/stable/declining), color coding; click subsystem for trust history detail view
- **Self-healing actions** — retry stuck import, reconnect stalled connector, reschedule missed brief, re-run failed backup verification; all logged
- **World Awareness** — model provider pricing changes, API deprecation notices, npm audit, connector API rate limit changes, GitHub dependency updates for Lee's codebase
- **Health history** — hourly snapshots; 30-day trend chart
- **Health API** — GET /health (public), GET /health/detail (private); status bar polls every 60 seconds

### Steps
1. Health Engine schema — health_snapshots, health_alerts, trust_scores, trust_events tables
2. Health Engine core — evaluate_all() every 5 minutes via Orchestration Engine; compute composite score; emit health alerts; store snapshots
3. Subsystem evaluators — individual evaluator functions for all subsystems including Constitution Engine and Fact/Interpretation Ledger health
4. Health Score calculator — weighted composite with all subsystem weights defined; trust score contribution at 15%
5. Trust Score Engine core — TrustScoreEngine: update_score(subsystem, event_type, evidence), get_score(subsystem), apply_decay()
6. Trust signal collection — wire into: Learning Engine (correction captured → negative signal to source subsystem), Assumption Engine (validated → positive, invalidated → negative), Brief Engine (section read → positive), Curiosity Engine (acted on → positive, dismissed → negative), Simulation Engine (prediction validated → positive)
7. Trust score calculation — weighted signal aggregation; weekly decay job via Orchestration Engine
8. Health alerts — CRITICAL to status bar and Android push; all alerts logged with severity
9. Self-healing actions — recoverable failures; all self-healing logged and visible in Health page
10. World Awareness monitors — pricing changes, npm audit, connector API health, rate limit patterns
11. Health page — full page including Trust Score dashboard; subsystem detail views; 30-day trend chart; health API endpoints; Today page health summary card

---

## Task #16 — Lee Strategy, Simulation & Reflection Engines

*Depends on: Task #5, Task #11, Task #13*

### What & Why
Three engines at the highest level of Lee's intelligence stack. Strategy makes Lee aware of long-term objectives and evaluates every recommendation against them. Simulation lets you think through consequences before acting — using named assumptions that are registered with the Assumption Ledger. Reflection measures how your thinking and operating environment have evolved over time.

### Done looks like
- **Strategy Engine** — active objectives (goal, horizon, status, progress evidence, blockers, related projects, key decisions, last reviewed); strategy items written to Interpretation Ledger as interpretation_type = strategy; strategy evaluated in every context packet; weekly review prompt from Scheduler
- **Simulation Engine** — structured simulations: question, assumptions named and registered with Assumption Ledger, Why Chain built during reasoning, reasoning chain visible, likely outcomes by probability tier (likely/possible/unlikely), risks, opportunities, recommended decision, evidence links; simulation results written to Interpretation Ledger as interpretation_type = simulation_result
- **Simulation transparency** — full assumption list shown before outcomes; user can correct any assumption and re-run; re-runs linked to original; confidence propagated from input facts and observations
- **Reflection Engine** — Weekly Review Reflection section; Monthly Reflection generated on first of each month; Annual Reflection on January 1; reflection items carry Why Chain on key insights
- **Reflection dimensions** — decision history, assumption accuracy, documentation quality trends, question evolution, cost trends, project momentum, waiting loop patterns, Lee accuracy (observations/recommendations acted on vs. dismissed); Trust Score history per subsystem
- **Reflection page** — period selector; dimension trend charts; report viewer; "most surprising changes" highlights

### Steps
1. Strategy schema — strategic_objectives, strategy_reviews tables
2. Strategy Engine — get_active_strategy(), evaluate_against_strategy(), generate_strategy_review_prompt(); register with Orchestration Engine; writes to Interpretation Ledger
3. Strategy applied to context — include active high-priority objectives in context packets; add strategy-conflict detection
4. Strategy page — objectives by horizon; status, blockers, related projects, recommended next actions; inline editing via Ask Lee
5. Simulation Engine — run_simulation(question, type, context_override); assembles structured prompt; registers all assumptions with Assumption Ledger before dispatching; calls model router; parses structured output; builds Why Chain; writes to Interpretation Ledger
6. Simulation UI — assumptions panel (Correct & Re-run per assumption); reasoning chain view; outcome tiers; evidence links; model and cost displayed; re-runs linked to original
7. Simulation history — linked to related projects and decisions; browsable from Ask Lee history
8. Reflection Engine schema — reflection_reports, reflection_metrics tables
9. Reflection Engine — generate_reflection(period, dimensions); collects metrics; assembles report; Why Chain on key insights; cheap model for aggregation, mid-tier for narrative
10. Reflection page and brief integration — period selector; dimension trend charts; report viewer; Monthly and Annual generation via Scheduler; Reflection section in Weekly Review Brief; Trust Score trend included

---

## Task #17 — Lee Learning Engine

*Depends on: Task #3, Task #11, Task #13*

### What & Why
Every correction makes Lee smarter. Every successful workflow becomes reusable. Every recurring pattern becomes a named shortcut. Every correction also sends a trust signal to the Trust Score Engine — the generating subsystem's trust score falls, which improves routing and calibration over time. The Learning Engine closes the feedback loop.

### Done looks like
- **Correction integration** — every correction captured in full (what Lee produced, what the user changed, context, generating engine); immediately applied to Founder Profile; trust signal sent to Trust Score Engine (negative signal to generating subsystem)
- **Workflow capture** — successful multi-step workflows recorded as named patterns; reusable templates
- **Recurring prompt detection** — structurally similar prompts tracked; 3+ recurrences → suggest named shortcut; saved shortcuts cached for CIL-style reuse
- **Routing improvement** — outcome tracking for model calls (edited/not edited, acted on/dismissed, followed by correction); aggregated signals as preference weights to Model Router; policy changes require explicit user review
- **Mistake pattern detection** — 3+ corrections in same category → Pattern Insight with proposed standing correction rule for user review
- **Standing correction rules** — user-confirmed; applied before model calls; versioned; auditable; no rule applied without user confirmation
- **Learning assets** — workflow templates, recurring prompt shortcuts (with cached responses), standing correction rules, routing preference signals, documentation format preferences, project structure templates
- **Learning dashboard** — corrections by category, active standing rules, workflow templates, routing signals, most-applied learnings, learning age

### Steps
1. Corrections schema — corrections, standing_correction_rules, learning_assets tables
2. Correction capture hooks — wire into all surfaces; each correction emits correction_captured event to Learning Engine AND trust signal to Trust Score Engine for generating subsystem
3. Learning Engine core — LearningEngine: ingest_correction(), detect_patterns(window), promote_to_standing_rule(pattern), apply_learning_assets(); register with Orchestration Engine at LOW priority
4. Pattern detector — groups corrections by category and context similarity; threshold triggers Pattern Insight with proposed rule
5. Standing rule confirmation UI — Pattern Insights with evidence; Confirm / Dismiss / Edit; confirmed rules immediately active; browsable and editable
6. Workflow capture — track multi-step sequences; record successful patterns; prompt user to name and save
7. Recurring prompt detector — track message hash/similarity in Ask Lee; 3+ recurrences → suggest shortcut; saved shortcuts as quick-access options
8. Routing preference signals — outcome tracking; aggregated signals as preference weights to Model Router; policy changes require user review
9. Learning assets applied — Context Engine applies standing correction rules; Brief Engine applies documentation format preferences; project creation suggests matching templates; Model Router applies routing preference signals
10. Learning dashboard — corrections by category, active rules, workflow templates, routing signals, most-applied learnings

---

## Task #18 — Lee Adaptive Workspace, Operating Modes & Relationship Intelligence

*Depends on: Task #2, Task #6, Task #11, Task #14*

### What & Why
Operating Modes upgrade from a UI-only concept to a system-wide behavioral architecture. Each mode changes which models are used, how strict governance is, how deep graph traversal goes, how aggressively connectors sync, and how notifications filter. The entire system adapts, not just the screen.

### Done looks like
- **Operating Modes — 10 modes** — Morning, Deep Work, Pilot, Deployment, Writing, Travel, Budget, Research, Evening, Review
- **Each mode defines all behavioral parameters**:
  - model_routing_override (cheap-first / mid-tier-allowed / strong-allowed)
  - governance_strictness_override (normal / strict / relaxed)
  - graph_traversal_depth (2 shallow → 5 maximum)
  - connector_sync_override (normal / reduced / minimal)
  - notification_threshold (normal / raised / lowered / critical-only)
  - context_packet_tier_weights (which memory tiers get how much weight)
  - ask_lee_default_mode (conversation mode default)
  - nav_order (which sections surface at top of left nav)
  - status_bar_slots (what mode-relevant stats appear in status bar)
- **Mode behavioral parameters enforced** — Model Router reads model_routing_override; Notification Engine reads notification_threshold; Context Engine reads graph_traversal_depth and tier_weights; Connector Engine reads connector_sync_override; Governance Engine reads governance_strictness_override; every engine queries current mode at job dispatch time via Orchestration Engine
- **Mode examples**:
  - Deep Work: frontier models allowed, notifications suppressed to CRITICAL, graph traversal depth 4, connector sync reduced
  - Budget: cheapest models only, strong-model threshold $0.01, no frontier models, aggressive CIL reuse
  - Pilot: governance strict (all external communications HOLD), relationship intelligence weighted higher, notification threshold lowered
  - Travel: cache-first responses, cheap-only models, connector sync minimal, notifications critical-only
  - Research: graph traversal depth 5, citations emphasized, context packets include broader Reference tier
- **Workspace Context Engine** — evaluate_context() scores all mode signals; activates highest-scoring mode with reason; runs every 15 minutes; register at LOW priority with Orchestration Engine
- **Adaptive layout** — left nav reorders per mode; status bar shows mode-relevant quick stats; mode indicator and manual override always visible in status bar
- **Mode history** — every activation logged with reason; browsable in Settings
- **Relationship Intelligence** — per-relationship record: interaction timeline, interaction frequency trend, outstanding promises (both directions), shared projects, trust history, open questions, recent momentum (active/warming/cooling/dormant), follow-up windows, tone sensitivity notes (user-declared only)
- **Relationship health score** (0–100) — open waiting loops, overdue promises, days since last contact vs. expected frequency, unanswered open questions
- **Promise tracking UI** — Person detail Promises tab: outgoing and incoming with status, due date, source evidence; overdue promises highlighted amber/red
- **Relationship briefs and alerts** — Person Brief includes full relationship intelligence; Meeting Brief includes outstanding promises, open questions, momentum; high-stakes relationships configurable for higher notification sensitivity

### Steps
1. Operating Mode schema — mode_configs table with all behavioral parameters per mode; mode_history table; current_mode in session state
2. Workspace Context Engine — evaluate_context() scores all mode signals; highest-scoring mode with reason
3. Mode behavioral parameters wired — update each affected engine to query current mode parameters at job dispatch; Model Router, Notification Engine, Context Engine, Connector Engine, Governance Engine all read from mode_configs
4. Adaptive layout and nav — dynamic nav ordering; mode-relevant status bar slots; mode indicator and manual override selector
5. Mode history and user controls — log every activation with reason; Settings viewer; manual override controls; section pinning; adaptive mode toggle
6. Android adaptive brief — Operating Mode-aware content ordering in Brief tab
7. Relationship intelligence schema — extend people table; interactions, promises, relationship_health_scores tables
8. Interaction ingestion — wire into Understanding Pipeline and Connector Engine; detect interactions and promises in processed content; promises → needs-review queue
9. Person detail relationship tabs — Interaction Timeline, Promises (outgoing + incoming), Open Questions, Meeting History, Momentum indicator; relationship health score badge
10. Relationship briefs and alerts — Person Brief and Meeting Brief update; health score monitoring; per-relationship notification level configuration

---

## Task #19 — Lee Constitution Engine

*Depends on: Task #1*

### What & Why
The immutable kernel above every other engine. Every engine must consult the Constitution before acting. Absolute provisions block before governance — they cannot be overridden even with approval. This is what prevents Lee from drifting over years as complexity grows.

### Done looks like
- **The Lee Constitution** — constitution_provisions table: provision_id, category, title, rule_text, machine_readable_rule (JSON), tier (ABSOLUTE / GOVERNED / CONFIGURABLE), version, created_at, amended_at, amendment_reason, applies_to_engines, consultation_count; constitution_versions for full amendment history
- **Immutability** — no engine modifies constitution records; only owner can propose amendments; amendments require CRITICAL governance approval; old versions sealed and retained permanently; the first constitution is always version 1
- **Constitution consultation API** — constitution.check(action_type, payload) → { permitted, applicable_provisions, constraints, override_required }; every consultation logged to Event Log
- **Tier enforcement**:
  - ABSOLUTE: blocks before governance; violation emits CRITICAL health alert; cannot be overridden by any means
  - GOVERNED: creates governance HOLD item; executable only after approval
  - CONFIGURABLE: owner can change via Settings without governance
- **Starter constitution provisions (~20)** — Replit-first but portable, all consequential actions require human review, no silent cost accumulation, raw sources preserved forever, facts never mixed with interpretations in the same ledger, model is interchangeable, privacy is absolute, Event Log is append-only and never modified, re-projection must always produce consistent state, nothing appears without provenance, no recommendation without Why Chain, model providers are cost-accountable, governance is fail-closed
- **Constitution provisions in context packets** — high-relevance provisions included in every context packet by category tag
- **Constitution violations** — blocked before governance; logged as CRITICAL health alert; visible in Health page
- **Constitution page** — read-only display organized by category; version history with diff view; consultation count per provision; Amendment Proposal flow (requires CRITICAL governance approval)
- **Constitution in every backup** — all versions; restore flow validates constitution presence before proceeding

### Steps
1. Constitution schema — constitution_provisions and constitution_versions tables; all fields; consultation_count index
2. Constitution Engine core — ConstitutionEngine: check(action_type, payload), log_consultation(), identify_provisions_by_action_type(); returns structured result
3. Starter provisions seed — ~20 provisions covering all known Lee principles; machine_readable_rule for each
4. Constitution consultation hooks — wire constitution.check() into: Governance Engine (before any HOLD/ALLOW), Understanding Pipeline (before Fact Ledger writes), Model Router (before strong-model dispatch), Connector Engine (before any write-adjacent action), Backup Engine (before export), Brief Engine (before generation)
5. Violation detection and blocking — when check() returns blocked: halt calling engine's action, emit constitution_violation event at CRITICAL severity, route to Health Engine alert
6. Amendment flow — Amendment Proposal API; governance CRITICAL approval required; on approval, create new constitution version, mark provisions amended; old version sealed and retained
7. Constitution provisions in context packets — update Context Engine to query high-relevance provisions by category tag and include them in every context packet
8. Constitution page UI — read-only by category; version history with diff view; consultation count per provision; Amendment Proposal button (routes to governance)
9. Backup integration — full constitution with all versions in Lee Brain exports; restore flow validates constitution presence before proceeding
10. Wire all engines — audit every engine's action dispatch paths; insert constitution.check() at correct interception point; no engine bypasses the Constitution

---

## Task #20 — Lee Confidence Propagation System

*Depends on: Task #1, Task #3, Task #12*

### What & Why
Confidence flows. A PDF has a confidence. The extraction from that PDF has a slightly lower confidence. The belief formed from that extraction has a lower one still. The observation built from that belief, lower still. The recommendation, lower still. The Confidence Propagation System makes the degradation of certainty visible at every step — so the user always knows how certain the system actually is, not just how confident the original source was.

Example chain:
```
Source PDF          → 96%
   ↓ extraction (×0.95)
Fact                → 91%
   ↓ belief formation (×0.94)
Observation         → 87%
   ↓ recommendation (×0.94)
Recommendation      → 82%
   ↓ simulation (×0.93)
Simulation          → 76%
   ↓ strategy (×0.95)
Strategy            → 72%
```

### Done looks like
- **Confidence chain data model** — confidence_lineage JSONB on all derivable objects: [{ source_id, source_confidence, step_type, degradation_factor, resulting_confidence, timestamp }]; propagated_confidence field distinct from user-assigned confidence
- **Degradation factors by step type** — extraction (×0.95), belief formation (×0.94), observation from belief (×0.91), recommendation from observation (×0.94), simulation from recommendation (×0.93), strategy from simulation (×0.95); stored as constitution CONFIGURABLE provisions; tunable via Settings
- **Evidence count bonus** — more supporting sources = less degradation; formula: bonus = min(0.03 × (n_sources − 1), 0.10)
- **Confidence floors** — Canonical beliefs: minimum 90%; Speculative: maximum 60%; Evergreen: shown as "permanent" not as a percentage
- **Confidence Chain UI** — Confidence Chain section on every object detail page; navigable vertical chain showing confidence at each step, degradation factor applied, link to source object; "Where did this confidence come from?" is always answerable
- **Confidence indicators on all cards** — propagated_confidence (not user-assigned confidence) used as the visual indicator throughout the console; color-coded: ≥85% green, 70–84% amber, 55–69% orange, <55% red
- **Confidence in context packets** — Context Packet Preview shows confidence distribution: % high (≥85%), % medium (70–84%), % low (<70%); user can filter out low-confidence context before running
- **System-wide confidence metric** — Health Engine tracks average propagated_confidence across all active recommendations and observations; sustained drop below threshold triggers a Health alert

### Steps
1. Confidence lineage schema — confidence_lineage JSONB and propagated_confidence on all derivable object types
2. Degradation factor config — all step type factors defined as constitution CONFIGURABLE provisions; read at runtime by Propagation Engine
3. Confidence Propagation Engine — ConfidencePropagationEngine: compute_propagated(source_objects, step_type), evidence_count_bonus(n_sources), apply_floor(confidence, belief_type)
4. Wire into Understanding Pipeline — extracted facts carry propagated_confidence and confidence_lineage
5. Wire into Curiosity and Opportunity Engines — observations and opportunities propagate from input facts
6. Wire into Simulation and Strategy Engines — simulations and strategies propagate from input observations and recommendations
7. Confidence Chain UI component — reusable ConfidenceChain component; navigable; degradation factor per step visible; source links
8. Confidence indicators on all cards — visual confidence indicator using propagated_confidence; color-coded scale
9. Context packet confidence distribution — show distribution in Context Packet Preview; low-confidence filter option
10. Health metric — system-wide average propagated confidence in Health Engine; alert on sustained drop

---

## Task #21 — Lee Fact/Interpretation Separation

*Depends on: Task #1, Task #3*

### What & Why
The most important architectural decision in v3.0. The Reality Ledger currently stores all beliefs in a single category. This task splits them permanently into two clean ledgers that can never be confused. A Fact Ledger (observed, extracted, declared, verifiable) and an Interpretation Ledger (patterns, predictions, observations, opportunities, strategies, simulations). Mixing them is how intelligent systems become untrustworthy over years. This must happen before the Reality Ledger accumulates significant data.

### Done looks like
- **Fact Ledger** — fact_ledger table; fact_types: observed, extracted, declared, verified; source_evidence required (at least 1); confidence, propagated_confidence, confidence_lineage, canon_level; database-level CHECK constraints preventing interpretation type names from appearing in this table
- **Interpretation Ledger** — interpretation_ledger table; interpretation_types: pattern, prediction, observation, opportunity, strategy, simulation_result, inference; at least 1 linked input fact required; generated_by_engine logged; database-level CHECK constraints preventing fact type names
- **Hard separation — Constitution ABSOLUTE provision** — "Predictions, patterns, observations, and strategies must never be written as Facts"; enforced at schema level, API Zod validation level, and ConstitutionEngine consultation for all Reality write operations
- **Migration script** — classifies every existing reality_beliefs record: declared/extracted/observed → fact_ledger; pattern/prediction/observation/opportunity/strategy/simulation → interpretation_ledger; ambiguous → interpretation_ledger with needs_review flag; no records lost
- **Interpretation-to-Fact promotion** — when reality confirms an interpretation, user can promote it; governance MEDIUM risk approval required; creates new fact record with source evidence; original interpretation retained with status = promoted; creates a link between them
- **Canon rules differ** — facts can reach Canonical through normal confirmation; interpretations cannot auto-promote above Working canon; Canonical for an interpretation requires owner confirmation + at least 2 linked supporting facts + governance MEDIUM approval
- **UI distinction** — Fact Ledger and Interpretation Ledger as separate tabs in Evidence page; every card, recommendation, and observation throughout the console shows a Fact or Interpretation badge; badges are visually distinct (solid vs. outlined)

### Steps
1. Schema design — fact_ledger and interpretation_ledger tables; all fields; database-level type CHECK constraints on both tables
2. Migration script — classify and move all existing reality_beliefs; ambiguous → interpretation_ledger with needs_review flag; verify zero records lost
3. Constitution provision — ABSOLUTE provision: no predictions/patterns/observations/strategies as Facts; wire into ConstitutionEngine for all Reality write operations
4. Fact Ledger API — CRUD; enforce source_evidence requirement (≥1) and fact type vocabulary at Zod layer; enforce at DB layer
5. Interpretation Ledger API — CRUD; enforce input_facts requirement (≥1 linked fact) and interpretation type vocabulary; enforce at DB layer
6. Update all writing engines — Understanding Pipeline: writes only to Fact Ledger; Curiosity, Opportunity, Strategy, Simulation Engines: write only to Interpretation Ledger; ConstitutionEngine consulted on all writes
7. Interpretation-to-Fact promotion flow — promotion endpoint; governance MEDIUM approval; creates fact record linked to interpretation; updates interpretation status to promoted; preserves link
8. Context packet update — both ledgers queried; records labeled separately in packet; preview shows fact count and interpretation count as distinct figures
9. UI distinction — Fact/Interpretation badge on all surfaces; Evidence page split into two tabs; badge styling (solid fact, outlined interpretation) consistent throughout
10. Canon rule enforcement — update canon promotion logic for both ledgers; Canonical for interpretations: owner confirmation + ≥2 supporting facts + MEDIUM governance; enforce via ConstitutionEngine

---

## Task #22 — Lee Why Chain & Provenance System

*Depends on: Task #1, Task #5*

### What & Why
Two problems solved together. The Why Chain makes reasoning navigable — click any recommendation and navigate the full chain of reasoning that produced it, step by step, with the evidence at each step. The Provenance System makes origin non-negotiable — nothing appears in Lee without a clear, navigable path back to where it came from. Together they answer: "Why this? Why now? And how do I know it's true?"

### Done looks like

**Why Chain**
- **Why Chain record** — why_chain JSONB on all recommendation-type objects (recommendations, observations, opportunities, brief items, simulation results, strategy items): ordered list of steps, each with { step_type, statement, evidence_id (optional), confidence, engine_name }
- **Step types** — waiting_loop_exceeded, relationship_importance, historical_pattern, decision_precedence, freshness_threshold, cost_signal, constitution_provision, fact_confirmed, interpretation_promoted, strategy_alignment, assumption_validated
- **Minimum 2 grounded steps** — no Why Chain generated purely from model output without at least 2 steps grounded in real Lee data; enforced by Why Chain builder
- **Why Chain built during reasoning** — not generated post-hoc; constructed by each engine using the WhyChain builder as it reasons; attached to the output before returning
- **Why Chain UI panel** — click any recommendation, observation, or brief item → Why Chain panel expands inline; each step shown as a navigable node with statement, evidence link, confidence, engine name; "Why that?" drill-down on each step; chain navigable to any depth
- **Why Chain in Ask Lee answers** — every model-generated answer includes a Why Chain section built from Lee's actual knowledge and the context packet used; shows which facts and interpretations were consulted, which constitution provisions applied, how confidence degraded

**Provenance System**
- **Provenance rule — Constitution ABSOLUTE provision** — "No object appears in the console without a provenance link"; enforced at API layer: any object without source_refs is marked unverified and flagged in the UI
- **Provenance panel** — every card has a source indicator; one click opens provenance panel: origin sources with links, extraction date, confidence at extraction, engine, pipeline run; chain is navigable (source → file → original upload)
- **Source indicator styles** — fully-sourced (solid icon), partially-sourced (amber icon), unverified (red outlined icon)
- **Provenance completeness metric** — Health Engine tracks % of active objects with ≥1 source_ref; target ≥95%; Health page alert below threshold
- **Provenance in exports** — full provenance chain for every object included in Lee Brain exports

### Steps
1. Why Chain schema — why_chain JSONB on all recommendation-type objects; step schema with all required fields
2. Why Chain builder utility — WhyChain builder class: add_step(type, statement, evidence_id, confidence, engine), build() → ordered chain with minimum 2 grounded steps enforced
3. Wire Why Chain into generating engines — Curiosity, Opportunity, Brief, Simulation, Strategy Engines all use WhyChain builder during their scan/generation loops; chain built before output returned
4. Why Chain UI panel — reusable WhyChainPanel: collapsible; step nodes with confidence, evidence links, engine attribution; "Why that?" drill-down per step
5. Wire Why Chain panel into all surfaces — recommendation cards, observation cards, brief items on Today page and full brief view, simulation results, strategy items, Ask Lee answers
6. Provenance constitution provision — add ABSOLUTE provision: "No object appears without a provenance link"; API layer enforcement: reject object creation without source_refs (except system-generated roots)
7. Provenance panel component — reusable ProvenancePanel: source list with links, extraction date, confidence, engine, pipeline run; navigable chain
8. Provenance indicator on all cards — source indicator on every card; three styles (fully-sourced / partially-sourced / unverified) applied consistently throughout the console
9. Provenance completeness metric — % active objects with ≥1 source_ref in Health Engine; alert below 95%; Health page display
10. Provenance in backups — full source chain in Lee Brain exports; restore flow validates provenance completeness before completing

---

## Task #23 — Lee Assumption Ledger

*Depends on: Task #1, Task #16*

### What & Why
Almost no AI system tracks its own assumptions. When an assumption is invalidated, the system should know which simulations and strategies were built on it and flag them for review. The Assumption Ledger gives assumptions the same lifecycle as facts — named, tracked, validated, invalidated, and linked to every conclusion that depended on them. Over years, this makes Lee measurably more accurate as the accumulated record of what was assumed and what turned out to be wrong builds up.

### Done looks like
- **Assumption record** — assumption_id, statement, assumption_type (structural / behavioral / market / technical / relationship / temporal), confidence, evidence_basis (source_refs, ≥0 at creation), status (active / validated / invalidated / superseded / expired), created_at, created_by_engine, used_in (simulation_ids, recommendation_ids, strategy_ids), validated_at, invalidated_at, invalidation_source, superseded_by, review_date
- **Assumptions registered when used** — Simulation, Strategy, and Curiosity Engines create or reference assumptions before dispatching; assumptions are named and explicit, never implicit; reuse tracked
- **Assumption used_in links** — every simulation, recommendation, and strategy stores the assumption_ids it was built on; clicking any conclusion shows which assumptions it rested on
- **Assumption validation** — when new facts confirm an assumption: mark validated; confidence of all linked conclusions updated
- **Assumption invalidation** — when new facts contradict an assumption: HIGH notification listing all conclusions that depended on it with one-click re-run links for simulations; stale flag on all linked conclusions
- **Assumption expiry** — temporal assumptions carry a review_date; when date passes without validation: flagged as expired; all linked conclusions flagged as potentially stale; digest notification
- **Simulation assumption display** — full assumption list shown before outcomes; Correct & Re-run button per assumption; re-runs create new simulation linked to original
- **Assumption Ledger page** — all assumptions by status; filter by type, engine, date, status; assumption detail with statement, evidence basis, all linked conclusions, validation/invalidation history; action buttons: Mark Validated / Invalidate / Supersede / Extend Review Date

### Steps
1. Assumption schema — assumption_ledger and assumption_uses tables; all fields; indexes on status, created_by_engine, review_date
2. Assumption Engine core — AssumptionEngine: create_or_reference(statement, type, confidence, evidence_basis, created_by), mark_validated(id, source), invalidate(id, source), expire_stale(); register with Orchestration Engine
3. Wire into Simulation Engine — extract assumptions from simulation parameters; register with Assumption Engine before dispatching; link simulation_id to assumption records
4. Wire into Strategy Engine — register structural and temporal assumptions used in strategy generation; link strategy_item_id
5. Wire into Curiosity Engine — register behavioral and market assumptions underlying observations; link observation_id
6. Assumption invalidation notification — when invalidate() called: HIGH notification listing all linked conclusions with one-click re-run links; stale flag on all linked conclusions
7. Assumption expiry scanner — scheduled job via Orchestration Engine; scans for expired review_dates; flags assumptions; creates digest notification listing all expired
8. Simulation assumption display — full assumption list before outcomes in Simulation UI; Correct & Re-run per assumption; re-runs create new simulation linked to original
9. Assumption Ledger page — full page with all filters; assumption detail view with linked conclusions and history; all action buttons
10. Assumption in context packets — include active assumptions as named, explicit context items in simulation and strategy calls so the model reasons from them explicitly

---

## Task #24 — Lee Decision Impact Graph

*Depends on: Task #1, Task #13*

### What & Why
Different from the Intelligence Graph. Instead of relationships, this tracks consequences. Decision A caused Project B to be created, which caused Waiting Loop C to open, which caused Meeting D, which produced Pilot E. Over years, this becomes the founder's evidence-backed causal record — which decisions actually mattered, which paths were dead ends, which choices had the most leverage.

### Done looks like
- **Decision Impact Graph** — separate tables from the Intelligence Graph; nodes are decisions and consequences; edges are typed causal links: caused (direct), enabled (removed a blocker), prevented (blocked a negative path), informed (influenced without directly causing), accelerated, delayed; all directional, all typed
- **Node types** — decision, project, waiting_loop, meeting, artifact, commitment, revenue_signal, relationship_event, pilot_milestone, risk_realized, opportunity_captured, principle_applied; every node links to the corresponding Lee object by id
- **Impact score** — every decision node has a computed impact_score: downstream consequence count weighted by depth (direct ×3, depth-2 ×2, depth-3+ ×1) × consequence importance; updates automatically as new consequence edges are added
- **Manual consequence linking** — "What caused this?" picker on all applicable object detail pages; creates causal edge at confidence 1.0 (user_declared); immediately recalculates impact scores; this is the primary input mechanism
- **Automated consequence proposals** — Understanding Pipeline detects causal language ("as a result of", "following the decision to", "after we decided"); proposed consequence edges → needs-review queue at appropriate confidence
- **Decision Impact page** — force-directed graph visualization; nodes sized by impact_score, colored by type; click a decision to see all downstream consequences as a navigable tree; timeline filter; "most impactful decisions" ranked list
- **Impact chain view** — from any decision: full downstream tree showing every consequence at every depth with date observed and evidence link
- **Decision detail integration** — every Decision page includes an Impact section: impact_score badge, direct downstream consequences with links, "View full impact chain" button
- **Brief and Reflection integration** — Weekly Review and Annual Reflection include highest-impact decisions of the period using impact_score; consequence chain summary in narrative
- **Separate from Intelligence Graph** — separate tables (impact_nodes, impact_edges), separate visualization page, separate API endpoints; the two graphs may reference the same underlying objects but are never merged

### Steps
1. Decision Impact schema — impact_nodes and impact_edges tables; all fields; edge_type vocabulary; impact_score field on impact_nodes; indexes
2. Impact score calculator — weighted downstream consequence count; recalculate when new edges are added; efficient graph traversal query
3. Manual consequence linking UI — "What caused this?" picker on all applicable detail pages; creates edge at user_declared confidence; triggers impact score recalculation
4. Automated consequence proposals — extend Understanding Pipeline entity extractor to detect causal language patterns; create proposed impact edges in needs-review queue with pattern-based confidence
5. Decision Impact Graph visualization — force-directed layout; nodes sized by impact_score, colored by object type; click-to-expand consequence tree; timeline filter slider
6. Impact chain view — from any decision node: full downstream consequence tree as collapsible outline with dates and evidence links at each node
7. Ranked impact list — sortable list of all decision nodes by impact_score; filter by date range, project, decision type; displayed alongside the graph
8. Decision detail impact section — Impact section on every decision detail page with impact_score badge, direct consequences, and link to full impact chain view
9. Brief and Reflection integration — query top N decisions by impact_score in the period for Weekly Review and Annual Reflection; include consequence chain summary in generated narrative
10. API endpoints — GET /impact/graph, GET /impact/decision/:id/tree, GET /impact/leaderboard, POST /impact/edges (manual), GET /impact/proposed (needs-review queue)

---

## Task #25 — Lee Digital Twin Timeline

*Depends on: Task #2, Task #13*

### What & Why
Everything in Lee has a timestamp. This task makes that history navigable as a scrollable, filterable, zoomable founder timeline — Git for your career. Not a summary. Not a report. The actual record of what happened, in sequence, as it unfolded. At year three, you will be able to scroll back to April 2026, see the day pilot discussions with CerbaSeal began, and trace the exact sequence of decisions and meetings that led to any outcome. That understanding compounds.

### Done looks like
- **Timeline data model** — constructed from the Event Log and object timestamps; significance scoring determines which events surface; operationally significant moments only by default; significance threshold configurable in Settings
- **Event types surfaced** — decision_made, decision_locked, decision_superseded, project_created, project_status_changed, meeting_occurred, waiting_loop_opened, waiting_loop_resolved, document_imported, fact_extracted, belief_promoted, pilot_milestone, relationship_event, connector_sync_notable, brief_generated, model_call_notable (strong model or high cost only), backup_completed, constitution_amended, assumption_validated, assumption_invalidated, opportunity_captured
- **Zoom levels** — Year view (most significant events per month only), Month view (all significant events), Week view (all logged events including minor), Day view (full detail, every event)
- **Event card** — event type badge, headline (one sentence), related objects as linked chips, date/time; click to expand for full detail including evidence links
- **Milestone markers** — user marks any event as a Milestone with a label; appear prominently in Year view; included in Annual Reflections and Decision Impact Graph narrative
- **Filter controls** — project, person, event type, date range, significance threshold slider; saved filter sets
- **Project Timeline tab** — Timeline tab on every project detail page; pre-filtered to that project; full history of the project as it actually happened
- **Person Timeline tab** — Timeline tab on every person detail page; pre-filtered to that person; all interaction events, waiting loop events, meeting events, document events
- **Timeline search** — full-text search across event headlines; results shown in timeline position with surrounding context
- **Timeline export** — any date range → markdown document or PDF; the founder's operational history for that period; used in Annual Reflection generation

### Steps
1. Timeline event classification — significance scoring function; timeline_event_config table mapping Event Log event types to visibility rules and significance scores
2. Timeline query layer — GET /timeline?start&end&projects&people&types&min_significance; efficient indexed query from Event Log + object tables; returns chronologically ordered, significance-filtered events
3. Timeline page shell — scrollable vertical layout with date markers; zoom level selector (Year/Month/Week/Day); filter panel; search bar
4. Event card component — reusable TimelineEventCard: type badge, headline, related objects as linked chips, expand/collapse for full detail; significance-based sizing; Milestone marker button
5. Zoom level rendering — Year view aggregates by month, top-N significant only; Month/Week/Day views show progressively more events; smooth zoom transition
6. Filter controls — all filters; saved filter sets stored in Settings per user
7. Milestone system — milestone_markers table; Milestone button on event cards; Year view renders milestone markers prominently; milestone list feeds Annual Reflection generation
8. Project Timeline tab — Timeline tab on project detail pages; pre-filtered to project; same event card component and filter panel
9. Person Timeline tab — Timeline tab on person detail pages; pre-filtered to person
10. Timeline export — date range → markdown or PDF; accessible from filter panel; used by Reflection Engine for Annual Reflection narrative generation

---

*End of Project LEE Full Build Task Plan*
*25 Tasks. One coherent system. One Constitution above everything.*
*One Lee. Many surfaces. The memory must not be replaceable.*
