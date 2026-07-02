# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 4.0 — 34 Tasks*

---

## Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff — she doesn't replace your thinking, she protects it. She doesn't replace your decisions, she prepares them. She doesn't replace your memory, she preserves it.

The primary asset is the accumulated knowledge, governance, memory, relationships, timelines, and operational state — not the specific model answering questions. The model could change. Lee continues to grow.

---

## Architecture Principles (v4.0)

**1. The Constitution sits above everything.** Every engine consults the Constitution before acting. Absolute provisions cannot be overridden — not even by governance approval.

**2. Event Sourcing is the foundation.** Almost nothing mutates directly. State changes are events. Current state is a projection. Re-projection from the Event Log alone must produce a consistent database.

**3. Facts and Interpretations are never mixed.** The Fact Ledger holds what is verifiable. The Interpretation Ledger holds what Lee reasons. They have different canon rules, different confidence rules, and different decay rates.

**4. The Query Engine is the universal access layer.** No intelligence engine reads from storage directly. All reads — from every engine — go through the Query Engine. One retrieval policy, one ranking algorithm, one cache, one authorization layer.

**5. Intent is a first-class typed object.** Every request — human or machine-initiated — classifies its intent before retrieval or reasoning begins. All downstream decisions use the Intent record.

**6. Context competes.** The Context Economy formula replaces static tier weights. Every object scores against eight dimensions. The highest-scoring objects within the token budget always win, regardless of which memory tier they came from.

**7. Intelligence is independent of presentation.** Every capability must work without any UI. The Console, Android app, CLI, API, and future desktop app all consume identical services via the Internal API surface. Nothing exists "because the web UI needs it."

**8. Resource-aware scheduling.** The Orchestration Engine reads the Resource Engine before every dispatch. No heavy jobs run blindly into a constrained system.

**9. Brain Versioning for safe migrations.** A Brain Version (YYYY.M.minor) covers Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together. Every backup is tagged with its Brain Version.

**10. Confidence flows. Trust is earned.** Confidence degrades through each inference step at defined rates. Trust is a per-subsystem score that decays without activity and rises with accurate, verified performance. They are different constructs and are never conflated.

**11. Every output has a Why Chain.** No recommendation without reasoning. No observation without grounded steps. Every inference chain is navigable. Provenance is an ABSOLUTE constitutional provision.

**12. Assumptions are tracked.** Every simulation and strategy names its assumptions. Invalidated assumptions trigger review of all conclusions built on them.

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
| 10 | Improves itself | Tasks #17, #34 (behavioral learning, not code mutation) |

---

## Layer Hierarchy

Dependencies flow downward only. No upward references. No circular dependencies.

