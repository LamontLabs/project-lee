import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, Check, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";

type WorkingMemoryRecord = {
  scopeKey: string;
  lastReason: string;
  updatedAt: string;
  envelope: {
    activeConversation?: { query?: string; mode?: string; intentType?: string | null };
    categories?: Record<string, string[]>;
    selected?: Array<{ id: string; kind: string; text: string; temperature: string; confidence: number; objectiveRelevance: number; selectionReason: string; provenance?: { sourceRef?: string } }>;
    excluded?: Array<{ id: string; kind: string; text: string; temperature: string; confidence: number; objectiveRelevance: number; selectionReason: string; provenance?: { sourceRef?: string } }>;
    selectionAudit?: { selectedTotal: number; excludedTotal: number; selectedRetained: number; excludedRetained: number; excludedOverflow: number; budgetTokens: number; selectedTokens: number };
    attention?: { topScore: number; averageScore: number; objectiveRelevance: number };
    cilHandoff?: { assetRefs: string[]; boundary: string; boundedTokenEstimate: number };
  };
};

function percent(value: number | undefined) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value ?? 0))) * 100)}%`;
}

export default function WorkingMemoryPanel() {
  const [record, setRecord] = useState<WorkingMemoryRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/memory-architecture/working-memory", { cache: "no-store" });
    if (response.status === 404) { setRecord(null); setError(""); return; }
    if (!response.ok) throw new Error(`Working Memory unavailable (${response.status}).`);
    setRecord(await response.json());
    setError("");
  }, []);

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Working Memory unavailable.")); }, [load]);

  const rebuild = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/memory-architecture/working-memory/rebuild", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scopeKey: record?.scopeKey }) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Working Memory rebuild failed.");
      setRecord(await response.json());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Working Memory rebuild failed.");
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-accent/30 bg-accent/10 p-5 text-sm text-accent-foreground">{error}</div>;
  if (!record) return <div className="mx-auto mt-5 max-w-[1280px] rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Working Memory will appear after the next context request.</div>;

  const envelope = record.envelope;
  const audit = envelope.selectionAudit;
  const entries = showExcluded ? envelope.excluded ?? [] : envelope.selected ?? [];
  const categories = Object.entries(envelope.categories ?? {}).filter(([, ids]) => ids.length > 0);

  return <div className="mx-auto mt-5 max-w-[1280px]">
    <div className="rounded-2xl border border-primary/25 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><BrainCircuit size={19} /></div>
          <div><p className="lee-label text-primary">Cognitive runtime</p><h3 className="mt-1 text-lg font-semibold">Working Memory</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">A bounded, restart-safe projection of what is active now. Leaving this surface never deletes durable memory.</p></div>
        </div>
        <button onClick={() => void rebuild()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"><RefreshCw size={14} className={busy ? "animate-spin" : ""} />{busy ? "Rebuilding…" : "Rebuild from evidence"}</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Selected</p><p className="mt-2 text-2xl font-semibold">{audit?.selectedRetained ?? 0}<span className="ml-1 text-xs font-normal text-muted-foreground">/ {audit?.selectedTotal ?? 0}</span></p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Excluded with reasons</p><p className="mt-2 text-2xl font-semibold">{audit?.excludedRetained ?? 0}<span className="ml-1 text-xs font-normal text-muted-foreground">/ {audit?.excludedTotal ?? 0}</span></p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Attention peak</p><p className="mt-2 text-2xl font-semibold">{percent(envelope.attention?.topScore)}</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="lee-label text-muted-foreground">Context budget</p><p className="mt-2 text-2xl font-semibold">{audit?.selectedTokens ?? 0}<span className="ml-1 text-xs font-normal text-muted-foreground">/ {audit?.budgetTokens ?? 0} tok</span></p></div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2"><Sparkles size={15} className="text-primary" /><p className="text-sm font-semibold">Active conversation</p></div>
          <p className="mt-3 text-sm leading-relaxed">{envelope.activeConversation?.query || "No active query recorded."}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground"><span className="rounded-full border border-border px-2 py-1">{envelope.activeConversation?.mode ?? "normal"}</span><span className="rounded-full border border-border px-2 py-1">{envelope.activeConversation?.intentType ?? "unclassified"}</span><span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-primary">Scope {record.scopeKey}</span></div>
          <div className="mt-4 border-t border-border pt-3"><p className="lee-label text-muted-foreground">Why these entries</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{record.lastReason} Attention averages {percent(envelope.attention?.averageScore)} and objective relevance averages {percent(envelope.attention?.objectiveRelevance)}.</p></div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Check size={15} className="text-primary" /><p className="text-sm font-semibold">{showExcluded ? "Excluded candidates" : "Selected entries"}</p></div><button onClick={() => setShowExcluded((value) => !value)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted">{showExcluded ? "Show selected" : `Show excluded (${audit?.excludedTotal ?? 0})`}</button></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{categories.map(([category, ids]) => <span key={category} className="rounded-full border border-border px-2 py-1 text-[10px] capitalize text-muted-foreground">{category.replace(/([A-Z])/g, " $1")} · {ids.length}</span>)}</div>
          <div className="mt-4 space-y-2">{entries.length ? entries.slice(0, 8).map((entry) => <div key={entry.id} className="rounded-lg border border-border bg-card p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{entry.kind} · {entry.id}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{entry.text}</p></div><span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${entry.temperature === "hot" ? "border-primary/25 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{entry.temperature}</span></div><p className="mt-2 text-[10px] text-muted-foreground">{entry.selectionReason} · objective {percent(entry.objectiveRelevance)} · confidence {percent(entry.confidence)}{entry.provenance?.sourceRef ? ` · ${entry.provenance.sourceRef}` : ""}</p></div>) : <p className="py-4 text-xs text-muted-foreground">No {showExcluded ? "excluded" : "selected"} entries in this bounded projection.</p>}</div>
          {showExcluded && (audit?.excludedOverflow ?? 0) > 0 && <p className="mt-3 flex items-center gap-1.5 text-[11px] text-accent-foreground"><ShieldAlert size={13} />{audit?.excludedOverflow} additional exclusions remain represented by the canonical context packet, outside this bounded projection.</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"><span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">CIL boundary: {envelope.cilHandoff?.boundary ?? "asset_refs_only"}</span><span>{envelope.cilHandoff?.assetRefs?.length ?? 0} asset references · {envelope.cilHandoff?.boundedTokenEstimate ?? 0} bounded tokens</span><span className="ml-auto">Updated {new Date(record.updatedAt).toLocaleString()}</span></div>
    </div>
  </div>;
}