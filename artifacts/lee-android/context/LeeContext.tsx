import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createClientManifest, getClientHeaders } from '@workspace/mobile-foundation';
import {
  clearPairing,
  clearLegacyPlaintextState,
  getAlertsCache,
  getApprovalsCache,
  getBriefCache,
  getCaptures,
  getConnectionsCache,
  getConfidenceCache,
  getContractCache,
  getHealthCache,
  getPairing,
  getProjectOperationsCache,
  getSelfAwarenessCache,
  getReadinessCache,
  getRuntimeCache,
  getUncertainty,
  getUncertaintyCache,
  getWaitingSnapshot,
  markCachedValueStale,
  saveAlertsCache,
  saveApprovalsCache,
  saveBriefCache,
  saveCaptures,
  saveConnectionsCache,
  saveConfidenceCache,
  saveContractCache,
  saveHealthCache,
  savePairing,
  saveProjectOperationsCache,
  saveSelfAwarenessCache,
  saveReadinessCache,
  saveRuntimeCache,
  saveUncertaintyCache,
  saveWaitingSnapshot,
  type Pairing,
} from '@/lib/storage';
import { createLeeApi, type CognitiveRuntimeSnapshot, type ConnectionSummary, type HealthResponse, type ObservationSession, type OperationalConfidence, type ProjectOperationsProject, type ReadinessResponse, type SelfAwarenessSnapshot } from '@/lib/api';
import { normalizeAndroidSystemShare, type AndroidSystemSharePayload } from '@/lib/system-share';
import { stopScreenObservation } from '@/lib/native-watch';
import type { Alert, Approval, Brief, CachedValue, Capture, Freshness, PerceptionCapture, UncertaintyRecord, WaitingLoop } from '@/lib/types';
import type { SystemContract } from '@workspace/api-zod';
import type { FreshNotificationTarget } from '@/lib/notification-links';

type HostedState = {
  freshness: Freshness;
  connectivity: 'offline' | 'connecting' | 'online' | 'stale' | 'reauthorization-required' | 'revoked' | 'incompatible';
  detail: string;
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
};

type LeeContextValue = {
  pairing: Pairing | null;
  captures: Capture[];
  uncertainty: CachedValue<UncertaintyRecord[]> | null;
  brief: CachedValue<Brief> | null;
  waiting: CachedValue<WaitingLoop[]> | null;
  alerts: CachedValue<Alert[]> | null;
  approvals: CachedValue<Approval[]> | null;
  connections: CachedValue<ConnectionSummary[]> | null;
  runtime: CachedValue<CognitiveRuntimeSnapshot> | null;
  contract: CachedValue<SystemContract> | null;
  health: CachedValue<HealthResponse> | null;
  readiness: CachedValue<ReadinessResponse> | null;
  confidence: CachedValue<OperationalConfidence> | null;
  projectOperations: CachedValue<ProjectOperationsProject[]> | null;
  selfAwareness: CachedValue<SelfAwarenessSnapshot> | null;
  authorizedNotificationTarget: FreshNotificationTarget | null;
  hosted: HostedState;
  observationSession: ObservationSession | null;
  isLoading: boolean;
  pair: (apiUrl: string, token: string) => Promise<boolean>;
  pairInvite: (invite: string) => Promise<boolean>;
  pairingError: string | null;
  isClaimingInvite: boolean;
  unpair: () => void;
  addCapture: (text: string, tag: string) => Promise<void>;
  capturePerception: (capture: Omit<PerceptionCapture, 'captureId'> & { captureId?: string }) => Promise<void>;
  captureSystemShare: (payload: AndroidSystemSharePayload) => Promise<boolean>;
  syncCapture: (capture: Capture) => Promise<void>;
  retryCapture: (capture: Capture) => Promise<void>;
  api: ReturnType<typeof createLeeApi> | null;
  refresh: () => Promise<void>;
  clearFreshNotificationTarget: () => void;
  cacheFreshNotificationTarget: (target: FreshNotificationTarget) => Promise<void>;
  waitingAction: (id: string, action: 'resolve' | 'snooze') => Promise<void>;
  alertAction: (id: string, action: 'dismiss' | 'snooze') => Promise<void>;
  decideApproval: (id: string, decision: 'approve' | 'hold' | 'reject') => Promise<Approval>;
  askWhy: (id: string) => Promise<string>;
  setObservationSession: (session: ObservationSession | null) => void;
  endObservationSession: (reason?: string) => Promise<void>;
};

