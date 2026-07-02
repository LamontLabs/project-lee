# Project LEE — Full Build Task Plan
*Learning Environment Engine · Pronounced: Lee*
*Generated: July 2, 2026*

---

## Overview

9 tasks. 9 phases. Ordered by dependency — nothing starts until its foundation is solid.

| # | Task | Depends On | Artifact |
|---|------|-----------|---------|
| 1 | Lee Foundation — Data Layer & API Server | — | — |
| 2 | Lee Console — Private Web Interface | #1 | Web app |
| 3 | Lee Understanding Pipeline — Imports & Extraction | #1, #2 | — |
| 4 | Lee Time Engine & Daily Briefs | #3 | — |
| 5 | Lee Model Router & Cost Engine | #1, #2 | — |
| 6 | Lee Real Connectors — Gmail, Calendar, Drive, GitHub, Replit | #1, #3, #5 | — |
| 7 | Lee Android Companion App | #6 | Mobile app |
| 8 | Lee Governance Layer | #2, #5 | — |
| 9 | Lee Backup & Migration System | #1 | — |

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
1. **Create the react-vite artifact** at path `/` — this is the Lee Console; configure it as the root artifact with dark-mode-first theme and the Lee color system (green/amber/red/blue/purple/gray functional palette)
2. **Authentication wall** — gate the entire app behind a login screen that calls the API's auth endpoint; session cookie persists until timeout; no public routes except `/login`
3. **Shell layout** — build the persistent top status bar, left navigation, main workspace area, and right context rail as the app frame; wire status bar data (health, cost today, approvals, notifications, backup status, time) to live API calls
4. **Today page** — build the home screen with all sections; Lee's Brief card shows placeholder when no brief exists yet; all other sections pull from live API (waiting loops, recent events, costs, system health)
5. **Ask Lee page** — build the conversation UI with mode selector, cost estimate display, context packet preview panel, and all action buttons; conversation history stored and fetched from API; actual AI call integration deferred to Task #5 but UI fully built
6. **Projects pages** — projects list with card grid and all status indicators; full project detail with all tabs; CerbaSeal Pilot Mode tab fully built
7. **People pages** — people list with cards and all relationship indicators; full person detail with timeline and all sections
8. **Decisions page** — full decision ledger with all views, filters, and decision detail with all actions
9. **Waiting page** — full waiting tracker with all columns and action buttons
10. **Evidence page** — source browser with all filters and detail view
11. **Imports page** — upload area with file type support, recent imports list, processing status, needs-review queue
12. **Connectors, Costs, Governance, Backups, Settings pages** — build all remaining pages fully; Governance approval queue functional with Approve/Hold/Reject; Backups shows real backup state; Costs shows real cost ledger data
13. **Right context rail** — build the context rail component that shows on project/person/decision/evidence detail pages; pulls context packet, related sources, freshness, confidence from API
14. **Polish and consistency** — ensure typography, spacing, color system, status badges, freshness indicators, and confidence indicators are consistent across all pages; verify no emojis appear anywhere

---

## Task #3 — Lee Understanding Pipeline — Imports & Extraction

*Depends on: Task #1, Task #2*

### What & Why
Build the intelligence layer that transforms raw uploads into operational understanding. When you drop a PDF, a ChatGPT export, or a transcript into Lee, this pipeline reads it, chunks it, detects what projects/people/decisions it touches, updates the Reality Ledger, and queues anything uncertain for your review. This is how Lee learns from evidence instead of assumption.

### Done looks like
- Background worker process that picks up uploaded files from the Source Vault and processes them through the pipeline
- **Parser support** for all Phase 1 import types: ChatGPT JSON export, PDF, DOCX, Markdown, TXT, plain email thread paste, screenshot (OCR via API), transcript (plain text), manual note
- **Chunking engine** — splits parsed text into semantically coherent chunks with metadata (source_id, chunk_index, char_range, token_estimate); chunks stored in DB and available for embedding later
- **Understanding Engine** — for each chunk, asks: What happened? What changed? Which project is affected? Which person is involved? Is this new? Is this a decision? Is this a task? Is this a risk? Is this an opportunity? Does this contradict something existing? Does this make older context stale?
- **Entity extraction** — project detection (fuzzy name match against existing projects), person detection (name matching against known people), decision detection (keyword + pattern detection), task detection, risk detection
- **Reality updates** — when new evidence confirms, contradicts, or refines an existing belief, the Reality Ledger is updated with: updated confidence, updated last_confirmed_at, the new source linked as evidence, a contradiction flag if applicable
- **Contradiction Engine** — detects when new evidence conflicts with an existing locked or canonical belief; creates a contradiction record surfaced in the Evidence page and Today page; never silently resolves high-impact contradictions
- **Evidence Graph links** — after extraction, creates relationship links: projects ↔ documents, documents ↔ decisions, people ↔ emails, meetings ↔ action items, briefs ↔ sources
- **Needs-review queue** — any detected entity or belief update with confidence below threshold is placed in the needs-review queue visible in the Imports page; user can approve, reject, or edit each suggestion
- **Belief type tagging** — all extracted beliefs tagged correctly: declared (user said it), observed (connector showed it), extracted (doc contained it), inferred (Lee reasoned it), speculative (weakly supported)
- **Canon protection** — the pipeline never auto-promotes a belief to Locked or Canonical; that always requires user action
- **Duplicate detection** — checksums prevent the same source file from being imported twice; near-duplicate chunk detection prevents redundant beliefs
- **Event emission** — every pipeline step emits events to the Event Log (file_uploaded, file_parsed, chunk_created, entity_detected, belief_updated, contradiction_found, review_item_created)
- **Processing status visible in UI** — Imports page shows real-time pipeline status per uploaded file (uploaded → parsing → chunking → extracting → reviewing → complete / failed)
- **Retry on failure** — failed pipeline stages preserve the raw source and allow manual retry; errors are logged with detail

