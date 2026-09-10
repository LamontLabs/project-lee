e.json(); if (response.ok) { setNewToken(result.token); setPairing({ active: true, ...result }); setNotice('New Android pairing token issued. Save it now; it will not be shown again.'); } else setNotice(result.error ?? 'Could not issue an Android pairing token.'); setPairingBusy(false); };
  const revokePairing = async () => { setPairingBusy(true); const response = await fetch('/api/android/pairing/revoke', { method: 'POST' }); if (response.ok) { setPairing({ active: false }); setNewToken(''); setNotice('Android pairing token revoked.'); } else setNotice('Could not revoke the Android pairing token.'); setPairingBusy(false); };
  return <div className="mx-auto max-w-[960px]"><SectionHeading eyebrow="Boundaries & preferences" title="Settings" detail="The quiet controls behind a private operating console." /><div className="space-y-5"><Panel><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck size={23} /></div><div className="flex-1"><p className="lee-label text-primary">Private access</p><h3 className="mt-1 text-lg font-semibold">Founder session is active</h3><p className="mt-1 text-sm text-muted-foreground">This console has no invited members and no public share surface.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Verified</span></div></Panel>{capacity && <Panel><div className="flex items-center justify-between gap-4"><div><p className="lee-label text-primary">Operational capacity</p><h3 className="mt-1 text-lg font-semibold">{capacity.state} · {Math.round(capacity.score)}/100</h3><p className="mt-1 text-sm text-muted-foreground">Inference-only presentation signal. It does not model mood or collect new data.</p></div><div className="flex flex-wrap gap-2">{['HIGH', 'NOMINAL', 'CONSTRAINED', 'LOW'].map((state) => <button key={state} onClick={() => void overrideCapacity(state)} className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${capacity.overrideState === state ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{state}</button>)}<button onClick={() => void overrideCapacity(null)} className="rounded-xl border border-border px-3 py-2 text-[11px] font-semibold">Auto</button></div></div></Panel>}<Panel><div className="flex items-center gap-3"><Radio className="text-primary" size={18} /><div><p className="lee-label text-primary">Android companion</p><h3 className="mt-1 text-lg font-semibold">Pairing access</h3></div><span className={`ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold ${pairing?.active ? 'border-primary/25 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{pairing?.active ? 'Token active' : 'Not paired'}</span></div><p className="mt-3 text-sm text-muted-foreground">Issue a one-time token for the Android companion. Rotating immediately revokes every previous token.</p>{newToken && <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3"><p className="lee-label text-primary">Copy this token now</p><code className="mt-2 block break-all text-xs">{newToken}</code></div>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => void rotatePairing()} disabled={pairingBusy} className="rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="button-rotate-android-pairing">{pairing?.active ? 'Rotate token' : 'Generate token'}</button>{pairing?.active && <button onClick={() => void revokePairing()} disabled={pairingBusy} className="rounded-xl border border-destructive/30 px-3.5 py-2.5 text-xs font-semibold text-destructive disabled:opacity-50" data-testid="button-revoke-android-pairing">Revoke token</button>}</div>{pairing?.lastUsedAt && <p className="mt-3 text-xs text-muted-foreground">Last verified by Android {formatDate(pairing.lastUsedAt)}.</p>}</Panel><Panel><div className="flex items-center gap-3"><Settings2 className="text-primary" size={18} /><div><p className="lee-label text-primary">Session preferences</p><h3 className="mt-1 text-lg font-semibold">How Lee should meet you</h3></div></div><div className="mt-5 divide-y divide-border"><SettingToggle title="Opening brief" detail="Prepare the daily signal when the console opens." value={briefs} onChange={() => setBriefs(!briefs)} testId="toggle-opening-brief" /><SettingToggle title="Quiet system notices" detail="Show meaningful state changes without interrupting the work surface." value={notifications} onChange={() => setNotifications(!notifications)} testId="toggle-system-notices" /></div></Panel><Panel><div className="flex items-center gap-3"><Clock3 className="text-primary" size={18} /><div><p className="lee-label text-primary">Current session</p><h3 className="mt-1 text-lg font-semibold">Local session-22</h3></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Started</p><p className="mt-2 text-sm font-semibold">Today, 07:28</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Location</p><p className="mt-2 text-sm font-semibold">Founder device</p></div><div className="rounded-xl bg-muted/60 p-3.5"><p className="lee-label text-muted-foreground">Access</p><p className="mt-2 text-sm font-semibold">Full console</p></div></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setNotice('Other sessions revoked. This device remains active.')} className="rounded-xl border border-border px-3.5 py-2.5 text-xs font-semibold hover:bg-muted" data-testid="button-revoke-sessions">Revoke other sessions</button><button onClick={onLock} className="rounded-xl border border-destructive/30 px-3.5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10" data-testid="button-lock-console-settings">Lock console</button></div>{notice && <p className="mt-4 text-xs text-primary" data-testid="status-settings-notice">{notice}</p>}</Panel></div></div>;
}

function SelfTestPage() {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');
  const load = async () => { const response = await fetch('/api/self-tests'); if (response.ok) setHistory(await response.json()); };
  useEffect(() => { void load(); }, []);
  const run = async () => { setRunning(true); setNotice('Running full system check…'); const response = await fetch('/api/self-tests/run', { method: 'POST' }); const result = await response.json(); if (response.ok) { setReport(result); setNotice(`Completed ${result.overall_result}.`); await load(); } else setNotice(result.error ?? 'Self-test failed to start.'); setRunning(false); };
  return <div className="mx-auto max-w-[1100px]"><SectionHeading eyebrow="Settings / System" title="Full system check" detail="Verify that Lee is not merely running, but capable of the functions she claims to provide." action={<button onClick={() => void run()} disabled={running} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{running ? 'Running checks…' : 'Run Full System Check'}</button>} />{notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">{notice}</div>}{report && <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="lee-label text-primary">Latest report</p><p className="mt-1 text-lg font-semibold">{report.test_run_id}</p></div><StatusPill status={String(report.overall_result).toLowerCase() as any} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{report.test_suites.map((suite: any) => <details key={suite.suite_name} className="rounded-xl bg-muted/50 p-3" open={suite.result !== 'PASS'}><summary className="cursor-pointer text-sm font-semibold">{suite.suite_name} · {suite.result}</summary><div className="mt-3 space-y-2">{suite.tests.map((item: any) => <details key={item.test_id} className="border-t border-border/70 pt-2 text-xs"><summary className="cursor-pointer"><span className={item.result === 'PASS' ? 'text-primary' : item.result === 'WARN' ? 'text-accent-foreground' : 'text-destructive'}>{item.result}</span> · {item.test_name}</summary><p className="mt-1 text-muted-foreground">{item.message}</p><pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">{JSON.stringify(item.evidence, null, 2)}</pre></details>)}</div></details>)}</div></Panel>}<Panel className="mt-5"><div className="mb-4 flex items-center justify-between"><div><p className="lee-label text-muted-foreground">History</p><h3 className="mt-1 text-lg font-semibold">Past self-tests</h3></div><span className="lee-label text-muted-foreground">{history.length} reports</span></div>{history.length ? <div className="divide-y divide-border">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 py-3"><span className="text-sm font-medium">{new Date(item.startedAt).toLocaleString()}</span><StatusPill status={String(item.overallResult).toLowerCase() as any} /><span className="text-xs text-muted-foreground">{item.passCount} pass · {item.warnCount} warn · {item.failCount} fail</span></div>)}</div> : <EmptyState title="No self-test history" detail="Run the first full system check to establish a baseline." />}</Panel></div>;
}

type OperationalReview = {
  id: string;
  cadence: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  summaryNarrative: string;
  sections: Record<string, { narrative?: string; sourceRefs?: string[]; [key: string]: unknown }>;
  sourceRefs: string[];
  keyThemes: string[];
  generatedAt: string;
};

function ReviewsPage() {
  const [reviews, setReviews] = useState<OperationalReview[]>([]);
  const [selected, setSelected] = useState<OperationalReview | null>(null);
  const [cadence, setCadence] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/reviews${cadence === 'all' ? '' : `?cadence=${cadence}`}`);
      if (!response.ok) throw new Error(`Reviews request failed (${response.status}).`);
      const data = await response.json() as OperationalReview[];
      setReviews(data);
      if (selected) {
        const refreshed = data.find((review) => review.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load operational reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReviews(); }, [cadence]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    setNotice('');
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (cadence === 'annual' ? 365 : cadence === 'quarterly' ? 90 : cadence === 'monthly' ? 30 : 7));
    try {
      const response = await fetch('/api/reviews/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cadence: cadence === 'all' ? 'weekly' : cadence, periodStart: start.toISOString(), periodEnd: end.toISOString() }),
      });
      if (!response.ok) throw new Error(`Review generation failed (${response.status}).`);
      const review = await response.json() as OperationalReview;
      setSelected(review);
      setNotice('Review generated and stored permanently.');
      await loadReviews();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate an operational review.');
    } finally {
      setGenerating(false);
    }
  };

  return <div className="mx-auto max-w-[1280px]">
    <SectionHeading eyebrow="Institutional history" title="Operational reviews" detail="Permanent retrospectives grounded in events, objectives, and assumptions." action={<div className="flex gap-2"><select value={cadence} onChange={(event) => setCadence(event.target.value)} className="rounded-xl border border-input bg-card px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary" aria-label="Filter reviews by cadence"><option value="all">All cadences</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select><button onClick={() => void generate()} disabled={generating} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50" data-testid="button-generate-review"><Sparkles size={14} /> {generating ? 'Generating…' : 'Generate review'}</button></div>} />
    {notice && <div className="mb-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary" role="status">{notice}</div>}
    {error && <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}<button onClick={() => void loadReviews()} className="ml-3 font-semibold underline">Retry</button></div>}
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
      <Panel>
        <div className="mb-4 flex items-center justify-between"><div><p className="lee-label text-primary">Archive</p><h3 className="mt-1 text-lg font-semibold">Review history</h3></div><span className="lee-label text-muted-foreground">{reviews.length} stored</span></div>
        {loading ? <SkeletonRows /> : reviews.length === 0 ? <EmptyState title="No reviews yet" detail="Generate the first retrospective to begin LEE's institutional history." /> : <div className="space-y-2">{reviews.map((review) => <button key={review.id} onClick={() => setSelected(review)} className={cn('w-full rounded-xl border px-4 py-3 text-left transition-colors', selected?.id === review.id ? 'border-primary/35 bg-primary/10' : 'border-transparent bg-muted/55 hover:border-primary/20')}><div className="flex items-center justify-between gap-3"><span className="lee-label text-primary">{review.cadence}</span><span className="text-[11px] text-muted-foreground">{formatDate(review.generatedAt)}</span></div><p className="mt-2 text-sm font-semibold">{review.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{review.summaryNarrative}</p></button>)}</div>}
      </Panel>
      <Panel>
        {!selected ? <EmptyState title="Select a review" detail="Choose a retrospective from the archive to inspect its narrative and evidence sections." /> : <div><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="lee-label text-primary">{selected.cadence} · {formatDate(selected.periodStart)} — {formatDate(selected.periodEnd)}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{selected.title}</h3></div><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><CircleCheck size={13} /> Stored</span></div><div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.06] p-4"><p className="lee-label text-primary">Summary narrative</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{selected.summaryNarrative}</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(selected.sections).map(([key, section]) => <div key={key} className="rounded-xl bg-muted/55 p-4"><p className="lee-label text-muted-foreground">{key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase())}</p>{section.narrative && <p className="mt-2 text-sm leading-relaxed">{section.narrative}</p>}<p className="mt-2 text-xs text-muted-foreground">{section.sourceRefs?.length ?? 0} source references</p></div>)}</div><div className="mt-5 border-t border-border pt-4"><p className="lee-label text-muted-foreground">Key themes</p><div className="mt-2 flex flex-wrap gap-2">{selected.keyThemes.map((theme) => <span key={theme} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">{theme}</span>)}</div><p className="mt-4 text-xs text-muted-foreground">{selected.sourceRefs.length} event/objective references indexed in the Intelligence Graph.</p></div></div>}
      </Panel>
    </div>
  </div>;
}

