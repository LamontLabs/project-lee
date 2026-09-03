import { useState, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "lee-manual-auth";
const EXPECTED = import.meta.env.VITE_MANUAL_PASSWORD ?? "lamont-labs-lee";

function verify(input: string) {
  return input === EXPECTED;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "1") setAuthed(true);
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }

  if (authed) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (verify(input)) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <img src="/favicon.png?icon=lee" alt="" className="w-8 h-8 rounded border border-primary/60 shadow-[0_0_18px_hsl(var(--brand-red)/.22)]" />
            <span className="font-semibold text-foreground tracking-tight">Project LEE</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-1">Private Access</h1>
          <p className="text-sm text-muted-foreground">Enter your access key to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Access key"
              autoFocus
              className={`w-full bg-card border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono transition-all ${
                error ? "border-destructive focus:ring-destructive/50" : "border-border"
              }`}
            />
            {error && (
              <p className="mt-2 text-xs text-destructive">Incorrect access key.</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Project LEE Manual — Internal Reference Only
        </p>
      </div>
    </div>
  );
}
