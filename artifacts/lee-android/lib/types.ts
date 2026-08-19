export type Capture = {
  id: string;
  text: string;
  tag: string;
  status: 'queued' | 'synced';
  createdAt: string;
};

export type WaitingLoop = {
  id: string;
  subject: string;
  project: string;
  days: number;
  risk: 'low' | 'medium' | 'high';
  action: string;
};

export type Alert = {
  id: string;
  title: string;
  reason: string;
  project: string;
  severity: 'critical' | 'high' | 'medium';
};

export type Approval = {
  id: string;
  action: string;
  risk: 'high' | 'medium';
  reason: string;
  source: string;
  verdict: string;
};