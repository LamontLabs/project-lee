import { useEffect, useState } from "react";

type PersonalityVersion = {
  id: string;
  version: number;
  status: string;
  sections: Record<string, unknown>;
  changeReason: string;
  sourceRefs: string[];
  proposedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  confirmedByOwner: boolean;
  createdAt: string;
};

type EvolutionEntry = {
  id: string;
  fromVersion?: number | null;
  toVersion: number;
  action: string;
  reason: string;
  actor: string;
  createdAt: string;
};

export default function PersonalityMemoryPanel() {
  const [current, setCurrent] = useState<PersonalityVersion | null>(null);
  const [versions, setVersions] = useState<PersonalityVersion[]>([]);
  const [evolution, setEvolution] = useState<EvolutionEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [reviewReason, setReviewReason] = useState("Owner reviewed and confirmed this presentation-only change.");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [currentResponse, versionsResponse, evolutionResponse] = await Promise.all([
      fetch("/api/personality", { cache: "no-store" }),
      fetch("/api/personality/versions", { cache: "no-store" }),
      fetch("/api/personality/evolution", { cache: "no-store" }),
    ]);
    if (!currentResponse.ok || !versionsResponse.ok || !evolutionResponse.ok) throw new Error("Unable to load Personality Memory.");
    const currentData = await currentResponse.json() as PersonalityVersion;
    const versionsData = await versionsResponse.json() as PersonalityVersion[];
    setCurrent(currentData);
    setVersions(versionsData);
    setEvolution(await evolutionResponse.json() as EvolutionEntry[]);
    if (!draft) setDraft(JSON.stringify(currentData.sections, null, 2));
  };

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load Personality Memory.")); }, []);

  const submitProposal = async () => {
    setBusy(true); setNotice(""); setError("");
    try {
      const sections = JSON.parse(draft) as Record<string, unknown>;
      const response = await fetch("/api/personality/propose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sections, changeReason: reason, evidenceRefs: ["owner-console-personality-review"] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Personality proposal failed.");
      setReason(""); setNotice(`Personality Memory proposal v${result.version} is waiting for owner review.`); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Personality proposal failed.");
    } finally { setBusy(false); }
  };

  const review = async (versionId: string, decision: "accept" | "reject" | "reverse") => {
    setBusy(true); setNotice(""); setError("");
    const response = await fetch("/api/personality/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId, decision, reason: reviewReason }) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Personality review failed.");
    else { setNotice(`Personality Memory ${decision}ed.`); await load(); }
    setBusy(false);
  };

  return <section className="mx-auto mt-5 max-w-[1280px]" data-testid="panel-personality-memory">
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="lee-label text-primary">Canonical Brain · presentation layer</p>
          <h3 className="mt-1 text-lg font-semibold">Personality Memory</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Versioned traits, preferences, heuristics, shared history, and tone boundaries. Personality shapes presentation only; it cannot change facts, uncertainty, CIL routing, governance, permissions, owner authority, or Event Log integrity.</p>
        </div>
        {current && <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Active v{current.version}</span>}
      </div>
      {notice && <p className="mt-4 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-primary" role="status">{notice}</p>}
      {error && <p className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="lee-label text-muted-foreground">Current sections</p><p className="mt-1 text-sm font-semibold">Safe, model-independent baseline</p></div><span className="text-xs text-muted-foreground">{current?.confirmedByOwner ? "Owner confirmed" : "Review required"}</span></div>
          <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-[11px] leading-relaxed text-muted-foreground">{current ? JSON.stringify(current.sections, null, 2) : "Loading…"}</pre>
          <div className="mt-4"><label className="text-xs font-semibold" htmlFor="personality-review-reason">Review reason</label><input id="personality-review-reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs" /></div>
          {current && current.version > 1 && <button onClick={() => void review(current.id, "reverse")} disabled={busy} className="mt-3 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50" data-testid="button-reverse-personality">Reverse active version</button>}
        </div>
        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <p className="lee-label text-muted-foreground">Owner-reviewed proposal</p>
          <p className="mt-1 text-sm font-semibold">Changes never activate automatically</p>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 min-h-56 w-full resize-y rounded-xl border border-input bg-background p-3 font-mono text-[11px] leading-relaxed outline-none focus:border-primary" aria-label="Personality Memory proposal JSON" />
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why should this evidence-backed presentation change exist?" className="mt-3 h-10 w-full rounded-xl border border-input bg-background px-3 text-xs" />
          <button onClick={() => void submitProposal()} disabled={busy || !reason.trim()} className="mt-3 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-propose-personality">Submit proposal</button>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3"><div><p className="lee-label text-muted-foreground">Review queue</p><p className="mt-1 text-sm font-semibold">Version history</p></div><span className="text-xs text-muted-foreground">{versions.length} versions</span></div>
        <div className="mt-3 divide-y divide-border">{versions.length ? versions.map((version) => <div key={version.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">v{version.version} · {version.status}</p><p className="mt-1 text-xs text-muted-foreground">{version.changeReason}</p></div><span className="text-[11px] text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</span>{version.status === "proposed" && <div className="flex gap-2"><button onClick={() => void review(version.id, "accept")} disabled={busy} className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50">Accept</button><button onClick={() => void review(version.id, "reject")} disabled={busy} className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-[11px] font-semibold text-destructive disabled:opacity-50">Reject</button></div>}</div>) : <p className="py-3 text-xs text-muted-foreground">The initial Personality Memory will appear after the API finishes bootstrapping the canonical Brain.</p>}</div>
      </div>
      <div className="mt-5 rounded-xl border border-border p-4">
        <p className="lee-label text-muted-foreground">Personality evolution history</p>
        <div className="mt-3 divide-y divide-border">{evolution.length ? evolution.map((entry) => <div key={entry.id} className="flex flex-wrap gap-x-3 gap-y-1 py-2 text-xs"><span className="font-semibold text-primary">{entry.action} · v{entry.toVersion}</span><span className="text-muted-foreground">{entry.reason}</span><span className="ml-auto text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span></div>) : <p className="py-2 text-xs text-muted-foreground">No evolution records yet.</p>}</div>
      </div>
    </div>
  </section>;
}