function SettingToggle({ title, detail, value, onChange, testId }: { title: string; detail: string; value: boolean; onChange: () => void; testId: string }) {
  return <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><button onClick={onChange} role="switch" aria-checked={value} className={cn('relative h-6 w-11 shrink-0 rounded-full', value ? 'bg-primary' : 'bg-secondary')} data-testid={testId}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm', value ? 'left-6' : 'left-1')} /></button></div>;
}

function AskDialog({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (question.trim()) setSubmitted(true); };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-5 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl border border-card-border bg-card p-6 shadow-2xl lee-enter lee-red-edge" role="dialog" aria-modal="true" data-testid="dialog-ask-lee"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="lee-metal grid h-10 w-10 place-items-center rounded-xl text-white"><BrainCircuit size={19} /></span><div><p className="lee-label text-primary">Private reasoning surface</p><h2 className="mt-1 text-xl font-semibold">Ask LEE</h2></div></div><button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" data-testid="button-close-ask-lee"><X size={17} /></button></div>{submitted ? <div className="mt-7 rounded-xl border border-primary/25 bg-primary/10 p-5"><div className="flex items-center gap-2 text-primary"><CircleCheck size={17} /><p className="text-sm font-semibold">Question held for the private session.</p></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">LEE will ground the response in current objectives, evidence, and system state. This first pass keeps the interaction local.</p><button onClick={() => { setSubmitted(false); setQuestion(''); }} className="mt-4 text-xs font-semibold text-primary hover:underline" data-testid="button-ask-another">Ask another question</button></div> : <form onSubmit={submit}><p className="mt-6 text-sm leading-relaxed text-muted-foreground">What deserves a sharper read right now?</p><textarea autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about an objective, a signal, or a decision..." className="mt-4 min-h-32 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="textarea-ask-lee" /><div className="mt-4 flex items-center justify-between"><span className="lee-label text-muted-foreground">Private · founder context only</span><button type="submit" disabled={!question.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-submit-ask-lee">Ask LEE <ArrowUpRight size={14} /></button></div></form>}</div></div>;
}

