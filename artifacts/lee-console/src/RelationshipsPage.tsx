import { useEffect, useState } from "react";
import { CheckCircle2, FileText, MessageCircle, Plus, Users } from "lucide-react";

const directionLabel: Record<string, string> = {
  owner_owes: "You owe them",
  owed_by_other: "They owe you",
  mutual_waiting: "Mutual waiting",
  task: "Task only",
  uncertain: "Needs review",
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not recorded";
}

export default function RelationshipsPage() {
  const [people, setPeople] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [statement, setStatement] = useState("");
  const [completionEvidence, setCompletionEvidence] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const load = async () => {
    const response = await fetch("/api/relationships/people", { cache: "no-store" });
    if (response.ok) setPeople(await response.json());
  };
  useEffect(() => { void load(); }, []);

  const open = async (person: any) => {
    setSelected(person);
    const response = await fetch(`/api/relationships/people/${person.id}/intelligence`, { cache: "no-store" });
    if (response.ok) setIntel(await response.json());
  };

  const addCommitment = async () => {
    if (!statement.trim() || !selected) return;
    const response = await fetch("/api/relationships/commitments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        statement,
        actor: { type: "owner", label: "Owner" },
        recipient: { type: "person", id: selected.id, label: selected.displayName },
        personIds: [selected.id],
        sourceRef: "owner:relationship-console",
      }),
    });
    if (!response.ok) { setNotice("The commitment could not be recorded."); return; }
    setStatement("");
    setNotice("Commitment recorded with owner-confirmed provenance.");
    await open(selected);
  };

  const fulfill = async (item: any) => {
    const evidence = completionEvidence[item.id]?.trim();
    if (!evidence) { setNotice("Add a source reference before marking a commitment fulfilled."); return; }
    const response = await fetch(`/api/relationships/commitments/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "fulfilled", completionEvidenceRefs: [evidence] }),
    });
    if (!response.ok) { setNotice((await response.json()).error ?? "The commitment could not be completed."); return; }
    setNotice("Commitment fulfilled and its waiting loop resolved.");
    await open(selected);
  };

  return (
    <div className="mx-auto max-w-[1250px]">
      <p className="lee-label text-primary">Relationship intelligence</p>
      <h1 className="mt-2 text-3xl font-semibold">People</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">A provenance-backed reconstruction of identity, communication, commitments, waiting loops, projects, and open questions. Possibilities stay marked as uncertain until evidence supports them.</p>
      {notice && <div className="mt-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">{notice}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          {people.map((person) => (
            <button key={person.id} onClick={() => void open(person)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === person.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
              <div className="flex items-center gap-3">
                <Users size={18} className="text-primary" />
                <div><p className="font-semibold">{person.displayName}</p><p className="text-xs text-muted-foreground">{person.organizationalRole ?? person.roles?.join(", ") ?? "Relationship"}</p></div>
                <span className="ml-auto rounded-full bg-muted px-2 py-1 text-[10px]">{person.relationshipHealth}</span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Last contact: {formatDate(person.lastInteractionAt)}</p>
            </button>
          ))}
          {!people.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No people recorded yet.</div>}
        </section>

        {intel ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="lee-label text-primary">Person reconstruction</p><h2 className="mt-1 text-2xl font-semibold">{intel.person.displayName}</h2><p className="mt-1 text-sm text-muted-foreground">{intel.identity.email ?? "No email recorded"} · {intel.identity.organizationalRole ?? "Role not recorded"}</p><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{intel.status.summary}</p></div>
              <div className="text-right"><p className="lee-label text-muted-foreground">Health</p><p className="mt-1 text-2xl font-semibold text-primary">{Math.round(intel.health.score)}<span className="text-sm">/100</span></p><p className="text-xs text-muted-foreground">{intel.health.momentum}</p></div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                ["Interactions", intel.interactions.length],
                ["Open commitments", intel.commitments.filter((item: any) => ["open", "uncertain"].includes(item.status)).length],
                ["Waiting loops", intel.waitingLoops.filter((item: any) => item.status === "open").length],
                ["Evidence items", intel.evidence.length],
              ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4"><p className="lee-label text-primary">Identity & context</p><p className="mt-2 text-sm">{intel.identity.organizations.length ? `Organization: ${intel.identity.organizations.join(", ")}` : "Organization not recorded."}</p><p className="mt-1 text-sm text-muted-foreground">{intel.identity.projects.length ? `Projects: ${intel.identity.projects.join(", ")}` : "No linked projects."}</p><p className="mt-2 text-xs text-muted-foreground">Cadence: {intel.cadence.recommendedDays} days · {intel.cadence.state}</p></div>
              <div className="rounded-xl border border-border p-4"><p className="lee-label text-primary">Reconstruction coverage</p><p className="mt-2 flex items-center gap-2 text-sm"><MessageCircle size={14} /> {intel.importantMessages.length} important messages</p><p className="mt-1 flex items-center gap-2 text-sm"><FileText size={14} /> {intel.documents.length} documents · {intel.meetings.length} meetings</p><p className="mt-1 text-xs text-muted-foreground">{intel.decisions.length} decisions and {intel.unresolvedQuestions.length} unresolved questions</p></div>
            </div>

            <div className="mt-5 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3"><p className="lee-label text-primary">Commitments</p><span className="text-[11px] text-muted-foreground">Completion requires evidence</span></div>
              <div className="mt-3 space-y-3">
                {intel.commitments.map((item: any) => (
                  <div key={item.id} className="rounded-xl bg-muted/35 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm font-medium">{item.statement}</p><span className={`rounded-full px-2 py-1 text-[10px] ${item.status === "uncertain" ? "bg-accent/15 text-accent-foreground" : "bg-primary/10 text-primary"}`}>{directionLabel[item.direction] ?? item.direction} · {item.status}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground">Confidence {Math.round(item.confidence * 100)}% · due {formatDate(item.dueAt)} · evidence {item.evidenceRefs.length}</p>
                    {(item.status === "open" || item.status === "uncertain") && <div className="mt-3 flex gap-2"><input value={completionEvidence[item.id] ?? ""} onChange={(event) => setCompletionEvidence((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Completion source reference" className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-xs" /><button onClick={() => void fulfill(item)} className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-2 text-xs font-semibold text-primary"><CheckCircle2 size={13} />Fulfill</button></div>}
                  </div>
                ))}
                {!intel.commitments.length && <p className="text-sm text-muted-foreground">No commitments tracked yet.</p>}
              </div>
              <div className="mt-4 flex gap-2"><input value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="Record an explicit commitment…" className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-xs" /><button onClick={() => void addCommitment()} className="rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"><Plus className="mr-1 inline" size={13} />Add</button></div>
            </div>

            <div className="mt-5"><p className="lee-label text-primary">Interaction timeline</p><div className="mt-3 space-y-3">{intel.interactions.slice(0, 8).map((item: any) => <div key={item.id} className="flex gap-3 border-b border-border pb-3 text-sm"><MessageCircle size={15} className="mt-0.5 text-primary" /><div><p>{item.summary}</p><p className="text-xs text-muted-foreground">{formatDate(item.occurredAt)} · {item.direction} · {item.sourceRef}</p></div></div>)}{!intel.interactions.length && <p className="text-sm text-muted-foreground">No interactions recorded.</p>}</div></div>
            {intel.waitingLoops.length > 0 && <div className="mt-5 rounded-xl border border-accent/30 bg-accent/[0.06] p-4"><p className="lee-label text-accent-foreground">Waiting loops</p><div className="mt-2 space-y-2">{intel.waitingLoops.filter((item: any) => item.status === "open").map((item: any) => <p key={item.id} className="text-sm">{item.subject}<span className="ml-2 text-xs text-muted-foreground">{directionLabel[item.direction] ?? item.direction} · score {item.metadata?.waitingScore ?? "—"}</span></p>)}</div><p className="mt-3 text-xs text-muted-foreground">LEE surfaces these for review only; it does not send follow-ups or mutate external providers.</p></div>}
          </section>
        ) : <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">Select a person to open relationship intelligence.</div>}
      </div>
    </div>
  );
}