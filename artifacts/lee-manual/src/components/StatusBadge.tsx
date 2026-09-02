type Status = "canonical" | "implementation" | "operational" | "draft" | "historical" | "superseded";

const CONFIG: Record<Status, { label: string; cls: string }> = {
  canonical:       { label: "Canonical",       cls: "status-canonical" },
  implementation:  { label: "Implementation",  cls: "status-implementation" },
  operational:     { label: "Operational",     cls: "status-operational" },
  draft:           { label: "Draft",           cls: "status-draft" },
  historical:      { label: "Historical",      cls: "status-historical" },
  superseded:      { label: "Superseded",      cls: "status-superseded" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function VersionBadge({ version }: { version: string }) {
  return (
    <span className="version-badge">v{version}</span>
  );
}

export function AbsoluteBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25 font-mono">
      ABSOLUTE
    </span>
  );
}

export function LayerBadge({ number, name }: { number: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-card border border-border text-muted-foreground font-mono">
      <span className="text-primary">L{number}</span>
      <span>{name}</span>
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: "proposed" | "in-progress" | "complete" }) {
  const config = {
    proposed:    { label: "Proposed",    cls: "bg-gray-500/15 text-gray-400 border border-gray-500/25" },
    "in-progress": { label: "In Progress", cls: "bg-amber-500/15 text-amber-400 border border-amber-500/25" },
    complete:    { label: "Complete",    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