function LockedScreen({ onUnlock }: { onUnlock: () => void }) {
  return <div className="lee-noise grid min-h-[100dvh] place-items-center bg-sidebar p-5 text-sidebar-foreground"><div className="max-w-md text-center lee-enter"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><LockKeyhole size={25} /></span><p className="lee-label mt-7 text-sidebar-primary">Console locked</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Private state is protected.</h1><p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/60">The founder session is still here. Unlock locally to return to the operating view.</p><button onClick={onUnlock} className="mt-7 rounded-xl bg-sidebar-primary px-5 py-3 text-sm font-semibold text-sidebar-primary-foreground hover:opacity-90" data-testid="button-unlock-console">Unlock local session</button></div></div>;
}

function LoginScreen({ onAuthenticated, enrollmentRequired }: { onAuthenticated: () => void; enrollmentRequired?: boolean }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch(enrollmentRequired ? '/api/auth/enroll' : '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) onAuthenticated(); else setError(result.error ?? (enrollmentRequired ? 'Owner enrollment could not be completed.' : 'The owner credentials were not accepted.'));
    setBusy(false);
  };
  return <div className="lee-noise grid min-h-[100dvh] place-items-center bg-sidebar p-5 text-sidebar-foreground"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-7 shadow-2xl"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><LockKeyhole size={22} /></div><p className="lee-label mt-7 text-sidebar-primary">{enrollmentRequired ? 'First-run owner setup' : 'Private founder console'}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{enrollmentRequired ? 'Create your owner key.' : 'Enter Lee.'}</h1><p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/60">{enrollmentRequired ? 'Set the local owner credentials for this installation. The local runtime must be available to complete setup, and the password is stored only as a salted secure hash.' : 'This surface is private. Your session is scoped to the owner and expires automatically.'}</p><div className="mt-7 space-y-3"><input name="username" required autoComplete="username" placeholder="Owner name" className="h-11 w-full rounded-xl border border-sidebar-border bg-sidebar px-3 text-sm outline-none focus:border-sidebar-primary" /><input name="password" required minLength={enrollmentRequired ? 12 : undefined} type="password" autoComplete={enrollmentRequired ? 'new-password' : 'current-password'} placeholder={enrollmentRequired ? 'Password (12+ characters)' : 'Password'} className="h-11 w-full rounded-xl border border-sidebar-border bg-sidebar px-3 text-sm outline-none focus:border-sidebar-primary" /></div>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}<button disabled={busy} className="mt-6 w-full rounded-xl bg-sidebar-primary py-3 text-sm font-semibold text-sidebar-primary-foreground disabled:opacity-50">{busy ? (enrollmentRequired ? 'Creating credentials…' : 'Verifying…') : (enrollmentRequired ? 'Create owner credentials' : 'Unlock console')}</button></form></div>;
}