```
┌─────────────────────────────────────────────────────┐
│  1. FOUNDATIONS                                     │
│  Constitution Engine · Event Log · Foundation DB    │
│  Memory Architecture · Brain Versioning             │
├─────────────────────────────────────────────────────┤
│  2. KNOWLEDGE                                       │
│  Fact Ledger · Interpretation Ledger                │
│  Intelligence Graph · Assumption Ledger             │
│  Why Chain & Provenance · Digital Twin Timeline     │
├─────────────────────────────────────────────────────┤
│  3. RETRIEVAL                                       │
│  Query Engine · Semantic Index                      │
├─────────────────────────────────────────────────────┤
│  4. INTELLIGENCE                                    │
│  Intent Engine · Understanding Pipeline             │
│  Curiosity Engine · Strategy Engine                 │
│  Reflection Engine · Explanation Engine             │
│  Confidence Propagation · Simulation                │
├─────────────────────────────────────────────────────┤
│  5. COORDINATION                                    │
│  Orchestration Engine · Policy Engine               │
│  Governance Engine · Resource Engine                │
│  State Engine · Operating Modes                     │
│  Capability Registry · Health Engine                │
├─────────────────────────────────────────────────────┤
│  6. INTERFACES                                      │
│  Console · Android App · Connectors                 │
│  Cost Engine · Backup & Migration                   │
│  Context Economy · Brief Engine · Model Router      │
└─────────────────────────────────────────────────────┘
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
| 10 | Orchestration Engine | 1 |
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

---

## Task Descriptions

---

### Task 1 — Foundation & Core Schema

**Depends on:** nothing

**What & Why**
The base layer every other task builds on. Sets up the Node.js + TypeScript + Express server, PostgreSQL + Drizzle ORM, the core database schema, and the event sourcing infrastructure. Nothing else can start until the foundation is solid.

**Done looks like**
- Server starts and responds to a health check at GET /health
- All core tables created via Drizzle migrations: Projects, People, Sources, Events, Costs, AuditLog, Users
- Event Log table is append-only; re-projection from the Event Log alone produces a consistent database state — this is the primary acceptance criterion for the Event Log, not merely that events are written
- OpenAPI spec valid and Orval codegen runs cleanly
- Database schema versioned with a migration history
- pnpm monorepo structure set up with correct workspace references

**Out of scope**
- Any UI (that is Task #2)
- Any connector integration
- Any AI model call

**Steps**
1. Initialize pnpm monorepo with Node.js 24, TypeScript 5.9, esbuild; create artifacts/api-server and lib/db packages
2. Set up PostgreSQL connection via Drizzle ORM; configure connection pooling and environment-based config
3. Define core schema: projects, people, sources, events (Event Log — append-only), costs, audit_log, users
4. Implement Event Log enforcement: append-only constraint, re-projection utility that rebuilds DB state from events
5. Create OpenAPI spec; configure Orval codegen; verify codegen produces typed client
6. Wire Express 5 server with Zod-validated routes, error handling middleware, and health check endpoint
7. Write Drizzle migration workflow; verify migrations are idempotent and versioned

---

### Task 2 — Console (Web App)

**Depends on:** 1

**What & Why**
The primary desktop interface for Lee. A dark-mode-first React web app connected to the API server. The Console is a consumer of API services — no business logic lives in the frontend. No data transformation happens client-side beyond display formatting.

**Intelligence/Presentation principle:** The Console consumes services. It does not implement them.

**Done looks like**
- React app loads in browser with dark mode active
- Layout shell: top status bar (Lee name, version, last-backup indicator, current state badge), left navigation, main content area
- Today page renders with empty-state gracefully handled
- Settings page scaffold in place with section placeholders
- Navigation between pages works without full page reload
- No emojis anywhere in the UI
- Typography-led design — no heavy use of icons as primary communication

**Out of scope**
- Any AI-powered features (those are downstream tasks)
- Android app (Task #7)
- Any page beyond Today and Settings scaffold

**Steps**
1. Set up React + Vite app in artifacts/console; configure to read BASE_URL from environment; connect to API server
2. Build layout shell: top status bar component, left navigation, main content area with route outlet
3. Build Today page: daily brief section (empty state), status-at-a-glance section, quick capture input
4. Build Settings page scaffold with section headers for all known settings categories
5. Wire dark mode as default; establish typography scale and spacing system; confirm no emojis anywhere

---

### Task 3 — Understanding Pipeline

**Depends on:** 1

**What & Why**
The ingestion and comprehension layer. Accepts raw inputs — text, URLs, files, voice notes, paste dumps — runs them through extraction, enrichment, entity detection, classification, and importance scoring, and stores the results as typed knowledge objects. This is the entry point for all new knowledge entering Lee.

**Done looks like**
- Text input accepted via POST /api/understand
- Extraction produces typed objects: facts (to Fact Ledger), interpretations (to Interpretation Ledger), entities (Projects, People, Organizations)
- Entity detection fuzzy-matches against known projects and people in the DB
- Importance score (0–1) assigned to every output object
- Source archived to App Storage (Source Vault) with a stable source_id
- All extracted objects linked back to their source_id
- Processing steps logged to Event Log

**Out of scope**
- Voice transcription (text input only in this phase)
- Real-time streaming extraction
- PDF or binary file parsing (plain text and URLs only)

**Steps**
1. Build the ingestion endpoint: accept text/URL, validate with Zod, create a source record and archive raw content to App Storage
2. Implement the extraction stage: identify candidate facts and interpretations from raw text using a cheap model call
3. Implement entity detection: fuzzy-match extracted entities against known projects and people; create new entities when confidence is high enough
4. Implement importance scoring: score each extracted object from 0–1 based on entity density, novelty, and recency signals
5. Write typed objects to Fact Ledger and Interpretation Ledger; link all objects to source_id; log processing events to Event Log

---

### Task 4 — Brief Engine

**Depends on:** 3, 5

**What & Why**
The daily briefing generator. Produces the Morning Brief and on-demand briefs. Assembles a context packet, calls the Model Router, and renders the output as a structured document. Briefs are stored and immutable after generation — regeneration requires explicit user action.

**Done looks like**
- Morning Brief generated on a daily schedule (configurable time)
- Brief sections: priorities, decisions pending, risks, relationships to tend, financial snapshot, schedule awareness, closing observation
- Brief rendered in the Console on the Today page
- Briefs are immutable after generation; a "Regenerate" button exists but requires explicit confirmation
- Brief generation logged to Event Log
- Brief accessible from a Briefs history page showing all past briefs

**Out of scope**
- Voice delivery of briefs (future capability)
- Multi-recipient briefs
- Real-time brief updates (briefs are point-in-time snapshots)

**Steps**
1. Define the Brief schema: brief_id, generated_at, sections (JSONB), context_packet_snapshot, model_used, token_cost, status
2. Implement BriefEngine: assemble_brief() → calls Context Engine to build packet → calls Model Router → structures output into sections → stores as immutable record
3. Schedule morning brief generation via the Orchestration Engine (Task #10 dependency honored — scheduler wired once #10 exists; manual trigger available before that)
4. Build Briefs page in the Console: brief list, individual brief viewer with section rendering
5. Wire regeneration flow: explicit confirmation required; regeneration creates a new brief record, does not overwrite the original

---

### Task 5 — Model Router & Context Engine

**Depends on:** 1

**What & Why**
The routing intelligence between Lee and external models. Classifies each request by complexity and routes to the appropriate model tier. Assembles context packets with structured memory, relevance scoring, and token budget management. Context Packet Preview shows exactly what will be sent before it is sent. CIL (Compressed Instruction Layer) for reusable context segments.

**Done looks like**
- Requests routed to cheap / mid-tier / strong model based on intent complexity
- Context packet assembled with correct objects from memory tiers
- Token budget respected — packets never exceed configured limit
- Cost estimate displayed before every strong-model call; user confirms before proceeding
- CIL: reusable context segments compressed and reused across requests
- Context Packet Preview: expandable panel showing all objects in the packet, their sources, and their relevance scores
- All model calls logged with model_id, token_count, cost_usd, purpose

**Out of scope**
- Model fine-tuning
- Streaming responses (batch responses only in this phase)
- Multi-model ensemble calls

**Steps**
1. Define model tiers: cheap (fast, low-cost), mid-tier (capable), strong (frontier); configure model IDs and cost-per-token per tier
2. Implement request classifier: complexity_score from intent signals (length, entity count, reasoning depth required) → tier selection
3. Build Context Engine: retrieve objects from memory tiers, rank by relevance, pack into token budget; produce structured ContextPacket type
4. Implement CIL: identify reusable segments (system instructions, persistent facts), compress and cache them, inject by reference into packets
5. Build Context Packet Preview UI component: expandable panel with included objects, tier labels, relevance scores, token count, estimated cost
6. Implement model call executor: send assembled packet to selected model, log full telemetry, return typed ModelResponse

---

### Task 6 — Connector Engine

**Depends on:** 1, 3

**What & Why**
The bridge between Lee and external data sources. Connectors for Gmail (read-only), Google Calendar (read-only), Google Drive (read-only), and GitHub. Each connector syncs on schedule, transforms ingested data through the Understanding Pipeline, and maintains freshness timestamps. No write access to any external service in this phase.

**Done looks like**
- All 4 connectors authenticate and sync without errors
- Ingested data flows through the Understanding Pipeline and produces typed knowledge objects
- Freshness indicators accurate: last_synced_at per connector visible in Settings
- Connector health status visible in Settings: HEALTHY / DEGRADED / ERROR
- Connector errors create health alerts, not silent failures
- Sync events logged to Event Log

**Out of scope**
- Write access to any external service
- Webhooks / real-time event push (polling only)
- Additional connectors beyond the 4 named above

**Steps**
1. Define Connector interface: authenticate(), sync(), get_health() → ConnectorHealth; implement for Gmail, Google Calendar, Google Drive, GitHub
2. Implement OAuth flow for each connector; store tokens via the Secrets management layer (never in plain DB)
3. Build sync pipeline: for each connector, fetch new/changed records → pass through Understanding Pipeline → store knowledge objects
4. Implement freshness tracking: last_synced_at per connector; update after every successful sync
5. Wire connector health to Settings page: status badge, last sync time, error details; connector errors create health alerts

---

### Task 7 — Android App

**Depends on:** 2, 4

**What & Why**
The mobile surface for Lee. Expo React Native. Consumes the same API as the Console. The Android app implements no business logic — it is a presentation layer, identical in that respect to the Console. Enables capture on the go and brief delivery via push notification.

**Done looks like**
- App builds and runs on Android
- Today screen: morning brief + current state indicator
- Capture screen: text input and voice note (transcribed client-side before sending to API)
- People screen: relationship dashboard with follow-up indicators
- Settings screen: connector status, notification preferences
- Brief delivered as push notification with digest preview on lock screen
- Offline capture queue: captures stored locally when offline, synced on reconnect
- API authenticated with the same auth as Console

**Out of scope**
- iOS build (Android only in this phase)
- Full brief editing or regeneration on mobile
- Graph or timeline visualization on mobile

**Steps**
1. Initialize Expo app in artifacts/android; configure BASE_URL and API authentication to match Console
2. Build Today screen: brief renderer (section list), state indicator badge at top
3. Build Capture screen: text input with submit; voice note with client-side transcription; offline queue with sync indicator
4. Build People screen: people list with relationship tier, last interaction, follow-up flag; tap to see interaction history
5. Build Settings screen: connector status cards, notification preference toggles
6. Configure push notifications: brief delivery, governance items, health alerts (CRITICAL only on mobile by default)
7. Implement offline capture queue: local storage when offline, background sync when connection restored

---

### Task 8 — Cost Engine

**Depends on:** 1, 5

**What & Why**
The financial accountability layer. Tracks every token consumed, every model call made, every API request paid for. Hard limits trigger governance holds — not silent failures. Budget projections prevent surprises.

**Done looks like**
- Every model call logged with: model_id, purpose, token_count, cost_usd, timestamp, requesting_engine
- Daily / weekly / monthly spend visible in Console Settings under Cost
- Cost breakdown by engine and purpose: what is Brief Engine spending vs. Curiosity Engine vs. Ask Lee
- Budget limits enforced: approaching limit creates a MEDIUM governance hold; hitting limit creates a HIGH governance hold and blocks further spend
- Weekly and monthly projections based on rolling averages
- Cost estimate shown before every strong-model call and before any action with projected cost > threshold

**Out of scope**
- Invoice generation or external billing integration
- Per-project cost allocation (all costs tracked at the Lee system level)

**Steps**
1. Define cost_records schema: model_id, purpose, engine, token_count_input, token_count_output, cost_usd, timestamp; indexes on timestamp and engine
2. Implement CostEngine: record_call(), get_daily_spend(), get_weekly_spend(), get_monthly_spend(), project_monthly()
3. Wire budget limits from Policy Engine (Cost Policy): daily limit, weekly limit, monthly limit, strong-model approval threshold
4. Implement governance hold creation when budget thresholds are reached; block model calls when monthly limit is hit
5. Build Cost page in Settings: spend charts by day/week/month, breakdown by engine and purpose, projections, budget configuration

---

### Task 9 — Backup, Migration & Brain Versioning

**Depends on:** 1

**What & Why**
The portability and durability layer. The Lee Brain must always be ownable — not held hostage by any hosting provider. Produces encrypted, verifiable Lee Brain snapshots. Brain Versioning is part of this task: a logical version identifier (YYYY.M.minor format) covering Memory schema, Knowledge graph, Learning assets, Constitution, Policies, and Semantic Index together. Every backup is tagged with its Brain Version. Migration scripts transform between Brain Versions safely.

**Done looks like**
- Daily automated backup at 02:00 (configurable)
- Backup archive: encrypted ZIP (AES-256 with user-supplied passphrase), containing full DB dump, all App Storage files, manifest.json
- Backup manifest: backup_id, timestamp, brain_version, lee_version, db_schema_version, object_counts by type, checksums for every file, backup_format_version
- Brain Version: YYYY.M.minor label covering Memory schema version, Knowledge graph version, Learning asset version, Constitution version, Policy version, Semantic Index version; recorded in every manifest; versioned separately from the Lee software version
- Retention: 7 daily / 4 weekly / 12 monthly backups retained; older pruned automatically
- Verify Archive: validates checksums against manifest; reports completeness; does not restore
- Test Restore: provisions isolated DB, restores backup, runs integrity checks, reports pass/fail; does not affect live data
- Backup status visible in status bar: amber if last backup > 24h, red if > 72h
- Migration Readiness score in Backups page
- Brain Version upgrade path: migration scripts documented; upgrading from one Brain Version to the next validated before deployment

**Out of scope**
- Desktop import/export UI (backup format is designed for it; UI is Phase 9)
- Automated cloud backup to external providers
- Backup encryption key management service (user-supplied passphrase only)

**Steps**
1. Define Brain Version format (YYYY.M.minor); build BrainVersion record: version_id, component_versions (Memory, Graph, Learning, Constitution, Policies, SemanticIndex), created_at, notes; store in DB
2. Build BackupEngine: assemble_backup() → DB dump + App Storage files + manifest + Brain Version tag → encrypted ZIP
3. Implement manifest builder: all required fields including brain_version, checksums per file
4. Implement AES-256 encryption/decryption with user-supplied passphrase; unencrypted export option for migration
5. Wire daily backup schedule via Orchestration Engine; implement retention policy and pruning
6. Build Verify Archive: checksum validation against manifest; completeness report
7. Build Test Restore: isolated DB provisioning, restore, integrity checks (FK consistency, event log continuity), pass/fail report
8. Build Backups page in Console: last backup status, Backup Now button, archive list, Verify and Test Restore actions, Migration Readiness score
9. Implement Brain Version migration framework: detect version difference on restore; apply migration scripts in sequence; validate after each migration step

---

### Task 10 — Orchestration Engine

**Depends on:** 1

**What & Why**
The scheduler and dispatcher for all background work. Manages the priority queue, job registration for every engine, concurrency limits, retry logic, and job history. Reads the Resource Engine (Task #30) and State Engine (Task #32) before dispatching — scheduling is resource-aware.

**Done looks like**
- Priority queue: CRITICAL / HIGH / NORMAL / LOW tiers
- Every engine registers its jobs with the Orchestration Engine; no background work runs outside the queue
- Concurrency limits per priority tier enforced
- Retry with exponential backoff; max retry count configurable per job type
- Job history viewable in Health page: last N jobs by engine, status, duration
- State Engine integration (once Task #32 exists): state-based deferral rules enforced
- Resource Engine integration (once Task #30 exists): resource-state deferral rules enforced

**Out of scope**
- Distributed job queues (single-node only)
- Cross-session job persistence (jobs that survive server restart are handled by the scheduler; in-flight jobs are retried on next start)

**Steps**
1. Define job_records schema: job_id, engine, job_type, priority, status, attempts, created_at, started_at, completed_at, error; priority queue index
2. Build Orchestration Engine: enqueue(job_spec), dispatch(), cancel(job_id); priority-ordered dispatch with concurrency limits
3. Implement retry logic: exponential backoff, max_attempts per job type, dead-letter logging for permanently failed jobs
4. Build job registration interface: every engine calls OrchestratorEngine.register(engine_id, job_types, resource_requirements) on startup
5. Build job history view in Health page: last N jobs by engine, filter by status and priority
6. Add State Engine hook (stub until Task #32): before dispatch, check state; defer LOW/NORMAL when not Idle
7. Add Resource Engine hook (stub until Task #30): before dispatch, check resource state; defer LOW/NORMAL when CONSTRAINED, all non-CRITICAL when CRITICAL

---

### Task 11 — Governance Engine

**Depends on:** 1, 10

**What & Why**
The approval and oversight layer. Every significant action Lee takes routes through governance before execution. Risk levels determine approval requirements. Policy violations create governance holds. Full audit trail.

**Done looks like**
- Risk levels: LOW (auto-approve + log), MEDIUM (notify + approve in Console), HIGH (explicit confirmation required), CRITICAL (full review with written justification)
- All risk-rated actions block until their approval requirement is met
- Governance queue in Console: pending approvals with context, approve/reject actions
- Budget limit breaches → governance hold (created by Cost Engine)
- Policy violations → governance hold (created by Policy Engine, Task #29)
- Audit trail: every governance decision logged with decision, reason, timestamp, approver
- Email/push notification for MEDIUM and HIGH items requiring attention

**Out of scope**
- Multi-person governance (single owner only in this phase)
- Governance delegation to trusted contacts

**Steps**
1. Define governance_items schema: item_id, risk_level, action_type, context (JSONB), status, created_at, resolved_at, resolved_by, decision, reason
2. Build GovernanceEngine: create_item(risk_level, action, context), approve(item_id, reason), reject(item_id, reason); auto-approve LOW items
3. Implement blocking: actions that create MEDIUM/HIGH/CRITICAL items do not proceed until resolved; timeout behavior for MEDIUM (24h reminder)
4. Build Governance queue page in Console: pending items with full context, approve/reject forms
5. Wire audit trail: every governance decision logged to Event Log and audit_log table; audit log queryable from Settings

---

### Task 12 — Memory Architecture

**Depends on:** 1, 3

**What & Why**
The structured memory hierarchy. Six tiers with promotion, demotion, and compression rules. The Semantic Index (Task #28) is Stage 6 of this roadmap. Stage 2 output format must be validated for Stage 3 compatibility before Stage 2 is deployed — this is an explicit dependency constraint.

**Done looks like**
- Six tiers defined in schema: Working, Short-term, Long-term, Reference, Archive, Semantic (hook only until Task #28)
- All knowledge objects carry a memory_tier field
- Promotion rules: Working → Short-term on session end; Short-term → Long-term after 30 days if above importance threshold
- Demotion rules: objects demoted on low-access frequency and decreasing importance scores
- Memory Compression Roadmap:
  - Stage 1: Working → Short-term (move with metadata)
  - Stage 2: Short-term → Long-term (summarize; Stage 2 output validated for Stage 3 compatibility before deployment)
  - Stage 3: Long-term → Reference (further consolidation)
  - Stage 4: Reference → Archive (selective; importance threshold)
  - Stage 5: Archive → selective recall (on-demand retrieval, never automatic promotion)
  - Stage 6: Semantic Index integration (hooks only; Task #28 implements)
- Memory tier visible on all object detail pages
- Compression jobs run via Orchestration Engine at LOW priority

**Out of scope**
- Cross-owner memory sharing
- Memory export separate from the full Brain export (Task #9)

**Steps**
1. Add memory_tier field to all knowledge object tables; define tier enum; seed all existing objects as Working tier
2. Implement MemoryArchitecture engine: promote(object_id, target_tier), demote(object_id, reason), compress(tier, stage)
3. Build Stage 1 compression: move objects from Working to Short-term; update tier and metadata; log to Event Log
4. Build Stage 2 compression: generate summaries of Short-term objects using cheap model; store summaries as Long-term objects; validate output format for Stage 3 compatibility before deploying
5. Build Stage 3 compression: consolidate Long-term objects into Reference records
6. Build Stage 4 archival: demote Reference objects below importance threshold to Archive
7. Build Stage 5 recall: on-demand Archive query without automatic tier promotion
8. Schedule compression jobs via Orchestration Engine at LOW priority; expose memory tier distribution in Health page

---

### Task 13 — Intelligence Graph

**Depends on:** 1, 3

**What & Why**
The knowledge graph layer. Typed nodes and typed edges. Automatic edge creation from the Understanding Pipeline. Pattern detection. Visualization in the Console. Explicitly separate from the Decision Impact Graph (Task #24) — the Intelligence Graph tracks structural relationship; the Impact Graph tracks historical consequence.

**Done looks like**
- Node types: Project, Person, Organization, Concept, Event, Decision, Risk, Opportunity
- Edge types: related_to, depends_on, conflicts_with, supports, influences, led_by, part_of, blocks
- Automatic edge creation when Understanding Pipeline identifies relationships between entities
- Manual edge creation and deletion in Console
- Graph visualization renders on object detail pages and on a dedicated Graph page
- Pattern detection: clusters (tightly connected subgraphs), weak links (single edges between otherwise separate clusters), orphaned nodes (no edges)
- Pattern insights surfaced as Curiosity items

**Out of scope**
- Decision Impact Graph (Task #24)
- Real-time graph streaming
- Graph export to external tools

**Steps**
1. Define graph_nodes and graph_edges schema: node_id, node_type, object_ref; edge_id, from_node_id, to_node_id, edge_type, strength, created_at, source
2. Build GraphEngine: add_node(), add_edge(), remove_edge(), get_neighbors(node_id, edge_types), get_cluster(node_id)
3. Wire Understanding Pipeline to create edges when entity relationships are detected; confidence threshold for automatic edge creation
4. Build manual edge creation/deletion in Console object detail pages
5. Implement pattern detection: cluster detection (BFS/DFS from each node), weak link identification, orphaned node scan; run via Orchestration Engine at LOW priority
6. Build Graph visualization component (force-directed layout); render on object detail pages and dedicated Graph page

---

### Task 14 — Identity & Relationship Engine

**Depends on:** 1, 6, 13

**What & Why**
The people layer. Tracks everyone Lee has knowledge about: relationship strength, interaction history, communication patterns, upcoming occasions, follow-up states, and waiting loops tied to people.

**Done looks like**
- People entities tracked with: relationship_tier (Close / Professional / Extended / Peripheral), interaction_history, last_interaction_at, follow_up_state, upcoming_occasions
- Waiting loops: outstanding actions tied to specific people; escalation thresholds configurable
- People page in Console: list with relationship tier, last interaction, follow-up flag, open waiting loops
- Person detail page: interaction timeline, follow-up history, relationship insights from Intelligence Graph
- Relationship insights in Morning Brief: people who need attention, follow-ups overdue, upcoming occasions
- People referenced correctly in strategy and curiosity outputs

**Out of scope**
- Automated communication on behalf of the owner (read and insights only)
- CRM-style pipeline management

**Steps**
1. Extend People schema: relationship_tier, last_interaction_at, follow_up_state, upcoming_occasions (JSONB)
2. Build IdentityEngine: update_interaction(person_id, interaction), set_follow_up(person_id, due_date, note), get_relationship_insights(person_id)
3. Implement waiting loops for people: WaitingLoop records linked to person_id; escalation based on Relationship Policy (Task #29 dependency honored as stub)
4. Build People page: list with tier badges, last interaction, follow-up flags; filter by tier and follow-up state
5. Build Person detail page: interaction timeline, Intelligence Graph neighborhood, open waiting loops, upcoming occasions
6. Wire people insights into Brief Engine: who needs attention today, overdue follow-ups, upcoming occasions

---

### Task 15 — Curiosity Engine

**Depends on:** 3, 12, 13

**What & Why**
The proactive question-asking layer. Scans memory and the knowledge graph for staleness, gaps, conflicts, and missing connections. Generates focused curiosity items. Does not ask questions Lee could answer herself. Trust Score per curiosity item type tracked independently.

**Trust Score:** Per-subsystem reliability score, separate from Confidence. Starts at 50, decays 0.5 per day without activity, rises when the owner verifies a curiosity item as accurate and useful. Determines how prominently curiosity items are surfaced.

**Done looks like**
- Staleness detection: objects not updated in configurable window flagged for curiosity
- Gap detection: entities in the Intelligence Graph with few connections or missing expected edges
- Conflict detection: interpretations that contradict known facts flagged as curiosity items
- Curiosity items ranked by relevance score and Trust Score
- Questions surface in Morning Brief under "Questions Lee has today"
- Trust Score displayed on each curiosity item type in Settings
- Items the owner marks as irrelevant reduce Trust Score for that item type

**Out of scope**
- External research (curiosity is internal — based on what Lee already knows and what is missing)
- Automated research to answer curiosity items (that triggers Ask Lee separately)

**Steps**
1. Define curiosity_items schema: item_id, curiosity_type (staleness/gap/conflict/missing_link), description, relevance_score, trust_factor, status, created_at
2. Build CuriosityEngine: scan_staleness(), scan_gaps(), scan_conflicts(); each produces CuriosityItem records
3. Implement Trust Score tracking per curiosity_type: decay 0.5/day without activity; rise on owner verification; store in subsystem_trust table
4. Wire curiosity items into Brief Engine: include top-N items by relevance × trust in the Morning Brief
5. Implement owner feedback on curiosity items: "Relevant" / "Not relevant" / "Already knew this" → update trust factor
6. Display curiosity Trust Score per type in Settings; expose scan history in Health page

---

### Task 16 — Strategy Engine

**Depends on:** 13, 14, 15

**What & Why**
The forward-looking intelligence layer. Manages OKRs, evaluates strategic options against current conditions, generates recommendations with confidence and risk assessments, runs prioritization across competing objectives. Strategies update when underlying facts change via Event Log subscription.

**Done looks like**
- OKRs tracked: objective_id, key_results, status, owner (project or person), due_date, confidence
- Recommendations generated with: recommendation text, confidence, risk_assessment, supporting evidence (Why Chain linked), alternative options
- Prioritization: given a set of objectives, produces a ranked order with reasoning
- Strategy page in Console: active objectives, current recommendations, prioritization view
- Strategies update when underlying facts change (Event Log subscription → re-evaluation trigger)
- Strategies separated from the Decision Impact Graph: Strategy Engine looks forward; Impact Graph looks backward

**Out of scope**
- Automated execution of strategies (recommendations only, never autonomous action)
- External benchmarking or market data (internal knowledge only)

**Steps**
1. Define objectives schema: objective_id, title, key_results (JSONB), status, confidence, project_ref, due_date; define recommendations schema with full Why Chain link
2. Build StrategyEngine: evaluate(objective_id), prioritize(objective_ids), recommend(context_packet)
3. Implement Event Log subscription: when facts or interpretations change, re-trigger evaluation for affected objectives
4. Build Strategy page in Console: objective list, recommendation cards with confidence badges, prioritization view, Why Chain expand
5. Wire Curiosity Engine gap findings and Identity Engine relationship insights into Strategy recommendations as supporting context

---

### Task 17 — Reflection Engine

**Depends on:** 12, 13, 16

**What & Why**
The pattern recognition and retrospective layer. Compares periods, identifies performance trends, summarizes what changed and why, surfaces lessons. Periodic summaries (weekly, monthly). Feeds the Curiosity Engine with structural gaps discovered during reflection.

**Done looks like**
- Period comparison: given two date ranges, produces a structured comparison of what changed in each dimension (projects, people, financials, strategy)
- Trend identification: directional trends across key metrics (project momentum, relationship health, cost trajectory)
- Reflection summaries stored as immutable Interpretation Ledger records
- Weekly reflection generated on schedule; monthly reflection generated on schedule
- Reflection page in Console: list of past reflections, period comparison view
- Structural gaps found during reflection sent to Curiosity Engine as gap-type items
- Lessons (recurrent patterns) surfaced in Morning Brief

**Out of scope**
- Real-time reflection (retrospective only, not continuous monitoring)
- External benchmark comparison

**Steps**
1. Build ReflectionEngine: compare(period_a, period_b) → structured comparison; summarize(period) → ReflectionSummary; trend(metric, period) → TrendReport
2. Implement period comparison: query changes in each dimension (projects, people, financials, strategy) across the two periods via Query Engine
3. Implement trend identification: compute directional trend for each tracked metric using rolling window statistics
4. Store reflection summaries as Interpretation Ledger records (interpretation_type = reflection)
5. Schedule weekly and monthly reflections via Orchestration Engine at LOW priority
6. Build Reflection page: summary list, period comparison UI, trend charts
7. Wire gap findings to Curiosity Engine: gaps found in reflection → CuriosityItem with type = structural_gap

---

### Task 18 — Operating Modes

**Depends on:** 10, 11

**What & Why**
System-wide behavioral configurations. Each mode changes how every engine behaves — not just the UI. All engines read the current mode's parameters at dispatch time via the Policy Engine (Task #29) when available.

**Done looks like**
- Five modes defined with per-engine behavior parameters:
  - FOCUS: minimal interruption, reduced connector activity, no proactive curiosity
  - TRAVEL: logistics-aware, location-relevant context weighted higher, lightweight briefs
  - DEEP_WORK: strategy and simulation prioritized, all non-CRITICAL notifications suppressed
  - REVIEW: historical and reflective mode, lower forward-looking weight, full reflection access
  - EMERGENCY: all resources toward CRITICAL resolution, all other jobs deferred
- Mode switch button in Console status bar and Android quick actions
- Current mode visible in status bar
- Mode history logged to Event Log
- Mode-specific behavior parameters stored as Policy Engine records (when Task #29 exists; stored as config until then)

**Out of scope**
- Automatic mode detection from calendar or context (manual switch only)
- Per-project modes

**Steps**
1. Define operating_modes schema: mode_id, mode_name, active, activated_at, parameters (JSONB per engine)
2. Build OperatingModes engine: activate(mode_name), get_current_mode(), get_mode_parameters(engine_id)
3. Wire all engines to read current mode parameters at dispatch time via get_mode_parameters()
4. Build mode switch UI in Console status bar: current mode badge, mode switcher dropdown
5. Implement mode history: log mode_activated events to Event Log; mode history browsable in Settings

---

### Task 19 — Constitution Engine

**Depends on:** 1, 2, 3, 4, 5

**What & Why**
The immutable governance kernel. The Constitution is a versioned document specifying what Lee will always do (ABSOLUTE provisions) and what the owner can adjust (CONFIGURABLE provisions). The Constitution Engine enforces ABSOLUTE provisions before every significant action, before governance evaluation. Amendments require a full quorum process.

**ABSOLUTE provisions include (examples):**
- Provenance is non-negotiable: no recommendation surfaces without a traceable Why Chain
- Internal APIs are not exposed externally: the /internal/ namespace is never accessible outside the Lee system
- Semantic Index embeddings are stored locally: embeddings never transmitted to external services without governance approval
- No silent failures: every blocked action creates a record
- The Event Log is append-only: no destructive operations against the Event Log

**Done looks like**
- Constitution document versioned in the DB: constitution_id, version, provisions (ABSOLUTE and CONFIGURABLE), ratified_at, hash
- ConstitutionEngine.check(action, context) called before every significant action; ABSOLUTE violations block unconditionally and log to audit trail
- Configurable provisions accessible via Settings; changes to CONFIGURABLE provisions logged
- Amendment process defined: proposed amendment → 72-hour review period → explicit owner ratification → new constitution version created
- Constitution version visible in Settings and in every Brain Version

**Out of scope**
- Multi-party constitution governance (single owner only)
- Constitution provisions that affect external parties

**Steps**
1. Define constitution schema: constitution_id, version, provisions JSONB (absolute: [], configurable: []), ratified_at, hash; seed initial constitution with all ABSOLUTE provisions
2. Build ConstitutionEngine: check(action_type, context) → { permitted, blocked_by, provision_id }; ABSOLUTE violations: block + audit log + return clear error; no silent degradation
3. Implement constitution check hooks in: Model Router, Brief Engine, Understanding Pipeline, Context Engine, Backup Engine, and all engines that perform significant actions
4. Build constitution version history: constitution page in Settings showing all versions, provisions, and ratification timestamps
5. Implement amendment process: propose_amendment(provision, change, reason) → creates a 72-hour review hold → owner ratifies → new version created and all checks updated

---

### Task 20 — Confidence Propagation

**Depends on:** 1, 12, 13

**What & Why**
The epistemic integrity layer. Every fact, interpretation, and recommendation carries a confidence score. Confidence degrades through inference chains at defined degradation factors. The user always knows how certainty degraded from source to recommendation.

**Done looks like**
- All fact and interpretation objects carry: confidence (0–1), confidence_source (direct observation / derived / inferred), confidence_chain_length
- Propagated confidence computed through inference chains: each hop reduces confidence by a configured degradation factor (e.g., 0.9 per hop by default, configurable)
- Confidence displayed on all object detail pages and in Why Chain visualizations
- Low-confidence objects (below configurable threshold) flagged with a visual indicator in the Console
- Low-confidence objects suppressed from briefs unless they are the only available information (flagged as such)
- Degradation factor configurable in Settings

**Out of scope**
- Bayesian confidence networks (scalar confidence with defined degradation is sufficient)
- Automated confidence calibration (manual calibration via feedback only)

**Steps**
1. Add confidence fields to all knowledge object tables: confidence, confidence_source, confidence_chain_length, propagated_confidence
2. Build ConfidencePropagation: compute_propagated_confidence(object_id) → traverses Why Chain, applies degradation factor per hop, returns propagated_confidence
3. Implement propagated confidence updates: when a source object's confidence changes, trigger re-computation for all downstream objects via Event Log subscription
4. Display confidence on object detail pages: confidence badge (color-coded: green > 0.8, amber 0.5–0.8, red < 0.5); tooltip showing chain length and degradation steps
5. Wire Brief Engine: suppress objects below confidence threshold; flag included low-confidence objects with indicator

---

### Task 21 — Fact/Interpretation Separation

**Depends on:** 1, 3, 13

**What & Why**
The epistemic ledger layer. Facts and Interpretations are permanently separate — at schema level, API level, and constitutional level. No object can exist in both ledgers. No API endpoint that accepts one will accept the other without an explicit type declaration.

**Facts:** directly observable, sourced, timestamped, confidence-scored, immutable once accepted.
**Interpretations:** derived conclusions, source-referenced, interpretation_type-classified, confidence-scored, revision-tracked.

**Done looks like**
- Two separate DB tables: fact_ledger and interpretation_ledger; no shared table
- Fact schema: fact_id, content, source_ref, observed_at, confidence, confidence_source, status (proposed/accepted/invalidated)
- Interpretation schema: interpretation_id, interpretation_type, content, source_fact_ids, reasoning_summary, confidence, propagated_confidence, status
- Understanding Pipeline writes to the correct ledger based on extraction type; never mixes types
- All API endpoints that accept facts are typed for facts only; same for interpretations
- Constitution ABSOLUTE provision: "Facts and Interpretations are never mixed"
- Ledger type badge visible on all object detail pages

**Out of scope**
- Automated reclassification of existing objects between ledgers (manual only, with governance approval)
- Ledger merging or cross-ledger queries (cross-ledger relationships tracked via the Intelligence Graph only)

**Steps**
1. Create fact_ledger and interpretation_ledger as separate tables; add DB-level constraints preventing type mixing
2. Update Understanding Pipeline to classify each extracted object as fact or interpretation and write to the correct ledger
3. Update all API endpoints to use typed schemas: FactInput and InterpretationInput are distinct Zod schemas; no endpoint accepts an untyped knowledge object
4. Add ledger type badge to all object detail pages in Console; make ledger type always visible
5. Add Constitution ABSOLUTE provision: "Facts and Interpretations are never mixed"; wire ConstitutionEngine.check() before any cross-ledger write

---

### Task 22 — Why Chain & Provenance

**Depends on:** 1, 5, 20, 21

**What & Why**
The reasoning transparency layer. Every recommendation, conclusion, and interpretation has a navigable Why Chain. Provenance is an ABSOLUTE constitutional provision: no recommendation can surface without a traceable chain to its evidence.

**Done looks like**
- why_chain_nodes table: node_id, object_id, object_type, parent_node_id, reasoning_step, confidence_at_step
- Every recommendation and interpretation created with a Why Chain automatically
- Why Chain UI in Console: click any recommendation → full reasoning tree with source links, confidence at each step, propagated confidence at each node
- Provenance links: each Why Chain leaf node links to its source object (Fact Ledger record, connector sync record, or direct input)
- ConstitutionEngine blocks any recommendation from surfacing without a Why Chain
- Why Chain included in Explanation Engine output (Task #27)

**Out of scope**
- Visual graph rendering of Why Chains (tree view only in this phase)
- Why Chain comparison across multiple recommendations

**Steps**
1. Define why_chain_nodes schema: node_id, chain_id, object_ref_id, object_ref_type, parent_node_id, reasoning_step, confidence_at_step, depth; chains linked to their output object
2. Build WhyChain: create_chain(output_object_id), add_step(chain_id, parent_id, reasoning, source_ref, confidence), get_chain(object_id)
3. Wire Why Chain creation into: Understanding Pipeline interpretations, Strategy Engine recommendations, Curiosity Engine insights, Reflection Engine summaries
4. Build Why Chain UI component: expandable tree view in Console; show at each node: object name, reasoning step text, confidence, source link
5. Add ConstitutionEngine ABSOLUTE provision: "No recommendation surfaces without a traceable Why Chain"; wire check before Brief Engine and Ask Lee output

---

### Task 23 — Assumption Ledger

**Depends on:** 12, 20, 21, 22

**What & Why**
The assumption tracking layer. Explicit assumptions recorded with a full lifecycle: assumption text, confidence, source, linked conclusions, and status (active / under_review / invalidated). When an assumption is invalidated, all conclusions built on it are flagged for review.

**Done looks like**
- assumptions table: assumption_id, text, confidence, source_ref, status, created_at, invalidated_at, invalidation_reason
- assumption_conclusions table: links assumption_id to every object built on that assumption
- When an assumption is invalidated: Event Log event emitted; all linked conclusions flagged as under_review; flagged conclusions suppressed from briefs until reviewed
- Assumptions page in Console: list of active assumptions, their confidence, and count of linked conclusions
- Assumption invalidation workflow: mark_invalidated(assumption_id, reason) → flags all linked conclusions → creates governance item for review

**Out of scope**
- Automated assumption invalidation (manual or triggered by specific fact changes only)
- Assumption probability modeling

**Steps**
1. Define assumptions and assumption_conclusions schemas; add assumption_ref field to interpretation_ledger for linked interpretations
2. Build AssumptionLedger: record(text, confidence, source), link_conclusion(assumption_id, conclusion_id), invalidate(assumption_id, reason)
3. Implement invalidation propagation: invalidate() → emit assumption_invalidated event → subscription flags all linked conclusions as under_review
4. Wire assumption creation into Strategy Engine and Simulation outputs: assumptions are named explicitly in every strategy and simulation
5. Build Assumptions page in Console: assumption list with status badges, confidence, linked conclusion count; invalidation action with confirmation

---

### Task 24 — Decision Impact Graph

**Depends on:** 13, 16, 22

**What & Why**
The consequence tracking layer. A separate directed graph tracking which decisions led to which outcomes. Counterfactuals recorded. Most impactful decisions surfaced by the Reflection Engine. Explicitly separate from the Intelligence Graph.

**Done looks like**
- impact_nodes table: node_id, node_type (decision/outcome), object_ref
- impact_edges table: edge_id, from_node_id, to_node_id, consequence_type (led_to/prevented/enabled/blocked), confidence, counterfactual_note
- Decision nodes created automatically when a governance-approved decision is logged
- Outcome edges linked manually or via Reflection Engine pattern detection
- Counterfactuals: "what would have happened if this decision had not been made" — recorded as notes on outcome edges
- Impact Graph visualization in Console: separate from Intelligence Graph visualization
- Most impactful decisions surfaced in weekly and monthly Reflection summaries

**Out of scope**
- Automated outcome detection (manual linking and Reflection Engine pattern detection only)
- Impact forecasting (retrospective only)

**Steps**
1. Define impact_nodes and impact_edges schemas; separate DB tables from Intelligence Graph nodes/edges
2. Build DecisionImpactGraph: add_decision_node(governance_decision_id), add_outcome_edge(from_decision, to_outcome, consequence_type, counterfactual_note)
3. Wire governance decision logging: when a HIGH or CRITICAL governance item is approved, create a decision node automatically
4. Implement Reflection Engine integration: during period summarization, identify decisions whose outcomes are now visible; prompt outcome edge creation
5. Build Impact Graph visualization in Console: separate page from Intelligence Graph; force-directed layout with consequence_type edge labels

---

### Task 25 — Digital Twin Timeline

**Depends on:** 1, 12, 13, 22, 24

**What & Why**
The operational history layer. The founder's full operational record as a scrollable, zoomable, filterable timeline. Events sourced from the Event Log, connector syncs, brief summaries, governance decisions, and state changes.

**Done looks like**
- Timeline renders with events from all sources: project milestones, decisions made, people interactions, briefs delivered, connector sync highlights, assumption invalidations, state changes, governance decisions
- Filter by: project, person, date range, event type
- Individual events link to full object detail (click a brief → opens the brief; click a decision → opens the governance record)
- Timeline scrollable and zoomable; event density manageable at all zoom levels (grouping / clustering at far zoom)
- Timeline page in Console
- Timeline events queryable via the Query Engine

**Out of scope**
- Real-time timeline updates (refreshed on page load and on manual refresh)
- Timeline export to external formats

**Steps**
1. Define timeline_events as a projection over the Event Log: query Event Log, connector sync records, brief records, governance records, and state history to produce a unified timeline event stream
2. Build TimelineEngine: get_events(filters) → sorted, paginated timeline events with source type and object_ref
3. Build Timeline visualization in Console: virtualized scrolling list or canvas-based timeline; zoom levels: day / week / month / quarter; event grouping at far zoom
4. Implement filter UI: project multi-select, person multi-select, date range picker, event type checkboxes
5. Wire event click → object detail navigation: each event type routes to its appropriate detail page

---

### Task 26 — Query Engine

**Depends on:** 1, 12, 13, 21

**What & Why**
The universal data access layer beneath all intelligence engines. No intelligence engine reads from Memory, Fact Ledger, Interpretation Ledger, Intelligence Graph, or Event Log directly. All reads go through the Query Engine. Single retrieval policy, single ranking algorithm, single cache, single authorization layer, single confidence aggregation system.

**Ranking algorithm:** base_score = importance × freshness × confidence × relevance_to_context. Per-purpose modifiers applied as weights on top of the base score. Consistent algorithm applied to all result types.

**Query result format:** Every result includes why_included — a breakdown of the ranking factors that determined its position. This makes retrieval transparent and feeds the Why Chain.

**Done looks like**
- QueryEngine.query(spec) where spec includes: sources, filters, ranking_policy, confidence_threshold, limit, requester, purpose
- Single ranking algorithm applied consistently to all results
- Shared query cache keyed by normalized spec; TTL varies by purpose; event-driven invalidation
- Authorization layer: engine-to-store permission matrix enforced before query execution
- Confidence aggregation: composite confidence on results spanning multiple sources
- ConstitutionEngine.check() called before executing any query
- Query telemetry logged: requester, purpose, sources, result count, cache hit/miss, execution time
- All intelligence engines refactored to use Query Engine exclusively; no direct DB queries from intelligence engines
- Context Engine and Brief Engine retrieval refactored to submit Query Engine calls

**Out of scope**
- Full-text search (that is the Semantic Index, Task #28)
- Write operations (Query Engine is read-only)
- External data retrieval (Connector Engine handles that)

**Steps**
1. Define query_log schema for telemetry and query_cache schema (or in-memory with DB fallback)
2. Build QueryEngine core: query(spec) → ranked results; Zod spec validation; ConstitutionEngine.check() before execution
3. Implement ranking algorithm: base_score = importance × freshness × confidence × relevance; per-purpose ranking_policy modifiers
4. Build query cache: shared cache with TTL and event-driven invalidation via Event Log subscription
5. Implement authorization layer: engine-to-store permission matrix enforced before execution
6. Implement confidence aggregation: when spanning multiple sources, apply Confidence Propagation rules to produce composite propagated_confidence on results
7. Standardize result format: StandardQueryResult type with why_included factor breakdown
8. Refactor Context Engine and Brief Engine to submit all retrieval through Query Engine
9. Refactor all intelligence engines (Understanding Pipeline, Curiosity, Strategy, Reflection, Identity) to use Query Engine exclusively
10. Expose query performance metrics to Health Engine; surface in Health page

---

### Task 27 — Explanation Engine

**Depends on:** 5, 22, 26

**What & Why**
The audience-aware translation layer. Translates Lee's internal state — objects, Why Chains, strategies, simulations, relationships — into explanations tailored to a specified audience. Reusable everywhere that requires communicating complex internal state in plain language.

**Audience profiles:** Developer, Investor, Founder, Executive, Legal, Technical, General. Each profile has defined vocabulary level, depth, tone, emphasis, and sentence length preference.

**Done looks like**
- Explanation Engine callable from Ask Lee, Brief Engine, and Strategy page
- Explanation types: Object, Reasoning, Relationship, Graph, Timeline, Comparison, Risk
- Explanations stored as Interpretation Ledger records; reused until source objects change (event-driven invalidation)
- Every explanation includes its own Why Chain (why these facts were included, why this audience profile was applied)
- Ask Lee shows audience profile badge on explanation responses with option to switch profile
- Quality feedback (good / needs improvement) routed to Learning Engine; trust signal updated for Explanation Engine subsystem

**Out of scope**
- Multi-language support (English only)
- Real-time translation of external content
- Explanations of Lee's own source code

**Steps**
1. Define explanations as Interpretation Ledger records with explanation-specific fields: audience_profile, explanation_type, source_object_ids, explanation_brief
2. Define all audience profile records in the Capability Registry: vocabulary_level, depth, tone, emphasis, sentence_length_preference
3. Build ExplanationBriefAssembler: for a given object + type, queries Query Engine for relevant facts and Why Chains; structures explanation brief
4. Build ExplanationEngine: explain(object_id, explanation_type, audience_profile) → explanation; calls assembler → Model Router → attaches Why Chain → stores as Interpretation Ledger record
5. Implement explanation cache: cache by object_id + type + audience_profile; invalidate via Event Log subscription on source object changes
6. Wire Intent Engine (Task #31): explanation-seeking intents routed through Explanation Engine with detected audience profile
7. Wire Ask Lee: return explanation with Why Chain, source links, and audience profile badge
8. Wire Brief Engine: call Explanation Engine for complex narrative sections
9. Add "Explain for Investor" / "Explain for Executive" actions to Strategy page items

---

### Task 28 — Semantic Index

**Depends on:** 3, 12, 26

**What & Why**
The discovery layer. A vector embedding store indexed over all Lee's knowledge. Enables fuzzy semantic search: "What was that conversation six months ago where Olivia mentioned pilots?" Not storage — all data lives in its primary store. The Semantic Index is discovery-only. Stage 6 of the Memory Compression Roadmap.

**Privacy constraint (ABSOLUTE constitutional provision):** Semantic Index embeddings are stored locally. They are never transmitted to external services without explicit governance approval.

**Done looks like**
- Embedding store covers: fact chunks, interpretation summaries, source documents, conversation turns, brief sections, decision records, object names and descriptions
- SemanticIndex.search(query_text, filters, top_k, requester) → ranked results with similarity scores and excerpts
- Query Engine calls SemanticIndex.search() for discovery-mode queries (intent classified as fuzzy/exploratory)
- Index freshness tracked: objects modified since last indexing flagged as semantically stale; staleness rate in Health page
- Full rebuild utility: runs as background job at LOW priority; estimated progress shown in Health page
- Semantic Index included in Brain exports; rebuild scheduled on restore if incomplete

**Out of scope**
- Real-time semantic indexing (eventual consistency acceptable)
- Cross-owner or federated semantic search
- Semantic clustering or topic modeling (Curiosity Engine capabilities)

**Steps**
1. Install and configure embedding model (local or governance-approved API); define EmbeddingService interface; track embedding costs in Cost Engine
2. Set up embedding store (pgvector or equivalent): embedding_id, object_id, object_type, embedding_vector, indexed_at, model_version, excerpt
3. Build IndexWriter: index_object(object_id, type) → text representation → embedding → store; queue-based at LOW priority
4. Build freshness tracker: compare last_modified against indexed_at; compute semantic_staleness_count; expose to Health Engine
5. Build SemanticIndex.search(): embed query → cosine similarity search → apply filters → return ranked results with excerpts
6. Wire Query Engine to call SemanticIndex.search() for discovery-mode queries; merge semantic and structured results
7. Build index rebuild utility: truncate + re-queue all objects; register as Health Engine self-healing action; show progress in Health page
8. Add Constitution ABSOLUTE provision: "Semantic Index embeddings stored locally; never transmitted externally without governance approval"; wire into IndexWriter
9. Wire index into Brain exports; implement post-restore completeness verification and rebuild scheduling

---

### Task 29 — Policy Engine

**Depends on:** 1, 19

**What & Why**
The mutable operational policy layer. Sits between the immutable Constitution and the case-by-case Governance Engine. Manages policies that change over time without requiring a constitutional amendment. Policies are versioned, auditable, and consistently enforced.

**Built-in policy types:** Cost Policy, Privacy Policy, Retention Policy, Notification Policy, Relationship Policy, Backup Policy, Connector Policy.

**Done looks like**
- PolicyEngine.check(policy_type, action, context) → { permitted, value, constraints, applied_policy_version }
- Every consultation logged to Event Log
- Policy violations create governance holds (not constitution violations); violations are overridable by governance approval
- All built-in policies seeded with sensible defaults at installation
- Policy page in Settings: current values with descriptions, change history, edit form with validation
- Policy versioning: every change creates a new version; rollback to previous version available with governance MEDIUM approval
- All engines wire PolicyEngine.check() before acting: Model Router (Cost), Context Engine (Privacy), Notification Engine (Notification), Connector Engine (Connector), Backup Engine (Backup)

**Out of scope**
- Automated policy generation from documents
- Policies that require constitutional amendment
- External policy enforcement

**Steps**
1. Define policy_records and policy_consultations schemas: policy_id, policy_type, version, values JSONB, created_at, change_reason, superseded_at
2. Build PolicyEngine: check(policy_type, action, context) → result; load active version; evaluate; log consultation
3. Define all policy types with fields, valid ranges, and defaults; seed all defaults at installation
4. Implement policy versioning: create_version(), rollback(); rollback requires governance MEDIUM approval
5. Wire PolicyEngine.check() into all relevant engines (Model Router, Context Engine, Brief Engine, Notification Engine, Connector Engine, Backup Engine)
6. Implement policy violation → governance hold creation; never silent skip
7. Build Policy page in Settings: per-policy-type sections with current values, descriptions, change history, edit forms

---

### Task 30 — Resource Engine

**Depends on:** 1, 10

**What & Why**
The resource awareness layer. Continuously tracks all resource dimensions and exposes the current resource state to the Orchestration Engine before every job dispatch. Scheduling is resource-aware: constrained resources defer non-critical work automatically.

**Dimensions tracked:** CPU, RAM, disk space, token budget, cost budget, API quotas per connector, network quality, Android battery (when paired).

**State levels per dimension:** HEALTHY / CONSTRAINED / CRITICAL.

**Done looks like**
- ResourceEngine.get_state() → { overall_state, dimensions: { cpu, memory, disk, token_budget, cost_budget, api_quotas, network, battery } }
- Orchestration Engine calls get_state() before every dispatch; CONSTRAINED defers LOW/NORMAL jobs; CRITICAL defers everything except CRITICAL priority
- API quota tracker: per-connector requests remaining, quota reset time, updated after every connector sync
- Token budget tracker: daily tokens used, burn rate, projected quota exhaustion time
- Android battery dimension updated by Android app on session start and significant battery change
- Resource health card in Health page: current state per dimension, trends, quota countdowns
- CRITICAL state creates a CRITICAL health alert; CONSTRAINED creates an in-app notification

**Out of scope**
- Container-level resource management
- Network traffic shaping
- Storage tiering based on disk pressure (Memory Architecture handles archival)

**Steps**
1. Define resource_snapshots and resource_alerts schemas
2. Build ResourceSampler: sample_all() every 30 seconds; compute rolling 5-minute averages; store snapshots
3. Implement state level calculator: HEALTHY / CONSTRAINED / CRITICAL per dimension from Policy Engine thresholds (Resource Policy)
4. Build API quota tracker: update per-connector quota state from response headers after each sync; expose remaining quota and reset time
5. Build token budget tracker: read from Cost Engine; compute burn rate and exhaustion projection
6. Implement network quality monitor: latency probe to model provider endpoints every 5 minutes; classify high/degraded/offline
7. Implement Android battery dimension: Android app reports on session start and on significant battery change
8. Wire Orchestration Engine: call ResourceEngine.get_state() before dispatch; implement CONSTRAINED and CRITICAL deferral logic
9. Build Resource health card in Health page: all dimension cards with trends, quota countdowns, alert states

---

### Task 31 — Intent Engine

**Depends on:** 1, 26

**What & Why**
The intent classification layer. Every request — from Ask Lee, the Android app, a scheduled job, or an internal engine — produces a typed Intent record before anything else happens. All downstream decisions use the Intent record: retrieval mode, model selection, audience profile, context scoring.

**Intent record fields:** intent_id, raw_input, intent_type, intent_subtype, detected entity IDs, audience_profile, urgency, requires_model, model_complexity_estimate, retrieval_mode, explanation_type, confidence, session_id, source.

**Intent types:** question_factual, question_exploratory, explanation_seeking, recommendation_request, simulation_request, strategy_request, draft_request, review_request, capture_input, approval_action, governance_action, navigation_request, status_check, configuration_change.

**Done looks like**
- IntentEngine.classify(raw_input, session_context) → Intent record; uses cheap fast model
- Intent shown in Ask Lee before context assembly: "Understood as: [type] about [entities]" with Correct button
- Corrections feed the Learning Engine
- Query Engine, Model Router, Explanation Engine, and Context Economy all consume the Intent record
- Scheduled jobs produce synthetic Intent records; same pipeline for human and machine requests
- Intent history browsable in Ask Lee with intent badge on each turn

**Out of scope**
- Multi-turn intent tracking across sessions (each turn produces its own Intent record)
- Predictive intent (Curiosity Engine capability)
- Intent classification for structured governance forms

**Steps**
1. Define intent_records schema with all fields; indexes on intent_type, session_id, generated_at
2. Build IntentEngine: classify(raw_input, session_context) → Intent record; cheap model call with structured classification prompt; confidence score required
3. Build classification prompt: all intent types and subtypes defined; entity detection from session context; audience profile detection; complexity estimate
4. Build intent correction UI in Ask Lee: classified intent displayed with Correct button; corrections feed Learning Engine
5. Implement entity detection: fuzzy-match against known projects, people, and active objects; populate detected entity ID fields
6. Wire Intent record into Query Engine, Model Router, Explanation Engine, and Context Economy
7. Build synthetic intents for scheduled jobs: brief generation, freshness scan, connector sync — all produce Intent records
8. Wire intent history into Ask Lee: intent badge on each conversation turn; click to see full Intent record

---

### Task 32 — State Engine

**Depends on:** 1, 10

**What & Why**
Lee's operational state at every moment. Defined finite states with defined transition rules. State is visible on all UI surfaces. Orchestration Engine reads state before dispatch — state simplifies deferral logic from many condition checks to one state read.

**States:** Booting, Learning, Idle, Thinking, Briefing, Importing, Synchronizing, Waiting, Recovering, Offline, Degraded.

**Done looks like**
- Exactly one primary state at all times; invalid transitions rejected and logged
- All state transitions logged to Event Log with entered_at, exited_at, duration, reason
- Status bar shows current state with appropriate styling: Thinking → subtle pulse; Offline → disconnected icon; Recovering/Degraded → amber badge
- Orchestration Engine uses state for deferral: heavy jobs deferred when Thinking; model calls deferred when Offline; Waiting surfaces governance queue
- Android app shows current state prominently on Today screen when not Idle
- State history in Health page: timeline of transitions, time-in-state aggregates

**Out of scope**
- Parallel primary states
- State-based UI themes
- User-triggered state transitions

**Steps**
1. Define lee_state and state_history schemas; state enum; indexes on current_state, entered_at
2. Build StateEngine: get_state() → current state record; transition(new_state, reason, triggering_job_id) → validates, writes, emits Event Log event
3. Define full state transition graph; reject and log invalid transitions
4. Wire Orchestration Engine: call transition() on job start/finish; use get_state() for deferral decisions
5. Build state badge in Console status bar with state-appropriate styling
6. Wire Android app: show state on Today screen; Offline state shows local capture queue size
7. Implement estimated duration for Importing and Thinking states; show in status bar tooltip
8. Build State History section in Health page: transition timeline, time-in-state aggregates, filter by state and date range

---

### Task 33 — Internal API Contracts & Capability Registry

**Depends on:** 1, 10

**What & Why**
The engine modularity layer. Every engine exposes a versioned, typed REST API surface at /internal/[engine-name]. Contracts are Zod-validated on every request and response. The Capability Registry is a central registry where every engine registers on startup. Orchestration Engine routes via the registry — not hardcoded config.

**Constitutional constraint (ABSOLUTE):** Internal APIs are not exposed externally. The /internal/ namespace is never accessible outside the Lee system.

**Named engine APIs include:** Memory API (remember, forget, retrieve, promote, archive), Query API, Strategy API (evaluate, prioritize, recommend), Reflection API (compare, summarize, trend), Explanation API, Intent API, State API, Policy API.

**Done looks like**
- Every engine exposes GET /internal/[engine]/health and GET /internal/[engine]/capabilities at minimum
- All internal API request/response shapes Zod-validated at runtime; malformed requests return typed errors
- Capability Registry populated by all engines on startup; registration failure = boot error
- Engine registration includes: capabilities, dependencies, inputs, outputs, version, owner
- Heartbeat every 60 seconds; missed heartbeat × 3 → engine marked UNAVAILABLE → health alert; State Engine transitions to Degraded
- Orchestration Engine resolves job routing from registry; dependency graph from registry
- Engines panel in Health page: all registered engines with status, version, last heartbeat, capabilities

**Out of scope**
- External API contracts (handled by OpenAPI spec and Orval codegen)
- Plugin architecture or third-party engine loading
- Dynamic capability negotiation per-request

**Steps**
1. Define engine_registrations schema: engine_id, name, version, status, owner, registered_at, last_heartbeat, capabilities JSONB, dependencies JSONB, inputs JSONB, outputs JSONB
2. Build CapabilityRegistry: register(engine_spec), heartbeat(engine_id), get_all(), get_by_id(), get_by_capability(); heartbeat timeout detection every 60s
3. Implement engine registration on startup for all engines; registration failure = boot error; log to audit trail
4. Define Zod schemas for all named engine API actions; validate all internal API requests and responses at runtime
5. Add Constitution ABSOLUTE provision: "Internal APIs not exposed externally"; /internal/ route namespace enforced as private-only
6. Build Memory API, Query API, Strategy API, Reflection API, Explanation API, Intent API, State API, Policy API with Zod validation on all actions
7. Update all engine callers to use internal API contracts instead of direct function calls or DB queries
8. Wire Orchestration Engine to resolve job routing via CapabilityRegistry; replace hardcoded engine references
9. Implement heartbeat sender in every engine; implement timeout detection; UNAVAILABLE status → health alert → State Engine Degraded
10. Build Engines panel in Health page: engine cards with status, version, last heartbeat, capabilities, dependency graph

---

### Task 34 — Context Economy

**Depends on:** 5, 12, 20, 26

**What & Why**
The dynamic context relevance layer. Replaces static tier-based context weights with a continuous scoring formula. Every object competing for a context packet earns its position. The highest-scoring objects within the token budget always win — regardless of memory tier.

**Formula:**
```
Context Value =
  (Goal_Match     × W_goal)
