import { CONSTITUTIONAL_PROVISIONS } from "../data/constitution";
import { AbsoluteBadge, VersionBadge } from "../components/StatusBadge";

export function ConstitutionPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-foreground">Constitution</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">
            13 Provisions
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          The non-negotiable operating constraints of LEE. All 13 provisions are ABSOLUTE — they cannot be overridden, bypassed, disabled, or modified at runtime. They are consulted on every request, after Identity. They are enforced in code, not configuration.
        </p>
        <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <p className="text-sm text-red-400 font-medium">
            Constitutional provisions are not policies. Policies are configurable. Constitutional provisions are not.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The Policy Engine manages configurable rules. The Constitution Engine enforces ABSOLUTE provisions. These are two distinct systems.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {CONSTITUTIONAL_PROVISIONS.map(p => (
          <div
            key={p.number}
            id={`provision-${p.number}`}
            className="absolute-provision pl-4 bg-card border border-card-border rounded-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">Provision {p.number}</span>
                  <AbsoluteBadge />
                  <VersionBadge version={p.versionIntroduced} />
                </div>
                <h2 className="text-base font-semibold text-foreground">{p.statement}</h2>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Purpose</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.purpose}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Threat Prevented</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.threatPrevented}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Enforcement Location</p>
                <p className="text-xs text-muted-foreground">{p.enforcementLocation}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Systems Affected</p>
                <div className="flex flex-wrap gap-1">
                  {p.systemsAffected.map(s => (
                    <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <p className="text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-2">Example Violation</p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">{p.exampleViolation}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">Correct Behavior</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.correctBehavior}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