function RuntimeUnavailableScreen() {
  return <div className="lee-noise grid min-h-[100dvh] place-items-center bg-sidebar p-5 text-sidebar-foreground"><div className="max-w-md text-center lee-enter"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sidebar-primary/40 bg-sidebar-primary/15 text-sidebar-primary"><CircleAlert size={25} /></span><p className="lee-label mt-7 text-sidebar-primary">Local runtime unavailable</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">LEE is still starting.</h1><p className="mt-3 text-sm leading-relaxed text-sidebar-foreground/60">The owner console cannot verify a session until the local API and database are available. Restart the local runtime from the desktop status panel, then try again.</p><button type="button" onClick={() => window.location.reload()} className="mt-7 rounded-xl bg-sidebar-primary px-5 py-3 text-sm font-semibold text-sidebar-primary-foreground hover:opacity-90">Check runtime again</button></div></div>;
}

function LiveCollectionPage({ eyebrow, title, detail, endpoint, emptyTitle, emptyDetail, icon: Icon = ListChecks }: { eyebrow: string; title: string; detail: string; endpoint: string; emptyTitle: string; emptyDetail: string; icon?: typeof ListChecks }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const liveEndpoint = title === 'Evidence' ? '/api/facts' : endpoint;
  useEffect(() => { void fetch(liveEndpoint).then(async (response) => { if (!response.ok) throw new Error('This live surface is not available yet.'); return response.json(); }).then((value) => setItems(Array.isArray(value) ? value : value?.items ?? [])).catch((cause) => { setItems([]); setError(cause instanceof Error ? cause.message : 'Unable to load this surface.'); }); }, [liveEndpoint]);
  if (endpoint === '/api/understanding/runs') return <ImportsPage />;
  if (endpoint === '/api/governance/requests') return <GovernancePage />;
  if (endpoint === '/api/brain-versions') return <BackupsPage />;
  if (title === 'Evidence') return <EvidenceLedgerPage />;
  return <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow={eyebrow} title={title} detail={detail} /><Panel>{error && <div className="mb-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-muted-foreground">{error}</div>}{items === null ? <SkeletonRows /> : items.length ? <div className="grid gap-3 md:grid-cols-2">{items.map((item, index) => <div key={item.id ?? index} className="rounded-xl border border-border bg-muted/40 p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.name ?? item.title ?? item.subject ?? item.originalFilename ?? item.eventType ?? `Record ${index + 1}`}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description ?? item.body ?? item.status ?? item.sourceRef ?? 'Live record from the Lee API.'}</p>{item.createdBy && <p className="mt-2 text-[11px] text-muted-foreground">{item.createdBy === 'owner' ? 'Owner-created' : `Created by ${item.createdBy}`} · {item.verifiedBy ? `Verified by ${item.verifiedBy}` : <span className={item.generatedBy ? 'text-accent-foreground' : ''}>{item.generatedBy ? 'Unverified' : 'Never verified'}</span>}</p>}</div><div className="flex flex-col items-end gap-2"><span className="lee-label text-muted-foreground">{item.status ?? 'live'}</span>{item.id && item.createdBy && !item.verifiedBy && <button onClick={async () => { await fetch(`/api/ownership/${title === 'People' ? 'person' : title === 'Evidence' ? 'fact' : 'object'}/${item.id}/verify`, { method: 'POST' }); setItems((current) => current?.map((row) => row.id === item.id ? { ...row, verifiedBy: 'owner', verifiedAt: new Date().toISOString() } : row) ?? null); }} className="text-[10px] font-semibold text-primary hover:underline">Mark verified</button>}</div></div></div>)}</div> : <EmptyState title={emptyTitle} detail={emptyDetail} />}</Panel></div>;
}

function LegacyAskPage() {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('normal');
  const [notice, setNotice] = useState('');
  const [packet, setPacket] = useState<any>(null);
  const [conversationId, setConversationId] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const prepare = async () => {
    if (!message.trim()) { setNotice('Add a question first.'); return; }
    setBusy(true); setNotice('');
    const response = await fetch('/api/ai/context-preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
    const result = await response.json();
    if (!response.ok) setNotice(result.error ?? 'Unable to prepare context.'); else { setPacket(result); setNotice('Context packet prepared. Nothing has run yet.'); }
    setBusy(false);
  };
  const run = async () => {
    if (!packet || !message.trim()) return;
    setBusy(true); setNotice('');
    let id = conversationId;
    if (!id) { const created = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }).then((response) => response.json()); id = created.id; setConversationId(id); }
    const response = await fetch(`/api/ai/conversations/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
    const result = await response.json();
    if (result.held) setNotice(`Held for approval. Estimated cost $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`); else if (result.packetOnly) { setAnswer('Packet-only mode selected. No model was called.'); setNotice('Context packet returned without a model call.'); } else if (!response.ok) setNotice(result.error ?? 'Lee could not complete this request.'); else { setAnswer(result.answer ?? ''); setNotice(`Answered with ${result.model} · ${result.provider} · $${Number(result.estimatedCostUsd ?? 0).toFixed(4)}.`); }
    setBusy(false);
  };
  const modeLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const intent = packet?.intent;
  const correctIntent = async (intentType: string) => { if (!intent?.id) return; const response = await fetch(`/api/intents/${intent.id}/correct`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intentType }) }); if (response.ok) { const corrected = await response.json(); setPacket((current: any) => ({ ...current, intent: corrected })); setNotice('Intent corrected and sent to Learning.'); } };
  return <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[1fr_360px]"><div><SectionHeading eyebrow="Private reasoning surface" title="Ask Lee" detail="Prepare a bounded context packet first. Review the route and estimated cost before Lee executes." /><Panel><div className="min-h-64 rounded-xl border border-dashed border-border bg-muted/30 p-5">{answer ? <div><p className="lee-label text-primary">Lee’s response</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{answer}</p>{packet?.packet?.items?.length > 0 && <p className="mt-5 text-xs text-muted-foreground">Grounded in {packet.packet.items.length} evidence items.</p>}</div> : <EmptyState title="No response in this session" detail="Your questions and answers remain inside the private founder session." />}</div><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should Lee help you see?" className="mt-4 min-h-28 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm outline-none focus:border-primary" /><div className="mt-3 flex flex-wrap items-center gap-2"><select value={mode} onChange={(event) => { setMode(event.target.value); setPacket(null); }} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">{['normal','deep_think','build','write','review','pilot','low_cost','private','no_model','governed_action'].map((item) => <option key={item} value={item}>{modeLabel(item)}</option>)}</select><button onClick={() => void prepare()} disabled={busy} className="ml-auto rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-semibold text-primary disabled:opacity-50">{busy ? 'Working…' : 'Prepare context'}</button><button onClick={() => void run()} disabled={busy || !packet} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Run Lee</button></div>{notice && <p className="mt-3 text-sm text-primary">{notice}</p>}</Panel></div><div className="space-y-5"><Panel><p className="lee-label text-primary">Intent confirmation</p><h3 className="mt-2 text-lg font-semibold">{intent ? `Understood as: ${modeLabel(intent.intentType)}` : 'Awaiting a question'}</h3>{intent && <><p className="mt-2 text-xs text-muted-foreground">{Math.round(intent.confidence * 100)}% confidence · {intent.retrievalMode} retrieval · {intent.audienceProfile} audience</p><select value={intent.intentType} onChange={(event) => void correctIntent(event.target.value)} className="mt-4 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value={intent.intentType}>{modeLabel(intent.intentType)}</option>{['question_factual','question_exploratory','explanation_seeking','recommendation_request','review_request','status_check','capture_input'].filter((item) => item !== intent.intentType).map((item) => <option key={item} value={item}>{modeLabel(item)}</option>)}</select></>}</Panel><Panel><p className="lee-label text-primary">Context packet preview</p><h3 className="mt-2 text-lg font-semibold">{packet ? 'Ready for your decision' : 'Awaiting a question'}</h3><div className="mt-5 space-y-3 text-sm text-muted-foreground"><div className="flex justify-between"><span>Mode</span><span className="font-medium text-foreground">{modeLabel(mode)}</span></div><div className="flex justify-between"><span>Route</span><span className="font-medium text-foreground">{packet?.route?.replace('_', ' ') ?? 'Not selected'}</span></div><div className="flex justify-between"><span>Model</span><span className="font-medium text-foreground">{packet?.selectedModel ?? 'Not selected'}</span></div><div className="flex justify-between"><span>Estimated cost</span><span className="font-medium text-foreground">{packet ? `$${Number(packet.estimatedCostUsd).toFixed(4)}` : 'Calculated on prepare'}</span></div><div className="flex justify-between"><span>Context</span><span className="font-medium text-foreground">{packet ? `${packet.packet.tokens} tokens · ${packet.packet.items.length} items` : 'Not assembled'}</span></div></div>{packet?.packet?.excludedRefs?.length > 0 && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{packet.packet.excludedRefs.length} stale or lower-relevance items excluded from this packet.</p>}</Panel><Panel><p className="lee-label text-muted-foreground">Actions</p><div className="mt-4 grid gap-2"><button className="rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted">Save as decision</button><button className="rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted">Create task</button><button className="rounded-xl border border-border px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted">Mark as scratch</button></div></Panel></div></div>;
}

function AskPage() {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('normal');
  const [notice, setNotice] = useState('');
  const [packet, setPacket] = useState<any>(null);
  const [conversationId, setConversationId] = useState('');
  const [answer, setAnswer] = useState('');
  const [answerContract, setAnswerContract] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const modeLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const prepare = async () => {
    if (!message.trim()) { setNotice('Add a question first.'); return; }
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/ai/context-preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
      const result = await response.json();
      if (!response.ok) setNotice(result.error ?? 'Unable to prepare context.'); else { setPacket(result); setNotice('Context is ready. Nothing has run yet.'); }
    } catch { setNotice('Unable to prepare context right now.'); }
    setBusy(false);
  };

  const ask = async () => {
    if (!packet || !message.trim()) return;
    setBusy(true); setNotice('');
    try {
      let id = conversationId;
      if (!id) {
        const created = await fetch('/api/ai/conversations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode }) }).then((response) => response.json());
        id = created.id;
        setConversationId(id);
      }
      const response = await fetch(`/api/ai/conversations/${id}/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, mode }) });
       const result = await response.json();
       if (result.held) { setAnswer('This model call is held for owner approval before execution.'); setAnswerContract(result.answerContract ?? null); setNotice('This request is waiting for approval.'); } else if (result.packetOnly) { setAnswer('Context-only mode selected. No model was called.'); setAnswerContract(result.answerContract ?? null); } else if (!response.ok) setNotice(result.error ?? 'LEE could not complete this request.'); else { setAnswer(result.answer ?? ''); setAnswerContract(result.answerContract ?? null); }
    } catch { setNotice('Unable to ask LEE right now.'); }
    setBusy(false);
  };

  return <div className="mx-auto max-w-4xl">
    <SectionHeading eyebrow="Private reasoning" title="Ask LEE" detail="Write one question, review the context, then ask the system." />
    <Panel>
       {answer ? <AskAnswerCard answer={answer} contract={answerContract} /> : <p className="text-sm text-muted-foreground">Start with a decision, loose thread, or question that deserves a clearer read.</p>}
       <textarea value={message} onChange={(event) => { setMessage(event.target.value); setPacket(null); setAnswerContract(null); }} placeholder="What should the system help you see?" className="mt-5 min-h-32 w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:border-primary" data-testid="textarea-ask-lee" />
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={mode} onChange={(event) => { setMode(event.target.value); setPacket(null); }} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm sm:w-auto">{['normal', 'deep_think', 'build', 'write', 'review', 'pilot', 'low_cost', 'private', 'no_model', 'governed_action'].map((item) => <option key={item} value={item}>{modeLabel(item)}</option>)}</select>
        <button onClick={() => void prepare()} disabled={busy || !message.trim()} className="rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-semibold text-primary disabled:opacity-50">{busy ? 'Working…' : 'Review context'}</button>
        <button onClick={() => void ask()} disabled={busy || !packet} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Ask LEE</button>
      </div>
      {packet && <div className="mt-4 rounded-xl border border-border bg-muted/35 p-4 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Context ready</span><span className="ml-2">· {packet.packet?.items?.length ?? 0} items · {packet.selectedModel ?? 'model not selected'} · {packet.estimatedCostUsd != null ? `$${Number(packet.estimatedCostUsd).toFixed(4)}` : 'cost pending'}</span></div>}
      {notice && <p className="mt-4 text-sm text-primary" role="status">{notice}</p>}
    </Panel>
  </div>;
}

