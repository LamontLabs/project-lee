import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";

type Approval = {
  id: string;
  lifecycle: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  requestedAction: string;
  actionClass: string;
  target: string;
  affectedSystem: string;
  reason: string;
  risk: string;
  proposedChange: string;
  evidence: Array<{ id: string; label: string }>;
  cerbaSeal: { state: string; verdict: string | null; decisionId: string | null; reasonCodes: string[]; authorizationExpiresAt: string | null };
  expiresAt: string | null;
  ownerConfirmationRequired: boolean;
  humanConfirmationRequired: boolean;
  postApprovalEffect: string;
  source: { subsystem: string; requestId: string; auditTargetId: string };
  outcome: { verdict: string | null; resolvedAt: string | null; reasonCodes: string[] };
  requestedAt: string;
};

const date = (value: string | null) => value ? new Date(value).toLocaleString() : "—";
const riskClass = (risk: string) => risk === "CRITICAL" ? "border-destructive/35 bg-destructive/10 text-destructive" : risk === "HIGH" ? "border-accent/35 bg-accent/10 text-accent-foreground" : "border-primary/25 bg-primary/10 text-primary";
const stateClass = (state: string) => state === "ALLOWED" ? "text-primary" : state === "UNAVAILABLE" || state === "REJECTED" ? "text-destructive" : "text-accent-foreground";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border/70 bg-background/35 p-3"><p className="lee-label text-muted-foreground">{label}</p><div className="mt-1 text-sm leading-relaxed">{children}</div></div>;
}