× (Recency        × W_recency)
× (Importance     × W_importance)
× (Relationship   × W_relationship)
× (Project_Activity × W_project)
× (Confidence     × W_confidence)
× (Trust          × W_trust)
× (Mode_Relevance × W_mode)
```

All factors normalized to [0, 1]. Multiplicative — any zero factor eliminates the object from contention. Weights configurable per intent type via the Policy Engine.

**Done looks like**
- Context Economy formula replaces tier-based assembly in the Context Engine
- All 8 factor calculators implemented: Goal_Match (semantic similarity or keyword overlap), Recency (decay function), Importance, Relationship (Intelligence Graph connection strength), Project_Activity (recent event count), Confidence, Trust, Mode_Relevance
- Context Packet Preview shows each object's Context Value score and factor breakdown
- Excluded objects visible in a collapsed section with their scores and why they were outcompeted
- Weights configurable per intent type in Settings under Context Tuning
- Feedback (helpful / unhelpful on responses) routes to Learning Engine for weight calibration
- Cold-start defaults for new objects: Confidence 0.5, Importance 0.5, Relationship 0.0 — new objects can still compete on Goal_Match and Recency

**Out of scope**
- Real-time re-scoring during a model call (computed once at assembly time)
- Token-level packing optimization (objects included or excluded as units)

**Steps**
1. Define context_scores schema for audit: object_id, intent_id, context_value_score, factor_breakdown JSONB, included bool, exclusion_reason, computed_at
2. Implement all 8 factor calculators: each accepts the object and current Intent record; returns [0, 1] value; independently testable
3. Build ContextEconomy: score(object, intent, mode, weights) → { context_value, factor_breakdown }; log to context_scores
4. Define default weights per intent type; store as Policy Engine records; expose weight editing in Settings under Context Tuning
5. Implement Goal_Match: semantic similarity via Semantic Index when available; keyword overlap fallback when not
6. Build ContextBudget: given scored objects and token budget, greedily select highest-scoring objects that fit; return included and excluded with scores
7. Replace tier-based assembly in Context Engine with Context Economy scoring + ContextBudget selection
8. Update Context Packet Preview: show Context Value score and factor breakdown per object; add Excluded section with competition scores
9. Wire helpful/unhelpful feedback → Learning Engine → weight calibration suggestions per intent type
10. Implement and test cold-start defaults; verify new high-relevance objects win against older low-relevance objects

---

## Architecture Notes

### Intelligence / Presentation Separation (First-Class Principle)

Every capability must exist independently of any UI surface. The Console, the Android app, a future CLI, a voice interface, and the API all consume identical services via the Internal API surface (Task #33). Nothing is implemented "because the web UI needs it." This is verified by confirming that every intelligence capability is callable via the internal API surface without any UI being present.

### Event Sourcing as Recovery Primitive

The Event Log is append-only. Any destructive operation against the Event Log is a constitutional violation. The acceptance criterion for the Event Log is re-projection: rebuilding the full database state from the Event Log alone produces a result consistent with the current DB. Backups include the full Event Log. Restores replay events before finalizing.

### Confidence vs. Trust — Never Conflate These

| Dimension | Confidence | Trust |
|-----------|-----------|-------|
| What it measures | Epistemic certainty of a specific object | Reliability of a subsystem over time |
| Range | 0–1 | 0–100 (starts at 50) |
| Decay | Per inference hop (degradation factor) | 0.5/day without activity |
| Rises when | Source quality is high; chain is short | Owner verifies accuracy of subsystem outputs |
| Used in | Why Chain, Brief filtering, Context Economy | Context Economy (Trust factor), curiosity item weighting |

### Context Packet Assembly Order (v4.0)

```
1. Classify request → Intent record (Intent Engine)
2. Query candidate objects → (Query Engine with intent spec)
3. Score all candidates → (Context Economy formula)
4. Select within token budget → (ContextBudget greedy selection)
5. Assemble packet → (scores and factor breakdowns visible in Context Packet Preview)
6. Route to Model Router → (with Intent record and assembled packet)
7. Return explanation-type responses through Explanation Engine (if intent.explanation_type is set)
```

### Brain Version vs. Lee Version

| Concept | Definition | Changes When |
|---------|-----------|-------------|
| Lee Version | Software version of the Lee application | Code is updated |
| Brain Version (YYYY.M.minor) | Logical version of the owner's accumulated knowledge | Memory schema, Constitution, Policies, Semantic Index, or Knowledge graph structure changes |

Every backup manifest records both. Migration scripts operate on Brain Version differences, not Lee Version differences.

---

*Plan version: 4.0 · Task count: 34 · Date: July 2, 2026*
*New in v4.0: Tasks #26–#34 (Query Engine, Explanation Engine, Semantic Index, Policy Engine, Resource Engine, Intent Engine, State Engine, Internal API Contracts & Capability Registry, Context Economy) · Task #9 updated with Brain Versioning · 4 new Architecture Principles added · Context Packet Assembly Order formalized · Capability Levels updated*
