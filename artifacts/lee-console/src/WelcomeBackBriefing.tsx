import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  FileCheck2,
  Fingerprint,
  History,
  LockKeyhole,
  Minus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type WelcomeBackSection = {
  id?: string | number | null;
  label?: string | null;
  status?: string | null;
  statement?: string | null;
  evidenceRefs?: JsonValue;
  freshness?: JsonValue;
  contradictionState?: JsonValue;
  unavailableReason?: string | null;
};

type WelcomeBackBrief = {
  version?: JsonValue;
  status?: string | null;
  session?: {
    lastSessionAt?: string | null;
    currentSessionAt?: string | null;
  } | null;
  headline?: string | null;
  sections?: WelcomeBackSection[] | null;
  knowledgeGap?: JsonValue;
  routeEvidence?: JsonValue;
  memoryHealth?: JsonValue;
  recoveryMode?: JsonValue;
};

type ViewState = "loading" | "unavailable" | "recovery" | "baseline" | "no-changes" | "briefing";

function isRecord(value: JsonValue | unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function readable(value: unknown): string {
  const direct = textValue(value);
  if (direct) return direct;
  if (value === null || value === undefined) return "Not supplied";
  if (Array.isArray(value)) return value.length ? value.map(readable).join(", ") : "None supplied";
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, entry]) => `${humanize(key)}: ${readable(entry)}`)
      .join(" · ");
  }
  return String(value);
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function normalized(value: unknown): string {
  return readable(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function formatDateTime(value: unknown): string {
  const raw = textValue(value);
  if (!raw) return "Not supplied";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function asList(value: JsonValue | undefined): JsonValue[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function isNoChanges(status: unknown): boolean {
  const value = normalized(status);
  return value.includes("no_changes") || value.includes("no_change") || value.includes("unchanged") || value.includes("no_updates");
}

function isBaselineRequired(status: unknown): boolean {
  return normalized(status).includes("baseline");
}

function isRecoveryProtected(value: unknown): boolean {
  const mode = normalized(value);
  return mode.includes("recovery_mode") || mode.includes("recovery_protected") || mode.includes("read_only") || mode.includes("readonly") || mode.includes("quarantine") || mode === "protected";
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function statusTone(status: unknown): string {
  const value = normalized(status);
  if (value.includes("contradict") || value.includes("unavailable") || value.includes("error") || value.includes("failed")) {
    return "border-red-300/40 bg-red-950/40 text-red-100";
  }
  if (value.includes("stale") || value.includes("degraded") || value.includes("review") || value.includes("uncertain") || value.includes("pending")) {
    return "border-amber-300/40 bg-amber-950/35 text-amber-100";
  }
  if (value.includes("verified") || value.includes("fresh") || value.includes("clear") || value.includes("available") || value.includes("complete") || value.includes("healthy")) {
    return "border-emerald-300/35 bg-emerald-950/35 text-emerald-100";
  }
  return "border-white/15 bg-white/[0.06] text-white/75";
}

function ValueView({ value, testId }: { value: JsonValue | undefined; testId: string }) {
  const items = asList(value);
  if (!items.length) {
    return <span data-testid={testId} className="text-sm text-white/40">Not supplied</span>;
  }

  return (
    <span data-testid={testId} className="block">
      {items.length > 1 ? (
        <span className="block space-y-1.5">
          {items.map((item, index) => (
            <span key={`${testId}-${index}`} data-testid={`${testId}-item-${index}`} className="block text-sm leading-6 text-white/75">
              {readable(item)}
            </span>
          ))}
        </span>
      ) : (
        <span data-testid={`${testId}-value`} className="text-sm leading-6 text-white/75">{readable(items[0])}</span>
      )}
    </span>
  );
}

function BriefingSkeleton() {
  return (
    <main data-testid="welcome-back-briefing-loading" className="mx-auto min-h-[420px] max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="animate-pulse space-y-6" aria-label="Loading welcome-back briefing">
        <div className="h-3 w-32 rounded-full bg-white/10" />
        <div className="h-16 max-w-3xl rounded-2xl bg-white/[0.08]" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-28 rounded-2xl bg-white/[0.06]" data-testid={`welcome-back-loading-card-${item}`} />)}
        </div>
        <div className="h-48 rounded-2xl bg-white/[0.06]" />
      </div>
    </main>
  );
}

function UnavailableState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main data-testid="welcome-back-briefing-unavailable" className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-red-300/25 bg-[#12080b] p-6 shadow-[0_24px_80px_rgba(0,0,0,.32)] sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-red-400/15" />
        <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full border border-red-400/10" />
        <div className="relative max-w-xl">
          <span className="mb-6 grid h-11 w-11 place-items-center rounded-2xl border border-red-300/30 bg-red-500/10 text-red-200">
            <AlertTriangle size={19} />
          </span>
          <p className="lee-label text-red-200/70">Welcome-back briefing</p>
          <h1 data-testid="welcome-back-unavailable-title" className="lee-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">The briefing is unavailable.</h1>
          <p data-testid="welcome-back-unavailable-reason" className="mt-4 text-sm leading-7 text-white/60">{message}</p>
          <button type="button" onClick={onRetry} data-testid="button-retry-welcome-back" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-red-200/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/20">
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}

function StateBanner({ state, recoveryMode }: { state: Exclude<ViewState, "loading" | "unavailable" | "briefing">; recoveryMode?: JsonValue }) {
  const recovery = state === "recovery";
  const baseline = state === "baseline";
  return (
    <div data-testid={`welcome-back-state-${state}`} className={cn(
      "mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm",
      recovery ? "border-amber-200/30 bg-amber-950/35 text-amber-50" : "border-white/15 bg-white/[0.045] text-white/75",
    )}>
      <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg", recovery ? "bg-amber-300/10 text-amber-200" : "bg-white/[0.08] text-white/65")}>
        {recovery ? <LockKeyhole size={15} /> : <Minus size={15} />}
      </span>
      <div>
        <p data-testid="welcome-back-state-title" className="font-semibold">{recovery ? "Recovery protection is active." : baseline ? "A first session boundary is being established." : "No changes since your last session."}</p>
        <p data-testid="welcome-back-state-detail" className="mt-1 text-xs leading-5 opacity-70">
          {recovery
            ? "This briefing is read-only while the runtime protects continuity."
            : baseline
              ? "LEE did not inspect historical records as new. Return after this baseline to receive a bounded change summary."
              : "LEE has no new owner-facing changes to surface in this session."}
        </p>
        {recoveryMode !== undefined && <p data-testid="welcome-back-recovery-mode" className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] opacity-65">Mode · {readable(recoveryMode)}</p>}
      </div>
    </div>
  );
}

function SessionStamp({ label, value, testId }: { label: string; value: unknown; testId: string }) {
  return (
    <div data-testid={testId} className="border-l border-white/15 pl-3">
      <p className="lee-label text-white/40">{label}</p>
      <p data-testid={`${testId}-value`} className="mt-1 text-xs font-medium text-white/75">{formatDateTime(value)}</p>
    </div>
  );
}

function ContextCard({ label, value, icon: Icon, testId }: { label: string; value: JsonValue | undefined; icon: typeof Fingerprint; testId: string }) {
  return (
    <section data-testid={testId} className="min-h-[138px] rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-500/10 text-red-200"><Icon size={14} /></span>
        <h2 className="lee-label text-white/45">{label}</h2>
      </div>
      <div className="mt-4">
        <ValueView value={value} testId={`${testId}-value`} />
      </div>
    </section>
  );
}

function BriefingSection({ section, index }: { section: WelcomeBackSection; index: number }) {
  const references = asList(section.evidenceRefs);
  const sectionId = textValue(section.id) || String(index + 1);
  const hasEvidence = references.length > 0;
  return (
    <article data-testid={`welcome-back-section-${sectionId}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#171214] p-5 sm:p-6">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-400/80 via-red-600/40 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
        <div className="min-w-0">
          <p data-testid={`welcome-back-section-${sectionId}-index`} className="lee-label text-red-200/55">Signal {String(index + 1).padStart(2, "0")}</p>
          <h2 data-testid={`welcome-back-section-${sectionId}-label`} className="lee-display mt-1 text-xl font-bold tracking-tight text-white">{textValue(section.label) || "Unlabeled section"}</h2>
        </div>
        <span data-testid={`welcome-back-section-${sectionId}-status`} className={cn("rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]", statusTone(section.status))}>
          {humanize(textValue(section.status) || "status not supplied")}
        </span>
      </div>

      <p data-testid={`welcome-back-section-${sectionId}-statement`} className="mt-6 max-w-3xl pl-2 text-[15px] leading-7 text-white/85">
        {textValue(section.statement) || "No statement was supplied for this section."}
      </p>

      <div className="mt-6 grid gap-4 border-t border-white/10 pl-2 pt-4 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 size={13} className={hasEvidence ? "text-emerald-300" : "text-white/35"} />
            <p className="lee-label text-white/40">Evidence references</p>
          </div>
          {hasEvidence ? (
            <div data-testid={`welcome-back-section-${sectionId}-evidence-refs`} className="mt-2 flex flex-wrap gap-2">
              {references.map((reference, referenceIndex) => (
                <span key={`${sectionId}-evidence-${referenceIndex}`} data-testid={`welcome-back-section-${sectionId}-evidence-ref-${referenceIndex}`} className="rounded-lg border border-emerald-300/20 bg-emerald-400/[0.07] px-2.5 py-1.5 font-mono text-[10px] leading-4 text-emerald-100/80">
                  {readable(reference)}
                </span>
              ))}
            </div>
          ) : (
            <p data-testid={`welcome-back-section-${sectionId}-evidence-refs-empty`} className="mt-2 text-xs text-white/35">No references supplied.</p>
          )}
        </div>
        <div data-testid={`welcome-back-section-${sectionId}-freshness`} className="min-w-[110px]">
          <p className="lee-label text-white/40">Freshness</p>
          <p data-testid={`welcome-back-section-${sectionId}-freshness-value`} className="mt-2 text-xs text-white/70">{readable(section.freshness)}</p>
        </div>
        <div data-testid={`welcome-back-section-${sectionId}-contradiction`} className="min-w-[125px]">
          <p className="lee-label text-white/40">Contradiction</p>
          <p data-testid={`welcome-back-section-${sectionId}-contradiction-value`} className={cn("mt-2 text-xs", normalized(section.contradictionState).includes("none") || normalized(section.contradictionState).includes("clear") ? "text-emerald-200/80" : "text-amber-200/80")}>{readable(section.contradictionState)}</p>
        </div>
      </div>

      {textValue(section.unavailableReason) && (
        <p data-testid={`welcome-back-section-${sectionId}-unavailable-reason`} className="mt-4 rounded-xl border border-amber-200/20 bg-amber-400/[0.06] px-3 py-2.5 text-xs leading-5 text-amber-100/75">
          {section.unavailableReason}
        </p>
      )}
    </article>
  );
}

export default function WelcomeBackBriefing() {
  const [briefing, setBriefing] = useState<WelcomeBackBrief | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/cognitive-runtime/welcome-back", { cache: "no-store" });
      const result: unknown = await response.json();
      if (!isRecord(result)) throw new Error("Welcome-back briefing returned an unreadable response.");
      if (!response.ok && !result.status) throw new Error(`Welcome-back briefing unavailable (${response.status}).`);
      setBriefing(result as WelcomeBackBrief);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setBriefing(null);
      setError(cause instanceof Error ? cause.message : "Welcome-back briefing unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const viewState = useMemo<ViewState>(() => {
    if (loading) return "loading";
    if (!briefing) return "unavailable";
    if (isRecoveryProtected(briefing.recoveryMode)) return "recovery";
    if (isBaselineRequired(briefing.status)) return "baseline";
    if (isNoChanges(briefing.status)) return "no-changes";
    return "briefing";
  }, [briefing, loading]);

  if (viewState === "loading") return <BriefingSkeleton />;
  if (viewState === "unavailable") return <UnavailableState message={error || "No briefing data was returned."} onRetry={() => void load()} />;
  if (!briefing) return null;

  const sections = Array.isArray(briefing.sections) ? briefing.sections : [];
  const status = textValue(briefing.status) || "Status not supplied";
  const recovery = viewState === "recovery";
  return (
    <main data-testid="welcome-back-briefing" className="lee-noise relative mx-auto min-h-[calc(100dvh-4rem)] max-w-[1280px] overflow-hidden px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
      <div className="pointer-events-none absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full border border-red-500/10 bg-red-950/10 shadow-[0_0_140px_rgba(125,11,31,.2)]" />
      <div className="pointer-events-none absolute left-[-16rem] top-[32rem] h-[28rem] w-[28rem] rounded-full border border-red-500/[0.07]" />

      <header data-testid="welcome-back-briefing-header" className="relative border-b border-white/10 pb-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_16px_rgba(248,113,113,.8)]" />
              <p className="lee-label text-red-200/70">Owner briefing · welcome back</p>
            </div>
            <h1 data-testid="welcome-back-headline" className="lee-display mt-4 text-4xl font-bold leading-[1.04] tracking-[-0.06em] text-white sm:text-6xl">
              {textValue(briefing.headline) || "Your briefing is ready."}
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <Sparkles size={14} className="text-red-200" />
            <span data-testid="welcome-back-status" className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">{humanize(status)}</span>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-7 gap-y-4">
          <SessionStamp label="Last session" value={briefing.session?.lastSessionAt} testId="welcome-back-last-session" />
          <SessionStamp label="Current session" value={briefing.session?.currentSessionAt} testId="welcome-back-current-session" />
          <div data-testid="welcome-back-version" className="border-l border-white/15 pl-3">
            <p className="lee-label text-white/40">Briefing version</p>
            <p data-testid="welcome-back-version-value" className="mt-1 font-mono text-xs text-white/75">{readable(briefing.version)}</p>
          </div>
        </div>
      </header>

      {viewState === "recovery" || viewState === "baseline" || viewState === "no-changes" ? <StateBanner state={viewState} recoveryMode={briefing.recoveryMode} /> : null}

      <div className="relative mt-7 grid gap-3 md:grid-cols-3">
        <ContextCard label="Knowledge gap" value={briefing.knowledgeGap} icon={Fingerprint} testId="welcome-back-knowledge-gap" />
        <ContextCard label="Route evidence" value={briefing.routeEvidence} icon={History} testId="welcome-back-route-evidence" />
        <ContextCard label="Memory health" value={briefing.memoryHealth} icon={ShieldCheck} testId="welcome-back-memory-health" />
      </div>

      <section data-testid="welcome-back-sections" className="relative mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="lee-label text-red-200/60">What LEE can stand behind</p>
            <h2 data-testid="welcome-back-sections-title" className="lee-display mt-2 text-2xl font-bold tracking-tight text-white">Evidence-backed signals</h2>
          </div>
          <p data-testid="welcome-back-section-count" className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{sections.length} {sections.length === 1 ? "section" : "sections"}</p>
        </div>
        {sections.length ? (
          <div className="space-y-3">
            {sections.map((section, index) => <BriefingSection key={`${textValue(section.id) || "section"}-${index}`} section={section} index={index} />)}
          </div>
        ) : (
          <div data-testid="welcome-back-sections-empty" className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-10 text-center">
            <Check className="mx-auto text-emerald-300/70" size={18} />
            <p data-testid="welcome-back-sections-empty-title" className="mt-3 text-sm font-semibold text-white/80">{recovery ? "No protected signals are available." : "No signals are available."}</p>
            <p data-testid="welcome-back-sections-empty-detail" className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/40">LEE did not return any sections for this briefing.</p>
          </div>
        )}
      </section>

      {recovery && (
        <footer data-testid="welcome-back-recovery-footer" className="relative mt-8 flex items-center gap-3 border-t border-amber-200/15 pt-4 text-xs text-amber-100/55">
          <Clock3 size={14} className="shrink-0" />
          <span>Recovery mode · owner-facing briefing remains informational until continuity is restored.</span>
        </footer>
      )}
    </main>
  );
}