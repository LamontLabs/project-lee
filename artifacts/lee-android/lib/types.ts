export type Capture = {
  id: string;
  text: string;
  tag: string;
  status: 'queued' | 'synced';
  createdAt: string;
};

export type Brief = {
  title: string;
  unreadAlerts: number;
  alerts: Array<{ id: string; title: string; body: string; severity: string }>;
};

export type WaitingLoop = {
  id: string;
  subject: string;
  project: string;
  days: number;
  risk: 'low' | 'medium' | 'high';
  action: string;
  owner?: string | null;
  waitingSince: string;
  nextCheckAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type Alert = {
  id: string;
  title: string;
  reason: string;
  project: string;
  severity: 'critical' | 'high' | 'medium';
  body?: string | null;
};

export type Approval = {
  id: string;
  action: string;
  risk: 'high' | 'medium';
  reason: string;
  source: string;
  verdict: string;
  actionClass?: string;
  targetSystem?: string;
  reasonCodes?: string[];
};