export default function GovernancePage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [risk, setRisk] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [explanation, setExplanation] = useState("");

  const load = useCallback(async () => {
    const query = new URLSearchParams({ status });
    if (risk !== "all") query.set("riskLevel", risk);
    const response = await fetch(`/api/governance/approvals?${query}`, { cache: "no-store" });
    if (!response.ok) { setNotice("The approval queue is unavailable. No decision can be released."); return; }
    const next = await response.json() as Approval[];
    setItems(next);
    setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null);
  }, [risk, status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setConfirmed(false); setDecisionReason(""); setExplanation(""); }, [selectedId]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const decide = async (verdict: "ALLOW" | "REJECT" | "HOLD") => {
    if (!selected || !confirmed) return;
    setBusy(true);
    const response = await fetch(`/api/governance/requests/${selected.id}/verdict`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verdict, actor: "founder", reason: decisionReason || null }),
    });
    const result = await response.json().catch(() => ({}));
    setNotice(response.ok ? `Decision ${verdict.toLowerCase()}d and recorded through CerbaSeal.` : result.error ?? "Decision blocked.");
    if (response.ok) { setConfirmed(false); setDecisionReason(""); await load(); }
    else if (result.approval) setItems((current) => current.map((item) => item.id === result.approval.id ? result.approval : item));
    setBusy(false);
  };

  const askWhy = async () => {
    if (!selected) return;
    setBusy(true);
    const response = await fetch(`/api/governance/requests/${selected.id}/ask-why`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setExplanation(response.ok ? result.explanation : result.error ?? "Lee could not explain this approval.");
    setBusy(false);
  };

  return <div className="mx-auto w-full max-w-[1280px]">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="lee-label text-primary">Unified owner inbox</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Approvals</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Consequential actions from every subsystem converge here. CerbaSeal remains the final release boundary.</p></div>
      <div className="flex flex-wrap gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-xs"><option value="PENDING">Needs review</option><option value="ALL">All decisions</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="EXPIRED">Expired</option></select><select value={risk} onChange={(event) => setRisk(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-xs"><option value="all">All risks</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select><button onClick={() => void load()} className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold">Refresh</button></div>
    </div>
    {notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><div><p className="lee-label text-muted-foreground">{status === "PENDING" ? "Awaiting owner decision" : "Decision history"}</p><h2 className="mt-1 text-lg font-semibold">{items.length} {items.length === 1 ? "item" : "items"}</h2></div><ShieldAlert className="text-accent-foreground" size={20} /></div>
        {items.length ? <div className="space-y-2">{items.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-4 text-left transition ${item.id === selectedId ? "border-primary/50 bg-primary/[0.07]" : "border-border bg-muted/25 hover:bg-muted/50"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${riskClass(item.risk)}`}>{item.risk}</span><span className="lee-label text-muted-foreground">{item.source.subsystem}</span></div><p className="mt-2 truncate text-sm font-semibold">{item.requestedAction}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.target}</p></div><span className={`shrink-0 text-[10px] font-semibold ${item.lifecycle === "PENDING" ? "text-accent-foreground" : item.lifecycle === "APPROVED" ? "text-primary" : "text-destructive"}`}>{item.lifecycle}</span></div><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.reason}</p><div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{item.evidence.length} evidence refs</span><span>{item.lifecycle === "PENDING" ? `Expires ${date(item.expiresAt)}` : date(item.outcome.resolvedAt)}</span></div></button>)}</div> : <div className="py-14 text-center"><Clock3 className="mx-auto text-muted-foreground" size={22} /><p className="mt-3 text-sm font-semibold">No matching approvals</p><p className="mt-1 text-xs text-muted-foreground">Held actions and resolved outcomes will remain auditable here.</p></div>}
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {selected ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.source.subsystem} · {selected.lifecycle}</p><h2 className="mt-2 text-2xl font-semibold">{selected.requestedAction}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.target}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${riskClass(selected.risk)}`}>{selected.risk} risk</span></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><Detail label="Requested action">{selected.requestedAction} <span className="text-xs text-muted-foreground">({selected.actionClass})</span></Detail><Detail label="Affected system">{selected.affectedSystem}</Detail><Detail label="Reason">{selected.reason}</Detail><Detail label="Proposed change">{selected.proposedChange}</Detail><Detail label="Expiration"><span className={selected.lifecycle === "PENDING" ? "text-accent-foreground" : "text-muted-foreground"}>{date(selected.expiresAt)}</span></Detail><Detail label="Post-approval effect">{selected.postApprovalEffect}</Detail></div>
          <div className="mt-3 rounded-xl border border-border/70 bg-muted/25 p-4"><div className="flex items-center gap-2"><ShieldCheck size={17} className={stateClass(selected.cerbaSeal.state)} /><p className="text-sm font-semibold">CerbaSeal · {selected.cerbaSeal.state.replaceAll("_", " ")}</p></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{selected.cerbaSeal.state === "UNAVAILABLE" ? "CerbaSeal is unavailable or this authorization is invalid. The action remains held and cannot be released." : selected.cerbaSeal.state === "ALLOWED" ? "A valid gate verdict is recorded for this request. Execution still depends on the immediate server-side release check." : "No valid release authorization is currently available. Owner review cannot bypass the gate."}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p className="text-muted-foreground">Verdict <span className="font-semibold text-foreground">{selected.cerbaSeal.verdict ?? "not evaluated"}</span></p><p className="text-muted-foreground">Decision ID <span className="break-all font-semibold text-foreground">{selected.cerbaSeal.decisionId ?? "—"}</span></p><p className="text-muted-foreground">Authorization expiry <span className="font-semibold text-foreground">{date(selected.cerbaSeal.authorizationExpiresAt)}</span></p><p className="text-muted-foreground">Reason codes <span className="font-semibold text-foreground">{selected.cerbaSeal.reasonCodes.join(" · ") || "none reported"}</span></p></div></div>
          <details className="mt-3 rounded-xl border border-border/70 p-4"><summary className="cursor-pointer text-xs font-semibold">Evidence ({selected.evidence.length})</summary><div className="mt-3 space-y-2">{selected.evidence.length ? selected.evidence.map((evidence) => <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 p-3 text-xs"><span>{evidence.label}</span><span className="break-all text-muted-foreground">{evidence.id}</span></div>) : <p className="text-xs text-destructive">No evidence attached. High and critical actions cannot be approved.</p>}</div></details>
          <details className="mt-3 rounded-xl border border-border/70 p-4"><summary className="cursor-pointer text-xs font-semibold">Audit linkage and outcome</summary><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p>Requested <span className="font-semibold text-foreground">{date(selected.requestedAt)}</span></p><p>Resolved <span className="font-semibold text-foreground">{date(selected.outcome.resolvedAt)}</span></p><p>Request ID <span className="break-all font-semibold text-foreground">{selected.source.requestId}</span></p><p>Audit target <span className="break-all font-semibold text-foreground">{selected.source.auditTargetId}</span></p></div>{selected.outcome.reasonCodes.length > 0 && <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">Outcome codes: {selected.outcome.reasonCodes.join(" · ")}</p>}</details>
          {explanation && <div className="mt-3 rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm leading-relaxed text-primary"><span className="font-semibold">Lee’s explanation:</span> {explanation}</div>}
          {selected.lifecycle === "PENDING" && <div className="mt-5 border-t border-border pt-5"><label className="flex items-start gap-3 text-xs text-muted-foreground"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 accent-primary" /><span>I am the owner and confirm this decision. Approval remains subject to a fresh, valid CerbaSeal ALLOW.</span></label><textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Optional decision note" className="mt-3 min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" /><div className="mt-3 flex flex-wrap justify-end gap-2"><button onClick={() => void askWhy()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold"><ExternalLink size={14} />Ask why</button><button onClick={() => void decide("HOLD")} disabled={busy || !confirmed} className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold">Keep on hold</button><button onClick={() => void decide("REJECT")} disabled={busy || !confirmed} className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2.5 text-xs font-semibold text-destructive"><XCircle size={14} />Reject</button><button onClick={() => void decide("ALLOW")} disabled={busy || !confirmed} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground"><CheckCircle2 size={14} />Approve</button></div></div>}
        </> : <div className="py-20 text-center text-sm text-muted-foreground">Select an approval to inspect its evidence and release conditions.</div>}
      </section>
    </div>
  </div>;
}