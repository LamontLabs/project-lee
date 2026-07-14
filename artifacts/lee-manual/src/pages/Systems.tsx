import { Link } from "wouter";

export function SystemsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">LEE, CIL, and CerbaSeal</h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Three distinct systems with distinct ownership boundaries. LEE is the operating environment. CIL is the reasoning service. CerbaSeal is the governance service. LEE calls both. Neither can be accessed by LEE's database queries.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center font-mono font-bold text-primary">L</div>
            <div>
              <h2 className="text-base font-semibold text-foreground">LEE — Learning Environment Engine</h2>
              <p className="text-xs text-muted-foreground">Operating Intelligence</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Owns: context, projects, people, timelines, facts, interpretations, objectives, portfolio, provider routing, and orchestration. LEE is the system that maintains operational continuity. She accumulates knowledge over time, maintains provenance, governs all consequential actions through CerbaSeal, and uses CIL for reusable reasoning.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owns</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>All 6 knowledge ledgers</li>
                <li>The Intelligence Graph</li>
                <li>The Event Log</li>
                <li>All engine state</li>
                <li>The Identity Profile</li>
                <li>Executive Objectives</li>
                <li>Brain Versions</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Does not own</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>CIL's reasoning cache</li>
                <li>CerbaSeal's governance log</li>
                <li>Provider adapter internals</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-mono font-bold text-blue-400">C</div>
            <div>
              <h2 className="text-base font-semibold text-foreground">CIL — Cognitive Infrastructure Layer</h2>
              <p className="text-xs text-muted-foreground">Reasoning Service · Separate Deployment</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Provides reusable reasoning via three tiers. Reduces frontier model dependency. When CIL is unavailable, LEE falls back to local reasoning — Operational Confidence is depressed, but LEE continues operating.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {[
              { tier: "T1", name: "Trigram Reuse", description: "Exact or near-exact match. Zero new inference cost." },
              { tier: "T2", name: "Vector Similarity", description: "Similar past reasoning found and adapted. Low inference cost." },
              { tier: "T3", name: "Frontier Escalation", description: "No match. Full frontier model reasoning. Full cost." },
            ].map(t => (
              <div key={t.tier} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                <span className="font-mono text-sm font-bold text-blue-400">{t.tier}</span>
                <p className="text-xs font-semibold text-foreground mt-1">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Authentication</p>
              <p className="text-xs text-muted-foreground">HMAC-authenticated HTTP API. Secret: <span className="font-mono text-primary">CIL_LEE_HMAC_SECRET</span>. Key: <span className="font-mono text-primary">CIL_LEE_API_KEY</span>.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Endpoint</p>
              <p className="text-xs font-mono text-primary/70">cognitive-infrastructure-layer.replit.app/api/query/lee</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs font-semibold text-amber-400 mb-1">Degradation Behavior</p>
            <p className="text-xs text-muted-foreground">CIL unavailability → local reasoning fallback. Operational Confidence depressed. No HOLD applied. LEE continues operating.</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center font-mono font-bold text-violet-400">G</div>
            <div>
              <h2 className="text-base font-semibold text-foreground">CerbaSeal</h2>
              <p className="text-xs text-muted-foreground">Governance Service · Separate Deployment · Fail-Closed</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Authorizes consequential actions. Every action with external effect (sending a message, triggering a deployment, modifying an external record) requires a CerbaSeal ALLOW before it can proceed. Returns ALLOW, HOLD, or REJECT with reason codes and an evidence bundle.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {[
              { outcome: "ALLOW", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", description: "Action is authorized. Proceed." },
              { outcome: "HOLD", color: "text-amber-400 bg-amber-500/10 border-amber-500/25", description: "Action is not authorized at this time. Queue for retry. Never automatically escalate to ALLOW." },
              { outcome: "REJECT", color: "text-red-400 bg-red-500/10 border-red-500/25", description: "Action is not permitted. Surface reason codes to owner." },
            ].map(o => (
              <div key={o.outcome} className={`p-3 rounded-lg border ${o.color}`}>
                <span className={`font-mono text-sm font-bold ${o.color.split(" ")[0]}`}>{o.outcome}</span>
                <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Authentication</p>
              <p className="text-xs text-muted-foreground">HMAC-authenticated HTTP API. Secret: <span className="font-mono text-primary">CERBASEAL_HMAC_SECRET</span>. Key: <span className="font-mono text-primary">CERBASEAL_API_KEY</span>.</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Endpoint</p>
              <p className="text-xs font-mono text-primary/70">cerbaseal.replit.app</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-xs font-semibold text-red-400 mb-1">Fail-Closed (Constitutional Provision #9)</p>
            <p className="text-xs text-muted-foreground">CerbaSeal unavailability → HOLD, not ALLOW. This is never bypassed. An unresponsive governance service is not a permissive governance service.</p>
          </div>
          <div className="mt-3">
            <Link href="/tasks/48" className="text-xs text-primary hover:underline">
              Task #48: Internal Capability Services Layer →
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Constitutional Provisions Governing These Systems</h2>
        <div className="space-y-2">
          {[
            { num: 9, text: "CerbaSeal is fail-closed.", path: "/constitution#provision-9" },
            { num: 10, text: "CIL and CerbaSeal databases are never accessed directly by LEE.", path: "/constitution#provision-10" },
            { num: 11, text: "Credentials for CIL and CerbaSeal are never logged, stored in LEE's DB, or sent to a model.", path: "/constitution#provision-11" },
          ].map(p => (
            <Link key={p.num} href={p.path}>
              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors group">
                <span className="font-mono text-xs text-red-400/70">P{p.num}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{p.text}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
