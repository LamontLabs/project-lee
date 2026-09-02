import { useState } from "react";
import { Link } from "wouter";

type Section = {
  id: string;
  title: string;
  sub?: string;
};

const SECTIONS: Section[] = [
  { id: "overview", title: "0. Overview and Prerequisites" },
  { id: "startup", title: "1. Startup and Boot Sequence" },
  { id: "request-pipeline", title: "2. The Request Pipeline" },
  { id: "cil", title: "3. CIL Connection" },
  { id: "cerbaseal", title: "4. CerbaSeal Connection" },
  { id: "event-bus", title: "5. Domain Event Bus" },
  { id: "providers", title: "6. Provider Wiring" },
  { id: "executive-loop", title: "7. The Executive Loop" },
  { id: "knowledge-write", title: "8. Writing to the Knowledge Layer" },
  { id: "engine-lifecycle", title: "9. Engine Lifecycle and Recovery" },
  { id: "identity-onboarding", title: "10. First-Time Identity Onboarding" },
  { id: "security-rules", title: "11. Security Rules and Hard Stops" },
];

function SectionAnchor({ id }: { id: string }) {
  return <span id={id} className="block" style={{ marginTop: "-5rem", paddingTop: "5rem" }} />;
}

function CalloutBox({ variant, title, children }: { variant: "warn" | "critical" | "note" | "seq"; title: string; children: React.ReactNode }) {
  const styles = {
    warn: "border-amber-500/40 bg-amber-500/5 text-amber-300",
    critical: "border-red-500/40 bg-red-500/5 text-red-300",
    note: "border-primary/30 bg-primary/5 text-primary",
    seq: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  };
  const labels = { warn: "Warning", critical: "Critical — Fail Closed", note: "Note", seq: "Required Order" };
  return (
    <div className={`border rounded-lg p-4 mb-4 ${styles[variant]}`}>
      <div className="text-xs font-mono font-semibold uppercase tracking-widest mb-1.5 opacity-70">{labels[variant]}</div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className="text-sm opacity-80 leading-relaxed">{children}</div>
    </div>
  );
}

function StepBlock({ n, title, children }: { n: string | number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-mono text-xs font-bold text-primary mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground mb-1">{title}</div>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="mb-4">
      {label && <div className="text-xs font-mono text-muted-foreground/60 mb-1 ml-1">{label}</div>}
      <pre className="bg-background/80 border border-border rounded-lg p-4 text-xs font-mono text-foreground/85 overflow-x-auto whitespace-pre leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground/90 mt-6 mb-3">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}
function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 mb-4 ml-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary/50 mt-0.5 flex-shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TableOfContents({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="sticky top-6 space-y-0.5">
      <div className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest mb-3 pl-3">Contents</div>
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => {
            onSelect(s.id);
            document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
          }}
          className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
            active === s.id
              ? "bg-primary/15 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          {s.title}
        </button>
      ))}
    </nav>
  );
}