### Out of scope
- Vector/semantic embeddings and semantic search (deferred — basic keyword search only in this phase)
- Live connector ingestion (Task #6 handles Gmail, Calendar, Drive, GitHub)
- Model routing and cost optimization for extraction calls (Task #5)
- Voice transcription pipeline (deferred)

### Steps
1. **Worker process** — set up a background worker (Node.js with a job queue) that polls for pending source records and processes them sequentially; integrate with the existing API server process or run as a separate lightweight process
2. **Parsers** — implement parsers for each import type: ChatGPT JSON export (extract conversations, messages, timestamps), PDF (text extraction), DOCX (text extraction), Markdown/TXT (direct), email thread paste (heuristic parsing), transcript (speaker/timestamp parsing), manual note (direct); each parser returns structured text + metadata
3. **Chunker** — implement a chunking strategy (paragraph-aware, max token size per chunk) that preserves sentence boundaries; store chunks in the DB with source linkage
4. **Entity detector** — build matchers for projects (fuzzy name match against project list), people (name matching against person list), decisions (keyword + pattern detection), risks (risk signal keywords), tasks (action item patterns)
5. **Understanding Engine** — for each chunk, run entity detection and classify the chunk's meaning; produce candidate belief updates and evidence graph links
6. **Reality Ledger updater** — apply belief updates: if new evidence confirms an existing belief, update confidence and last_confirmed_at; if contradicting, flag contradiction and create review item; if new, create candidate belief at appropriate type
7. **Contradiction Engine** — compare new extractions against locked/canonical beliefs; surface conflicts to the needs-review queue with both sides of the contradiction shown
8. **Evidence Graph writer** — create relationship records linking the processed source to detected projects, people, and decisions
9. **Needs-review queue** — build the review queue API and wire it to the Imports page UI so the user can approve, edit, or reject each suggested entity/belief update
10. **Duplicate guard** — implement checksum-based deduplication on upload; implement chunk-level near-duplicate detection to prevent redundant beliefs
11. **Event emission** — ensure every pipeline stage emits the appropriate event to the Event Log with full payload

---

## Task #4 — Lee Time Engine & Daily Briefs

*Depends on: Task #3*

### What & Why
Build Lee's temporal awareness and its signature daily artifacts. The Time Engine makes Lee time-conscious — every fact has an age, every wait has a duration, every context has a freshness. The Brief Engine generates the documents that make Lee useful every single day: the morning brief, evening reflection, weekly review, and specialized briefs. The Scheduler runs recurring jobs. This is what makes Lee feel alive.

### Done looks like
- **Time Engine** — all objects carry computed temporal fields: age (days since created), staleness (days since last_confirmed), wait_duration (for waiting loops), deadline_distance (for time-bound items), follow_up_window (for people/relationships), freshness_score (0–100, decays by object type)
- **Freshness decay rules** implemented per object type: project status (fast decay, ~7 days to stale), relationship context (medium decay, ~14 days), technical docs (medium, decays faster after repo changes), market/regulatory (fast), founder principles (very slow), decisions (no decay until superseded)
- **Waiting Engine** — tracks all open waiting loops; computes days_waiting in real time; applies risk escalation (amber at expected window, red past it); fires notification events when thresholds crossed; recommended_action updated automatically based on waiting duration and relationship sensitivity
- **Freshness Engine** — runs on a schedule and re-scores all objects; marks objects as fresh / aging / stale / critical; surfaces stale context warnings on Today page and in the right context rail
- **Scheduler** — cron-based job runner with named jobs: morning_brief (08:00 local), evening_reflection (20:00 local), weekly_review (Sunday 09:00), backup_check (daily 02:00), cost_check (daily), stale_context_scan (every 6h), connector_health_scan (every 1h); all jobs log to Event Log; failures alert without crashing
- **Brief Engine** — generates the following brief types on demand and on schedule:
  - **Today's Brief**: current operating state, important changes since last brief, top projects (with status/health), waiting loops (with days and risk), upcoming meetings, stale context warnings, active risks, open approvals, recommended focus, confidence notes, evidence links, available actions
  - **Evening Reflection**: what happened today, what changed, decisions made, new/resolved waiting loops, cost summary, what to prepare for tomorrow
  - **Weekly Review**: week summary, project momentum, relationship health, waiting loop aging, decisions made, drift warnings, cost trend, backup status, recommended focus for next week
  - **CerbaSeal Pilot Brief**: pilot status, Olivia/LineAxia timeline, security review readiness, artifacts status, open questions, follow-up recommendations, pilot health score, momentum, risks, next best action
  - **Project Brief**: project overview, current state, recent activity, decisions, risks, waiting loops, people involved, relevant sources
  - **Person Brief**: who they are, last contact, open loops, relationship history, tone notes, relevant projects, recommended next action
  - **Decision Brief**: decision, why, when, source, confidence, supersedes, risk if wrong
  - **Meeting Brief**: meeting context, relevant people, open questions, project state, what to know before the meeting, suggested agenda points
- **Brief storage** — briefs are persisted as objects in the DB (with type, generated_at, sources_used, confidence, version); previous briefs kept for history
- **Notifications center** — notification objects with level (silent_log / digest / in_app / push / sms), why_it_matters, related_project, recommended_action, snooze, open_lee, dismiss; Lee never becomes noisy — push only for high-impact events; SMS reserved for critical alerts
- **Today page fully alive** — real brief content, real freshness warnings, real waiting loop states, real stale context surfaced

### Out of scope
- Push notifications to Android (Task #7)
- SMS delivery (Task #7)
- Real connector data feeding briefs (Task #6) — briefs use available DB data only at this stage
- Full model routing for brief generation (Task #5) — basic model call used with cost guard

### Steps
1. **Time Engine utilities** — build shared time utilities: age_of(object), days_waiting(loop), freshness_score(object, type), deadline_distance(date), follow_up_window(person), is_stale(object, type); make these available across all API responses as computed fields
2. **Freshness decay config** — define per-type decay rates and stale thresholds in a config file; make them tunable via Settings page; apply to all object queries so freshness_score is always current
3. **Waiting Engine** — add a waiting loop processor that recomputes days_waiting, risk level, and recommended_action for all open loops on each scheduler tick; emit escalation events when thresholds are crossed
4. **Freshness Engine** — build the scheduled freshness scan that re-scores all objects and creates stale_context events for objects crossing the stale threshold; surface results in Today page and context rail
5. **Scheduler** — implement cron-based job runner (node-cron or similar); register all named jobs with their schedules; all jobs must catch errors and emit job_failed events without crashing the process
6. **Brief Engine — core** — build the brief generator that assembles context (active projects, waiting loops, recent events, decisions, people, stale context, costs, risks) and generates structured brief objects; start with Today's Brief and Evening Reflection
7. **Brief Engine — specialized briefs** — extend to CerbaSeal Pilot Brief, Project Brief, Person Brief, Decision Brief, Meeting Brief; each fetches the right context for its subject
8. **Brief storage and history** — persist all generated briefs with metadata; make brief history browsable in the console
9. **Notifications Engine** — build the notification decision engine: evaluate events against notification rules; create notification objects at the right level; expose notification API for console to fetch and dismiss
10. **Wire Today page to live data** — update the Today page to show the real latest brief, real freshness warnings, real waiting loop escalations, real notification queue, real cost status

---

## Task #5 — Lee Model Router & Cost Engine

*Depends on: Task #1, Task #2*

### What & Why
Wire Lee's AI brain end-to-end. This phase integrates real model providers (OpenAI, Anthropic, Gemini), builds the cost-aware model router, implements the Context Packet system that prevents manual context rebuilding, and fully activates the Ask Lee conversation interface. After this phase, Lee can reason with real intelligence while never spending money silently.

### Done looks like
- **Model Router** — a routing engine that selects the cheapest sufficient path for each request:
  1. No model — use existing DB state
  2. Cached answer — return approved cached response
  3. CIL-style reuse — return a valid recent context asset
  4. Cheap model (GPT-4o-mini / Haiku)
  5. Mid-tier model (GPT-4o / Sonnet)
  6. Strong frontier model (o1 / Opus)
  7. Human review
  Routing decision always logged.
- **Provider adapters** — modular adapters for OpenAI, Anthropic, and Gemini; each handles auth, retry, rate limiting, token counting, and error normalization; providers are interchangeable via Settings
- **Context Packet system** — before any model call, the Context Engine assembles a packet: detected intent, active project, relevant people, included context (decisions, sources, recent changes), excluded stale context (with freshness warnings), selected model, estimated cost, risk level; packets are stored and reusable
- **Context Packet Preview** — the Ask Lee page shows the packet before execution with Run / Use Cheaper Model / Packet Only / Edit Packet / Cancel options; user never gets a surprise bill
- **Cost estimation** — before calling any model, Lee estimates cost from token count and model pricing table; cost shown in UI
- **Strong-model gate** — if estimated cost exceeds a configurable threshold, Lee holds for user approval before calling; shown in Governance page
- **Ask Lee fully wired** — conversation interface sends messages, builds context packets, routes to the correct model, streams responses, stores conversation history, detects mentioned projects/people, extracts candidate decisions from answers, shows evidence links
- **Conversation modes** — all modes implemented: Normal, Deep Think, Build, Write, Review, Pilot, Low Cost, Private, No Model, Governed Action
- **CIL-style reuse** — context packets cached by intent fingerprint; reuse events logged and credited in cost savings
- **Cost Engine** — tracks all model calls; aggregates for today/week/month views; computes cache savings and avoided calls; enforces daily/weekly/monthly budget limits with hard stops; projects monthly cost
- **Budget controls enforced** — when daily limit is reached, Lee stops expensive calls and switches to Low Cost mode automatically; not silently ignored
- **Lee Brain for context** — Context Engine draws from full Lee Brain: project state, people, decisions, reality beliefs, waiting loops, recent events, freshness scores, evidence graph
- **Model usage history** — all model calls stored in cost_ledger with full metadata; browsable in Costs page with per-call detail

### Out of scope
- Android Ask Lee (Task #7)
- Connector data in context packets (Task #6) — uses DB data only
- Local/open-source model adapters (deferred — architecture must support them as a future route)

### Steps
1. **Provider adapters** — implement OpenAI, Anthropic, and Gemini adapters with consistent interface: send(prompt, options) → {text, tokens_in, tokens_out, model, provider, cost_usd}; each handles auth, retry (3x with backoff), rate limit errors, and token counting; API keys loaded from environment secrets
2. **Model routing logic** — build the router that evaluates request type, cost sensitivity, mode, and budget state to select the cheapest sufficient path; log every routing decision with reason
3. **Context Packet builder** — implement the Context Engine that assembles packets from the Lee Brain; queries relevant objects by relevance to intent; applies freshness filtering (excludes stale context); estimates token count and cost before calling model
4. **CIL-style packet cache** — cache assembled context packets by intent fingerprint; on new request, check for a valid recent cached packet before rebuilding; log reuse events; invalidate cached packets when source objects change
5. **Cost estimation and display** — implement pre-call cost estimation from token count and model pricing config; expose cost estimate in Context Packet Preview API response; display in Ask Lee UI
6. **Strong-model gate** — implement configurable cost threshold; above threshold, create a governance hold item instead of calling immediately; wire to Governance page approval flow
7. **Budget enforcement** — implement hard daily/weekly/monthly limits; when limit hit, block expensive calls and emit budget_limit_reached event; auto-switch to Low Cost mode; notify user
8. **Ask Lee conversation endpoint** — build the streaming conversation API: receive message, build context packet, route to model, stream response, store conversation turn, extract candidate decisions, link evidence; handle all conversation modes
9. **Wire Ask Lee UI** — connect the full Ask Lee page to the live conversation API: streaming responses, mode selection, context packet preview, cost display, save-as-decision action, evidence panel, conversation history
10. **Cost Engine aggregations** — build cost aggregation queries (by day/week/month, provider, model, project, workflow); wire to Costs page; add cache savings and avoided calls tracking

---

## Task #6 — Lee Real Connectors — Gmail, Calendar, Drive, GitHub, Replit

*Depends on: Task #1, Task #3, Task #5*

### What & Why
Connect Lee to the live services where your real work happens. Every connector is read-only first, produces events (never directly mutates the Lee Brain), and respects the governance boundary — Lee observes, reasons, and recommends; humans approve consequential actions.

### Done looks like
- **Connector framework enforced** — connector produces events → Understanding Engine processes events → Reality Engine updates Lee Brain; no connector directly writes to projects/people/decisions/beliefs
- **Gmail connector** (read-only):
  - OAuth2 connection flow in Settings/Connectors page
  - Polls for new threads in watched labels (Inbox, important senders)
  - Detects replies from tracked people (especially Olivia/CerbaSeal contacts); emits reply_received events
  - Updates waiting loops when a reply resolves an open loop
  - Imports email threads into Source Vault for Understanding Pipeline processing
  - Draft-only writing: Lee can prepare a draft response in Gmail drafts; actual send requires governance approval
  - Lee never sends email autonomously
- **Google Calendar connector** (read-only):
  - OAuth2 connection
  - Syncs upcoming events for the next 14 days
  - Detects meetings with tracked people; creates meeting prep waiting loops
  - Feeds Today page's "Upcoming meetings" section
  - Triggers Meeting Brief generation before relevant meetings
  - Creating or editing calendar events requires governance approval
- **Google Drive connector** (read-only):
  - OAuth2 connection
  - Watches specified folders/files for changes
  - Imports changed documents into Source Vault for pipeline processing
  - Detects stale documents (doc not changed but repo has changed since it was written)
  - Sharing or editing Drive files requires governance approval
- **GitHub connector** (read-only):
  - Personal access token auth
  - Imports repos: README, key docs, open issues, recent PRs, commit log (summary)
  - Tracks commit activity to detect repo freshness
  - Detects README drift (README not updated after significant code changes)
  - Surfaced in project detail under the relevant project
  - Creating issues or PR comments requires governance approval
- **Replit connector** (read-only):
  - API token auth
  - Tracks Replit projects/repls linked to Lee projects
  - Monitors deployment status, build logs (summary), run status
  - Surfaces Replit project state in the Lee console under linked projects
  - Deploy/modify actions require governance approval
- **Android capture API** — REST endpoints the future Android app will call:
  - POST /android/capture — accepts voice note, text note, photo, screenshot with optional tag
  - POST /android/ask — quick question endpoint (low-cost mode by default)
  - GET /android/brief — today's brief formatted for mobile consumption
  - GET /android/waiting — open waiting loops
  - GET /android/alerts — pending notifications above in-app level
  - POST /android/approve — approve or reject a governance item
  - All Android endpoints require device pairing token (configured in Settings)
  - Captures feed into the Understanding Pipeline immediately
- **Connector health monitoring** — each connector tracks last_sync, error_state, consecutive_failure_count; Connectors page shows health; scheduler runs connector_health_scan every hour; failed connectors get a clear error state with reconnect option
- **Connector audit log** — every sync, every event produced, every error logged to audit log with connector_id and timestamp
- **Settings/Connectors page updated** — each connector has a detail view showing auth status, permission scopes granted, sync schedule, last sync, error history, data types being synced, event count, disconnect button

### Out of scope
- Writing/sending through connectors autonomously (always requires governance approval)
- Slack, Discord, Notion, browser extension (Phase 3 connectors — deferred)
- Voice transcription pipeline (deferred)
- Local folder watcher (desktop future)

### Steps
1. **Connector Engine framework** — build the event-producing connector architecture: each connector has a sync() method that produces events; events are queued and processed by the Understanding Engine; no connector writes directly to Lee Brain tables; build ConnectorEngine class with registration, scheduling, health tracking, and audit logging
2. **OAuth2 infrastructure** — implement the OAuth2 flow handler for Google services (Gmail, Calendar, Drive): authorization URL generation, callback handling, token storage (encrypted), token refresh; build Settings/Connectors UI for connecting and disconnecting Google account
3. **Gmail connector** — implement using Google Gmail API: poll for new messages from tracked senders, parse thread structure, emit reply_received / thread_imported events; implement draft creation endpoint; governance gate on send
4. **Google Calendar connector** — implement using Google Calendar API: sync upcoming events, detect meetings with tracked people, emit meeting_detected events, trigger Meeting Brief generation; governance gate on create/edit
5. **Google Drive connector** — implement using Google Drive API: watch specified folder for changes, emit document_changed events, detect staleness relative to GitHub commits; governance gate on share/edit
6. **GitHub connector** — implement using GitHub REST API with personal access token: import repos (README + key docs), track commits, detect drift between code activity and documentation; emit repo_updated / readme_drift_detected events
7. **Replit connector** — implement using Replit API: link Replit repls to Lee projects, poll deployment/run status, emit deployment_changed events; surface in project detail
8. **Android capture API** — build all Android API endpoints with device pairing authentication; voice/photo uploads stored in Source Vault and queued for pipeline; quick ask uses low-cost model route; brief and waiting endpoints serve mobile-formatted data
9. **Connector health monitoring + UI** — implement health tracking; update scheduler to run connector health scans; update Connectors page to show real health state with reconnect/reauthorize flows
10. **End-to-end event flow test** — verify: Gmail reply from a tracked person → reply_received event → Understanding Engine detects it → waiting loop is resolved or updated → Today page reflects the change → notification is created

---

## Task #7 — Lee Android Companion App

*Depends on: Task #6*

### What & Why
Build the Android companion that keeps Lee close when you are away from the console. This is not a miniature desktop app — it is Lee in your pocket: briefs, captures, waiting loops, alerts, quick questions, and approvals. Simple, fast, and trustworthy. Connects to the hosted Lee API on Replit.

### Done looks like
- Expo React Native app targeting Android
- **Device pairing** — first launch shows a pairing screen: enter the Lee API URL and a device pairing token (generated in Lee Console Settings); pairing is confirmed and stored; all API calls use this token
- **Brief tab** — today's summary in mobile-friendly format: top priority (large, readable), what changed, open waiting loops (count + most urgent), upcoming meetings today, recommended focus; pull-to-refresh; tapping any item opens the relevant detail
- **Capture tab** — the primary input surface:
  - Voice note: tap to record, Lee transcribes and processes after upload
  - Text note: quick text input with optional tag selector (project tag, person tag, or untagged)
  - Photo / screenshot: camera or gallery picker, uploaded to Source Vault
  - All captures immediately queued to the Understanding Pipeline via Android capture API
  - Recent captures shown below the input area with processing status
- **Waiting tab** — list of all open waiting loops: person/org, project, days waiting, risk level (color-coded); tap to see recommended action; actions: Snooze (set duration), Resolve, Prepare Follow-up (opens Ask tab with context preloaded)
- **Alerts tab** — notifications above the digest level: shows why it matters, related project, recommended action; Snooze / Dismiss / Open Lee (deep link to console) actions; critical alerts shown with red accent
- **Ask tab** — quick question interface: text input, sends to Lee API using low-cost mode by default; streaming response displayed; option to escalate to stronger model (shows cost estimate); conversation history stored per device session; responses include evidence links and confidence level
- **Approvals tab** — pending governance items requiring human decision: shows the action Lee wants to take, risk level, reason, related source, recommended verdict; Approve / Hold / Reject actions with confirmation; consequential approvals (send, share, delete) require tap-and-hold confirmation
- **Push notifications** — Firebase Cloud Messaging (FCM) integration: Lee API sends push when notification level is push or higher; notifications include brief text, related project, action buttons (Snooze / Open); tapping opens the relevant tab; notification categories: brief_ready, alert, waiting_escalation, approval_required, cost_warning
- **Offline resilience** — brief tab caches last fetched brief for offline viewing; capture tab queues captures locally and syncs when connectivity returns; waiting tab shows cached data when offline with stale indicator
- **Visual design** — dark mode matching console palette (green/amber/red/blue/purple/gray); readable typography sized for mobile; no emojis; clean, calm, functional; bottom tab bar with clear icons and labels

### Out of scope
- iOS (Android-only for now per the spec)
- Biometric auth (deferred)
- Voice transcription server-side (captures are uploaded as audio; transcription handled by pipeline)
- Full conversation history sync with console (ask sessions are local to device for now)

### Steps
1. **Create Expo artifact** — bootstrap the Android app as a new Expo artifact; configure it to point at the hosted Lee API URL via environment config; set up the dark-mode theme with Lee's color system
2. **Device pairing screen** — build the first-launch pairing flow: URL + token input, verification call to API, success state stored in AsyncStorage; all subsequent screens require valid pairing
3. **API client** — build a typed API client wrapping the Lee API's Android endpoints (brief, waiting, alerts, capture, ask, approve); handles auth token, retry, offline detection
4. **Brief tab** — fetch and display today's brief in mobile-optimized layout; pull-to-refresh; tap targets for waiting loops and priority items; cache last brief for offline
5. **Capture tab** — voice recording with upload, text note with tag selector, photo/screenshot picker; local queue with sync-on-connect; captures display processing status after upload
6. **Waiting tab** — fetch and display open waiting loops with color-coded risk; Snooze/Resolve/Prepare actions; Prepare Follow-up pre-loads Ask tab with context
7. **Alerts tab** — fetch and display push-level notifications; action buttons; critical accent styling; Snooze/Dismiss/Open Lee actions
8. **Ask tab** — quick question UI with streaming response; low-cost mode default with escalation option showing cost estimate; confidence and evidence display
9. **Approvals tab** — fetch governance items; Approve/Hold/Reject with confirmation; tap-and-hold for consequential actions; updates propagate to console
10. **Push notifications (FCM)** — integrate Firebase Cloud Messaging; register device token with Lee API on pairing; handle notification receipt and tap navigation; implement notification categories with appropriate actions

---

## Task #8 — Lee Governance Layer

*Depends on: Task #2, Task #5*

### What & Why
Build the governance system that enforces Lee's Constitution: consequential actions require explicit human approval. Lee prepares, drafts, summarizes, and recommends — but she never sends, publishes, shares, deletes, or permanently marks canon without passing through ALLOW / HOLD / REJECT. This is not a friction layer; it is the trust layer that makes Lee safe to give real access to.

### Done looks like
- **Governance Engine** — central system that intercepts all consequential actions before they execute; consequential actions are: sending external messages (email/SMS), publishing content, sharing files externally, deleting sources, marking beliefs canonical, changing official project status, approving exports, contacting external people, any action classified as risk_level ≥ MEDIUM
- **ALLOW / HOLD / REJECT logic**:
  - ALLOW: action is pre-approved by a standing rule or user approved this specific action
  - HOLD: action requires review; creates a governance item in the queue; execution is blocked until resolved
  - REJECT: action is blocked by a standing rule or user rejected it
- **Governance queue** — all HOLD items appear in the Governance page and Approvals tab (Android); each item shows: what action Lee wants to take, risk level (LOW / MEDIUM / HIGH / CRITICAL), reason Lee wants to take it, related source (evidence), affected object, recommended verdict, created_at, time waiting for review
- **Action evidence** — for HIGH and CRITICAL actions, Lee must show supporting evidence before showing the action buttons; the user cannot approve without seeing why Lee is recommending this action
- **Verdict actions** — Approve (executes action), Hold (keeps in queue, snooze optional), Reject (blocks action and logs), Edit (modify the action before approving), Ask Why (asks Lee to explain its reasoning)
- **Standing rules** — user can configure standing rules in Settings/Governance: "always allow X", "always reject X", "always hold X for review"; rules are versioned and logged; no rule silently overrides the user's intent
- **Audit trail** — every governance decision logged to the audit_log table with: action_id, verdict, actor, timestamp, reason, evidence_shown, was_edited
- **Risk classification** — actions classified at creation time: LOW (internal state change, no external effect), MEDIUM (reversible external effect), HIGH (irreversible or externally visible), CRITICAL (financial, legal, security, or relationship-critical)
- **Fail-closed by default** — if the Governance Engine cannot classify an action's risk level, it defaults to HOLD; it never defaults to ALLOW for unclassified actions
- **CerbaSeal-style integration points** — architecture prepared for future CerbaSeal API calls on CRITICAL actions; the interface is built so the future CerbaSeal adapter slots in without redesign
- **Session governance** — governance items expire if not acted on within a configurable window (default 48h for HIGH, 7 days for MEDIUM); expired items auto-rejected and logged; user notified before expiry
- **Governance page fully functional** — queue with filters (by risk level, action type, project, status); bulk actions (approve all LOW, reject all of type X); governance audit log browsable with full detail for each past decision
- **Governance integrated across all engines** — model router uses governance gate for strong-model calls above threshold; connector write actions route through governance; brief engine routes sharing through governance; import deletes route through governance

### Out of scope
- Live CerbaSeal API integration (deferred — architecture is ready but CerbaSeal remains separate per spec)
- SMS governance (deferred until SMS connector is live)
- Financial transaction governance (no payment flows in Lee)

### Steps
1. **Governance Engine core** — build the GovernanceEngine class: register_action(type, payload, risk_level, reason, evidence), evaluate(action) → ALLOW/HOLD/REJECT, execute(action_id) after approval; all consequential action paths in the API must call this before executing
2. **Risk classifier** — build the action risk classification table: define all known action types and their default risk levels; build a classifier that takes action type + payload and returns risk level; fail-closed for unknown types
3. **Governance queue DB** — define governance_items table (action_id, action_type, payload, risk_level, reason, evidence_ids, status, verdict, actor, created_at, expires_at, audit_trail); build CRUD API endpoints
4. **Standing rules system** — define governance_rules table (rule_type: always_allow/always_hold/always_reject, action_pattern, created_at, created_by, version); build rules management UI in Settings/Governance; apply rules before creating HOLD items
5. **Governance page** — build the full governance UI: queue with all columns and filters, action detail with evidence display (evidence required for HIGH/CRITICAL before buttons appear), verdict buttons (Approve/Hold/Reject/Edit/Ask Why), bulk actions, standing rules manager
6. **Audit log UI** — build the governance audit log browser: searchable by action type, verdict, actor, date; full detail for each past decision including what evidence was shown and whether the action was edited
7. **Governance gate integration** — wire governance checks into: model router (strong-model threshold), Gmail send (always HOLD), Drive share (always HOLD), GitHub create (always HOLD), source delete (always HIGH), belief promote-to-canonical (MEDIUM), project status change (MEDIUM)
8. **Session expiry and notifications** — implement expiry logic; send in-app notifications (and Android alert if paired) before governance items expire; auto-reject and log expired items
9. **Ask Why flow** — implement the "Ask Why" action: takes the governance item, builds a context packet explaining Lee's reasoning, calls the model, returns the explanation inline in the governance UI without executing the action
10. **Android Approvals tab integration** — ensure Android Approvals tab is fully connected to the governance queue; verify tap-and-hold confirmation works for HIGH/CRITICAL items; verify approved actions execute correctly via API

---

## Task #9 — Lee Backup & Migration System

*Depends on: Task #1*

### What & Why
A backup that cannot restore is not a backup. This phase builds the durable backup and migration system that makes Lee portable — exportable, restorable, and migration-ready for the day Lee moves from Replit to desktop. The Lee Brain must always be ownable, not held hostage by any hosting provider.

### Done looks like
- **Backup Engine** — produces complete, verifiable Lee Brain snapshots containing: full database dump (all tables, all rows), all object storage files (raw sources, uploads), evidence index, decision ledger export, reality ledger export, project states, people timelines, context assets, settings, cost logs, audit logs, connector metadata (not tokens), backup manifest with checksums and version info
- **Backup manifest** — every backup archive includes a manifest.json: backup_id, timestamp, lee_version, db_schema_version, reality_model_version, object_count by type, source_file_count, total_size_bytes, checksums for every included file, backup_format_version
- **Backup formats** — primary format is an encrypted ZIP archive (AES-256 with user-supplied passphrase); unencrypted ZIP option for migration use; manifest always in plaintext for verification without decryption
- **Manual backup** — "Backup Now" button in Backups page triggers an immediate backup; progress shown; download link available when complete
- **Scheduled backup** — daily automated backup at 02:00 (configurable); last 7 daily backups retained; weekly backups retained for 4 weeks; monthly backups retained for 12 months; old backups pruned automatically
- **Backup verification** — "Verify Archive" function: loads a backup file, validates manifest checksums, reports completeness (which tables present, file count, any missing pieces), does NOT restore — only reports; runs automatically after every scheduled backup
- **Restore test** — "Test Restore" function: provisions a temporary isolated database, restores the backup into it, runs integrity checks (foreign key consistency, belief type validity, event log continuity), reports pass/fail; does not affect the live Lee Brain; available in Backups page
- **Export Lee Brain** — produces the full backup archive for download; user prompted for passphrase; download link expires after 1 hour; export action logged to audit trail and requires governance approval (MEDIUM risk)
- **Import Lee Brain** — accepts a backup archive upload; validates manifest; shows what will be imported (object counts, date range, schema version compatibility); warns if schema versions differ; requires explicit user confirmation before applying; import action logged; if schema version mismatch, runs migration scripts before import
- **Migration readiness indicator** — Backups page shows a migration readiness score: backup health (last backup age), restore test status (last test passed/failed), schema export completeness, portability checklist (all raw sources present, no external-only references, no hardcoded provider dependencies in data)
- **Backup storage** — backups stored in Replit App Storage (object storage); up to 10 backups retained locally; older ones pruned; download always available
- **Backup status on Today page and status bar** — last backup time and health always visible; amber if last backup >24h, red if >72h
- **Version tracking** — every backup records the Lee version, DB schema version, reality model version, and backup format version; enables future migration scripts to transform older backup formats correctly
- **Incremental backup metadata** — system tracks what changed since the last backup (new events, changed objects) so future incremental backup support can be added without redesigning the format

### Out of scope
- Desktop import/export UI (the desktop app will use the same backup format — the format is designed for it, but the desktop app itself is a future phase)
- Automated cloud backup to external providers (Replit App Storage is the backup store for now)
- Backup encryption key management service (user-supplied passphrase only in this phase)

### Steps
1. **Backup Engine core** — build the BackupEngine class: assemble_backup() collects all DB tables via Drizzle dump, all object storage files via App Storage list+download, produces structured archive with manifest; implement checksum computation for every included file
2. **Manifest builder** — implement the manifest.json generator: version fields, object counts by type, source file inventory, checksums, format version; validate manifest schema before writing to archive
3. **Encryption layer** — implement AES-256 encryption with user-supplied passphrase for the ZIP archive; implement decryption for restore and verification flows; unencrypted option for migration export
4. **Backup storage + retention** — implement backup storage in Replit App Storage; implement retention policy (7 daily, 4 weekly, 12 monthly); implement pruning job in the scheduler
5. **Manual backup + download** — build the "Backup Now" API endpoint with progress streaming; build the download endpoint with 1-hour expiring link; wire to Backups page UI
6. **Scheduled backup** — register backup_check in the scheduler (daily 02:00); emit backup_created or backup_failed events; notify user if backup fails
7. **Backup verification** — implement the verify_archive function: load archive, validate checksums against manifest, report completeness; run automatically after every scheduled backup; expose as API endpoint for manual verification; show results in Backups page
8. **Restore test** — implement the test_restore function: provision temporary DB schema, restore backup data into it, run integrity checks (FK consistency, belief types, event log ordering), report pass/fail; expose as API endpoint; show last test result in Backups page
9. **Import Lee Brain** — build the import endpoint: accept archive upload, validate manifest, show import preview (object counts, dates, schema version), run schema migration if needed, apply import after confirmation; log to audit trail; require governance approval
10. **Migration readiness + UI** — compute migration readiness score from backup health, restore test status, and portability checklist; display in Backups page with clear visual status; wire Today page backup status indicator and status bar to live backup state

---

*End of Project LEE Build Task Plan*
*One Lee. Many surfaces. The memory must not be replaceable.*
