import { fetch as expoFetch } from 'expo/fetch';
import type { Alert, Approval, Brief, Capture, WaitingLoop } from './types';

export type Pairing = { apiUrl: string; token: string; pairedAt: string };

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
    waiting: () => request<WaitingLoop[]>('/android/waiting'),
    waitingAction: (id: string, action: 'resolve' | 'snooze') => request(`/android/waiting/${id}/action`, { method: 'POST', body: JSON.stringify({ action, hours: 24 }) }),
    alerts: () => request<Alert[]>('/android/alerts'),
    alertAction: (id: string, action: 'dismiss' | 'snooze') => request(`/android/alerts/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
    approvals: () => request<Approval[]>('/android/approvals'),
    capture: (capture: { text: string; tag?: string; filename?: string; mimeType?: string }) => request<{ sourceId: string | null; status: string }>('/android/capture', { method: 'POST', body: JSON.stringify(capture) }),
    ask: (message: string) => request<{ answer: string; model: string; estimatedCostUsd: number; contextItems: number }>('/android/ask', { method: 'POST', body: JSON.stringify({ message }) }),
    approve: (governanceRequestId: string, decision: 'approve' | 'hold' | 'reject') => request<{ id: string; status: string }>('/android/approve', { method: 'POST', body: JSON.stringify({ governanceRequestId, decision }) }),
    health: () => request('/healthz'),
  };
}