export function IntegrationManualPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="flex gap-8 relative">
      {/* Table of Contents */}
      <aside className="hidden xl:block w-56 flex-shrink-0">
        <TableOfContents active={activeSection} onSelect={setActiveSection} />
      </aside>

      {/* Main Content */}
      <article className="flex-1 min-w-0 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-3">
            <span>v12.0</span>
            <span className="text-border">·</span>
            <span>Operator Reference</span>
            <span className="text-border">·</span>
            <span className="text-amber-400">Internal Only</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Integration Manual</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
            The full technical wiring guide for LEE v12.0. Covers every connection point, startup sequence, API contract,
            domain event flow, engine lifecycle, and security constraint required to bring LEE from cold storage to
            fully operational. This is not a conceptual overview — it is step-by-step.
          </p>
        </div>

        {/* 0. Overview and Prerequisites */}
        <SectionAnchor id="overview" />
        <H2>0. Overview and Prerequisites</H2>
        <P>
          LEE is composed of 11 architectural layers (0–9, with 6b) containing 69 distinct engines, services,
          and responsibilities. Two of these — CIL and CerbaSeal — run as entirely separate deployments. Everything
          else runs as a single LEE process. The Integration Manual describes how to wire all of this together correctly.
        </P>

        <H3>What "connected" means</H3>
        <P>A fully operational LEE has the following connections live simultaneously:</P>
        <Ul items={[
          "Foundation DB (append-only Event Log, core schema, Brain Versioning tables) — LEE writes",
          "Knowledge Layer DB (five ledgers, Intelligence Graph, Why Chain, Digital Twin Timeline) — LEE reads and writes",
          "CIL deployment (separate process, separate DB) — LEE calls via authenticated HTTP",
          "CerbaSeal deployment (separate process, separate DB) — LEE calls via authenticated HTTP, fail-closed",
          "At least one CommunicationProvider adapter (e.g., Gmail or Proton) — read-only by default",
          "At least one DevelopmentProvider adapter (e.g., GitHub or Replit) — read-only by default",
          "At least one DocumentProvider adapter (e.g., Google Drive) — read-only by default",
          "SchedulingProvider adapter — read-only by default",
          "Console (web app) — read/write via authenticated session",
        ]} />

        <H3>Required environment variables (LEE process)</H3>
        <CodeBlock label="LEE process env">{`# Foundational
LEE_VERSION=12.0
LEE_OWNER_ID=<canonical owner identifier>
LEE_ENV=production                   # production | staging | development

# Databases
LEE_FOUNDATION_DB_URL=<postgres dsn>
LEE_KNOWLEDGE_DB_URL=<postgres dsn>  # may be same instance, different schema

# CIL Connection
CIL_LEE_API_KEY=<api key>            # issued by CIL to LEE
CIL_LEE_HMAC_SECRET=<secret>         # shared secret for HMAC signing
CIL_BASE_URL=https://<cil-host>

# CerbaSeal Connection
CERBASEAL_API_KEY=<api key>          # issued by CerbaSeal to LEE
CERBASEAL_HMAC_SECRET=<secret>       # shared secret for HMAC signing
CERBASEAL_BASE_URL=https://<cerbaseal-host>

# Console
CONSOLE_SESSION_SECRET=<random 64-byte hex>
CONSOLE_ALLOWED_ORIGINS=https://<your-domain>

# Provider credentials (examples — add per adapter)
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...
GITHUB_OAUTH_TOKEN=...               # read-only PAT
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=<base64 encoded>`}
        </CodeBlock>

        <CalloutBox variant="critical" title="Credentials are never passed to models or logged">
          CIL_LEE_HMAC_SECRET, CERBASEAL_HMAC_SECRET, and all provider OAuth tokens must never appear in any
          log output, any CIL reasoning request, or any CerbaSeal evidence envelope. This is Constitutional
          Provision #8 and is enforced at the Governance Engine level.
        </CalloutBox>

        {/* 1. Startup Sequence */}
        <SectionAnchor id="startup" />
        <H2>1. Startup and Boot Sequence</H2>
        <P>
          LEE's engines boot in strict dependency order. Attempting to start an engine before its dependencies are
          healthy will trigger a boot failure, not a degraded start. The Engine Lifecycle Manager enforces this.
        </P>

        <CalloutBox variant="seq" title="Layer boot order is non-negotiable">
          Identity (0) must be healthy before anything else starts. Foundations (1) must be healthy before any
          engine in Layers 2–9 starts. CerbaSeal must be reachable before the Governance Engine (Layer 5) starts.
        </CalloutBox>

        <StepBlock n="1" title="Foundation DB — schema apply and health check">
          Run all pending migrations against the Foundation DB. Verify the Event Log table has append-only constraints
          enforced at the database level (no UPDATE, no DELETE — checked via information_schema). If this check fails,
          abort. LEE will not start on a Foundation DB without append-only guarantees.
        </StepBlock>

        <StepBlock n="2" title="Knowledge Layer DB — schema apply and health check">
          Run pending migrations for all five ledger tables (Fact, Interpretation, Anchor, Decision Heuristic,
          Institutional Knowledge), Assumption Ledger, Intelligence Graph, Why Chain, and Digital Twin Timeline.
          Verify that the Anchor Ledger has no "expires_at" column — anchors never age out.
        </StepBlock>

        <StepBlock n="3" title="CerbaSeal — reachability check">
          Send an authenticated GET /health to the CerbaSeal deployment. If CerbaSeal is unreachable, the boot
          sequence pauses here. The Governance Engine will not start without CerbaSeal. All consequential actions
          are fail-closed until this succeeds. Do not continue to step 4 until CerbaSeal returns 200.
        </StepBlock>

        <StepBlock n="4" title="CIL — reachability check (non-blocking)">
          Send an authenticated GET /health to the CIL deployment. If CIL is unreachable, log the degraded state
          and continue — CIL unavailability does not block boot, but Operational Confidence will be depressed.
          The Strategy Engine and Understanding Pipeline must surface an explicit degraded or held result when CIL is unavailable; they do not fall back to local cognitive routing.
        </StepBlock>

        <StepBlock n="5" title="Identity Engine (Layer 0) — load Identity Profile">
          Load the latest versioned Identity Profile from the Foundation DB. Verify all 12 behavioral dimensions
          are present and non-null. If any dimension is missing, run the Identity Onboarding Flow (see Section 10)
          before continuing. The Identity Profile must be resident in memory before any request is processed.
        </StepBlock>

        <StepBlock n="6" title="Constitution Engine (Layer 1) — load and verify provisions">
          Load all 13 Constitutional Provisions into the Constitution Engine. Verify that the provision checksums
          match the canonical v12.0 hashes. If any provision hash mismatches, abort with a constitutional integrity
          error. Provisions are code-enforced — do not allow runtime overrides.
        </StepBlock>

        <StepBlock n="7" title="Knowledge Layer engines (Layer 2) — warm up">
          Start the five ledger read-write pools, the Intelligence Graph engine, the Why Chain tracker, the Knowledge
          Aging scheduler, and the Assumption Ledger. The Semantic Index (Layer 3) begins warming in the background
          — it does not need to be fully warm to complete boot.
        </StepBlock>

        <StepBlock n="8" title="Intelligence engines (Layer 4) — start all nine">
          Start: Intent Engine, Understanding Pipeline, Curiosity Engine, Strategy Engine, Reflection Engine,
          Explanation Engine, Confidence Propagation, Uncertainty Tracking, Simulation Engine. Each engine registers
          itself with the Capability Registry. Engines that fail to register are marked unavailable — they do not
          block other engines.
        </StepBlock>

        <StepBlock n="9" title="Coordination Layer (Layer 5) — start and verify Governance">
          Start: Orchestration Engine, Policy Engine, Governance Engine, Resource Engine, State Engine, Engine
          Lifecycle Manager. The Governance Engine performs one test call to CerbaSeal (POST /governed-action with
          action_type: "boot-verify") to confirm the HMAC signing chain is working. If this fails, halt.
        </StepBlock>

        <StepBlock n="10" title="Operational Context (Layer 6) + Portfolio Intelligence (6b) — start Executive Loop">
          Start the World State Engine, Operational Memory, Initiative Engine, OIE, Resource Allocation Engine,
          and all Portfolio Intelligence engines. Then start the Executive Loop — the 8-phase operational heartbeat.
          The first loop iteration runs in "boot" mode (reduced scope). Log the loop start timestamp.
        </StepBlock>

        <StepBlock n="11" title="Provider adapters (Layer 8) — connect and authorize">
          For each configured provider, instantiate the adapter and run its auth check. Providers that fail auth
          are marked disconnected in the Capability Registry and on the Console Connectors page. Failed providers
          depress Operational Confidence for their domain (Communication, Development, etc.) but do not block boot.
        </StepBlock>

        <StepBlock n="12" title="Console and Brief Engine (Layer 9) — start web server">
          Start the Console web server with session authentication. Start the Brief Engine in standby mode.
          Run the Self-Test framework (constitutional and functional checks). Log the System Manifest entry for
          this boot. LEE is now operational.
        </StepBlock>

        {/* 2. Request Pipeline */}
        <SectionAnchor id="request-pipeline" />
        <H2>2. The Request Pipeline</H2>
        <P>
          Every request that enters LEE — whether from the Console, the Android App, the Executive Loop, or an
          internal engine — passes through the same pipeline in the same order. No layer may be skipped.
        </P>

        <CodeBlock label="Request pipeline — layer call order">{`Request received (Console / Android App / Executive Loop)
  │
  ▼
Layer 0: Identity Engine
  │  — Load Identity Profile (12 behavioral dimensions)
  │  — Determine behavioral posture for this request
  │  — Output: identity_consultation { interrupt_threshold, silence_threshold,
  │             escalation_posture, asking_posture, observation_posture, ... }
  ▼
Layer 1: Constitution Engine
  │  — Check all 13 ABSOLUTE provisions against the request
  │  — Output: constitutional_decision { allowed: bool, blocking_provision?: string }
  │  — If allowed=false: return ConstitutionalBlock response immediately.
  │    No further processing. No exceptions.
  ▼
Layer 4: Intent Engine
  │  — Parse and classify owner intent
  │  — Output: classified_intent { type, risk_level, domain, entities[] }
  ▼
Layer 3: Query Engine
  │  — Pull relevant context from Knowledge Layer
  │  — Context Economy scoring selects top-K items within token budget
  │  — Output: context_packet { facts[], interpretations[], assumptions[], anchors[] }
  ▼
Layer 4: Strategy Engine (if request needs recommendation)
  │  — CIL call: POST /query with context_packet + classified_intent
  │  — Output: recommendation { action, rationale, confidence, tier_used }
  ▼
Layer 5: Governance Engine (if action is consequential)
  │  — Build GovernedRequest (see Section 4)
  │  — CerbaSeal call: POST /governed-action
  │  — Output: governance_decision { verdict: ALLOW|HOLD|REJECT, reason_codes[] }
  │  — If HOLD or REJECT: return to owner for decision. Never auto-override.
  ▼
Layer 1: Event Log (append)
  │  — Write domain event for this request (typed, with full provenance)
  ▼
Response assembled and returned`}
        </CodeBlock>

        <H3>Constitutional blocks — behavior</H3>
        <P>
          When the Constitution Engine returns <code className="text-xs font-mono bg-background/80 border border-border rounded px-1.5 py-0.5">allowed: false</code>, LEE returns a
          ConstitutionalBlock response to the caller. The blocking provision number is included.
          The event is logged. No reasoning, no CIL call, no workaround. This is non-negotiable.
        </P>

        <H3>Risk levels and what they trigger</H3>
        <CodeBlock label="Intent risk levels → pipeline branch">{`risk_level: LOW
  → Standard pipeline. No Governance Engine call required.

risk_level: MEDIUM
  → Governance Engine consulted. CerbaSeal call made.
  → ALLOW → proceed. HOLD → surface to owner. REJECT → stop.

risk_level: HIGH
  → Governance Engine consulted. CerbaSeal call made.
  → Constitutional provisions re-checked before execution.
  → ALLOW requires additional evidence in the GovernedRequest.
  → HOLD always surfaces to owner — never auto-resolves.

risk_level: ABSOLUTE
  → Constitutional Engine blocks unconditionally.
  → Pipeline never reaches Governance Engine.`}
        </CodeBlock>

        {/* 3. CIL Connection */}
        <SectionAnchor id="cil" />
        <H2>3. CIL Connection</H2>
        <P>
          CIL (the reasoning reuse service) runs as a separate deployment. LEE calls it via authenticated HTTP.
          CIL maintains its own database — LEE never accesses it directly.
        </P>

        <H3>Authentication</H3>
        <P>
          Every request to CIL is authenticated with an HMAC-SHA256 signature. The signature covers the request
          body, timestamp, and a nonce. Requests without a valid signature are rejected with 401.
        </P>
        <CodeBlock label="CIL request signing (pseudo)">{`function signCILRequest(body: object): Headers {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const payload = JSON.stringify(body) + timestamp + nonce;
  const signature = hmacSHA256(payload, process.env.CIL_LEE_HMAC_SECRET);
  return {
    "X-CIL-API-Key": process.env.CIL_LEE_API_KEY,
    "X-CIL-Timestamp": timestamp,
    "X-CIL-Nonce": nonce,
    "X-CIL-Signature": signature,
    "Content-Type": "application/json",
  };
}`}
        </CodeBlock>

        <H3>CIL Query request format</H3>
        <CodeBlock label="POST /query">{`{
  "request_id": "<uuid>",           // LEE-generated, used to match response
  "caller": "lee-v12",
  "query_type": "reasoning",        // reasoning | classification | extraction
  "context": {
    "facts": [...],                  // from Knowledge Layer — never include raw credentials
    "intent": { ... },               // from Intent Engine output
    "relevant_interpretations": [...],
    "active_anchors": [...],         // Strategic Anchors always included
  },
  "constraints": {
    "token_budget": 4096,
    "prefer_tier": "auto",          // auto | T1 | T2 | T3
    "require_provenance": true
  }
}`}
        </CodeBlock>

        <H3>CIL three-tier resolution</H3>
        <CodeBlock label="CIL tier behavior">{`T1 — Trigram Cache
  → Hit if query is near-identical to a cached query (trigram similarity > 0.92)
  → Response time: <50ms
  → Use when: high-frequency repeated reasoning patterns

T2 — Vector Cache
  → Hit if semantic similarity > 0.85 to a cached query
  → Response time: <200ms
  → Use when: semantically similar but not identical queries

T3 — CIL-selected execution
  → Cold cache or similarity below threshold
  → CIL selects the approved model/provider route
  → LEE executes that route through the Replit AI Bridge
  → Response time: 1–10s
  → Always occurs on first query of a new type`}
        </CodeBlock>

        <H3>CIL response format</H3>
        <CodeBlock label="CILQueryResolved response">{`{
  "request_id": "<uuid>",           // matches request
  "tier_used": "T2",                // T1 | T2 | T3
  "result": {
    "reasoning": "...",
    "recommendation": { ... },
    "confidence": 0.87
  },
  "provenance": {
    "cache_key": "...",
    "model_used": null,             // null if T1 or T2 cache hit
    "cached_at": "..."
  },
  "cost_tokens": 0,                // 0 for T1/T2; token count for T3
  "latency_ms": 143
}`}
        </CodeBlock>

        <H3>CIL degradation — what happens when CIL is down</H3>
        <Ul items={[
          "CIL unavailable: explicit degraded/no-model or held reasoning result (no local T1/T2/T3 substitute)",
          "Understanding Pipeline processes documents using local extraction only",
          "Operational Confidence is depressed (CIL health is a component of Operational Confidence)",
          "CIL health is surfaced independently from CerbaSeal and Project Operations",
          "Every CIL call attempt is logged as a domain event (CILCallFailed)",
          "When CIL restores, the queue of failed reasoning requests is NOT automatically replayed — owner initiates replay",
        ]} />

        {/* 4. CerbaSeal Connection */}
        <SectionAnchor id="cerbaseal" />
        <H2>4. CerbaSeal Connection</H2>
        <P>
          CerbaSeal is the consequential-action authorization service. It runs as a separate deployment with its
          own database. LEE calls it for every action classified as consequential. CerbaSeal is fail-closed:
          if it is unreachable, all consequential actions are HELD — never auto-approved.
        </P>

        <CalloutBox variant="critical" title="CerbaSeal is never bypassed">
          There is no override flag, no development bypass, no "trust me" mode. If CerbaSeal is down, consequential
          actions wait. This is Constitutional Provision #9. The Governance Engine does not have a fallback path
          that skips CerbaSeal.
        </CalloutBox>

        <H3>What counts as a consequential action</H3>
        <Ul items={[
          "Sending any communication (email, message, notification) on behalf of the owner",
          "Creating, modifying, or deleting any external resource (GitHub issue, Drive document, calendar event)",
          "Making any financial decision or recommendation that triggers a workflow",
          "Modifying the Identity Profile",
          "Modifying any Strategic Anchor",
          "Running any write operation against the Institutional Knowledge Ledger",
          "Generating and persisting a Brain Version snapshot on demand",
          "Any action classified as risk_level MEDIUM or HIGH by the Intent Engine",
        ]} />

        <H3>GovernedRequest format</H3>
        <CodeBlock label="POST /governed-action">{`{
  "request_id": "<uuid>",
  "caller": "lee-v12",
  "action": {
    "type": "send-email",           // typed action identifier
    "description": "...",           // human-readable, for audit trail
    "target": "...",                // who/what is affected
    "reversible": false,            // true if the action can be undone
    "impact_scope": "external"      // internal | external | owner-only
  },
  "evidence": {
    "intent_classification": { ... },      // from Intent Engine
    "constitutional_check": { ... },       // from Constitution Engine
    "owner_approval": null,                // populated if owner pre-approved
    "relevant_policy_rules": [ ... ],      // from Policy Engine
    "confidence_score": 0.91,
    "risk_level": "MEDIUM"
  },
  "decision_envelope": {
    "request_context_summary": "...",      // no credentials, no raw data
    "fallback_if_held": "notify-owner",    // what LEE does if HOLD returned
  }
}`}
        </CodeBlock>

        <H3>CerbaSeal response and handling</H3>
        <CodeBlock label="Governance decision response">{`{
  "request_id": "<uuid>",
  "verdict": "ALLOW",              // ALLOW | HOLD | REJECT
  "reason_codes": [],              // populated on HOLD or REJECT
  "conditions": [],                // any conditions attached to an ALLOW
  "audit_id": "<cerbaseal-audit-uuid>",
  "decided_at": "2026-07-14T..."
}

ALLOW  → proceed with the action, log the audit_id on the domain event
HOLD   → surface to owner via Console notification. Do not auto-proceed.
         Owner must explicitly approve or reject. Log HoldIssued event.
REJECT → do not proceed. Log ActionRejected event. Explain to owner why.`}
        </CodeBlock>

        <H3>HMAC signing for CerbaSeal</H3>
        <CodeBlock label="CerbaSeal request signing (pseudo)">{`function signCerbaSealRequest(body: object): Headers {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const payload = JSON.stringify(body) + timestamp + nonce;
  const signature = hmacSHA256(payload, process.env.CERBASEAL_HMAC_SECRET);
  return {
    "X-CerbaSeal-API-Key": process.env.CERBASEAL_API_KEY,
    "X-CerbaSeal-Timestamp": timestamp,
    "X-CerbaSeal-Nonce": nonce,
    "X-CerbaSeal-Signature": signature,
    "Content-Type": "application/json",
  };
}`}
        </CodeBlock>

        {/* 5. Domain Event Bus */}
        <SectionAnchor id="event-bus" />
        <H2>5. Domain Event Bus</H2>
        <P>
          LEE uses event sourcing as its truth store (Architectural Principle #2). Every state change produces a
          typed domain event that is appended to the Event Log. The Event Log is append-only at the database
          constraint level — no UPDATE, no DELETE, enforced by the Foundation DB schema.
        </P>

        <H3>Event structure</H3>
        <CodeBlock label="Domain event envelope">{`{
  "event_id": "<uuid>",
  "event_type": "KnowledgeAged",         // typed — see Domain Events catalog
  "schema_version": "1.0",
  "occurred_at": "2026-07-14T...",
  "source_engine": "knowledge-aging",
  "source_layer": 2,
  "payload": { ... },                     // event-specific data
  "provenance": {
    "triggered_by_request_id": "<uuid>",  // the request that caused this
    "triggered_by_event_id": "<uuid>",    // if cascaded from another event
    "why_chain_entry": "<uuid>",          // links to Why Chain
  },
  "confidence": 0.95,                     // confidence in this event
  "owner_id": "<owner-id>"
}`}
        </CodeBlock>

        <H3>Key domain events and which engines consume them</H3>
        <CodeBlock label="Event → consumer map (selected)">{`IdentityProfileUpdated
  → Constitution Engine (re-validates compatibility)
  → All engines (profile may affect behavior thresholds)

ConstitutionalBlock
  → Event Log (always)
  → Console (surfaced to owner if risk_level >= MEDIUM)

IntentClassified
  → Strategy Engine
  → Governance Engine (if risk_level >= MEDIUM)

KnowledgeAged
  → Curiosity Engine (surfaces as a knowledge gap question)
  → OIE (may reprioritize operational agenda)

AssumptionInvalidated
  → Why Chain (updates provenance for all derived beliefs)
  → Strategy Engine (may invalidate pending recommendations)

CILCallFailed
  → Capability Registry (marks CIL as degraded)
  → Operational Confidence (depresses score)

GovernedActionHeld
  → Console (owner notification)
  → Executive Loop (pauses any scheduled execution of this action)

BrainVersionCreated
  → Console (Version History page)
  → Backup & Migration (triggers verification)

ExecutiveLoopCompleted
  → Event Log
  → Operational Memory (updates usage patterns)`}
        </CodeBlock>

        <H3>Writing to the Event Log</H3>
        <P>
          All writes to the Event Log go through the Foundation Layer's Event Log writer — never directly to the DB.
          The writer enforces: (1) schema validation against the Domain Events catalog, (2) append-only semantics,
          (3) provenance chain population, (4) confidence score attachment.
        </P>
        <CalloutBox variant="warn" title="No engine writes events directly to the database">
          All event appends go through the Event Log writer service. Direct DB writes bypass schema validation
          and provenance enforcement. This is architecturally prohibited.
        </CalloutBox>

        {/* 6. Provider Wiring */}
        <SectionAnchor id="providers" />
        <H2>6. Provider Wiring</H2>
        <P>
          All external service access goes through the Provider Abstraction Layer (Layer 8). No engine above
          Layer 8 references a specific service by name. Engines request capabilities — the PAL routes to the
          appropriate adapter.
        </P>

        <H3>Provider interface types</H3>
        <CodeBlock label="Five provider interface types">{`CommunicationProvider
  → Capabilities: read_inbox, read_thread, send_message, search_messages
  → Adapters: GmailAdapter, ProtonAdapter
  → Default policy: read-only. Send requires CerbaSeal ALLOW.

DocumentProvider
  → Capabilities: read_file, list_files, search_files, create_file, update_file
  → Adapters: GoogleDriveAdapter, NotionAdapter
  → Default policy: read-only. Create/update requires CerbaSeal ALLOW.

DevelopmentProvider
  → Capabilities: list_repos, read_repo, read_file, list_issues, create_issue,
                  create_pr, merge_pr, read_deployment
  → Adapters: GitHubAdapter, ReplitAdapter
  → Default policy: read-only. Create/merge requires CerbaSeal ALLOW.

SchedulingProvider
  → Capabilities: read_calendar, create_event, update_event, delete_event
  → Adapters: GoogleCalendarAdapter
  → Default policy: read-only. Create/update/delete requires CerbaSeal ALLOW.

StorageProvider
  → Capabilities: read_object, write_object, list_objects, delete_object
  → Adapters: S3Adapter, GCSAdapter
  → Default policy: read-only. Write/delete requires CerbaSeal ALLOW.`}
        </CodeBlock>

        <H3>Adding a new provider adapter</H3>
        <StepBlock n="1" title="Implement the interface">
          Create a class that implements the relevant provider interface (e.g., CommunicationProvider).
          Implement all capability methods. Unimplemented capabilities return a CapabilityNotSupported error.
        </StepBlock>
        <StepBlock n="2" title="Register with the PAL">
          Add the adapter to the Provider Abstraction Layer registry with its provider_type and capabilities list.
          The PAL will route requests to it based on capability matching.
        </StepBlock>
        <StepBlock n="3" title="Add auth check to boot sequence">
          Add the adapter's auth check to Step 11 of the boot sequence. The adapter must succeed its auth check
          to be marked available in the Capability Registry.
        </StepBlock>
        <StepBlock n="4" title="Add Connector entry in Console">
          Add an entry to the Connectors page data so the owner can see connection status and manually reconnect.
        </StepBlock>

        <CalloutBox variant="note" title="Bootstrap Engine uses DevelopmentProvider — read-only">
          The Project Bootstrap Engine scans project structure via the DevelopmentProvider. It reads file trees,
          dependency manifests, and documentation. It never reads secret values (Constitutional Provision #8).
          It never needs write access.
        </CalloutBox>

        {/* 7. Executive Loop */}
        <SectionAnchor id="executive-loop" />
        <H2>7. The Executive Loop</H2>
        <P>
          The Executive Loop is the operational heartbeat — LEE's continuous self-management process that runs
          regardless of owner interaction. It has 8 phases and runs on a configurable schedule (default: every 15
          minutes). It is coordinated by the Orchestration Engine (Layer 5) and executed by Layer 6 engines.
        </P>

        <CodeBlock label="8-phase Executive Loop">{`Phase 1: STATE REFRESH
  → World State Engine refreshes from all provider adapters
  → Reads new emails, commits, calendar events, document changes
  → Writes normalized provider events to the Event Log

Phase 2: KNOWLEDGE INTEGRATION
  → Understanding Pipeline processes new documents and signals
  → New facts, interpretations, and assumptions are written to their ledgers
  → Knowledge Aging runs — ages relevant items

Phase 3: INTELLIGENCE SYNTHESIS
  → Curiosity Engine identifies knowledge gaps
  → Reflection Engine identifies historical patterns
  → Simulation Engine runs any pending simulations (read-only)
  → Confidence Propagation updates all affected objects

Phase 4: PORTFOLIO ASSESSMENT
  → Project Momentum Engine re-classifies project trajectories
  → Opportunity Engine scans for new cross-project opportunities
  → Portfolio Dependency Graph checks for new blast-radius risks
  → Execution Readiness scores re-computed

Phase 5: OPERATIONAL PRIORITY COMPUTATION
  → OIE re-ranks all operational items
  → Resource Allocation Engine re-distributes attention allocation
  → Executive Objectives Engine updates objective health states
  → Initiative Engine surfaces new observations from drift detection

Phase 6: GOVERNANCE SWEEP
  → Any pending HOLD decisions are re-evaluated (did conditions change?)
  → Expiring actions are surfaced to owner
  → Policy Engine checks for policy violations in new state

Phase 7: BRIEF PREPARATION
  → If next brief window is within the next loop period, Brief Engine
    pre-computes the brief from current state
  → Brief is staged — not sent until the scheduled brief time

Phase 8: SELF-ASSESSMENT
  → Operational Confidence score computed from all component signals
  → Operational Self-Improvement evaluates its own loop effectiveness
  → System Economics updates cost accounting for this loop run
  → ExecutiveLoopCompleted event appended to Event Log`}
        </CodeBlock>

        <H3>Loop configuration</H3>
        <CodeBlock label="Executive Loop policy (owner-configurable)">{`{
  "loop_interval_minutes": 15,         // default: 15min
  "deep_focus_mode_interval": 60,      // during Deep Focus mode: 60min
  "low_power_mode_interval": 120,      // during Low Power mode: 120min
  "maintenance_mode": false,           // if true, loop runs Phase 1 only
  "phases_enabled": [1,2,3,4,5,6,7,8], // phases can be disabled individually
  "resource_budget_tokens_per_loop": 50000,
  "max_cil_calls_per_loop": 10
}`}
        </CodeBlock>

        {/* 8. Writing to the Knowledge Layer */}
        <SectionAnchor id="knowledge-write" />
        <H2>8. Writing to the Knowledge Layer</H2>
        <P>
          Each knowledge type has a distinct write path. Writing to the wrong ledger is a logic error.
          The following rules are absolute.
        </P>

        <CodeBlock label="Knowledge type → ledger mapping">{`FACT
  → Fact Ledger
  → Requires: source provenance, confidence score
  → Ages: yes (default 90 days unless refreshed)
  → Who writes: Understanding Pipeline (from documents), World State Engine (from providers)

INTERPRETATION
  → Interpretation Ledger
  → Requires: source fact(s), reasoning chain, confidence score
  → Ages: yes (faster than facts — interpretations are more fragile)
  → Who writes: Intelligence engines (Strategy, Reflection, OIE)
  → Rule: NEVER stored as a fact. Constitutional Principle #4.

ASSUMPTION
  → Assumption Ledger
  → Requires: what is being assumed, why, and what would invalidate it
  → Ages: yes, with expiry check on each loop
  → Who writes: any engine that acts on uncertain data

ANCHOR (Strategic Anchor)
  → Anchor Ledger
  → Requires: owner confirmation to create or modify
  → Ages: NEVER. Anchors are intentionally durable (Principle #28)
  → Who writes: owner via Console only. No engine auto-creates anchors.
  → CerbaSeal: required for any anchor modification

DECISION HEURISTIC
  → Decision Heuristic Ledger
  → Requires: observed decision pattern (minimum 3 observations)
  → Ages: slowly (heuristics are checked against new decisions)
  → Who writes: Decision Memory system (inferred from observed behavior)

INSTITUTIONAL KNOWLEDGE
  → Institutional Knowledge Ledger
  → Requires: real-world validation of a prior belief (Principle #41)
  → Ages: very slowly
  → Who writes: Reflection Engine, after validation event observed
  → Rule: beliefs promoted to IK only after reality tests them.
             Experience → Lesson → Pattern → Institutional Knowledge.

WHY CHAIN (for every write)
  → Every knowledge write creates a Why Chain entry
  → Why Chain entry: { knowledge_id, derived_from[], reasoned_by, confidence }
  → Chains are never broken. If source is deleted, chain marks source as "retracted".`}
        </CodeBlock>

        {/* 9. Engine Lifecycle */}
        <SectionAnchor id="engine-lifecycle" />
        <H2>9. Engine Lifecycle and Recovery</H2>
        <P>
          The Engine Lifecycle Manager (Layer 5) manages start, stop, health checking, and recovery for all
          engines. It maintains the Capability Registry — a live map of engine health states.
        </P>

        <H3>Engine states</H3>
        <CodeBlock label="Engine health states">{`INITIALIZING  → Engine is starting. Dependency checks running.
HEALTHY       → Engine is operating normally.
DEGRADED      → Engine is running but with reduced capability.
               Logged. Operational Confidence impact computed.
               Does not trigger Recovery Mode unless this engine is critical.
UNHEALTHY     → Engine has failed its health check.
               Triggers Recovery Mode selection.
               Other engines that depend on this one are notified.
STOPPED       → Engine was intentionally stopped (maintenance, mode change).
UNAVAILABLE   → Engine failed to start or crashed unrecoverably.`}
        </CodeBlock>

        <H3>Recovery modes</H3>
        <CodeBlock label="Recovery mode triggers and behavior">{`Recovery Mode: ReadOnly
  Trigger: Knowledge Layer DB unavailable, or Event Log unwritable
  Behavior: All read operations continue. All write operations queued.
            Operational Confidence: severely degraded.
            Executive Loop: Phase 1 only (state refresh from cache).

Recovery Mode: Safe
  Trigger: Foundation DB unavailable
  Behavior: No new requests processed. Console shows recovery status.
            Existing in-memory state preserved. No writes attempted.
            Target recovery time: restore Foundation DB, then normal boot.

Recovery Mode: Manual
  Trigger: Orchestration Engine or Scheduler failure
  Behavior: Executive Loop paused. Owner must manually trigger loops.
            All engines remain running. No automatic scheduling.
            Console: Manual Loop control appears.

Recovery Mode: Degraded-CIL
  Trigger: CIL unreachable for > 2 consecutive health checks
  Behavior: All reasoning falls back to local. No T1/T2/T3 access.
            Operational Confidence depressed.
            Self-healing: CIL health checked every 60s. Auto-restores
            when CIL returns healthy.`}
        </CodeBlock>

        {/* 10. Identity Onboarding */}
        <SectionAnchor id="identity-onboarding" />
        <H2>10. First-Time Identity Onboarding</H2>
        <P>
          The Identity Profile (12 behavioral dimensions) must be populated before LEE can process any request.
          On first boot, if the Identity Profile is missing, the Identity Onboarding Flow runs before boot continues.
          This flow is owner-interactive — LEE cannot self-initialize her Identity Profile.
        </P>

        <H3>The 12 Identity dimensions</H3>
        <CodeBlock label="Identity Profile — 12 dimensions (v11.0+)">{`1.  communication_style        — how LEE communicates (direct / measured / formal / etc)
2.  interrupt_threshold         — what warrants interrupting the owner
3.  silence_threshold           — how long before LEE initiates on her own
4.  escalation_posture          — how LEE handles uncertain or risky situations
5.  asking_posture              — how often and when LEE asks clarifying questions
6.  observation_posture         — how proactively LEE surfaces unsolicited observations
7.  correction_style            — how LEE corrects the owner when she disagrees
8.  initiative_level            — how much LEE acts vs. waits
9.  memory_prioritization       — what kinds of information LEE treats as most durable
10. strategic_alignment_mode    — how LEE weights short-term vs. long-term recommendations
11. owner_energy_model          — how LEE infers and adapts to owner capacity
12. relationship_model          — how LEE understands her role relative to the owner`}
        </CodeBlock>

        <StepBlock n="1" title="Onboarding prompt sequence">
          LEE presents one dimension at a time. For each dimension, she explains what it means in operational
          terms (not abstract terms) and asks the owner to confirm or set a value. Values are in human language,
          not enums — LEE holds them semantically.
        </StepBlock>
        <StepBlock n="2" title="Provisional Identity Profile">
          After the onboarding conversation, LEE produces a provisional Identity Profile and presents it to the
          owner for review. The owner confirms, adjusts, or rejects each dimension before the profile is persisted.
        </StepBlock>
        <StepBlock n="3" title="Profile persistence">
          The confirmed Identity Profile is written to the Foundation DB with version 1.0. An IdentityProfileUpdated
          domain event is appended. Boot continues from Step 6.
        </StepBlock>
        <StepBlock n="4" title="Subsequent profile changes">
          Every change to the Identity Profile after initial setup requires explicit owner confirmation.
          No engine may modify the Identity Profile autonomously. Changes produce a new version number and a
          new IdentityProfileUpdated event.
        </StepBlock>

        {/* 11. Security Rules */}
        <SectionAnchor id="security-rules" />
        <H2>11. Security Rules and Hard Stops</H2>
        <P>
          These rules are not configurable. They are enforced in code and at the constitutional level.
          Any deviation is a bug, not a feature.
        </P>

        <div className="space-y-3">
          {[
            ["Credentials never reach models", "No CIL request, no prompt, no CerbaSeal evidence envelope may contain any credential, token, or secret value. This is checked by the Governance Engine before every CIL and CerbaSeal call."],
            ["CerbaSeal is never bypassed", "There is no override. Consequential actions with CerbaSeal unreachable are HELD indefinitely. No 'development mode' bypass exists."],
            ["Event Log is append-only", "Enforced at DB constraint level. The LEE application has no UPDATE or DELETE privileges on the Event Log table. Any attempt raises a fatal error."],
            ["Strategic Anchors require owner confirmation", "No engine creates or modifies a Strategic Anchor autonomously. All anchor operations go through the Console and require explicit owner action."],
            ["Simulations never trigger actions", "The Simulation Engine is read-only. Its outputs are stored simulations, not action authorizations. The Governance Engine rejects any action request sourced from a simulation."],
            ["Bootstrap Engine never reads secrets", "The Project Bootstrap Engine reads file structures and dependency manifests only. It has no provider permissions that allow reading environment files or secret stores."],
            ["No engine names a specific service", "Engines above Layer 8 request capabilities (e.g., 'send a message via CommunicationProvider'). Any engine that imports or names a specific service adapter directly is in violation of Architectural Principle #21."],
            ["Institutional Knowledge Ledger is internal only", "IK entries are never sent to CIL, CerbaSeal, or any external service. They inform LEE's reasoning locally."],
            ["Self-improvement cannot modify foundations", "Operational Self-Improvement can adjust operational parameters and scheduling weights. It cannot modify: Identity Profile, Constitutional Provisions, Strategic Anchors, or Knowledge Layer facts."],
            ["Identity Profile values are never external", "The 12 Identity dimensions are never sent to CIL, CerbaSeal, or any external service. They inform local behavior only."],
          ].map(([title, desc]) => (
            <div key={title} className="border border-border rounded-lg p-4 bg-card/30">
              <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <div className="text-xs font-mono text-muted-foreground/50">
            Project LEE Manual — Integration Manual — v12.0 — Internal Only
          </div>
          <Link href="/systems" className="text-xs text-primary hover:underline">
            LEE, CIL, and CerbaSeal reference →
          </Link>
        </div>
      </article>
    </div>
  );
}
