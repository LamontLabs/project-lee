import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, CircleCheck } from "lucide-react";

const date = (value: string | null) => value ? new Date(value).toLocaleString() : "—";
const badge = (risk: string) => risk === "CRITICAL" ? "bg-destructive/15 text-destructive" : risk === "HIGH" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary";

export default function GovernancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("HOLD");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const query = new URLSearchParams({ status });
    if (risk !== "all") query.set("riskLevel", risk);
    const [queue, history, configured] = await Promise.all([fetch(`/api/governance/requests?${query}`), fetch("/api/governance/audit"), fetch("/api/governance/rules")]);
    if (queue.ok) setItems(await queue.json());
    if (history.ok) setAudit(await history.json());
    if (configured.ok) setRules(await configured.json());
  }, [risk, status]);
  useEffect(() => { void load(); }, [load]);
  const decide = async (id: string, verdict: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (verdict === "ALLOW" && ["HIGH", "CRITICAL"].includes(item?.riskLevel) && !item?.evidenceRefs?.length) {
      setNotice("Evidence is required before approving a HIGH or CRITICAL action."); return;
    }
    const response = await fetch(`/api/governance/requests/${id}/verdict`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ verdict, actor: "founder" }) });
    setNotice(response.ok ? `Action ${verdict.toLowerCase()}d and recorded.` : ((await response.json()).error ?? "Decision failed."));
    await load();
  };
  const askWhy = async (id: string) => {
    const response = await fetch(`/api/governance/requests/${id}/ask-why`, { method: "POST" });
    const result = await response.json();
    setNotice(response.ok ? result.explanation : result.error ?? "Lee could not explain this action.");
  };
  return <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[1fr_340px]">
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="lee-label text-primary">Execution boundary</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Governance</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Lee prepares actions. You decide what can cross the boundary.</p></div><div className="flex gap-2"><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-xs"><option value="HOLD">Needs review</option><option value="ALLOW">Allowed</option><option value="REJECT">Rejected</option></select><select value={risk} onChange={(event) => setRisk(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-xs"><option value="all">All risks</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></div></div>
      {notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">{items.length ? <div className="space-y-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-border bg-muted/35 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badge(item.riskLevel)}`}>{item.riskLevel}</span><span className="lee-label text-muted-foreground">{item.actionClass}</span></div><h3 className="mt-2 text-sm font-semibold">{item.reason ?? "Consequential action proposed"}</h3></div><span className="text-xs text-muted-foreground">{date(item.createdAt)}</span></div><p className="mt-2 text-xs text-muted-foreground">Target: {item.affectedObject ?? item.targetSystem} · expires {date(item.expiresAt)}</p>{["HIGH", "CRITICAL"].includes(item.riskLevel) && <div className="mt-3 rounded-lg border border-accent/25 bg-accent/10 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Evidence shown:</span> {item.evidenceRefs?.length ? item.evidenceRefs.join(", ") : "No evidence attached — approval is blocked."}</div>}<div className="mt-3 flex flex-wrap justify-end gap-2">{item.status === "HOLD" && <><button onClick={() => void askWhy(item.id)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Ask why</button><button onClick={() => void decide(item.id, "REJECT")} className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive">Reject</button><button onClick={() => void decide(item.id, "ALLOW")} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Approve</button></>}</div></div>)}</div> : <div className="py-10 text-center"><ShieldAlert className="mx-auto text-muted-foreground" size={22} /><p className="mt-3 text-sm font-semibold">No matching governance items</p><p className="mt-1 text-xs text-muted-foreground">Held actions and past verdicts remain visible here.</p></div>}</div>
      <div className="mt-5"><p className="lee-label text-primary">Decision history</p><h2 className="mt-2 text-xl font-semibold">Audit trail</h2><div className="mt-3 rounded-2xl border border-border bg-card p-5 shadow-sm">{audit.length ? <div className="space-y-2">{audit.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 p-3"><div><p className="text-xs font-semibold">{entry.action}</p><p className="mt-1 text-[11px] text-muted-foreground">{entry.actor} · {entry.targetId}</p></div><span className="lee-label text-muted-foreground">{entry.outcome}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No governance decisions yet.</p>}</div></div>
    </div>
    <div className="space-y-5"><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="lee-label text-primary">Standing rules</p><h2 className="mt-2 text-lg font-semibold">Policy presets</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Rules are versioned and never hide the action from the audit trail.</p><div className="mt-4 space-y-2">{rules.length ? rules.map((rule) => <div key={rule.id} className="rounded-lg bg-muted/40 p-3"><div className="flex justify-between gap-2"><span className="text-xs font-semibold">{rule.actionPattern}</span><span className="lee-label text-primary">{rule.ruleType.replace("always_", "")}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{rule.active ? "Active" : "Inactive"} · v{rule.version}</p></div>) : <p className="text-sm text-muted-foreground">No standing rules configured. Unknown actions remain HOLD by default.</p>}</div></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><p className="lee-label text-muted-foreground">CerbaSeal boundary</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Critical actions are prepared for CerbaSeal consultation. If classification or the service is unavailable, Lee fails closed and keeps the action held.</p><CircleCheck className="mt-4 text-primary" size={18} /></div></div>
  </div>;
}