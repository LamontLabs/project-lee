import { fetch as expoFetch } from 'expo/fetch';
import type { Alert, Approval, Brief, UncertaintyRecord, WaitingLoop } from './types';
import type { SystemContract } from '@workspace/api-zod';
import { createClientManifest, getClientHeaders, type ClientManifest, type MobileIdentity, type PerceptionCapture } from '@workspace/mobile-foundation';

export type Pairing = { apiUrl: string; token: string; pairedAt: string };
export type AskStart = { model: string; contextItems: number; evidence: Array<{ id: string; kind: string; confidence: number }> };
export type AskComplete = AskStart & { answer: string; estimatedCostUsd: number };
export type AskStreamEvent =
  | { type: 'start'; data: AskStart }
  | { type: 'chunk'; data: { text: string } }
  | { type: 'complete'; data: AskComplete }
  | { type: 'error'; data: { error: string } };
export type ConnectionSummary = {
  id: string; displayName: string; targetType: string; method: string; status: string; statusLabel?: string;
  authStatus: string; credentialConfigured: boolean; permissions: string[]; capabilities: string[];
  authority?: { grants: string[]; primary: string; governsConsequentialActions: boolean; explanation: string };
  health?: { summary: string; whatFailed: string | null; remainsAvailable: string; blocked: string | null; recoveryAutomatic: boolean; ownerActionRequired: boolean; checkedAt: string | null };
  lastSyncAt?: string | null; lastSuccessfulOperation?: { label: string; at: string } | null; lastError?: string | null;
};
export type CognitiveRuntimeSnapshot = {
  status: string;
  lastRefreshAt: string | null;
  nextRefreshAt: string | null;
  staleModels: string[];
  degradedModels: string[];
  summary: { headline?: string; mostImportantAction?: string; operationalState?: string; uncertainty?: string };
};
export type HealthResponse = { connected: boolean; status: string; pairedAt: string; lastVerifiedAt: string; identity?: MobileIdentity };
export type CaptureAcknowledgement = { sourceId: string | null; perceptionId?: string | null; status: string; duplicate: boolean; serverRevision?: string | null; evidence?: Record<string, unknown> };
export type ObservationSession = {
  sessionId: string;
  personId: string;
  deviceId: string;
  clientType: 'owner';
  pairingId: string;
  sessionType: 'watch' | 'observe';
  enabledModalities: Array<'screen' | 'camera' | 'microphone' | 'share'>;
  privacyScope: 'owner-private';
  status: 'REQUESTED' | 'ACTIVE' | 'ENDED' | 'REVOKED' | 'EXPIRED' | 'FAILED';
  requestedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  hardExpiresAt: string;
  revocationReason: string | null;
  evidenceRefs: string[];
  provenance: Record<string, unknown>;
  authority: 'observation-only';
};
export type PerceptionReviewItem = {
  id: string;
  captureId: string;
  captureType: string;
  sourceMetadata: Record<string, unknown>;
  interpretation: { state: string; summary: string; confidence: number; uncertainty: Record<string, unknown>; provenance: Record<string, unknown> } | null;
  interpretationState: string;
  uncertainty: Record<string, unknown>;
  confidence: number;
  brainPromotionState: string;
  checksum: string;
  capturedAt: string;
};
export type ReadinessResponse = { ready: boolean; state: string; checks: Record<string, { state: string; detail: string; observedAt: string }> };
export type OperationalConfidence = { score: number; explanation: string; factors: Array<{ label: string; contribution: number; detail: string }> };
export type ProjectOperationsProject = {
  id: string;
  name: string;
  endpoint: string;
  capabilityLevel: string;
  allowedOperations: string[];
  capabilities: string[];
  credentialConfigured: boolean;
  health: { status: string; checkedAt: string | null; freshness: string; detail: string; error?: string };
  projectOperations: {
    contractVersion: string;
    inspection: { status: string; detail: string };
    delivery: { status: string; detail: string; source: string; observedAt: string | null };
    readiness: { status: string; detail: string; checks: Array<{ key: string; status: string; detail: string }> };
    permissions: { capabilityLevel: string; allowedOperations: string[]; credentialConfigured: boolean; ownerReviewRequired: boolean; governancePath: string };
    health: { status: string; freshness: string; detail: string; checkedAt: string | null };
    freshness: { state: string; observedAt: string | null; maxAgeMs: number };
    transport: { systemId: string; identity: string; adapter: string; status: string; correlationId: string | null; route: string | null; lastCallAt: string | null; rateLimit: { limit: number; windowMs: number; remaining: number; resetAt: string | null } };
    recommendations: string[];
  };
};
export type SelfAwarenessSnapshot = {
  generatedAt: string;
  hostedReality: {
    milestone: { id: string; title: string; state: string; status: string; detail: string; freshness: string; blockers: Array<{ id: string; label: string; status: string; detail: string }> };
    current: { state: string; detail: string; freshness: string };
    target: { state: string; detail: string; freshness: string };
    systems: Array<{ id: string; label: string; status: string; detail: string; freshness: string }>;
    deferredDesktop: { id: string; label: string; status: string; detail: string; freshness: string };
  };
  identity?: { currentVersion?: string | null; status?: string; freshness?: string };
};

const ownerManifest = createClientManifest('owner', '1.0.0');

