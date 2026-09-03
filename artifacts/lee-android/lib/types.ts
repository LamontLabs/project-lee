export type Capture = {
  id: string;
  text: string;
  tag: string;
  status: 'queued' | 'synced' | 'failed';
  createdAt: string;
  lastError?: string;
  attempts?: number;
};

export type Brief = {
  title: string;
  unreadAlerts: number;
  alerts: Array<{ id: string; title: string; body: string; severity: string }>;
};

export type UncertaintyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH';

export type UncertaintyRecord = {
  objectId: string;
  objectType: string;
  level: UncertaintyLevel;
  score: number;
  outcomeLevel: UncertaintyLevel;
  timingLevel: UncertaintyLevel;
  scopeLevel: UncertaintyLevel;
  signals: string[];
  computedAt?: string;
};

export type WaitingLoop = {
  id: string;
  subject: string;
  project?: string | null;
  projectId?: string | null;
  days?: number;
  risk: 'low' | 'medium' | 'high';
  action: string;
  owner?: string | null;
  direction?: 'owner_owes' | 'owed_by_other' | 'mutual_waiting' | 'task' | 'uncertain' | string;
  waitingScore?: number | null;
  confidence?: number;
  sourceRefs?: string[];
  completionEvidenceRefs?: string[];
  noAutomaticFollowUp?: boolean;
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
  lifecycle: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAction: string;
  actionClass: string;
  target: string;
  affectedSystem: string;
  reason: string;
  risk: string;
  proposedChange: string;
  evidence: Array<{ id: string; label: string }>;
  cerbaSeal: {
    state: string;
    verdict: string | null;
    decisionId: string | null;
    reasonCodes: string[];
    authorizationExpiresAt: string | null;
  };
  expiresAt: string | null;
  ownerConfirmationRequired: boolean;
  humanConfirmationRequired: boolean;
  postApprovalEffect: string;
  source: { subsystem: string; requestId: string; auditTargetId: string };
  outcome: { verdict: string | null; resolvedAt: string | null; reasonCodes: string[] };
  requestedAt: string;
};