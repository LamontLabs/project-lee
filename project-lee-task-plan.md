# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Named after the founder's grandmother.*
*Generated: July 2, 2026 · Version 2.0 — 18 Tasks*

---

## Vision

Lee is not a chatbot with memory bolted on. She starts with operating continuity and treats the language model as one interchangeable capability within a much larger system. She is a persistent digital Chief of Staff — she doesn't replace your thinking, she protects it. She doesn't replace your decisions, she prepares them. She doesn't replace your memory, she preserves it.

---

## Full Task Map

| # | Task | Depends On |
|---|------|-----------|
| 1 | Foundation — Data Layer & API Server | — |
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
| 12 | Tiered Memory Architecture | #1, #3 |
| 13 | Intelligence Graph & Personal Knowledge Map | #3, #12 |
| 14 | Curiosity Engine & Opportunity Engine | #3, #4, #13 |
| 15 | Health Engine & Self Monitoring | #1, #4, #10 |
| 16 | Strategy, Simulation & Reflection Engines | #5, #11, #13 |
| 17 | Learning Engine | #3, #11, #13 |
| 18 | Adaptive Workspace & Relationship Intelligence | #2, #6, #11, #14 |

---

## Task #1 — Lee Foundation — Data Layer & API Server

### What & Why
Build the durable core of Project LEE: the database schema, API server, authentication, object storage, and all foundational data structures. This is the bedrock every other phase builds on. Everything in Lee flows through this layer — nothing can be built without it.

### Done looks like
- Private Lee API server running on Replit (Express, TypeScript) with health check and versioning
- PostgreSQL database with the complete Universal Object Model schema: objects (projects, people, companies, documents, files, conversations, messages, meetings, ideas, tasks, decisions, questions, risks, opportunities, sources, waiting loops, notifications, context packets, model calls, briefs), each with the full standard field set (id, type, name, description, created_at, updated_at, last_confirmed_at, status, confidence, freshness, importance, source_refs, related_objects, history, permissions, version)
- Event Log table capturing every meaningful state change (event_id, type, timestamp, actor, source, payload, affected_objects, processing_status, result, error)
- Reality Ledger table for belief records (statement, belief_type — declared/observed/extracted/inferred/predicted/speculative/rejected/superseded — confidence, status, source_evidence, first_seen, last_confirmed, freshness, related_project, related_person, risk_if_wrong, superseded_by)
- Canon System field on all applicable records (scratch / candidate / working / locked / canonical)
- Source Vault table (original_filename, source_type, upload_time, original_creation_time, checksum, storage_path, related_projects, related_people, processing_status, privacy_level, chunk_count, summary, evidence_quality)
- Object storage bucket (Replit App Storage) for raw files (PDFs, DOCX, exports, screenshots, voice notes, transcripts, backups)
- Connector metadata table (name, provider, auth_method, permission_scopes, read_caps, write_caps, risk_level, sync_schedule, webhook_support, last_sync, error_state, rate_limits, data_types, retry_rules, token_refresh, disconnect_flow, audit_log)
- Cost ledger table (model_call_id, provider, model, project_id, workflow, tokens_in, tokens_out, cost_usd, timestamp, cached, reused)
- Audit log table (action, actor, target_id, target_type, timestamp, risk_level, verdict, source)
- Private authentication: single-user session-based login (no public sign-up, one owner only), protected behind env-based credentials
- All API routes use Zod validation; all DB access goes through Drizzle ORM
- OpenAPI spec updated to cover all core CRUD endpoints for every entity
- Database push script verified and working