const LeeContext = createContext<LeeContextValue | null>(null);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function staleSnapshot<T>(snapshot: CachedValue<T> | null, error: string) {
  return snapshot ? markCachedValueStale(snapshot, error) : Promise.resolve(null);
}

export function LeeProvider({ children }: { children: React.ReactNode }) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [uncertainty, setUncertainty] = useState<CachedValue<UncertaintyRecord[]> | null>(null);
  const [brief, setBrief] = useState<CachedValue<Brief> | null>(null);
  const [waiting, setWaiting] = useState<CachedValue<WaitingLoop[]> | null>(null);
  const [alerts, setAlerts] = useState<CachedValue<Alert[]> | null>(null);
  const [approvals, setApprovals] = useState<CachedValue<Approval[]> | null>(null);
  const [connections, setConnections] = useState<CachedValue<ConnectionSummary[]> | null>(null);
  const [runtime, setRuntime] = useState<CachedValue<CognitiveRuntimeSnapshot> | null>(null);
  const [contract, setContract] = useState<CachedValue<SystemContract> | null>(null);
  const [health, setHealth] = useState<CachedValue<HealthResponse> | null>(null);
  const [readiness, setReadiness] = useState<CachedValue<ReadinessResponse> | null>(null);
  const [confidence, setConfidence] = useState<CachedValue<OperationalConfidence> | null>(null);
  const [projectOperations, setProjectOperations] = useState<CachedValue<ProjectOperationsProject[]> | null>(null);
  const [selfAwareness, setSelfAwareness] = useState<CachedValue<SelfAwarenessSnapshot> | null>(null);
  const [authorizedNotificationTarget, setAuthorizedNotificationTarget] = useState<FreshNotificationTarget | null>(null);
  const [hosted, setHosted] = useState<HostedState>({ freshness: 'unverified', connectivity: 'offline', detail: 'No hosted Core has been verified yet.', lastVerifiedAt: null, lastSyncAt: null });
  const [observationSession, setObservationSession] = useState<ObservationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isClaimingInvite, setIsClaimingInvite] = useState(false);

  useEffect(() => {
    void Promise.all([
      clearLegacyPlaintextState(),
      getPairing(),
      getCaptures(),
      getUncertainty(),
      getUncertaintyCache(),
      getBriefCache(),
      getWaitingSnapshot(),
      getAlertsCache(),
      getApprovalsCache(),
      getConnectionsCache<ConnectionSummary[]>(),
      getRuntimeCache<CognitiveRuntimeSnapshot>(),
      getContractCache(),
      getHealthCache<HealthResponse>(),
      getReadinessCache<ReadinessResponse>(),
      getConfidenceCache<OperationalConfidence>(),
      getProjectOperationsCache(),
      getSelfAwarenessCache(),
    ]).then(([_legacyCleared, storedPairing, storedCaptures, legacyUncertainty, storedUncertainty, storedBrief, storedWaiting, storedAlerts, storedApprovals, storedConnections, storedRuntime, storedContract, storedHealth, storedReadiness, storedConfidence, storedProjectOperations, storedSelfAwareness]) => {
      setPairing(storedPairing);
      setCaptures(storedCaptures);
      if (storedUncertainty) {
        setUncertainty(storedUncertainty);
      } else {
        setUncertainty(legacyUncertainty.length ? { value: legacyUncertainty, cachedAt: new Date(0).toISOString(), observedAt: null, freshness: 'stale', source: 'local' } : null);
      }
      setBrief(storedBrief);
      setWaiting(storedWaiting);
      setAlerts(storedAlerts);
      setApprovals(storedApprovals);
      setConnections(storedConnections);
      setRuntime(storedRuntime);
      setContract(storedContract);
      setHealth(storedHealth);
      setReadiness(storedReadiness);
      setConfidence(storedConfidence);
      setProjectOperations(storedProjectOperations);
      setSelfAwareness(storedSelfAwareness);
      const lastVerifiedAt = storedHealth?.value.lastVerifiedAt ?? null;
       setHosted({
        freshness: storedHealth ? 'stale' : 'unverified',
         connectivity: storedHealth ? 'stale' : 'offline',
        detail: storedHealth ? 'Showing the last hosted snapshot until the Core is verified again.' : 'No hosted Core has been verified yet.',
        lastVerifiedAt,
        lastSyncAt: storedHealth?.cachedAt ?? null,
      });
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

   useEffect(() => {
    if (!pairing || isLoading) return;
    const activePairing = pairing;
    let active = true;
     async function retryQueued() {
       const localQueued = captures.filter((capture) => capture.status !== 'synced' && capture.status !== 'rejected' && capture.status !== 'conflict');
       const stored = await getCaptures();
       const queued = stored.filter((capture) => capture.status !== 'synced');
       const retryItems = queued.filter((capture) => capture.status !== 'rejected' && capture.status !== 'conflict');
       for (const capture of (retryItems.length ? retryItems : localQueued)) {
         if (!active) return;
         if (capture.nextRetryAt && new Date(capture.nextRetryAt).getTime() > Date.now()) continue;
         try { await syncCapture(capture); } catch { break; }
       }
    }
    void retryQueued();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void retryQueued(); });
    return () => { active = false; subscription.remove(); };
  }, [pairing, isLoading]);

   useEffect(() => {
     if (!pairing || isLoading) return;
     // A process restart must never silently resume a projection. Close any
     // server-side session left by the previous foreground process.
     const client = createLeeApi(pairing);
     void client.observationSessions().then((sessions) => {
       const active = sessions.filter((session) => session.status === 'REQUESTED' || session.status === 'ACTIVE');
       return Promise.all(active.map((session) => client.endObservationSession(session.sessionId, 'app_restart')));
     }).catch(() => undefined);
   }, [pairing, isLoading]);

   const syncCapture = async (capture: Capture) => {
     const MAX_ATTEMPTS = 5;
     if (!pairing) throw new Error('Pair with hosted Core before syncing captures.');
     if ((capture.attempts ?? 0) >= MAX_ATTEMPTS) throw new Error('Capture retry limit reached; reconnect and review this capture.');
     const client = createLeeApi(pairing);
     const mark = async (nextCapture: Capture) => {
       const stored = await getCaptures();
       const next = stored.map((item) => item.id === capture.id ? nextCapture : item);
       setCaptures(next);
       await saveCaptures(next);
     };
     const attempts = capture.attempts ?? 0;
     await mark({ ...capture, status: 'syncing', lastAttemptAt: new Date().toISOString() });
     setHosted((current) => ({ ...current, connectivity: 'connecting', detail: 'Revalidating this device before syncing the capture.' }));
    try {
       const health = await client.health();
       const identity = health.identity;
        const requiredCapability = capture.perception?.captureType === 'screen_observation'
          ? 'perception.screen_observation'
          : capture.perception?.captureType === 'image'
         ? 'perception.camera'
         : capture.perception?.captureType === 'audio'
           ? 'perception.microphone'
           : capture.perception && capture.perception.captureType !== 'text'
             ? 'perception.share'
             : 'capture.text';
       if (!identity || identity.compatibility.state !== 'compatible' || identity.clientType !== 'owner' || !identity.privacyScopes.includes(capture.perception?.authorizedScope ?? 'owner-private') || !identity.capabilities.granted.includes(requiredCapability)) {
         const error = new Error('The server no longer authorizes this device, capability, or privacy scope.');
         (error as Error & { status?: number }).status = identity?.compatibility.state === 'update-required' ? 426 : 403;
         throw error;
       }
       setHosted((current) => ({ ...current, freshness: 'live', connectivity: 'online', detail: 'Hosted Core verified. Live records and governed actions are available.', lastVerifiedAt: health.lastVerifiedAt }));
       const response = capture.perception
         ? await client.perceptionCapture(capture.perception)
         : await client.capture({ captureId: capture.id, text: capture.text, tag: capture.tag, clientCapturedAt: capture.createdAt, fingerprint: capture.fingerprint });
       const acknowledgement = {
         status: response.duplicate ? 'duplicate' as const : 'accepted' as const,
         serverId: response.sourceId,
          perceptionId: response.perceptionId ?? null,
         serverRevision: response.serverRevision ?? response.sourceId,
         receivedAt: new Date().toISOString(),
       };
       await mark({ ...capture, status: 'synced', attempts: attempts + 1, lastError: undefined, nextRetryAt: undefined, acknowledgement });
     } catch (error) {
       const status = (error as Error & { status?: number }).status;
       const nextStatus = status === 409 ? 'conflict' : status === 401 || status === 403 || status === 426 ? 'rejected' : attempts + 1 >= MAX_ATTEMPTS ? 'rejected' : 'failed';
       const detail = errorMessage(error, 'Capture sync failed.');
       await mark({
         ...capture,
         status: nextStatus,
         attempts: attempts + 1,
         lastAttemptAt: new Date().toISOString(),
         nextRetryAt: nextStatus === 'failed' ? new Date(Date.now() + Math.min(15 * 60_000, 2 ** Math.min(attempts, 5) * 1000)).toISOString() : undefined,
         lastError: detail,
         ...(nextStatus === 'conflict' ? { conflict: { reason: detail, detectedAt: new Date().toISOString() } } : {}),
       });
       setHosted((current) => ({
         ...current,
         freshness: status === 401 || status === 403 ? 'unavailable' : current.freshness,
         connectivity: status === 403 && /revoked|expired/i.test(detail) ? 'revoked' : status === 401 || status === 403 ? 'reauthorization-required' : status === 426 ? 'incompatible' : current.connectivity === 'online' ? 'stale' : current.connectivity,
         detail: status === 403 && /revoked|expired/i.test(detail) ? 'This device pairing is revoked or expired. Re-pair before syncing queued captures.' : status === 401 || status === 403 ? 'Server authorization changed. Reconnect this device before syncing queued captures.' : detail,
       }));
       throw error;
    }
  };

  const refreshHosted = async (uncertaintyRequest?: Promise<UncertaintyRecord[]>) => {
    if (!pairing) {
       setHosted({ freshness: 'unverified', connectivity: 'offline', detail: 'Pair with the hosted Core to refresh live records.', lastVerifiedAt: null, lastSyncAt: null });
      return;
    }
    const client = createLeeApi(pairing);
    const observedAt = new Date().toISOString();
    let successes = 0;
    let liveHealth: HealthResponse | null = null;
    let liveReadiness: ReadinessResponse | null = null;
    const load = async <T,>(fetcher: () => Promise<T>, set: React.Dispatch<React.SetStateAction<CachedValue<T> | null>>, save: (value: T, metadata?: { freshness?: Freshness; observedAt?: string | null; lastError?: string }) => Promise<CachedValue<T>>, current: CachedValue<T> | null) => {
      try {
        const result = await fetcher();
        const cached = await save(result, { freshness: 'live', observedAt });
        set(cached);
        successes += 1;
        return result;
      } catch (error) {
        // Cached uncertainty remains available offline.
        set(await staleSnapshot(current, errorMessage(error, 'Hosted read unavailable.')));
        return null;
      }
    };
    const results = await Promise.all([
      load(client.brief, setBrief, saveBriefCache, brief),
      load(() => uncertaintyRequest ?? createLeeApi(pairing).uncertainty(), setUncertainty, saveUncertaintyCache, uncertainty),
      load(client.waiting, setWaiting, saveWaitingSnapshot, waiting),
      load(client.alerts, setAlerts, saveAlertsCache, alerts),
      load(client.approvals, setApprovals, saveApprovalsCache, approvals),
      load(client.connections, setConnections, saveConnectionsCache, connections),
      load(client.runtime, setRuntime, saveRuntimeCache, runtime),
      load(client.contract, setContract, saveContractCache, contract),
      load(client.health, setHealth, saveHealthCache, health),
      load(client.readiness, setReadiness, saveReadinessCache, readiness),
      load(client.operationalConfidence, setConfidence, saveConfidenceCache, confidence),
      load(client.projectOperations, setProjectOperations, saveProjectOperationsCache, projectOperations),
      load(client.selfAwareness, setSelfAwareness, saveSelfAwarenessCache, selfAwareness),
    ]);
    liveHealth = results[8] as HealthResponse | null;
    liveReadiness = results[9] as ReadinessResponse | null;
    const compatibility = liveHealth?.identity?.compatibility.state;
    const freshness: Freshness = liveHealth && liveReadiness?.ready !== false && (compatibility === undefined || compatibility === 'compatible') ? 'live' : successes ? 'stale' : 'unavailable';
    const detail = freshness === 'live'
      ? 'Hosted Core verified. Live records and governed actions are available.'
       : compatibility === 'update-required'
         ? 'This mobile client must update before hosted actions are available.'
       : compatibility === 'unsupported'
         ? 'This mobile client is not supported by the hosted Core.'
      : freshness === 'stale'
        ? 'Some hosted reads failed. Cached records remain visible, but live-dependent actions stay blocked.'
        : 'Hosted Core is unavailable. Cached records remain visible and live-dependent actions are blocked.';
     setHosted({
      freshness,
       connectivity: freshness === 'live'
         ? 'online'
         : compatibility === 'update-required' || compatibility === 'unsupported'
           ? 'incompatible'
           : pairing ? 'stale' : 'offline',
      detail,
      lastVerifiedAt: liveHealth?.lastVerifiedAt ?? health?.value.lastVerifiedAt ?? null,
      lastSyncAt: observedAt,
    });
  };

  useEffect(() => {
    if (pairing && !isLoading) void refreshHosted();
  }, [pairing, isLoading]);

   const enqueuePerception = async (input: Omit<PerceptionCapture, 'captureId'> & { captureId?: string }) => {
    const headers = await getClientHeaders(createClientManifest('owner', '1.0.0'));
    const perception: PerceptionCapture = {
      ...input,
       captureId: input.captureId ?? `owner-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
       authorizedScope: input.authorizedScope,
      brainLinks: input.brainLinks ?? [],
    };
    const capture: Capture = {
      id: perception.captureId,
      text: perception.text ?? `${perception.captureType} evidence · ${perception.filename ?? 'captured media'}`,
      tag: perception.purpose,
      status: 'queued',
      createdAt: perception.capturedAt,
      clientType: 'owner',
      personId: 'owner',
      deviceId: headers['X-LEE-Device-Id'],
       privacyScope: perception.authorizedScope,
      fingerprint: `${perception.captureId}:${perception.text?.length ?? perception.byteSize ?? 0}`,
      perception,
    };
    const next = [capture, ...captures].slice(0, 30);
    setCaptures(next);
    await saveCaptures(next);
    if (pairing && hosted.freshness === 'live') {
      try {
        await syncCapture(capture);
      } catch {
        // syncCapture persists failed, rejected, and conflict states.
      }
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const value = useMemo<LeeContextValue>(() => ({
    pairing,
    captures,
    uncertainty,
    brief,
    waiting,
    alerts,
    approvals,
    connections,
    runtime,
    contract,
    health,
    readiness,
    confidence,
    projectOperations,
    selfAwareness,
    authorizedNotificationTarget,
    hosted,
    observationSession,
    isLoading,
    pairingError,
    isClaimingInvite,
    async pair(apiUrl, token) {
      const normalizedUrl = apiUrl.trim().replace(/\/$/, '');
      if (!/^https?:\/\//i.test(normalizedUrl) || token.trim().length < 8) return false;
      const next = { apiUrl: normalizedUrl, token: token.trim(), pairedAt: new Date().toISOString() };
      try {
        const client = createLeeApi(next);
        await client.liveness();
        const health = await client.health();
        if (health.identity?.compatibility.state && health.identity.compatibility.state !== 'compatible') return false;
      } catch { return false; }
      await savePairing(next);
      setAuthorizedNotificationTarget(null);
      setPairing(next);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    },
    async pairInvite(invite) {
      setIsClaimingInvite(true);
      setPairingError(null);
      try {
        const configuredDomain = String(process.env.EXPO_PUBLIC_DOMAIN ?? '').trim().replace(/\/$/, '');
        const apiUrl = /^https?:\/\//i.test(configuredDomain) ? configuredDomain : `https://${configuredDomain}`;
        if (!configuredDomain) throw new Error('This build has no hosted LEE destination configured.');
        const headers = await getClientHeaders(createClientManifest('owner', '1.0.0'));
        const response = await fetch(`${apiUrl}/api/android/pairing-invites/claim`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: JSON.stringify({ invite, clientType: 'owner', deviceId: headers['X-LEE-Device-Id'] }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.token !== 'string') throw new Error(result.error ?? 'This invitation could not be accepted.');
        const next = { apiUrl, token: result.token, pairedAt: new Date().toISOString() };
        const client = createLeeApi(next);
        await client.liveness();
        const health = await client.health();
        if (health.identity?.compatibility.state && health.identity.compatibility.state !== 'compatible') throw new Error(health.identity.compatibility.reason ?? 'This device is not compatible with hosted LEE.');
        await savePairing(next);
        setAuthorizedNotificationTarget(null);
        setPairing(next);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      } catch (error) {
        setPairingError(error instanceof Error ? error.message : 'This invitation could not be accepted.');
        return false;
      } finally {
        setIsClaimingInvite(false);
      }
    },
    unpair() {
      void clearPairing();
      setAuthorizedNotificationTarget(null);
      setPairing(null);
      setHosted({ freshness: 'unverified', connectivity: 'offline', detail: 'Unpaired. Cached records remain local and are not treated as live.', lastVerifiedAt: null, lastSyncAt: null });
    },
    async addCapture(text, tag) {
      await enqueuePerception({
        captureType: 'text',
        purpose: tag || 'manual_note',
        text: text.trim(),
        capturedAt: new Date().toISOString(),
        authorizedScope: 'owner-private',
        brainLinks: [],
      });
    },
    capturePerception: enqueuePerception,
     async captureSystemShare(payload) {
       const normalized = normalizeAndroidSystemShare(payload);
       if (!normalized) return false;
       await enqueuePerception(normalized);
       return true;
     },
    syncCapture,
    retryCapture: syncCapture,
    api: pairing ? createLeeApi(pairing) : null,
    async refresh() {
      let uncertaintyRequest: Promise<UncertaintyRecord[]> | undefined;
      try {
        uncertaintyRequest = pairing ? createLeeApi(pairing).uncertainty() : undefined;
      } catch {
        // Promise.all isolates each hosted read. Cached uncertainty remains available offline.
      }
      try {
        return await refreshHosted(uncertaintyRequest);
      } catch {
        // A persistence failure must not turn a cached hosted projection into a live claim.
        return undefined;
      }
    },
    clearFreshNotificationTarget() {
      setAuthorizedNotificationTarget(null);
    },
    async cacheFreshNotificationTarget(target) {
      const observedAt = new Date().toISOString();
      if (target.destination === 'alerts') {
        setAlerts(await saveAlertsCache(target.records, { freshness: 'live', observedAt }));
      } else if (target.destination === 'approvals') {
        setApprovals(await saveApprovalsCache(target.records, { freshness: 'live', observedAt }));
      } else {
        setWaiting(await saveWaitingSnapshot(target.records, { freshness: 'live', observedAt }));
      }
      setAuthorizedNotificationTarget(target);
    },
    async waitingAction(id, action) {
      if (!pairing || hosted.freshness !== 'live') throw new Error('A live hosted Core connection is required for waiting-loop actions.');
      await createLeeApi(pairing).waitingAction(id, action);
      await refreshHosted();
    },
    async alertAction(id, action) {
      if (!pairing || hosted.freshness !== 'live') throw new Error('A live hosted Core connection is required for alert actions.');
      await createLeeApi(pairing).alertAction(id, action);
      await refreshHosted();
    },
    async decideApproval(id, decision) {
      if (!pairing || hosted.freshness !== 'live') throw new Error('A live hosted Core connection is required for approval decisions.');
      const updated = await createLeeApi(pairing).approve(id, decision);
      await refreshHosted();
      return updated;
    },
    async askWhy(id) {
      if (!pairing || hosted.freshness !== 'live') throw new Error('A live hosted Core connection is required for explanations.');
      return (await createLeeApi(pairing).askWhy(id)).explanation;
    },
    setObservationSession,
    async endObservationSession(reason = 'owner_stopped') {
      const current = observationSession;
      setObservationSession(null);
      await stopScreenObservation();
      if (current && pairing) {
        try { await createLeeApi(pairing).endObservationSession(current.sessionId, reason); } catch { /* hard expiry remains the server fallback */ }
      }
    },
  }), [pairing, captures, uncertainty, brief, waiting, alerts, approvals, connections, runtime, contract, health, readiness, confidence, projectOperations, selfAwareness, authorizedNotificationTarget, hosted, observationSession, isLoading, pairingError, isClaimingInvite, syncCapture, refreshHosted, enqueuePerception]);

  return <LeeContext.Provider value={value}>{children}</LeeContext.Provider>;
}

export function useLee() {
  const context = useContext(LeeContext);
  if (!context) throw new Error('useLee must be used inside LeeProvider');
  return context;
}