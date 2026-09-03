import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, GitBranch, RefreshCw, Target } from "lucide-react";

type Belief = {
  id: string; beliefKey: string; conclusion: string; state: string; contradictionState: string;
  evidenceRefs: string[]; contradictionRefs: string[]; priorBeliefId?: string | null;
  revisionReason?: string | null; confidence: number; generatedByEngine: string; validFrom: string; supersededAt?: string | null;
};
type Prediction = {
  id: string; statement: string; horizon: string; supportingEvidenceRefs: string[]; reasoning: string;
  confidenceLower: number; confidenceUpper: number; accuracyResult: string; eventualOutcome?: string | null;
  derivedLesson?: string | null; status: string; createdAt: string;
};
type CausalClaim = {
  id: string; claim: string; cause: string; effect: string; evidenceRefs: string[];
  confidence: number; explicitness: string; alternatives: { label?: string; statement?: string }[]; status: string;
};
type KnowledgeGap = {
  id: string; question: string; importance: number; reason: string; objectiveId?: string | null;
  possibleEvidenceSources: string[]; lastInvestigatedAt?: string | null; nextAllowedAction: string; status: string;
};
type History = { beliefs: Belief[]; predictions: Prediction[]; causalClaims: CausalClaim[]; knowledgeGaps: KnowledgeGap[] };
type Tab = "beliefs" | "predictions" | "causal" | "gaps";

const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
const confidence = (value: number) => `${Math.round(value * 100)}%`;
const refs = (values: string[]) => values.length ? `${values.length} evidence reference${values.length === 1 ? "" : "s"}` : "No evidence references";