function AskAnswerCard({ answer, contract }: { answer: string; contract: any }) {
  const compact = contract?.compact;
  const evidence = contract?.evidence ?? [];
  return <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="lee-label text-primary">LEE response</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{compact?.conclusion ?? answer}</p></div>
      {compact && <div className="flex shrink-0 gap-2 text-[10px] font-semibold uppercase tracking-wide"><span className="rounded-full bg-background/70 px-2 py-1">{Math.round((compact.confidence ?? 0) * 100)}% {compact.confidenceLabel}</span><span className="rounded-full bg-background/70 px-2 py-1">{compact.freshness}</span></div>}
    </div>
    {compact && <div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-background/55 p-3"><p className="lee-label text-muted-foreground">Evidence</p><p className="mt-1 text-sm font-semibold">{compact.evidenceCount} grounded items</p></div><div className="rounded-lg bg-background/55 p-3"><p className="lee-label text-muted-foreground">Domains</p><p className="mt-1 text-sm font-semibold">{compact.domains?.join(' · ') || 'Knowledge'}</p></div><div className="rounded-lg bg-background/55 p-3"><p className="lee-label text-muted-foreground">Freshness</p><p className="mt-1 text-sm font-semibold">{contract.freshness?.label}</p></div></div>}
    {contract && <div className="mt-4 space-y-2">
      <details className="rounded-xl border border-border/80 bg-background/40 p-3"><summary className="cursor-pointer text-xs font-semibold">Evidence and provenance <span className="ml-1 text-muted-foreground">({evidence.length})</span></summary><div className="mt-3 space-y-2">{evidence.length ? evidence.map((item: any) => <div key={item.id} className="rounded-lg border border-border/70 bg-card/50 p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">{item.title}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize">{item.epistemicType}</span><span className="text-[10px] text-muted-foreground">{Math.round(item.confidence * 100)}% · {item.freshness}</span></div>{item.excerpt ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.excerpt}</p> : item.rawContentSuppressed ? <p className="mt-2 text-xs text-muted-foreground">Provider content is withheld here. The bounded selection remains server-side.</p> : null}<p className="mt-2 text-[10px] text-muted-foreground">Evidence ID {item.id} · source {item.sourceRef}</p></div>) : <p className="mt-3 text-xs text-muted-foreground">No source-backed items were selected.</p>}</div></details>
      {contract.assumptions?.length > 0 && <details className="rounded-xl border border-border/80 bg-background/40 p-3"><summary className="cursor-pointer text-xs font-semibold">Assumptions ({contract.assumptions.length})</summary><div className="mt-3 space-y-2">{contract.assumptions.map((item: any) => <p key={item.id} className="text-xs leading-relaxed text-muted-foreground">{item.excerpt ?? item.title} · {item.id}</p>)}</div></details>}
      {contract.contradictions?.detected && <details open className="rounded-xl border border-accent/30 bg-accent/5 p-3"><summary className="cursor-pointer text-xs font-semibold text-accent-foreground">Contradictions need attention</summary><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{contract.contradictions.items?.length ? `${contract.contradictions.items.length} open contradiction(s) are linked in the evidence list.` : 'CIL flagged a contradiction in the reasoning result.'}</p></details>}
      {contract.domainCards?.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{contract.domainCards.map((card: any) => <div key={card.domain} className="rounded-lg border border-border/70 bg-background/35 p-3"><p className="lee-label text-primary">{card.title}</p><p className="mt-1 text-xs text-muted-foreground">{card.summary}</p></div>)}</div>}
      <WhyChainPanel chain={contract.whyChain} />
      <details className="rounded-xl border border-border/80 bg-background/40 p-3"><summary className="cursor-pointer text-xs font-semibold">CIL route and provenance</summary><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p>Resolution <span className="font-semibold text-foreground">{contract.cilRoute?.resolutionTier}</span></p><p>Authority <span className="font-semibold text-foreground">{contract.cilRoute?.executionAuthority} selected the route</span></p><p>Provider <span className="font-semibold text-foreground">{contract.cilRoute?.provider}</span></p><p>Model <span className="font-semibold text-foreground">{contract.cilRoute?.model}</span></p><p>Route ID <span className="font-semibold text-foreground">{contract.cilRoute?.routeId ?? 'reuse / not applicable'}</span></p><p>Local rerouting <span className="font-semibold text-foreground">{contract.cilRoute?.localModelSelection ? 'enabled' : 'not used'}</span></p></div>{contract.provenance?.cilProvenance?.length > 0 && <p className="mt-3 border-t border-border/70 pt-3 text-[10px] text-muted-foreground">CIL provenance: {contract.provenance.cilProvenance.join(' · ')}</p>}</details>
    </div>}
  </div>;
}

function ImportsPage() {
  const [imports, setImports] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('manual-note.txt');
  const [mimeType, setMimeType] = useState('text/plain');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    const [sources, queue] = await Promise.all([fetch('/api/imports', { cache: 'no-store' }), fetch('/api/imports/review', { cache: 'no-store' })]);
    if (sources.ok) setImports(await sources.json());
    if (queue.ok) setReviews(await queue.json());
  }, []);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) { setNotice('Add source text or choose a text-readable file first.'); return; }
    const response = await fetch('/api/imports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename, mimeType, content }) });
    const result = await response.json();
    setNotice(result.duplicate ? 'Duplicate source detected by checksum; nothing was imported twice.' : response.ok ? 'Source accepted and processing completed or queued for review.' : result.error ?? 'Import failed.');
    if (response.ok) { setContent(''); await load(); }
  };
  const chooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setFilename(file.name); setMimeType(file.type || 'text/plain');
    if (file.type === 'application/json' || /\.(txt|md|csv|eml|json)$/i.test(file.name)) setContent(await file.text());
    else setNotice('This Phase 1 parser accepts the file, but browser text preview is unavailable for this binary format. Paste extracted text to process it.');
  };
  const resolve = async (id: string, status: string) => { await fetch(`/api/imports/review/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }); await load(); };
  return <div className="mx-auto grid w-full max-w-[1280px] gap-5 xl:grid-cols-[1fr_360px]"><div><SectionHeading eyebrow="Source intake" title="Imports" detail="Drop evidence into Lee. Every source is checksum-protected, parsed, chunked, and held below canon until reviewed." /><Panel><form onSubmit={submit}><div className="flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted"><Upload className="mr-2 inline" size={14} /> Choose file<input type="file" onChange={chooseFile} className="hidden" accept=".json,.pdf,.docx,.md,.txt,.eml,.png,.jpg,.jpeg" /></label><span className="lee-label text-muted-foreground">{filename}</span><select value={mimeType} onChange={(event) => setMimeType(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-xs"><option value="text/plain">Manual note / transcript</option><option value="text/markdown">Markdown</option><option value="application/json">ChatGPT JSON</option><option value="message/rfc822">Email thread</option><option value="application/pdf">PDF text</option><option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX text</option></select></div><textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-4 min-h-48 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:border-primary" placeholder="Paste a transcript, email thread, note, or extracted document text here…" /><div className="mt-3 flex items-center"><p className="text-xs text-muted-foreground">{notice || 'Low-confidence entities and belief changes will enter the review queue.'}</p><button className="ml-auto rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Import and understand</button></div></form></Panel><div className="mt-5"><SectionHeading eyebrow="Pipeline status" title="Recent sources" detail="uploaded → parsing → chunking → extracting → reviewing → complete" />{imports.length ? <div className="space-y-2">{imports.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><FileText size={17} className="text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.originalFilename}</p><p className="mt-1 text-xs text-muted-foreground">{item.mimeType} · {item.runs?.[0]?.factCount ?? 0} facts · {item.runs?.[0]?.interpretationCount ?? 0} interpretations</p></div><StatusPill status={item.processingStatus === 'completed' ? 'verified' : item.processingStatus === 'failed' ? 'offline' : 'evolving'} /><button onClick={() => fetch(`/api/imports/${item.id}/retry`, { method: 'POST' }).then(load)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary" title="Retry"><RefreshCw size={14} /></button></div>)}</div> : <Panel><EmptyState title="No sources imported" detail="Your first note, transcript, or export will establish the intake history." /></Panel>}</div></div><div><Panel><div className="flex items-center justify-between"><div><p className="lee-label text-accent-foreground">Needs review</p><h3 className="mt-2 text-lg font-semibold">{reviews.length} suggestions</h3></div><ShieldAlert className="text-accent" size={20} /></div>{reviews.length ? <div className="mt-5 space-y-3">{reviews.map((item) => <div key={item.id} className="rounded-xl border border-border bg-muted/35 p-3"><div className="flex items-center justify-between"><StatusPill status="needs review" /><span className="text-xs text-muted-foreground">{Math.round(item.confidence * 100)}%</span></div><p className="mt-2 text-sm font-medium">{item.itemType}</p><p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{item.proposedValue?.statement ?? item.proposedValue?.name ?? item.evidenceExcerpt}</p><div className="mt-3 flex gap-2"><button onClick={() => resolve(item.id, 'approved')} className="flex-1 rounded-lg bg-primary/15 py-2 text-xs font-semibold text-primary">Approve</button><button onClick={() => resolve(item.id, 'rejected')} className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold">Reject</button></div></div>)}</div> : <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Nothing is waiting for owner review. Canon and Locked beliefs are never auto-promoted.</p>}</Panel></div></div>;
}

function TimeSignals() {
  const [overview, setOverview] = useState<any>(null);
  const [notice, setNotice] = useState('');
  const load = useCallback(() => { void fetch('/api/time/overview', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(setOverview).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [load]);
  if (!overview) return <Panel><SkeletonRows /></Panel>;
  const stale = overview.objects?.filter((item: any) => ['stale', 'critical'].includes(item.temporal?.freshnessState)).length ?? 0;
  const red = overview.waitingLoops?.filter((item: any) => item.risk === 'red').length ?? 0;
  const generate = async () => { const response = await fetch('/api/briefs/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'today' }) }); setNotice(response.ok ? 'Today’s brief saved to history.' : 'Brief generation failed.'); load(); };
  return <Panel className="lee-enter lee-enter-delay-1"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="lee-label text-primary">Time engine</p><h3 className="mt-2 text-lg font-semibold">Context pulse</h3></div><button onClick={generate} className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">Generate today’s brief</button></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Aging context</p><p className="mt-2 text-xl font-semibold">{stale}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Waiting loops</p><p className="mt-2 text-xl font-semibold">{overview.waitingLoops?.length ?? 0}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Escalated</p><p className="mt-2 text-xl font-semibold text-accent-foreground">{red}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="lee-label text-muted-foreground">Unread</p><p className="mt-2 text-xl font-semibold">{overview.notifications?.length ?? 0}</p></div></div>{notice && <p className="mt-3 text-xs text-primary">{notice}</p>}</Panel>;
}

function Router({ onAsk, onLock }: { onAsk: () => void; onLock: () => void }) {
  const [location] = useLocation();
  if (location === "/settings/internal-services") return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><InternalServicesPage /></AppShell></ErrorBoundary>;
  if (location === "/connections") return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><ConnectionCenterPage /></AppShell></ErrorBoundary>;
  return <ErrorBoundary resetKey={location}><AppShell onAsk={onAsk} onLock={onLock}><Switch><Route path="/" component={() => <TodayCommandCenter />} /><Route path="/welcome-back" component={WelcomeBackBriefing} /><Route path="/ask" component={AskPage} /><Route path="/systems" component={SystemsPage} /><Route path="/bootstrap-awareness" component={BootstrapAwarenessPage} /><Route path="/initiative" component={InitiativePage} /><Route path="/operational-intelligence/history" component={OperationalHistoryPage} /><Route path="/settings/bootstrap" component={BootstrapPage} /><Route path="/projects" component={ProjectsPage} /><Route path="/people" component={() => <LiveCollectionPage eyebrow="Relationship layer" title="People" detail="People and relationship health from the live Lee API." endpoint="/api/people" emptyTitle="No people recorded" emptyDetail="Relationship records will appear here after the first connector sync or manual capture." icon={Users} />} /><Route path="/decisions" component={() => <LiveCollectionPage eyebrow="Decision ledger" title="Decisions" detail="Decisions are shown with their evidence and current canon state." endpoint="/api/objects?type=decision" emptyTitle="No decisions recorded" emptyDetail="Use Ask Lee or an import to record the first decision." icon={Scale} />} /><Route path="/waiting" component={() => <LiveCollectionPage eyebrow="Open loops" title="Waiting" detail="Loops that need a person, system, or future event before they can move." endpoint="/api/waiting-loops" emptyTitle="No waiting loops" emptyDetail="A quiet waiting list is a useful signal. New loops will appear here." icon={Clock3} />} /><Route path="/evidence" component={() => <LiveCollectionPage eyebrow="Reality ledger" title="Evidence" detail="Sources, provenance, and processing state remain visible before beliefs are trusted." endpoint="/api/sources" emptyTitle="No sources in the vault" emptyDetail="Import a file or capture a source to make evidence browsable." icon={FileText} />} /><Route path="/imports" component={() => <LiveCollectionPage eyebrow="Source intake" title="Imports" detail="Upload and processing flows connect here as the Understanding Pipeline expands." endpoint="/api/understanding/runs" emptyTitle="No imports yet" emptyDetail="Drop a document, transcript, or note into the intake flow when you are ready." icon={Upload} />} /><Route path="/connectors" component={ConnectorsPage} /><Route path="/costs" component={SystemEconomicsPage} /><Route path="/governance" component={() => <LiveCollectionPage eyebrow="Execution boundary" title="Governance" detail="Consequential actions require an explicit verdict before release." endpoint="/api/governance/requests" emptyTitle="No pending approvals" emptyDetail="Held and reviewable governed actions will appear here." icon={ShieldAlert} />} /><Route path="/backups" component={() => <LiveCollectionPage eyebrow="Continuity" title="Backups" detail="Verified brain versions protect the accumulated operating state." endpoint="/api/brain-versions" emptyTitle="No brain backups yet" emptyDetail="Create a Brain Version when you are ready to checkpoint the operating state." icon={Archive} />} /><Route path="/objectives" component={LiveObjectivesPage} /><Route path="/organization" component={OrganizationPage} /><Route path="/strategy/decision-patterns" component={DecisionPatternsPage} /><Route path="/knowledge" component={KnowledgePage} /><Route path="/institutional" component={() => <div className="mx-auto max-w-[1280px]"><SectionHeading eyebrow="Knowledge layer" title="Institutional Knowledge" detail="Operational patterns reality has reinforced across independent experiences." /><InstitutionalKnowledgePanel /></div>} /><Route path="/events" component={EventsPage} /><Route path="/reviews" component={ReviewsPage} /><Route path="/settings/manifest" component={ManifestPage} /><Route path="/settings/world-state" component={WorldStatePage} /><Route path="/settings/operational-memory" component={OperationalMemoryPage} /><Route path="/settings/self-test" component={SelfTestPage} /><Route path="/settings/self-improvement" component={SelfImprovementPage} /><Route path="/settings/system-economics" component={SystemEconomicsPage} /><Route path="/settings/identity" component={IdentityPage} /><Route path="/health" component={HealthPage} /><Route path="/settings" component={() => <SettingsPage onLock={onLock} />} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

function App() {
  const [locked, setLocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [enrollmentRequired, setEnrollmentRequired] = useState(false);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  useEffect(() => { document.documentElement.classList.add('dark'); return () => document.documentElement.classList.remove('dark'); }, []);
  useEffect(() => { void fetch('/api/auth/session', { cache: 'no-store' }).then(async (response) => { const result = await response.json(); if (response.status >= 500) throw new Error('The local runtime did not respond.'); return result; }).then((result) => { setAuthenticated(Boolean(result.authenticated)); setEnrollmentRequired(Boolean(result.enrollmentRequired)); setAuthChecked(true); }).catch(() => { setAuthUnavailable(true); setAuthChecked(true); }); }, []);
  const navigateToAsk = () => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    window.history.pushState({}, '', `${basePath}/ask`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><DesktopSetupPanel />{!authChecked ? <div className="grid min-h-[100dvh] place-items-center bg-sidebar text-sidebar-foreground"><RefreshCw className="animate-spin text-sidebar-primary" /></div> : authUnavailable ? <RuntimeUnavailableScreen /> : !authenticated ? <LoginScreen enrollmentRequired={enrollmentRequired} onAuthenticated={() => { setEnrollmentRequired(false); setAuthenticated(true); }} /> : locked ? <LockedScreen onUnlock={() => setLocked(false)} /> : <Router onAsk={navigateToAsk} onLock={() => setLocked(true)} />}</WouterRouter></TooltipProvider><Toaster /></QueryClientProvider>;
}

export default App;
