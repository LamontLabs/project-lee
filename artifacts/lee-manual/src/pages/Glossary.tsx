import { useState, useMemo } from "react";
import { GLOSSARY_TERMS, GLOSSARY_CATEGORIES } from "../data/glossary";

const CATEGORY_COLORS: Record<string, string> = {
  Knowledge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  Architecture: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  Engines: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  Governance: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Epistemic Signals": "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Security: "bg-red-500/15 text-red-400 border-red-500/25",
  Services: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  Retrieval: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  Portfolio: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  System: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  Interfaces: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

export function GlossaryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filtered = useMemo(() => {
    return GLOSSARY_TERMS.filter(t => {
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-foreground">Glossary</h1>
          <span className="font-mono text-sm text-muted-foreground">{GLOSSARY_TERMS.length} terms</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Authoritative definitions for all Project LEE terminology. When in doubt, check here — many terms have precise meanings that differ from their common usage.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search terms..."
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="All">All categories</option>
          {GLOSSARY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">No terms match the current filters.</div>
      )}

      <div className="space-y-4">
        {filtered.map(term => (
          <div
            key={term.term}
            id={term.term.toLowerCase().replace(/\s+/g, "-")}
            className="bg-card border border-card-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-sm font-semibold text-foreground">{term.term}</h2>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${CATEGORY_COLORS[term.category] ?? "bg-card border-border text-muted-foreground"}`}>
                {term.category}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{term.definition}</p>
            {term.relatedTerms && term.relatedTerms.length > 0 && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground/60">See also:</span>
                {term.relatedTerms.map(rt => (
                  <a
                    key={rt}
                    href={`#${rt.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-xs text-primary hover:underline font-mono"
                  >
                    {rt}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