export default function EpistemicHistoryPage() {
  const [history, setHistory] = useState<History | null>(null);
  const [tab, setTab] = useState<Tab>("beliefs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/epistemic/history", { cache: "no-store" });
      if (!response.ok) throw new Error(`Historical belief state unavailable (${response.status}).`);
      setHistory(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Historical belief state unavailable.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const currentBeliefs = useMemo(() => history?.beliefs.filter((item) => item.state === "current").length ?? 0, [history]);
  const tabs: { id: Tab; label: string; count: number; icon: typeof GitBranch }[] = [
    { id: "beliefs", label: "Belief history", count: history?.beliefs.length ?? 0, icon: GitBranch },
    { id: "predictions", label: "Predictions", count: history?.predictions.length ?? 0, icon: Target },
    { id: "causal", label: "Causal claims", count: history?.causalClaims.length ?? 0, icon: CheckCircle2 },
    { id: "gaps", label: "Knowledge gaps", count: history?.knowledgeGaps.length ?? 0, icon: CircleHelp },
  ];

  return <div className="mx-auto max-w-[1220px]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="lee-label text-primary">Epistemic history</p><h1 className="mt-2 text-3xl font-semibold">What LEE believed, and why it changed</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Historical interpretations remain addressable after revision. Facts, beliefs, predictions, causal claims, and unknowns stay visibly distinct.</p></div>
      <button onClick={() => void load()} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"><RefreshCw className={`mr-2 inline ${loading ? "animate-spin" : ""}`} size={14} />Refresh</button>
    </div>
    {error && <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><AlertTriangle className="mr-2 inline" size={16} />{error}</div>}
    <div className="mt-6 grid gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-border bg-card p-4"><p className="lee-label text-muted-foreground">Current beliefs</p><p className="mt-2 text-2xl font-semibold">{currentBeliefs}</p></div>
      <div className="rounded-2xl border border-border bg-card p-4"><p className="lee-label text-muted-foreground">Revisions retained</p><p className="mt-2 text-2xl font-semibold">{Math.max(0, (history?.beliefs.length ?? 0) - currentBeliefs)}</p></div>
      <div className="rounded-2xl border border-border bg-card p-4"><p className="lee-label text-muted-foreground">Open predictions</p><p className="mt-2 text-2xl font-semibold">{history?.predictions.filter((item) => item.status === "open").length ?? 0}</p></div>
      <div className="rounded-2xl border border-border bg-card p-4"><p className="lee-label text-muted-foreground">Open gaps</p><p className="mt-2 text-2xl font-semibold">{history?.knowledgeGaps.filter((item) => item.status === "open").length ?? 0}</p></div>
    </div>
    <div className="mt-6 flex flex-wrap gap-2">{tabs.map(({ id, label, count, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${tab === id ? "bg-primary text-primary-foreground" : "border border-border"}`}><Icon className="mr-2 inline" size={14} />{label} · {count}</button>)}</div>
    {loading && !history ? <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Loading historical epistemic state…</div> : <div className="mt-5 space-y-3">
      {tab === "beliefs" && (history?.beliefs ?? []).map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary">BELIEF · {item.state}</span>{item.contradictionState !== "none" && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300">CONTRADICTION · {item.contradictionState}</span>}<p className="mt-3 text-sm font-semibold">{item.conclusion}</p></div><span className="text-xs text-muted-foreground">{confidence(item.confidence)} confidence</span></div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><span>Observed in state: {date(item.validFrom)}</span><span>{refs(item.evidenceRefs)}</span><span>Engine: {item.generatedByEngine}</span></div>{item.priorBeliefId && <p className="mt-2 text-xs text-primary">Revision linked to prior belief {item.priorBeliefId}</p>}{item.revisionReason && <p className="mt-2 text-xs text-muted-foreground">Why changed: {item.revisionReason}</p>}</div>)}
      {tab === "predictions" && (history?.predictions ?? []).map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary">PREDICTION · {item.status}</span><p className="mt-3 text-sm font-semibold">{item.statement}</p></div><span className="text-xs text-muted-foreground">{confidence(item.confidenceLower)}–{confidence(item.confidenceUpper)}</span></div><p className="mt-2 text-xs text-muted-foreground">Horizon: {item.horizon} · {refs(item.supportingEvidenceRefs)} · {item.accuracyResult}</p><p className="mt-2 text-xs text-muted-foreground">Reasoning: {item.reasoning}</p>{item.eventualOutcome && <p className="mt-2 text-xs text-primary">Outcome: {item.eventualOutcome}{item.derivedLesson ? ` · Lesson: ${item.derivedLesson}` : ""}</p>}</div>)}
      {tab === "causal" && (history?.causalClaims ?? []).map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary">CAUSAL CLAIM · {item.explicitness}</span><p className="mt-3 text-sm font-semibold">{item.claim}</p></div><span className="text-xs text-muted-foreground">{confidence(item.confidence)} confidence</span></div><p className="mt-2 text-xs text-muted-foreground">Cause: {item.cause} → Effect: {item.effect}</p><p className="mt-2 text-xs text-muted-foreground">{refs(item.evidenceRefs)} · {item.alternatives.length} alternative{item.alternatives.length === 1 ? "" : "s"} retained · {item.status}</p></div>)}
      {tab === "gaps" && (history?.knowledgeGaps ?? []).map((item) => <div key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary">KNOWLEDGE GAP · {item.status}</span><p className="mt-3 text-sm font-semibold">{item.question}</p></div><span className="text-xs text-muted-foreground">{confidence(item.importance)} importance</span></div><p className="mt-2 text-xs text-muted-foreground">Why it matters: {item.reason}</p><p className="mt-2 text-xs text-muted-foreground">Next allowed action: {item.nextAllowedAction} · Last investigated: {date(item.lastInvestigatedAt)}</p><p className="mt-2 text-xs text-primary">Possible evidence: {item.possibleEvidenceSources.join(", ")}</p></div>)}
      {!loading && history && ((tab === "beliefs" && !history.beliefs.length) || (tab === "predictions" && !history.predictions.length) || (tab === "causal" && !history.causalClaims.length) || (tab === "gaps" && !history.knowledgeGaps.length)) && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No {tab} recorded yet.</div>}
    </div>}
  </div>;
}