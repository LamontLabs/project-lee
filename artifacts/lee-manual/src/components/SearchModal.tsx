import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import Fuse from "fuse.js";
import { TASKS } from "../data/tasks";
import { CONSTITUTIONAL_PROVISIONS } from "../data/constitution";
import { ARCHITECTURE_LAYERS } from "../data/architecture";
import { GLOSSARY_TERMS } from "../data/glossary";

type SearchResult = {
  id: string;
  type: "task" | "provision" | "layer" | "term";
  title: string;
  subtitle: string;
  path: string;
};

const SEARCH_ITEMS: SearchResult[] = [
  ...TASKS.map(t => ({
    id: `task-${t.id}`,
    type: "task" as const,
    title: `#${String(t.id).padStart(2, "0")} ${t.title}`,
    subtitle: `Layer ${t.layerNumber} — ${t.layer}`,
    path: `/tasks/${t.id}`,
  })),
  ...CONSTITUTIONAL_PROVISIONS.map(p => ({
    id: `provision-${p.number}`,
    type: "provision" as const,
    title: `Provision ${p.number}: ${p.statement.substring(0, 60)}${p.statement.length > 60 ? "..." : ""}`,
    subtitle: p.isAbsolute ? "ABSOLUTE Constitutional Provision" : "Constitutional Provision",
    path: `/constitution#provision-${p.number}`,
  })),
  ...ARCHITECTURE_LAYERS.map(l => ({
    id: `layer-${l.id}`,
    type: "layer" as const,
    title: `Layer ${l.number} — ${l.name}`,
    subtitle: l.purpose.substring(0, 80) + "...",
    path: `/architecture/${l.id}`,
  })),
  ...GLOSSARY_TERMS.map(t => ({
    id: `term-${t.term}`,
    type: "term" as const,
    title: t.term,
    subtitle: t.definition.substring(0, 80) + "...",
    path: `/glossary#${t.term.toLowerCase().replace(/\s+/g, "-")}`,
  })),
];

const fuse = new Fuse(SEARCH_ITEMS, {
  keys: ["title", "subtitle"],
  threshold: 0.35,
  includeScore: true,
});

const TYPE_CONFIG = {
  task: { label: "Task", cls: "text-blue-400" },
  provision: { label: "Provision", cls: "text-red-400" },
  layer: { label: "Layer", cls: "text-indigo-400" },
  term: { label: "Term", cls: "text-emerald-400" },
};

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const res = fuse.search(query).slice(0, 8).map(r => r.item);
    setResults(res);
    setSelected(0);
  }, [query]);

  const go = useCallback((path: string) => {
    onClose();
    navigate(path);
  }, [onClose, navigate]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { go(results[selected].path); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, go, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, provisions, layers, glossary..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-muted-foreground bg-muted border border-border rounded font-mono">
            ESC
          </kbd>
        </div>

        {results.length > 0 && (
          <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.id}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  i === selected ? "bg-accent" : "hover:bg-accent/50"
                }`}
                onClick={() => go(r.path)}
              >
                <span className={`text-xs font-mono w-16 shrink-0 ${TYPE_CONFIG[r.type].cls}`}>
                  {TYPE_CONFIG[r.type].label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results for "{query}"
          </div>
        )}

        {!query && (
          <div className="px-4 py-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Quick access</p>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: "Task #1 — Foundation", path: "/tasks/1" },
                { label: "Task #56 — Identity Engine", path: "/tasks/56" },
                { label: "Constitution", path: "/constitution" },
                { label: "Architecture Explorer", path: "/architecture" },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => go(item.path)}
                  className="text-left px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