### Out of scope
- AI model calls or model routing (Task #5)
- File parsing and entity extraction (Task #3)
- Connector auth flows with real services (Task #6)
- Android API surface (Task #7)
- Scheduled jobs / background worker (Task #4)
- UI / frontend (Task #2)

### Steps
1. **Authentication layer** — Implement private single-user session auth on the API server; protect all routes behind login; use env-based owner credentials; include session timeout and secure cookie handling
2. **Universal Object Model schema** — Define Drizzle schema for all Lee object types with the full standard field set; use JSONB for flexible fields (source_refs, related_objects, history, permissions); add proper indexes on id, type, status, and created_at
3. **Event Log schema** — Define the event_log table with all required fields; ensure every state-changing API handler writes an event; build an event emitter utility the rest of the server can use
4. **Reality Ledger schema** — Define the reality_beliefs table with all belief types and canon levels; build CRUD endpoints for belief management
5. **Source Vault schema + object storage** — Define the sources table; integrate Replit App Storage for raw file uploads; ensure raw files are preserved untouched after upload
6. **Connector, Cost, and Audit tables** — Define schemas for connector_configs, cost_ledger, and audit_log; build CRUD endpoints for each
7. **Waiting loops and notifications tables** — Define waiting_loops (start_date, last_touch, days_waiting, person_id, project_id, expected_window, risk, recommended_action, notification_level) and notifications tables
8. **Core API routes** — Build full CRUD REST endpoints for: projects, people, companies, decisions, tasks, waiting loops, sources, reality beliefs, cost entries, notifications, connectors, audit records
9. **OpenAPI spec** — Update lib/api-spec/openapi.yaml to reflect all new endpoints and schemas; run codegen
10. **Database push + seed** — Push schema to Postgres; add a seed script with canonical Lee truths (the constitution, locked decisions about Replit-first, portability law, etc.) and starter reality beliefs

---

## Task #2 — Lee Console — Private Web Interface

*Depends on: Task #1*

### What & Why
Build the Lee Console: the private, hosted web interface that is Lee's primary control surface. This is not a generic SaaS dashboard — it is a personal command center. Calm, structured, evidence-backed, alive. Dark mode. The user should open this every morning and feel oriented without rebuilding context manually.

### Done looks like
- React + Vite web app running at the root path (`/`) on Replit
- Private: login wall protects the entire console; only the owner can access
- **Top status bar** always visible: Project LEE name, current date/time, system health indicator, cost today, pending approvals count, notification count, current model mode, backup status
- **Left navigation** with all sections: Today, Ask Lee, Projects, People, Decisions, Waiting, Evidence, Imports, Connectors, Costs, Governance, Backups, Settings
- **Right context rail** on applicable pages: current context packet, related sources, recent changes, confidence indicator, freshness indicator, action buttons, evidence links
- **Today page**: Lee's Brief card, top priority, what changed, waiting loops, upcoming meetings, stale context warnings, active risks, open approvals, recommended next moves, cost status, system health, recent captures, backup status
- **Ask Lee page**: message area with conversation history, project/person detection indicator, mode selector (Normal / Deep Think / Build / Write / Review / Pilot / Low Cost / Private / No Model / Governed Action), cost estimate display, context packet preview panel, model route indicator, save-as-decision button, create-task button, lock-context button, mark-as-scratch button, export-answer button, evidence panel
- **Context Packet Preview**: before any expensive answer, Lee shows detected intent, active project, relevant people, included/excluded context, decisions used, sources used, estimated cost, selected model, risk level — with Run / Use Cheaper Model / Packet Only / Edit Packet / Cancel options
- **Projects page**: card grid showing name, status, priority, health, freshness, last activity, waiting loop count, open risks, next action; clicking opens full project detail with Overview, Current State, Timeline, Decisions, Files, People, Waiting, Risks, Opportunities, Evidence, Briefs, Context Packets, Outdated Context, Exports tabs; CerbaSeal projects get a Pilot Mode tab
- **CerbaSeal Pilot Mode tab**: pilot status, Olivia/LineAxia timeline, security review readiness, artifacts sent/pending, open questions, questions owed, meeting history, follow-up recommendations, pilot health score, momentum indicator, risks, next best action, draft follow-up
- **People page**: person cards showing name, role, org, related project, last contact, waiting status, relationship sensitivity, follow-up window, open loop; detail page with Timeline, Messages, Meetings, Decisions Influenced, Documents Shared, Open Questions, Tone Notes, Risks, Recommended Next Action, Evidence
- **Decisions page**: ledger with views for Locked / Canonical / Working / Candidate / Superseded / Rejected / Needs Review; decision detail shows decision, why, when, source, affected projects, confidence, supersedes, risk if wrong, review date; actions: Lock, Downgrade, Supersede, Reject, Add Evidence
- **Waiting page**: list of all open waiting loops with person/org, project, days waiting, last touch, expected window, risk level, recommended action, notification threshold; actions: Snooze, Resolve, Prepare Follow-up, Mark Stale, Ask Lee
- **Evidence page**: source browser with filters (project, person, source type, date, confidence, processing status); detail shows raw file link, parsed text, chunks, summary, extracted entities, decisions found, related beliefs, related projects
- **Imports page**: drag-and-drop upload area supporting ChatGPT export (JSON), PDF, DOCX, Markdown, TXT, screenshot, transcript, email thread paste, manual note; recent imports list with processing status; detected projects/people/decisions; needs-review queue
- **Connectors page**: connector cards (provider, status, last sync, next sync, permissions, errors, risk level, available actions); Phase 1 shows Manual Upload connector as active; all others shown as "coming soon" with their planned capabilities described
- **Costs page**: today/week/month cost; budget remaining; cost by provider, model, project, workflow; most expensive actions list; CIL savings, cache savings, avoided calls; projected monthly; budget controls (daily/weekly/monthly limits, strong-model approval threshold, low-cost mode toggle)
- **Governance page**: approval queue with pending actions, risk level, reason, related source, recommended verdict; Approve / Hold / Reject / Edit / Ask Why actions; sensitive actions show evidence before action buttons
- **Backups page**: last backup time, health, size, location, restore test status; Export Lee Brain button; Import Lee Brain button; Download Archive; Verify Archive; Migration Readiness indicator
- **Settings page**: owner profile, model provider API key management (masked), notification preferences, session management, feature flags, app version, schema version, export format version
- Visual design: dark mode first, soft contrast, readable serif/mono typography, clear spacing, status badges (green/amber/red/blue/purple/gray per spec), confidence indicators, freshness indicators, no noisy animations, no emojis anywhere in UI
- All data fetched from the Lee API using generated React Query hooks; no mocked data in final state

### Out of scope
- Actual AI model calls wired end-to-end (Task #5 wires Ask Lee fully)
- Real connector auth flows (Task #6)
- Scheduler / background jobs (Task #4)
- Android (Task #7)

### Steps
1. **Create the react-vite artifact** at path `/` — configure with dark-mode-first theme and the Lee color system (green/amber/red/blue/purple/gray functional palette)
2. **Authentication wall** — gate the entire app behind a login screen; session cookie persists until timeout; no public routes except `/login`
3. **Shell layout** — build the persistent top status bar, left navigation, main workspace area, and right context rail; wire status bar data to live API calls
4. **Today page** — build the home screen with all sections; Lee's Brief card shows placeholder when no brief exists yet
5. **Ask Lee page** — build the conversation UI with mode selector, cost estimate display, context packet preview panel, and all action buttons; actual AI call integration deferred to Task #5 but UI fully built
6. **Projects pages** — projects list with card grid; full project detail with all tabs; CerbaSeal Pilot Mode tab fully built
7. **People pages** — people list with cards; full person detail with timeline and all sections
8. **Decisions page** — full decision ledger with all views, filters, and decision detail with all actions
9. **Waiting page** — full waiting tracker with all columns and action buttons
10. **Evidence page** — source browser with all filters and detail view
11. **Imports page** — upload area with file type support, recent imports list, processing status, needs-review queue
12. **Connectors, Costs, Governance, Backups, Settings pages** — build all remaining pages fully
13. **Right context rail** — build the context rail component; pulls context packet, related sources, freshness, confidence from API
14. **Polish and consistency** — typography, spacing, color system, status badges consistent across all pages; verify no emojis appear anywhere

---

## Task #3 — Lee Understanding Pipeline — Imports & Extraction

*Depends on: Task #1, Task #2*

### What & Why
Build the intelligence layer that transforms raw uploads into operational understanding. When you drop a PDF, a ChatGPT export, or a transcript into Lee, this pipeline reads it, chunks it, detects what projects/people/decisions it touches, updates the Reality Ledger, and queues anything uncertain for your review. This is how Lee learns from evidence instead of assumption.

### Done looks like
- Background worker process that picks up uploaded files from the Source Vault and processes them through the pipeline
- Parser support for all Phase 1 import types: ChatGPT JSON export, PDF, DOCX, Markdown, TXT, plain email thread paste, screenshot (OCR via API), transcript (plain text), manual note
- **Chunking engine** — splits parsed text into semantically coherent chunks with metadata (source_id, chunk_index, char_range, token_estimate)
- **Understanding Engine** — for each chunk, asks: What happened? What changed? Which project is affected? Which person is involved? Is this new? Is this a decision? Is this a task? Is this a risk? Is this an opportunity? Does this contradict something existing? Does this make older context stale?
- **Entity extraction** — project detection (fuzzy name match), person detection, decision detection (keyword + pattern detection), task detection, risk detection
- **Reality updates** — when new evidence confirms, contradicts, or refines an existing belief, the Reality Ledger is updated with updated confidence, updated last_confirmed_at, the new source linked as evidence, a contradiction flag if applicable
- **Contradiction Engine** — detects when new evidence conflicts with an existing locked or canonical belief; never silently resolves high-impact contradictions
- **Evidence Graph links** — after extraction, creates relationship links: projects ↔ documents, documents ↔ decisions, people ↔ emails, meetings ↔ action items, briefs ↔ sources
- **Needs-review queue** — any detected entity or belief update with confidence below threshold is placed in the needs-review queue; user can approve, reject, or edit each suggestion
- **Belief type tagging** — all extracted beliefs tagged: declared, observed, extracted, inferred, speculative
- **Canon protection** — the pipeline never auto-promotes a belief to Locked or Canonical
- **Duplicate detection** — checksums prevent the same source file from being imported twice; near-duplicate chunk detection prevents redundant beliefs
- **Event emission** — every pipeline step emits events to the Event Log
- **Processing status visible in UI** — Imports page shows real-time pipeline status per uploaded file

### Out of scope
- Vector/semantic embeddings and semantic search (basic keyword search only in this phase)
- Live connector ingestion (Task #6)
- Model routing and cost optimization for extraction calls (Task #5)

### Steps
1. **Worker process** — set up a background worker (Node.js with a job queue) that polls for pending source records and processes them sequentially
2. **Parsers** — implement parsers for each import type; each parser returns structured text + metadata
3. **Chunker** — implement a chunking strategy (paragraph-aware, max token size per chunk) that preserves sentence boundaries; store chunks in DB
4. **Entity detector** — build matchers for projects, people, decisions, risks, and tasks
5. **Understanding Engine** — for each chunk, run entity detection and classify the chunk's meaning; produce candidate belief updates and evidence graph links
6. **Reality Ledger updater** — apply belief updates; flag contradictions; create candidate beliefs at appropriate type
7. **Contradiction Engine** — compare new extractions against locked/canonical beliefs; surface conflicts to the needs-review queue
8. **Evidence Graph writer** — create relationship records linking the processed source to detected projects, people, and decisions
9. **Needs-review queue** — build the review queue API and wire it to the Imports page UI
10. **Duplicate guard** — implement checksum-based deduplication on upload; implement chunk-level near-duplicate detection
11. **Event emission** — ensure every pipeline stage emits the appropriate event to the Event Log with full payload

---

## Task #4 — Lee Time Engine & Daily Briefs

*Depends on: Task #3*

### What & Why
Build Lee's temporal awareness and its signature daily artifacts. The Time Engine makes Lee time-conscious — every fact has an age, every wait has a duration, every context has a freshness. The Brief Engine generates the documents that make Lee useful every single day. The Scheduler runs recurring jobs. This is what makes Lee feel alive.

### Done looks like
- **Time Engine** — all objects carry computed temporal fields: age, staleness, wait_duration, deadline_distance, follow_up_window, freshness_score (0–100, decays by object type)
- **Freshness decay rules** per object type: project status (~7 days to stale), relationship context (~14 days), technical docs (faster after repo changes), market/regulatory (fast), founder principles (very slow), decisions (no decay until superseded)
- **Waiting Engine** — tracks all open waiting loops; computes days_waiting in real time; applies risk escalation (amber at expected window, red past it); fires notification events when thresholds crossed
- **Freshness Engine** — runs on a schedule and re-scores all objects; marks objects as fresh / aging / stale / critical
- **Scheduler** — cron-based job runner with named jobs: morning_brief (08:00 local), evening_reflection (20:00 local), weekly_review (Sunday 09:00), backup_check (daily 02:00), cost_check (daily), stale_context_scan (every 6h), connector_health_scan (every 1h)
- **Brief Engine** — generates: Today's Brief, Evening Reflection, Weekly Review, CerbaSeal Pilot Brief, Project Brief, Person Brief, Decision Brief, Meeting Brief
- **Brief storage** — briefs persisted as objects in DB with type, generated_at, sources_used, confidence, version
- **Notifications center** — notification objects with level (silent_log / digest / in_app / push / sms); Lee never becomes noisy — push only for high-impact events; SMS reserved for critical alerts
- **Today page fully alive** — real brief content, real freshness warnings, real waiting loop states, real stale context surfaced

### Out of scope
- Push notifications to Android (Task #7)
- SMS delivery (Task #7)
- Real connector data feeding briefs (Task #6)

### Steps
1. **Time Engine utilities** — build shared time utilities: age_of, days_waiting, freshness_score, deadline_distance, follow_up_window, is_stale
2. **Freshness decay config** — define per-type decay rates and stale thresholds in a config file; make tunable via Settings
3. **Waiting Engine** — recomputes days_waiting, risk level, and recommended_action for all open loops on each scheduler tick
4. **Freshness Engine** — scheduled freshness scan that re-scores all objects; creates stale_context events for objects crossing the stale threshold
5. **Scheduler** — implement cron-based job runner; register all named jobs; all jobs must catch errors and emit job_failed events without crashing
6. **Brief Engine — core** — build the brief generator starting with Today's Brief and Evening Reflection
7. **Brief Engine — specialized briefs** — extend to CerbaSeal Pilot Brief, Project Brief, Person Brief, Decision Brief, Meeting Brief
8. **Brief storage and history** — persist all generated briefs; make brief history browsable in the console
9. **Notifications Engine** — build the notification decision engine; create notification objects at the right level; expose notification API
10. **Wire Today page to live data** — real brief, real freshness warnings, real waiting loop escalations, real notification queue, real cost status

---

## Task #5 — Lee Model Router & Cost Engine

*Depends on: Task #1, Task #2*

### What & Why
Wire Lee's AI brain end-to-end. Integrates real model providers (OpenAI, Anthropic, Gemini), builds the cost-aware model router, implements the Context Packet system that prevents manual context rebuilding, and fully activates the Ask Lee conversation interface. After this phase, Lee can reason with real intelligence while never spending money silently.

### Done looks like
- **Model Router** — routing engine selecting the cheapest sufficient path: (1) No model, (2) Cached answer, (3) CIL-style reuse, (4) Cheap model (GPT-4o-mini / Haiku), (5) Mid-tier (GPT-4o / Sonnet), (6) Strong frontier (o1 / Opus), (7) Human review; routing decision always logged
- **Provider adapters** — modular adapters for OpenAI, Anthropic, and Gemini; interchangeable via Settings
- **Context Packet system** — assembles packets: detected intent, active project, relevant people, included context, excluded stale context (with freshness warnings), selected model, estimated cost, risk level; packets stored and reusable
- **Context Packet Preview** — Run / Use Cheaper Model / Packet Only / Edit Packet / Cancel; user never gets a surprise bill
- **Cost estimation** — pre-call cost estimate shown in UI before every model call
- **Strong-model gate** — cost exceeding threshold creates a governance hold before calling
- **Ask Lee fully wired** — sends messages, builds context packets, routes to correct model, streams responses, stores conversation history, detects mentioned projects/people, extracts candidate decisions, shows evidence links
- **Conversation modes** — Normal, Deep Think, Build, Write, Review, Pilot, Low Cost, Private, No Model, Governed Action
- **CIL-style reuse** — context packets cached by intent fingerprint; reuse events logged and credited in cost savings
- **Cost Engine** — tracks all model calls; aggregates for today/week/month; enforces daily/weekly/monthly budget limits with hard stops; projects monthly cost
- **Budget controls enforced** — when daily limit is reached, Lee stops expensive calls and switches to Low Cost mode automatically; not silently ignored

### Out of scope
- Android Ask Lee (Task #7)
- Connector data in context packets (Task #6)
- Local/open-source model adapters (architecture must support them as a future route)

### Steps
1. **Provider adapters** — implement OpenAI, Anthropic, and Gemini adapters; consistent interface: send(prompt, options) → {text, tokens_in, tokens_out, model, provider, cost_usd}; API keys from environment secrets
2. **Model routing logic** — router evaluates request type, cost sensitivity, mode, and budget state; logs every routing decision with reason
3. **Context Packet builder** — assembles packets from the Lee Brain; applies freshness filtering; estimates token count and cost
4. **CIL-style packet cache** — cache assembled packets by intent fingerprint; invalidate when source objects change
5. **Cost estimation and display** — pre-call cost estimation; expose in Context Packet Preview; display in Ask Lee UI
6. **Strong-model gate** — configurable cost threshold; above threshold, create a governance hold item
7. **Budget enforcement** — hard daily/weekly/monthly limits; auto-switch to Low Cost mode when limit hit; notify user
8. **Ask Lee conversation endpoint** — streaming conversation API: receive message, build packet, route, stream response, store turn, extract candidate decisions, link evidence
9. **Wire Ask Lee UI** — connect full Ask Lee page to live conversation API
10. **Cost Engine aggregations** — build cost aggregation queries; wire to Costs page; add cache savings and avoided calls tracking

---

## Task #6 — Lee Real Connectors

*Depends on: Task #1, Task #3, Task #5*

### What & Why
Connect Lee to the live services where your real work happens. Every connector is read-only first, produces events (never directly mutates the Lee Brain), and respects the governance boundary — Lee observes, reasons, and recommends; humans approve consequential actions.

### Done looks like
- **Connector framework** — connector produces events → Understanding Engine processes events → Reality Engine updates Lee Brain; no connector directly writes to projects/people/decisions/beliefs
- **Gmail connector** (read-only): OAuth2, polls watched labels, detects replies from tracked people, updates waiting loops when reply resolves an open loop, imports threads into Source Vault, draft creation only (send always requires governance approval)
- **Google Calendar connector** (read-only): OAuth2, syncs 14 days of upcoming events, detects meetings with tracked people, feeds Today page, triggers Meeting Brief generation
- **Google Drive connector** (read-only): OAuth2, watches specified folders, imports changed documents, detects staleness relative to GitHub commits
- **GitHub connector** (read-only): personal access token, imports repos (README, key docs, open issues, recent PRs, commit log summary), tracks commit activity, detects README drift
- **Replit connector** (read-only): API token, tracks Replit repls linked to Lee projects, monitors deployment status, surfaces in project detail
- **Android capture API** — POST /android/capture, POST /android/ask, GET /android/brief, GET /android/waiting, GET /android/alerts, POST /android/approve; all require device pairing token
- **Connector health monitoring** — tracks last_sync, error_state, consecutive_failure_count; Connectors page shows health; reconnect option on failure
- **Connector audit log** — every sync, event produced, and error logged with connector_id and timestamp

### Steps
1. **Connector Engine framework** — ConnectorEngine class with registration, scheduling, health tracking, and audit logging; no connector writes directly to Lee Brain tables
2. **OAuth2 infrastructure** — OAuth2 flow handler for Google services; token storage (encrypted); token refresh
3. **Gmail connector** — poll for new messages from tracked senders; emit reply_received / thread_imported events; implement draft creation; governance gate on send
4. **Google Calendar connector** — sync upcoming events; detect meetings with tracked people; emit meeting_detected events; trigger Meeting Brief generation
5. **Google Drive connector** — watch specified folder for changes; emit document_changed events; detect staleness relative to GitHub commits
6. **GitHub connector** — import repos; track commits; detect drift between code activity and documentation
7. **Replit connector** — link Replit repls to Lee projects; poll deployment/run status; emit deployment_changed events
8. **Android capture API** — all Android endpoints with device pairing authentication; captures queued to Understanding Pipeline immediately
9. **Connector health monitoring + UI** — implement health tracking; update Connectors page to show real health state with reconnect/reauthorize flows
10. **End-to-end event flow test** — verify: Gmail reply from tracked person → reply_received event → Understanding Engine → waiting loop updated → Today page reflects change → notification created

---

## Task #7 — Lee Android Companion App

*Depends on: Task #6*

### What & Why
Lee in your pocket. Not a miniature desktop app — briefs, captures, waiting loops, alerts, quick questions, and approvals. Simple, fast, and trustworthy.

### Done looks like
- Expo React Native app targeting Android
- **Device pairing** — first launch: enter Lee API URL and device pairing token; all calls use this token
- **Brief tab** — today's summary: top priority, what changed, open waiting loops, upcoming meetings, recommended focus; pull-to-refresh; offline cache
- **Capture tab** — voice note (upload + pipeline), text note with tag selector, photo/screenshot from camera or gallery; local queue with sync-on-connect; processing status display
- **Waiting tab** — color-coded risk list; Snooze / Resolve / Prepare Follow-up actions
- **Alerts tab** — push-level notifications; Snooze / Dismiss / Open Lee (deep link to console) actions; critical alerts in red
- **Ask tab** — quick question UI; low-cost mode default; escalation to stronger model with cost estimate; streaming response
- **Approvals tab** — governance items; Approve / Hold / Reject with confirmation; tap-and-hold for consequential actions
- **Push notifications** — FCM integration; categories: brief_ready, alert, waiting_escalation, approval_required, cost_warning
- **Offline resilience** — brief tab caches last brief; capture tab queues locally; waiting tab shows cached data with stale indicator
- **Visual design** — dark mode matching console palette; no emojis; bottom tab bar

### Steps
1. **Create Expo artifact** — bootstrap Android app; configure to point at hosted Lee API URL; dark-mode theme with Lee's color system
2. **Device pairing screen** — URL + token input; verification call to API; stored in AsyncStorage
3. **API client** — typed client wrapping Lee API Android endpoints; handles auth token, retry, offline detection
4. **Brief tab** — fetch and display; pull-to-refresh; offline cache
5. **Capture tab** — voice recording, text note, photo/screenshot; local queue with sync-on-connect
6. **Waiting tab** — color-coded risk list; Snooze/Resolve/Prepare actions
7. **Alerts tab** — push-level notifications with action buttons; critical accent styling
8. **Ask tab** — quick question UI with streaming response; escalation option with cost estimate
9. **Approvals tab** — governance items; tap-and-hold for consequential actions; updates propagate to console
10. **Push notifications (FCM)** — register device token with Lee API on pairing; handle notification receipt and tap navigation

---

## Task #8 — Lee Governance Layer

*Depends on: Task #2, Task #5*

### What & Why
Build the governance system that enforces Lee's Constitution. Lee prepares, drafts, summarizes, and recommends — but she never sends, publishes, shares, deletes, or permanently marks canon without passing through ALLOW / HOLD / REJECT. This is the trust layer that makes Lee safe to give real access to.

### Done looks like
- **Governance Engine** — intercepts all consequential actions before they execute: external messages, publishing content, sharing files externally, deleting sources, marking beliefs canonical, changing official project status, any risk_level ≥ MEDIUM action
- **ALLOW / HOLD / REJECT logic**: ALLOW (pre-approved rule or user-approved), HOLD (creates governance item, execution blocked), REJECT (blocked by rule or user)
- **Governance queue** — shows: action Lee wants to take, risk level (LOW / MEDIUM / HIGH / CRITICAL), reason, related evidence, affected object, recommended verdict, time waiting
- **Action evidence** — for HIGH and CRITICAL actions, Lee must show supporting evidence before the action buttons appear
- **Verdict actions** — Approve, Hold (snooze optional), Reject, Edit (modify action before approving), Ask Why
- **Standing rules** — always allow X / always reject X / always hold X; rules versioned and logged
- **Audit trail** — every governance decision logged with action_id, verdict, actor, timestamp, reason, evidence_shown, was_edited
- **Risk classification** — LOW (internal state change), MEDIUM (reversible external effect), HIGH (irreversible or externally visible), CRITICAL (financial, legal, security, relationship-critical)
- **Fail-closed by default** — unclassified actions default to HOLD, never ALLOW
- **Session governance** — items expire within configurable window (48h for HIGH, 7 days for MEDIUM); auto-rejected and logged; user notified before expiry
- **Governance integrated across all engines** — model router uses governance gate for strong-model calls; connector write actions route through governance; import deletes route through governance

### Steps
1. **Governance Engine core** — GovernanceEngine class: register_action(), evaluate() → ALLOW/HOLD/REJECT, execute(action_id) after approval
2. **Risk classifier** — action type + payload → risk level; fail-closed for unknown types
3. **Governance queue DB** — governance_items table; CRUD API endpoints
4. **Standing rules system** — governance_rules table; rules management UI in Settings/Governance; apply rules before creating HOLD items
5. **Governance page** — queue with filters, action detail with evidence display (required before buttons for HIGH/CRITICAL), verdict buttons, bulk actions, standing rules manager
6. **Audit log UI** — searchable by action type, verdict, actor, date; full detail per decision
7. **Governance gate integration** — wire into: model router, Gmail send (always HOLD), Drive share (always HOLD), GitHub create (always HOLD), source delete (always HIGH), belief promote-to-canonical (MEDIUM), project status change (MEDIUM)
8. **Session expiry and notifications** — expiry logic; in-app notifications before expiry; auto-reject and log
9. **Ask Why flow** — takes governance item, builds context packet explaining Lee's reasoning, calls model, returns explanation inline without executing action
10. **Android Approvals tab integration** — verify tap-and-hold confirmation works for HIGH/CRITICAL; verify approved actions execute correctly via API

---

## Task #9 — Lee Backup & Migration System

*Depends on: Task #1*

### What & Why
A backup that cannot restore is not a backup. Build the durable backup and migration system that makes Lee portable. The Lee Brain must always be ownable, not held hostage by any hosting provider.

### Done looks like
- **Backup Engine** — complete, verifiable Lee Brain snapshots: full database dump, all object storage files, evidence index, decision ledger, reality ledger, project states, people timelines, context assets, settings, cost logs, audit logs, connector metadata (not tokens), backup manifest with checksums
- **Backup manifest** — manifest.json in every backup: backup_id, timestamp, lee_version, db_schema_version, reality_model_version, object_count by type, source_file_count, total_size_bytes, checksums for every included file, backup_format_version
- **Backup formats** — AES-256 encrypted ZIP (user-supplied passphrase); unencrypted ZIP for migration; manifest always in plaintext
- **Manual backup** — "Backup Now" button; progress shown; download link when complete
- **Scheduled backup** — daily at 02:00 (configurable); last 7 daily, 4 weekly, 12 monthly retained; old backups pruned automatically
- **Backup verification** — validates manifest checksums, reports completeness, does NOT restore; runs automatically after every scheduled backup
- **Restore test** — provisions a temporary isolated database, restores backup, runs integrity checks (FK consistency, belief type validity, event log continuity), reports pass/fail; does not affect the live Lee Brain
- **Export Lee Brain** — full backup archive for download; passphrase prompted; download link expires after 1 hour; logged to audit trail; requires governance approval (MEDIUM risk)
- **Import Lee Brain** — accepts archive upload, validates manifest, shows import preview, warns on schema version mismatch, requires explicit confirmation, runs migration scripts if needed
- **Migration readiness indicator** — score from: backup health, restore test status, schema export completeness, portability checklist (all raw sources present, no external-only references)
- **Backup status** on Today page and status bar — amber if last backup >24h, red if >72h

### Steps
1. **Backup Engine core** — BackupEngine class: assemble_backup() collects all DB tables and object storage files; computes checksums
2. **Manifest builder** — manifest.json generator with all version fields, object counts, checksums
3. **Encryption layer** — AES-256 encryption with user-supplied passphrase; decryption for restore and verification
4. **Backup storage + retention** — Replit App Storage; retention policy (7 daily, 4 weekly, 12 monthly); pruning job
5. **Manual backup + download** — "Backup Now" API endpoint with progress streaming; 1-hour expiring download link; wire to Backups page UI
6. **Scheduled backup** — register backup_check in the scheduler; emit backup_created or backup_failed events
7. **Backup verification** — verify_archive function: load archive, validate checksums, report completeness; auto-run after scheduled backups
8. **Restore test** — test_restore function: provision temporary DB schema, restore data, run integrity checks, report pass/fail
9. **Import Lee Brain** — accept archive upload; validate manifest; show import preview; run schema migration if needed; apply after confirmation; require governance approval
10. **Migration readiness + UI** — compute migration readiness score; display in Backups page; wire Today page backup status indicator and status bar

---

## Task #10 — Lee Orchestration Engine

*Depends on: Task #1, Task #4*

### What & Why
Every subsystem in Lee — Understanding, Reality, Time, Cost, Governance, Notification, Connectors, Health, Curiosity, Strategy — is only as good as its coordination. Without a central orchestration layer, Lee becomes a collection of isolated modules that occasionally conflict. The Orchestration Engine is the conductor. It doesn't think in the LLM sense; it coordinates, prioritizes, schedules, resolves contention, and ensures every engine works as a coherent whole. As Lee grows over years, this layer is what keeps the entire system from drifting into chaos.

### Done looks like
- **Orchestration Engine** — a persistent coordination service that manages the lifecycle of all background engines and subsystems; runs as the system's internal nervous system
- **Engine registry** — every engine self-registers with name, capabilities, priority class, expected run frequency, resource consumption estimate, and dependencies; the registry is the system map
- **Work queue with priority classes** — CRITICAL (health alerts, governance approvals, backup failures), HIGH (connector sync, brief generation, waiting loop escalation), NORMAL (understanding pipeline, reality updates, freshness scans), LOW (learning, reflection, opportunity scanning, dormant memory maintenance)
- **Competing priority resolution** — CRITICAL always wins; within the same class, recency and urgency score determine order; starved LOW tasks get a boost after configurable time
- **Brief generation coordination** — decides when to generate briefs: morning brief only if Understanding Pipeline isn't mid-import and Reality Engine has settled; doesn't blindly fire the Brief Engine on a clock
- **Connector orchestration** — staggers connector syncs to avoid thundering herd on the DB or model quota; respects each connector's defined sync schedule but adds jitter
- **Engine health monitoring** — tracks each engine's last successful run, error rate, and average run duration; exponential backoff for repeatedly failing engines; alerts the Health Engine
- **Cost-aware scheduling** — before scheduling any model call, checks current cost state; if daily budget is >80%, delays non-CRITICAL model calls and logs the delay
- **Shutdown and restart coordination** — on graceful shutdown, flushes queue state to DB; on startup, reloads queue state and resumes interrupted jobs
- **Orchestration log** — every scheduling decision, priority resolution, delay, and engine failure logged to the Event Log
- **Visible in Health page** — queue state, last decisions, engine health scores, and any scheduling conflicts visible in the Health page
- **API for internal use** — all engines call the Orchestration Engine to request work scheduling; no engine calls another directly

### Out of scope
- Real-time streaming coordination (event-driven with async queue is sufficient)
- Multi-machine distributed orchestration (Replit-first is single-process; architecture must allow future distribution without rewrite)
- User-facing orchestration controls (Health page is read-only visibility; user-configurable priorities are a future Settings addition)

### Steps
1. **Engine registry** — EngineRegistry with self-registration; stored in memory with DB persistence for restart recovery
2. **Priority queue** — unified work queue with CRITICAL / HIGH / NORMAL / LOW priority classes; queue persisted to DB; survives restarts
3. **Orchestration scheduler** — core scheduling loop: poll queue, evaluate competing priorities, apply resolution rules, dispatch work; runs every few seconds in a lightweight async loop
4. **Cost-aware scheduling gate** — before dispatching any model-calling job, check current cost state; delay and log if budget threshold crossed
5. **Connector sync staggering** — spaces out connector syncs to avoid resource contention; respects sync schedules but adds jitter
6. **Engine health tracking** — track last_success, error_count, backoff_state, avg_duration for every registered engine; feed data to Health Engine; implement exponential backoff
7. **Shutdown and resume** — on SIGTERM, flush queue state to DB; on startup, reload queue state and resume interrupted jobs
8. **Orchestration log** — emit orchestration events to the Event Log for every significant scheduling decision
9. **Health page integration** — build the Orchestration section of the Health page: queue depth by priority class, engine health scores, recent scheduling decisions, any current delays or conflicts
10. **Wire all existing engines** — update the Understanding Pipeline, Brief Engine, Freshness Engine, Waiting Engine, Notification Engine, and Connector Engine to register with and submit work through the Orchestration Engine

---

## Task #11 — Lee Identity Engine & Founder Profile

*Depends on: Task #3, Task #5*

### What & Why
Lee understands projects, people, and decisions. But she doesn't yet understand you. Not your personal data — your operating identity. How you think. How you solve problems. How you write. Your risk tolerance. What creates momentum and what causes stalls. Over years, this Founder Profile becomes one of the most valuable assets in the system. It is learned, not assumed, and always correctable.

### Done looks like
- **Identity Engine** — builds, maintains, and applies the Founder Profile; learns from corrections, explicit declarations, observed patterns, and behavioral signals; never guesses; never hard-codes assumptions
- **Founder Profile dimensions**: thinking style, decision style, writing voice, technical depth (by domain), documentation preferences, risk tolerance (by domain), current goals, current priorities, energy patterns (what drains, what creates momentum, what causes stalls), preferred models, favorite workflows, current learning goals, recurring friction
- **Learning from corrections** — every time the user corrects Lee's output, tone, or recommendation, the Identity Engine records the correction and updates the relevant dimension; corrections outrank all other signals
- **Learning from patterns** — background scan on behavioral signals: which conversation modes are most used, which brief sections are read first, which recommendations are acted on vs. ignored, which waiting loops are resolved quickly vs. stalled
- **Explicit declaration interface** — Settings page Founder Profile section: user can read Lee's current understanding and correct any dimension; corrections immediately applied and logged
- **Profile confidence tracking** — each dimension has a confidence score (low / medium / high / confirmed) and a source log; low-confidence dimensions are flagged, never applied as assumptions
- **Profile applied in context packets** — high-confidence Founder Profile dimensions included in every context packet; low-confidence dimensions excluded; packet preview shows which profile dimensions were applied
- **Profile applied in briefs** — briefs written in the user's documented voice; prioritize what the Founder Profile identifies as high-priority energy patterns
- **Founder Profile history** — every version of the profile kept; browsable in Settings — see how Lee's understanding of you has evolved over time
- **Profile export** — included in all Lee Brain backups; travels with Lee when Lee migrates to desktop

### Out of scope
- Psychological profiling or emotional modeling (this is operational, not personal)
- Inferring anything not backed by evidence or explicit declaration
- Making the profile visible to anyone other than the owner

### Steps
1. **Founder Profile schema** — founder_profile table with all dimensions; each stored as structured record with value, confidence, source_log, last_updated, correction_count
2. **Identity Engine core** — IdentityEngine class: update_dimension(), apply_corrections(), get_profile_for_context(); register with Orchestration Engine at LOW priority for background scans
3. **Correction listener** — wire correction capture into all surfaces: brief edits, recommendation dismissals, draft corrections, belief disputes; correction events are the highest-weight signal
4. **Behavioral pattern scanner** — background scanner analyzing conversation mode frequency, brief section engagement, recommendation follow-through rate, waiting loop resolution speed; runs at LOW priority via Orchestration Engine
5. **Founder Profile Settings UI** — Founder Profile section in Settings: each dimension with current value, confidence, source summary, last-updated date; Edit button for explicit correction
6. **Context packet integration** — update the Context Engine (Task #5) to pull high-confidence Founder Profile dimensions and include them in every context packet; packet preview shows which profile dimensions were applied
7. **Brief personalization** — update the Brief Engine (Task #4) to apply Founder Profile dimensions: voice, density, prioritization, section ordering reflect what has been learned
8. **Profile history** — store every version of the Founder Profile as a snapshot whenever a dimension changes; make history browsable in Settings
9. **Profile export** — include full Founder Profile (all dimensions, history, confidence scores) in Lee Brain backup format; verify it restores correctly

---

## Task #12 — Lee Tiered Memory Architecture

*Depends on: Task #1, Task #3*

### What & Why
Flat storage treats a conversation from yesterday the same as a foundational decision made three years ago. That's not how memory works. This task replaces Lee's flat object store with a brain-like memory architecture where information lives at the right tier, decays or consolidates appropriately, and surfaces at the right time.

### Done looks like
- **Memory tiers**:
  - **Recent** — last 7 days; full fidelity; always available in context packets
  - **Working** — active projects, open decisions, open waiting loops, current goals; dynamically maintained regardless of age
  - **Reference** — information consulted regularly but not daily; medium retrieval weight
  - **Historical** — resolved items, past conversations, completed projects; compressed summaries retained; raw data preserved in Source Vault
  - **Archived** — objects older than a configurable threshold with no recent references; compressed to essential fields; retrievable on explicit query
  - **Dormant** — objects not accessed in a long time with low relevance scores; silently retained but excluded from all automatic surfaces
  - **Evergreen** — documents, principles, and frameworks declared as permanently relevant (Lee's Constitution, CerbaSeal security framework, Lamont Labs principles); never decays
  - **Foundational** — core identity facts about projects, people, and the operating environment
  - **Canonical** — user-confirmed truth at the highest level; never overridden by inference; used as ground truth in all context packets
- **Tier assignment** — new objects enter Recent; tier promoted/demoted as time passes and access frequency changes; protected tier rules (canonical never demoted, working memory tied to object status)
- **Decay and consolidation** — Historical memory automatically compressed: raw conversation turns summarized, key entities preserved, source files retained in Source Vault
- **Retrieval weighting** — Canonical and Evergreen always included; Working Memory always included; others weighted by relevance; Archived and Dormant excluded unless queried directly
- **Working Memory surface** — Today page and right context rail always show current Working Memory: active projects, open decisions, live waiting loops, current goals
- **Memory tier badge** — every object shows its current memory tier; user can manually promote or demote any object
- **Memory health** — Health Engine tracks memory tier distribution, compression backlog, dormant object count; visible in Health page
- **Memory in backups** — all tier classifications, consolidation states, and access history included in Lee Brain exports

### Out of scope
- Vector embedding-based semantic retrieval (structured relevance scoring in this phase; semantic search slots in later)
- Automatic compression of Canonical or Evergreen memory
- User-configurable tier thresholds in this phase

### Steps
1. **Memory tier schema** — add memory_tier field to all Lee objects; add last_accessed_at, access_count, relevance_score, consolidated_at; create indexes on tier and last_accessed_at
2. **Tier assignment rules** — define the rule set: initial tier by object type, promotion/demotion thresholds, protected tier rules
3. **Memory Architecture Engine** — MemoryArchitectureEngine class: scan_and_reclassify() runs on schedule via Orchestration Engine; emit memory_tier_changed events
4. **Historical consolidation** — compression process for objects transitioning to Historical tier: summarize via model router (cheap model), preserve key entities, log the consolidation; runs at LOW priority via Orchestration Engine
5. **Context Engine integration** — update the Context Engine (Task #5) to apply tier-based retrieval weights when building context packets
6. **Today page Working Memory** — update Today page to show current Working Memory as the primary operational surface
7. **Object detail tier badge** — add memory tier badge to every object detail page; include promote/demote controls
8. **Manual tier controls** — promote/demote UI; manual overrides flagged and logged; automatic reclassification respects manual overrides until released
9. **Memory health metrics** — expose tier distribution, consolidation backlog, and dormant object count to the Health Engine; display in Health page
10. **Backup integration** — verify tier classifications, consolidation states, and access history included in Lee Brain exports

---

## Task #13 — Lee Intelligence Graph & Personal Knowledge Map

*Depends on: Task #3, Task #12*

### What & Why
The Understanding Pipeline creates links between objects. The Intelligence Graph makes those links a first-class system. Every meaningful object in Lee becomes a node. Every meaningful relationship becomes a typed, weighted, directed edge. The Personal Knowledge Map makes that graph visible — navigable, zoomable, alive. From Lamont Labs down to a single waiting loop.

### Done looks like
- **Intelligence Graph** — graph data structure stored in DB (adjacency list + edge metadata) where every Lee object is a node and meaningful relationships are typed, weighted, directed edges
- **Node types** — all Universal Object Model types: projects, people, companies, documents, files, conversations, messages, meetings, ideas, tasks, decisions, questions, risks, opportunities, repositories, sources, waiting loops, context packets, briefs, goals, technologies, architectures
- **Edge types** — typed, directional edges: involves, produced, references, contradicts, supports, depends_on, tracks, spawned_from, informs, supersedes, and extensible new types
- **Edge weight and freshness** — every edge has a weight (strength of relationship, based on evidence count and recency) and a freshness score; stale edges flagged but not deleted
- **Graph builder** — continuously updated when Understanding Pipeline extracts entities/relationships and when Reality Engine updates beliefs
- **Graph queries** — API endpoints: get_neighbors(node_id, depth), find_path(node_a, node_b), get_cluster(node_id), find_related(node_id, edge_types), get_most_connected(node_type), find_orphans()
- **Context Engine uses the graph** — depth-limited graph traversal replaces simple JOIN-based context building; finds related context that flat queries miss
- **Personal Knowledge Map UI** — dedicated page in the console: force-directed graph layout, nodes sized by importance and colored by type, edges colored by type and weighted by strength, click-to-detail, double-click-to-focus, pan/zoom, filter by node type/edge type/project/person/date range, timeline slider
- **Lamont Labs view** — curated top-level view showing the high-level structure of Lamont Labs operations; default landing view; navigable to any depth
- **Orphan detection** — regular scan for isolated nodes; surfaced in Health page as potential gaps in understanding
- **Graph in backups** — full graph included in Lee Brain exports; graph rebuild from event log as a recovery path

### Steps
1. **Graph schema** — graph_nodes and graph_edges tables with all required fields; indexes on source_node_id, target_node_id, edge_type
2. **Graph builder** — GraphBuilder class: add_node(), add_edge(), update_edge_weight(), mark_historical(); wire into Understanding Pipeline so entity extraction automatically updates the graph
3. **Graph query API** — REST endpoints for: get_neighbors, find_path, get_cluster, get_most_connected, find_orphans, find_related
4. **Context Engine graph traversal** — update the Context Engine (Task #5) to use graph traversal: starting from detected intent nodes, traverse to depth 2 to find related context; weight traversal results by edge weight and node freshness
5. **Personal Knowledge Map page** — build the Knowledge Map page: integrate a graph visualization library; render nodes and edges with type-based coloring and sizing; implement click-to-detail, double-click-to-focus, pan/zoom
6. **Filters and search** — filter controls: node type toggles, edge type toggles, project filter, person filter, date range; node search that highlights and centers on the matched node
7. **Timeline slider** — graph state snapshots stored periodically; timeline slider to replay the graph as it existed at any past date; powered by the Event Log
8. **Lamont Labs strategic view** — curated top-level view showing high-level Lamont Labs structure; default landing view of the Knowledge Map
9. **Orphan detection** — orphan scanner as a Health Engine metric; surface orphan count in Health page with link to list and suggested connections
10. **Graph backup integration** — verify graph nodes and edges included in Lee Brain exports; implement graph rebuild-from-events as recovery path

---

## Task #14 — Lee Curiosity Engine & Opportunity Engine

*Depends on: Task #3, Task #4, Task #13*

### What & Why
A system that only responds to questions is a tool. A system that notices things is a partner. The Curiosity Engine gives Lee the ability to proactively observe — to surface patterns, drift, contradictions, and signals without being asked. The Opportunity Engine is its forward-looking counterpart: instead of noticing problems, it notices possibilities.

### Done looks like
- **Curiosity Engine** — background engine that continuously scans Lee's knowledge base for notable patterns, anomalies, and signals; surfaces findings as Observations without waiting to be asked
- **Observation types**: cross-document pattern ("Three separate documents mention the same unresolved problem"), architecture drift, recurring idea ("You have referenced this concept six times without formalizing it"), strengthening relationship, avoidance signal ("You have not opened this high-priority project in 18 days"), risk aging, contradictory assumption, stale anchor, momentum signal
- **Observation structure** — observation_id, type, headline (one sentence), supporting_evidence (≥2 source links required), affected_objects, confidence, generated_at, relevance_score, acknowledged_at, dismissed_at
- **Observation lifecycle** — Acknowledged, Acted On, Dismissed, or Promoted (to task/risk/decision with one click)
- **Evidence requirement** — no Observation generated without at least two evidence links; speculative observations labeled and have reduced surfacing weight
- **Opportunity Engine** — forward-looking counterpart; runs at LOW priority; scans for: reusable work, synthesizable context, solved problems, architecture opportunities, product signals, revisit signals, cross-project synergy
- **Opportunity structure** — mirrors Observation structure with potential_value (low/medium/high) and action_suggestion fields
- **Curiosity calibration** — Settings control for: observations per day limit, minimum confidence threshold, observation type toggles; prevents Lee from becoming noisy
- **Today page and context rail integration** — high-relevance Observations surface on Today page; contextually relevant items appear in right context rail; dedicated Observations/Opportunities section in left nav
- **History** — all generated Observations and Opportunities stored and browsable; input to the Reflection Engine

### Out of scope
- Real-time curiosity (observations generated in background scans, not real time)
- External world signals (Health Engine handles those; Curiosity Engine works on internal knowledge only)
- Autonomous action based on observations

### Steps
1. **Observation and Opportunity schema** — observations and opportunities tables with all required fields; indexes on type, relevance_score, generated_at, acknowledged_at
2. **Curiosity Engine core** — CuriosityEngine class with scan() method; register with Orchestration Engine at NORMAL priority; scan reads from Intelligence Graph, Reality Ledger, and Event Log
3. **Cross-document pattern detector** — find objects/chunks sharing unresolved topics across multiple sources; generate observations when threshold is met (3+ sources, unresolved topic)
4. **Drift detector** — compare architecture descriptions in documents against current repository structure; compare messaging in briefs against locked decisions; surface divergences
5. **Recurring idea detector** — track concept co-occurrence across chunks and conversations; when a concept appears N+ times without being formalized, generate an observation
6. **Avoidance and momentum signals** — detect when high-priority objects have not been accessed recently (avoidance) and when object quality/activity has improved significantly (momentum)
7. **Opportunity Engine core** — OpportunityEngine class with scan() method; register with Orchestration Engine at LOW priority; runs after Curiosity Engine scan completes
8. **Opportunity detectors** — implement detectors for: reusable work, synthesizable context, solved problems, architecture opportunities, cross-project synergy
9. **Today page and context rail integration** — surface high-relevance Observations on Today page; contextually relevant items in right context rail; add dedicated section to left nav
10. **Observation lifecycle UI** — Acknowledge / Act On / Dismiss / Promote controls; Promote opens flow to convert to task, decision, or project; all lifecycle transitions logged
11. **Calibration settings** — add Curiosity calibration controls to Settings: observations per day limit, minimum confidence threshold, observation type toggles

---

## Task #15 — Lee Health Engine & Self Monitoring

*Depends on: Task #1, Task #4, Task #10*

### What & Why
Lee should know when she is sick before you do. A personal AI operating environment that requires the user to notice its own failures is not reliable enough to trust. The Health Engine is Lee's immune system: it monitors every subsystem, every connector, every scheduled job, every backup, every model call, and every queue — and it surfaces problems clearly before they affect you.

### Done looks like
- **Health page** — dedicated page in the console:
  - **Brain Health** — composite score (0–100); green ≥ 90, amber 70–89, red < 70
  - **Database** — connection status, query latency p50/p95, table sizes, index health, recent errors
  - **Memory** — tier distribution, consolidation backlog, dormant object count, last consolidation run
  - **Import Pipeline** — queue depth, last successful import, failed imports with error, average processing time, stuck jobs
  - **API** — uptime, request rate, error rate, p95 response time, recent 5xx errors
  - **Connectors** — per-connector health card: last sync time, consecutive failures, next scheduled sync, reconnect needed flag
  - **Cost** — today's spend vs. budget, % of daily limit used, burn rate, projected monthly, any budget threshold breaches
  - **Backups** — last backup time, last backup size, last verification result, last restore test result
  - **Model Providers** — per-provider availability, last successful call, error rate, current rate limit state
  - **Queue** — Orchestration Engine queue depth by priority class, any CRITICAL items waiting, any engines in backoff state
  - **Brief Engine** — last morning brief generated, last evening reflection, last weekly review, any generation failures
  - **Freshness** — objects by freshness state, last freshness scan time
  - **Intelligence Graph** — node count, edge count, orphan count, last graph update time
- **Health Score calculation** — composite score weighted by subsystem criticality: Database and Backup failures have the highest impact; Connector warnings have low impact
- **Health alerts** — CRITICAL alerts appear in the top status bar (red indicator), push to Android if paired; non-critical alerts appear in Health page and Today page
- **Self-healing actions** — for known recoverable failures: retry a stuck import job, reconnect a stalled connector, reschedule a missed brief, re-run a failed backup verification; all self-healing logged
- **World Awareness component** — monitors Lee's own operational environment for external changes: AI model provider pricing changes, API deprecation notices, package security vulnerabilities, connector API rate limit changes, GitHub dependency updates for Lee's own codebase
- **Health history** — health scores and subsystem states recorded every hour; 30-day health trend chart in Health page
- **Health API** — GET /health (public, for uptime monitoring); GET /health/detail (private, authenticated); top status bar polls /health/detail every 60 seconds
- **Today page health summary** — compact health summary card: overall score, active alerts count, one-line description of most critical issue

### Steps
1. **Health Engine schema** — health_snapshots table (timestamp, overall_score, subsystem_scores JSONB, active_alerts JSONB); health_alerts table; 90-day retention for hourly snapshots
2. **Health Engine core** — HealthEngine class: evaluate_all() runs every 5 minutes via Orchestration Engine; evaluates each subsystem, computes composite score, emits health_alert events, stores snapshot
3. **Subsystem evaluators** — individual evaluator functions for: database, memory tier distribution, import queue depth, API error rate, connector last-sync age, cost vs. budget, backup age and verification status, model provider reachability, orchestration queue state, brief generation recency, Intelligence Graph integrity
4. **Health Score calculator** — weighted composite scoring with defined weights per subsystem; track score history
5. **Health alerts system** — alert creation, deduplication, and resolution detection; CRITICAL alerts trigger status bar update and Android push; all alerts logged with severity
6. **Self-healing actions** — recoverable self-healing for: stuck import jobs, stalled connector, missed brief, failed backup verification; all self-healing logged and visible in Health page
7. **World Awareness monitors** — scheduled checks: model provider pricing table diff, npm audit, connector API health endpoints, rate limit pattern detection; surface as World Awareness alerts
8. **Health page** — full Health page: composite score with color, all subsystem cards, active alerts with self-healing action buttons, 30-day trend chart, World Awareness section
9. **Health API endpoints** — build GET /health and GET /health/detail; wire top status bar to poll every 60 seconds
10. **Today page health summary** — compact health summary card on Today page; clicking opens the Health page

---

## Task #16 — Lee Strategy, Simulation & Reflection Engines

*Depends on: Task #5, Task #11, Task #13*

### What & Why
Three engines operating at the highest level of Lee's intelligence stack. The Strategy Engine makes Lee aware of long-term objectives and evaluates every recommendation against them. The Simulation Engine lets you think through consequences before acting — not through guessing, but through structured reasoning over everything Lee knows. The Reflection Engine creates your growth history: evidence-backed measurement of how your thinking, your projects, and your operating environment have evolved over time.

### Done looks like

**Strategy Engine**
- **Strategy record** — active objectives (goal, horizon, status, progress evidence, blockers, related projects, key decisions, last reviewed date), blocked objectives, emerging opportunities, capital/hiring/learning/marketing/product strategy
- **Strategy applied to recommendations** — context packets include current strategy as context; if a recommendation conflicts with a stated strategic objective, Lee surfaces the conflict
- **Strategy review cadence** — weekly strategy review prompt from the Scheduler: Are these objectives still current? Has anything changed?
- **Strategy page** — dedicated page: all objectives by horizon, status indicators, related projects, blockers, recommended next actions; editing through Ask Lee natural interaction

**Simulation Engine**
- **Simulation types**: delay simulation, pivot simulation, cost simulation, resource simulation, technical simulation
- **Simulation structure** — question asked, assumptions used (with confidence), reasoning chain (visible), likely outcomes (by probability tier: likely / possible / unlikely), risks identified, opportunities identified, recommended decision, evidence links, model and cost used
- **Simulation transparency** — shows reasoning chain; assumptions labeled with confidence; user can correct any assumption and re-run
- **Simulation history** — all simulations stored; browsable from Ask Lee history and from related project/decision pages

**Reflection Engine**
- **Reflection dimensions**: decision history, assumption accuracy, documentation quality trends, question evolution, cost trends, project momentum, waiting loop patterns, Lee accuracy (how often observations/recommendations were acted on vs. dismissed)
- **Reflection reports** — Weekly Review includes a Reflection section; dedicated Monthly Reflection generated on first of each month; Annual Reflection on January 1
- **Reflection page** — dedicated page: reflection reports by period, dimension trend charts, "most surprising changes" highlights, growth indicators

### Steps
1. **Strategy schema** — strategic_objectives table; strategy_reviews table for review history
2. **Strategy Engine** — StrategyEngine class: get_active_strategy(), evaluate_against_strategy(), generate_strategy_review_prompt(); register with Orchestration Engine; wire to weekly strategy review scheduler job
3. **Strategy applied to context** — update the Context Engine (Task #5) to include high-priority active objectives in every context packet; add strategy-conflict detection
4. **Strategy page** — objectives by horizon with status, blockers, related projects, recommended next actions; inline editing via Ask Lee integration
5. **Simulation Engine** — SimulationEngine class: run_simulation(question, type, context_override); assembles structured simulation prompt; calls model router (mid-tier or strong based on complexity); parses structured output; log to DB with full reasoning chain
6. **Simulation UI** — add simulation mode to Ask Lee (mode selector or "What happens if..." prefix); display: assumptions panel, reasoning chain, outcome tiers, evidence links, re-run with corrected assumptions; show model and cost used
7. **Simulation history** — store all simulations; make browsable from Ask Lee history; link simulations to related projects and decisions
8. **Reflection Engine schema** — reflection_reports table (period, type, dimensions JSONB, generated_at, model_used, sources_used); reflection_metrics table for time-series dimension data
9. **Reflection Engine** — ReflectionEngine class: generate_reflection(period, dimensions); collects raw metrics from DB; assembles structured report using cheap model for aggregation, mid-tier for narrative; store report
10. **Reflection page and brief integration** — build the Reflection page with period selector, dimension trend charts, report viewer; wire Monthly and Annual Reflection to the Scheduler; add Reflection section to Weekly Review brief; surface most notable reflection insight on Today page first day of each month

---

## Task #17 — Lee Learning Engine

*Depends on: Task #3, Task #11, Task #13*

### What & Why
Every correction makes Lee smarter. Every workflow pattern that succeeds becomes reusable. Every recurring prompt that produces the same structure becomes a template. Every mistake Lee makes and the user corrects is a training signal. The Learning Engine closes the feedback loop — it ensures Lee is measurably better at serving this specific user at month 12 than she was at month 1.

### Done looks like
- **Correction integration** — highest-priority learning signal: when the user corrects Lee's output, the Learning Engine captures the correction in full (what Lee produced, what the user changed it to, the context, the engine that produced the original); immediately applied to the Founder Profile and routing rules
- **Workflow capture** — when the user completes a multi-step workflow successfully, the Learning Engine records it as a named pattern with its steps, context, and outcome; captured workflows are reusable templates
- **Recurring prompt detection** — tracks message patterns in Ask Lee; when a structurally similar prompt appears 3+ times, flagged as a recurring prompt; Lee suggests creating a named workflow or shortcut; recurring prompts and their best responses are cached for CIL-style reuse (Task #5)
- **Routing improvement** — tracks which model routing decisions led to high-quality outcomes vs. low-quality; feeds signal back to the Model Router as advisory weights; routing policy changes require user confirmation
- **Documentation preference learning** — tracks types of documentation imported, engaged with, and referenced most; learns preferred formats; feeds into Brief Engine and writing mode context
- **Project structure learning** — when new projects are created, checks if they resemble past successful project structures; suggests applying successful structure as a starting template
- **Mistake pattern detection** — tracks categories of corrections over time; after 3+ corrections in the same category, surfaces a Pattern Insight with proposed standing correction rule for user review
- **Standing correction rules** — user-confirmed mistake patterns become standing correction rules applied before model calls; versioned and auditable; no rule is ever applied without user confirmation
- **Learning assets** — produces: named workflow templates, recurring prompt shortcuts (with cached responses), standing correction rules, routing preference signals, documentation format preferences, project structure templates
- **Learning dashboard** — section in Reflection page or Settings tab: corrections logged, standing correction rules, named workflow templates, routing preference signals, most-applied learnings, learning age
- **Learning assets in backups** — corrections history, standing rules, workflow templates, routing signals included in Lee Brain exports; learning does not reset when Lee migrates

### Out of scope
- Fine-tuning underlying model weights (behavioral learning at the application layer only)
- Automated application of standing rules without user review
- Learning from other users (Lee learns only from her owner)

### Steps
1. **Corrections schema** — corrections table (correction_id, engine_name, original_output, corrected_output, context_snapshot, correction_type, captured_at); standing_correction_rules table; learning_assets table for workflow templates and routing signals
2. **Correction capture hooks** — wire correction capture into all surfaces where the user can edit Lee's output: brief edits, recommendation dismissals, draft corrections, belief disputes, routing overrides; each correction emits a correction_captured event to the Learning Engine
3. **Learning Engine core** — LearningEngine class: ingest_correction(), detect_patterns(window), promote_to_standing_rule(pattern), apply_learning_assets(); register with Orchestration Engine at LOW priority
4. **Pattern detector** — groups corrections by category and context similarity; when a category reaches the threshold (3+ corrections), generates a Pattern Insight with proposed standing rule for user review
5. **Standing rule confirmation UI** — Pattern Insights surface in the Learning dashboard: shows proposed standing rules with evidence, Confirm / Dismiss / Edit actions; confirmed rules immediately active; standing rule list is browsable and editable
6. **Workflow capture** — track multi-step interaction sequences; when a sequence completes successfully (detected by outcome signals), record as a candidate workflow template; prompt the user to name and save it
7. **Recurring prompt detector** — track message hash/similarity in Ask Lee; when structurally similar prompt recurs 3+ times, flag and suggest creating a named shortcut; saved shortcuts appear as quick-access options in Ask Lee
8. **Routing preference signals** — implement outcome tracking for model calls (edited/not edited, acted on/dismissed, followed by correction); feed aggregated signals as preference weights to the Model Router; policy changes require explicit user review
9. **Learning assets applied** — update Context Engine to apply standing correction rules in context packets; update Brief Engine to apply documentation format preferences; update project creation flow to suggest matching templates; update Model Router to apply routing preference signals
10. **Learning dashboard** — build the Learning section: corrections logged by category, active standing rules, workflow templates, routing signals, most-applied learnings, learning age; inspectable and editable

---

## Task #18 — Lee Adaptive Workspace & Relationship Intelligence

*Depends on: Task #2, Task #6, Task #11, Task #14*

### What & Why
Two final layers that make Lee feel unmistakably personal. The Adaptive Workspace means the console reorganizes around what matters — morning shows the brief, pilot week shows the pilot dashboard, deployment week shows infrastructure. Lee should feel like she knows where you are in your work. Relationship Intelligence deepens the People system into something genuinely useful for high-stakes professional relationships: operational tracking of every promise, question, document, and interaction.

### Done looks like

**Adaptive Workspace**
- **Workspace Context Engine** — evaluates current operating context and adjusts the console's default layout, primary focus area, and surfaced shortcuts; context derived from: time of day, active waiting loops, upcoming calendar events, project activity patterns, Founder Profile, recent usage patterns
- **Adaptive layout modes**:
  - **Morning mode** — Today page primary, brief expanded, waiting loops prominent, upcoming meetings surfaced
  - **Deep Work mode** — active project's detail page becomes primary workspace; notifications suppressed except CRITICAL
  - **Pilot mode** — CerbaSeal Pilot Mode becomes primary workspace; pilot health score in status bar; follow-up recommendations prominent
  - **Deployment mode** — Infrastructure and Connectors pages surfaced in nav; GitHub connector status prominent
  - **Writing mode** — Imports page and Evidence browser surfaced; Ask Lee defaults to Write mode; brief condensed
  - **Evening mode** — Evening Reflection prompt appears; Today page shifts to "what happened" view
  - **Review mode** — Decisions page surfaced; Reflection section prominent; strategy review prompt appears
- **Adaptive nav** — left nav reorders to surface most relevant sections at the top; less relevant sections collapse but remain accessible; user can pin sections
- **Adaptive status bar** — shows mode-relevant quick stats: Pilot mode shows pilot health score; Deployment mode shows last deployment status
- **Mode history** — every mode activation logged with reason; browsable in Settings
- **User control** — override current mode, disable adaptive layout entirely, pin any section, configure which signals trigger which modes
- **Android adaptive brief** — Brief tab adapts: morning brief is primary in morning, pilot updates prominent during pilot-active periods

**Relationship Intelligence**
- **Per-relationship intelligence record** for each person: interaction timeline, interaction frequency (trending up or down), outstanding promises (you to them), incoming promises (them to you), shared projects, trust history, open questions (both directions), recent momentum (active / warming / cooling / dormant), follow-up windows, important documents, meeting history, tone sensitivity notes (user-declared, never inferred)
- **Relationship health score** — 0–100 based on: open waiting loops, outstanding promises overdue, days since last contact vs. expected frequency, open questions unanswered; shown on person card
- **Relationship briefs** — Person Brief includes the full relationship intelligence record; Meeting Brief includes outstanding promises, open questions, recent momentum, and recommended talking points
- **Relationship alerts** — when relationship health score drops, Lee creates a notification; high-stakes relationships (like Olivia/CerbaSeal) can be configured for higher notification levels
- **Promise tracking UI** — Person detail page Promises tab: outgoing (you to them) and incoming (them to you), each with status, due date, source evidence; overdue promises highlighted amber/red

### Steps
1. **Workspace Context Engine** — WorkspaceContextEngine class: evaluate_context() scores all mode signals and returns highest-scoring mode with reason; runs on page load and every 15 minutes; register with Orchestration Engine at LOW priority
2. **Layout mode system** — define mode schema (mode_name, signal_weights, nav_order, status_bar_slots, ask_lee_default_mode, notification_threshold); implement layout mode switcher in the console shell; persist current mode in session state
3. **Adaptive nav and status bar** — update left navigation to support dynamic ordering based on current mode; update status bar to show mode-relevant quick stats; add mode indicator and manual override selector
4. **Mode history and user controls** — log every mode activation with reason to mode_history table; build mode history viewer in Settings; add mode override controls, section pinning, and adaptive layout toggle
5. **Android adaptive brief** — update Android Brief tab to apply mode-aware content ordering
6. **Relationship intelligence schema** — extend people table; add interactions table, promises table, relationship_health_scores; update person cards to show health score
7. **Interaction ingestion** — wire interaction recording into Understanding Pipeline (Task #3) and Connector Engine (Task #6): when an email/meeting/message is processed and a known person is detected, create an interaction record; when a promise is detected in text, create a promise record in the needs-review queue
8. **Person detail — Relationship Intelligence tabs** — update Person detail page: Interaction Timeline tab, Promises tab (outgoing + incoming with status), Open Questions tab, Meeting History tab, Momentum indicator; relationship health score badge on person card
9. **Relationship briefs integration** — update Person Brief (Task #4) to include full relationship intelligence; update Meeting Brief to pull outstanding promises, open questions, and momentum for meeting participants
10. **Relationship alerts** — implement relationship health score monitoring; create notifications when score drops below threshold or promise becomes overdue; add per-relationship notification level configuration

---

*End of Project LEE Full Build Task Plan*
*18 Tasks. One coherent system.*
*One Lee. Many surfaces. The memory must not be replaceable.*
