import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Smartphone } from 'lucide-react';
import type { AndroidPairingInviteCreated, AndroidPairingInviteInput } from '@workspace/api-client-react';

type RecoveryStatus = { mode?: string };
type InvitationResponse = Partial<AndroidPairingInviteCreated> & {
  error?: string;
  recoveryMode?: string;
};

const protectedModes = new Set(['READ_ONLY', 'RECOVERY_MODE', 'MIGRATION_MODE', 'SAFE_MODE']);

export default function AndroidConnectionCard() {
  const [mode, setMode] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [creating, setCreating] = useState(false);
  const [invitation, setInvitation] = useState<AndroidPairingInviteCreated | null>(null);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');

  const refreshRecoveryStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/recovery/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Recovery status is unavailable.');
      const result = await response.json() as RecoveryStatus;
      if (typeof result.mode !== 'string') throw new Error('Recovery status is incomplete.');
      setMode(result.mode);
      setStatusError('');
    } catch {
      setMode(null);
      setStatusError('LEE readiness could not be verified. Refresh this page before connecting.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshRecoveryStatus();
    const interval = window.setInterval(() => void refreshRecoveryStatus(), 10_000);
    return () => window.clearInterval(interval);
  }, [refreshRecoveryStatus]);

  const recoveryBlocked = mode === null || protectedModes.has(mode);

  const createInvitation = async () => {
    setCreating(true);
    setError('');
    setInvitation(null);
    try {
      const request: AndroidPairingInviteInput = {
        clientType: 'owner',
        label: 'Project LEE Owner Android',
      };
      const response = await fetch('/api/android/pairing-invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      });
      const result = await response.json().catch(() => ({})) as InvitationResponse;
      if (response.status === 423 && typeof result.recoveryMode === 'string') {
        setMode(result.recoveryMode);
      }
      if (!response.ok) throw new Error(result.error ?? 'Could not create the Android connection link.');
      if (typeof result.deepLink !== 'string' || typeof result.expiresAt !== 'string') {
        throw new Error('LEE returned an incomplete connection link.');
      }
      setInvitation({ deepLink: result.deepLink, expiresAt: result.expiresAt });
      await refreshRecoveryStatus();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not create the Android connection link.');
    } finally {
      setCreating(false);
    }
  };

  const recoveryMessage = mode === 'RECOVERY_MODE'
    ? 'LEE is in Recovery Mode. Verify the canonical Brain before connecting Android.'
    : mode
      ? `LEE is in ${mode.replaceAll('_', ' ')}. Writes are paused until the Brain is ready.`
      : statusError || 'Checking that the canonical Brain is ready…';

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm" aria-labelledby="android-connect-title">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone size={21} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="lee-label text-primary">Android companion</p>
          <h3 id="android-connect-title" className="mt-1 text-lg font-semibold">Connect to this Brain</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Create a short-lived link, then open it on the Android phone with LEE installed. No code to copy or enter.
          </p>
        </div>
      </div>

      {recoveryBlocked && (
        <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-3 text-sm text-foreground" role="status" data-testid="android-recovery-blocked">
          {recoveryMessage}
        </p>
      )}
      {!recoveryBlocked && !checking && mode && (
        <p className="mt-4 text-xs text-muted-foreground" data-testid="android-brain-ready">
          Pairing available · {mode.replaceAll('_', ' ')}
        </p>
      )}

      <button
        type="button"
        onClick={() => void createInvitation()}
        disabled={checking || creating || recoveryBlocked}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="button-create-owner-android-invitation"
      >
        {checking ? 'Checking Brain…' : creating ? 'Preparing connection…' : 'Connect Android'}
        {!checking && !creating && <ArrowUpRight size={14} />}
      </button>

      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}

      {invitation && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="owner-android-invitation">
          <p className="text-sm font-semibold">Ready to connect</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This link works once and expires {new Date(invitation.expiresAt).toLocaleTimeString()}.
          </p>
          <a
            href={invitation.deepLink}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
            data-testid="link-open-owner-android-invitation"
          >
            Open LEE Android <ArrowUpRight size={14} />
          </a>
        </div>
      )}
    </section>
  );
}