export function createLeeApi(pairing: Pairing, manifest: ClientManifest = ownerManifest) {
  const base = pairing.apiUrl.replace(/\/$/, '');
    async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const clientHeaders = await getClientHeaders(manifest);
    const response = await expoFetch(`${base}/api${path}`, {
      ...(init as any),
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${pairing.token}`, ...clientHeaders, ...(init.headers ?? {}) },
    });
     if (!response.ok) {
       const error = new Error((await response.text()) || `Request failed (${response.status})`) as Error & { status?: number };
       error.status = response.status;
       throw error;
     }
    return response.json() as Promise<T>;
  }
  return {
    brief: () => request<Brief>('/android/brief'),
    uncertainty: () => request<UncertaintyRecord[]>('/uncertainty'),
    waiting: () => request<WaitingLoop[]>('/android/waiting'),
    waitingAction: (id: string, action: 'resolve' | 'snooze') => request(`/android/waiting/${id}/action`, { method: 'POST', body: JSON.stringify({ action, hours: 24 }) }),
    alerts: () => request<Alert[]>('/android/alerts'),
    alertAction: (id: string, action: 'dismiss' | 'snooze' | 'read') => request(`/android/alerts/${encodeURIComponent(id)}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
    alertContext: (id: string) => request<{ alertId: string; prompt: string }>(`/android/alerts/${encodeURIComponent(id)}/context`),
    approvals: () => request<Approval[]>('/android/approvals'),
    capture: (capture: { captureId: string; text: string; tag?: string; filename?: string; mimeType?: string; clientCapturedAt?: string; fingerprint?: string }) => request<CaptureAcknowledgement>('/android/capture', { method: 'POST', body: JSON.stringify(capture) }),
    perceptionCapture: (capture: PerceptionCapture) => request<CaptureAcknowledgement>('/android/perception/captures', { method: 'POST', body: JSON.stringify(capture) }),
     observationSessions: () => request<ObservationSession[]>('/android/observation-sessions'),
     createObservationSession: (input: { sessionType: 'watch' | 'observe'; enabledModalities: Array<'screen' | 'camera' | 'microphone' | 'share'>; hardExpirySeconds: number; privacyScope?: 'owner-private' }) => request<ObservationSession>('/android/observation-sessions', { method: 'POST', body: JSON.stringify(input) }),
     activateObservationSession: (sessionId: string) => request<ObservationSession>(`/android/observation-sessions/${encodeURIComponent(sessionId)}/activate`, { method: 'POST' }),
     endObservationSession: (sessionId: string, reason = 'owner_stopped') => request<ObservationSession>(`/android/observation-sessions/${encodeURIComponent(sessionId)}/end`, { method: 'POST', body: JSON.stringify({ reason }) }),
     revokeObservationSession: (sessionId: string, reason = 'owner_revoked') => request<ObservationSession>(`/android/observation-sessions/${encodeURIComponent(sessionId)}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
     failObservationSession: (sessionId: string, reason = 'permission_denied') => request<ObservationSession>(`/android/observation-sessions/${encodeURIComponent(sessionId)}/fail`, { method: 'POST', body: JSON.stringify({ reason }) }),
    perceptionReviewQueue: () => request<PerceptionReviewItem[]>('/android/perception/review'),
    reviewPerception: (id: string, decision: 'accept' | 'reject', note?: string) => request<{ id: string; brainPromotionState: string; reviewedAt: string | null; reviewedBy: string | null; reviewNote: string | null; automaticBrainPromotion: false }>(`/android/perception/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) }),
    async askStream(message: string, onEvent: (event: AskStreamEvent) => void, signal?: AbortSignal): Promise<void> {
      const clientHeaders = await getClientHeaders(manifest);
      const response = await expoFetch(`${base}/api/android/ask`, {
        method: 'POST',
        body: JSON.stringify({ message }),
        signal,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${pairing.token}`, ...clientHeaders, Accept: 'text/event-stream' },
      } as any);
      if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
      if (!response.body) throw new Error('Lee did not open a streaming response.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const next = await reader.read();
        buffer += decoder.decode(next.value, { stream: !next.done });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          const eventName = raw.match(/^event: (.+)$/m)?.[1] as AskStreamEvent['type'] | undefined;
          const payload = raw.match(/^data: (.+)$/m)?.[1];
          if (eventName && payload) onEvent({ type: eventName, data: JSON.parse(payload) } as AskStreamEvent);
        }
        if (next.done) break;
      }
    },
    approve: (governanceRequestId: string, decision: 'approve' | 'hold' | 'reject') => request<Approval>('/android/approve', { method: 'POST', body: JSON.stringify({ governanceRequestId, decision }) }),
    askWhy: (governanceRequestId: string) => request<{ explanation: string }>('/android/approvals/' + governanceRequestId + '/ask-why', { method: 'POST' }),
    liveness: () => request<{ status: string; live: boolean }>('/healthz'),
    health: () => request<HealthResponse>('/android/connection'),
    readiness: () => request<ReadinessResponse>('/readyz'),
    registerPushToken: (pushToken: string, platform = 'android', preferences = { enabled: true, categories: ['approval', 'alert', 'waiting', 'job', 'security'] }) => request<{ registered: boolean }>('/android/push-token', { method: 'POST', body: JSON.stringify({ pushToken, platform, preferences }) }),
    markNotificationDelivery: async (notificationId: string, status: 'opened' | 'dismissed') => {
      await request(`/android/alerts/${encodeURIComponent(notificationId)}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: status === 'dismissed' ? 'dismiss' : 'read' }),
      });
      return { recorded: true };
    },
    operationalConfidence: () => request<OperationalConfidence>('/operational-confidence'),
    contract: () => request<SystemContract>('/contract'),
    connections: () => request<ConnectionSummary[]>('/android/connections'),
    projectOperations: () => request<ProjectOperationsProject[]>('/android/project-operations'),
    selfAwareness: () => request<SelfAwarenessSnapshot>('/android/self-awareness'),
    runtime: () => request<CognitiveRuntimeSnapshot>('/android/runtime'),
  };
}