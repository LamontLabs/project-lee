import { fetch as expoFetch } from 'expo/fetch';
import type { Alert, Approval, Brief, Capture, UncertaintyRecord, WaitingLoop } from './types';
import type { SystemContract } from '@workspace/api-zod';

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

export function createLeeApi(pairing: Pairing) {
  const base = pairing.apiUrl.replace(/\/$/, '');
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await expoFetch(`${base}/api${path}`, {
      ...(init as any),
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${pairing.token}`, ...(init.headers ?? {}) },
    });
    if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
    return response.json() as Promise<T>;
  }
  return {
    brief: () => request<Brief>('/android/brief'),
    uncertainty: () => request<UncertaintyRecord[]>('/uncertainty'),
    waiting: () => request<WaitingLoop[]>('/android/waiting'),
    waitingAction: (id: string, action: 'resolve' | 'snooze') => request(`/android/waiting/${id}/action`, { method: 'POST', body: JSON.stringify({ action, hours: 24 }) }),
    alerts: () => request<Alert[]>('/android/alerts'),
    alertAction: (id: string, action: 'dismiss' | 'snooze') => request(`/android/alerts/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
    approvals: () => request<Approval[]>('/android/approvals'),
    capture: (capture: { text: string; tag?: string; filename?: string; mimeType?: string }) => request<{ sourceId: string | null; status: string }>('/android/capture', { method: 'POST', body: JSON.stringify(capture) }),
    async askStream(message: string, onEvent: (event: AskStreamEvent) => void, signal?: AbortSignal): Promise<void> {
      const response = await expoFetch(`${base}/api/android/ask`, {
        method: 'POST',
        body: JSON.stringify({ message }),
        signal,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${pairing.token}`, Accept: 'text/event-stream' },
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
    health: () => request<{ connected: boolean; status: string; pairedAt: string; lastVerifiedAt: string }>('/android/connection'),
    registerPushToken: (pushToken: string, platform = 'android') => request<{ registered: boolean }>('/android/push-token', { method: 'POST', body: JSON.stringify({ pushToken, platform }) }),
    operationalConfidence: () => request<{ score: number; explanation: string; factors: Array<{ label: string; contribution: number; detail: string }> }>('/operational-confidence'),
    contract: () => request<SystemContract>('/contract'),
    connections: () => request<ConnectionSummary[]>('/android/connections'),
  };
}