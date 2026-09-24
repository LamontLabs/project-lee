import type { Alert, Approval, WaitingLoop } from './types';

export type ProtectedDestination = 'alerts' | 'approvals' | 'waiting';

export type FreshNotificationTarget =
  | { destination: 'alerts'; id: string; records: Alert[] }
  | { destination: 'approvals'; id: string; records: Approval[] }
  | { destination: 'waiting'; id: string; records: WaitingLoop[] };

type NotificationRecord = Alert & {
  kind?: string;
  targetRef?: string | null;
};

export type NotificationLinkApi = {
  alerts: () => Promise<NotificationRecord[]>;
  approvals: () => Promise<Approval[]>;
  waiting: () => Promise<WaitingLoop[]>;
  markNotificationDelivery: (id: string, status: 'opened' | 'dismissed') => Promise<unknown>;
};

type ParsedLink =
  | { type: 'protected'; destination: ProtectedDestination; id: string }
  | { type: 'public'; destination: 'today' | 'ask'; prompt?: string };

type NotificationPayloadTarget = {
  destination: ProtectedDestination;
  id: string;
  receiptId?: string;
};

type NotificationLinkDependencies = {
  getApi: () => NotificationLinkApi | null;
  clearFreshTarget?: () => void;
  cacheFreshTarget: (target: FreshNotificationTarget) => Promise<void> | void;
  navigate: (destination: ProtectedDestination, id: string) => Promise<void> | void;
  navigatePublic: (destination: 'today' | 'ask', prompt?: string) => void;
  reportReceiptFailure?: (error: unknown) => void;
};

const protectedDestinations = new Set<ProtectedDestination>(['alerts', 'approvals', 'waiting']);
const MAX_GUARDED_OPENS = 128;
const targetIdFields = ['alertId', 'approvalId', 'waitingId'] as const;

function exactId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim() && !value.includes('/');
}

function isFamilyPayload(data: Record<string, unknown>) {
  return data.familyId !== undefined
    || data.familyRole !== undefined
    || data.audience === 'family'
    || data.clientType === 'family'
    || data.role === 'family';
}

function hasKnownPayloadShape(data: Record<string, unknown>) {
  const allowedFields = new Set(['tab', 'notificationId', ...targetIdFields]);
  if (Object.keys(data).some((key) => !allowedFields.has(key)) || isFamilyPayload(data)) return false;
  if (data.tab === 'index') {
    return Object.keys(data).every((key) => key === 'tab' || key === 'notificationId')
      && (data.notificationId === undefined || exactId(data.notificationId));
  }
  if (typeof data.tab !== 'string' || !protectedDestinations.has(data.tab as ProtectedDestination)) return false;
  const expectedField = data.tab === 'alerts' ? 'alertId' : data.tab === 'approvals' ? 'approvalId' : 'waitingId';
  return targetIdFields.every((field) => field === expectedField || data[field] === undefined);
}

function decodeSegments(pathname: string): string[] | null {
  try {
    const parts = pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
    return parts.some((part) => !part || part.includes('/')) ? null : parts;
  } catch {
    return null;
  }
}

export function parseLeeLink(rawUrl: string): ParsedLink | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol.toLowerCase() !== 'lee-android:' || url.username || url.password || url.port) return null;

  const hostname = url.hostname.toLowerCase();
  const knownRoutes = new Set(['alerts', 'approvals', 'waiting', 'ask', 'today', 'index']);
  if (hostname && !knownRoutes.has(hostname)) return null;
  const path = decodeSegments(url.pathname);
  if (!path) return null;
  const routeName = protectedDestinations.has(hostname as ProtectedDestination) || hostname === 'ask' || hostname === 'today' || hostname === 'index'
    ? hostname
    : path[0];
  const routeSegments = routeName === hostname ? path : path.slice(1);

  if (routeName === 'alerts' || routeName === 'approvals' || routeName === 'waiting') {
    if (url.search || url.hash || routeSegments.length !== 1 || !exactId(routeSegments[0])) return null;
    return { type: 'protected', destination: routeName, id: routeSegments[0] };
  }
  if (routeName === 'ask' && routeSegments.length === 0) {
    let hasUnexpectedQueryKey = false;
    url.searchParams.forEach((_value, key) => {
      if (key !== 'prompt') hasUnexpectedQueryKey = true;
    });
    if (url.hash || hasUnexpectedQueryKey) return null;
    const prompt = url.searchParams.get('prompt');
    return { type: 'public', destination: 'ask', ...(prompt ? { prompt } : {}) };
  }
  if ((routeName === 'today' || routeName === 'index') && routeSegments.length === 0) {
    if (url.search || url.hash) return null;
    return { type: 'public', destination: 'today' };
  }
  return null;
}

async function fetchFreshTarget(api: NotificationLinkApi, destination: ProtectedDestination, id: string): Promise<FreshNotificationTarget | null> {
  if (!exactId(id)) return null;
  if (destination === 'alerts') {
    const records = await api.alerts();
    return records.some((record) => record.id === id) ? { destination, id, records } : null;
  }
  if (destination === 'approvals') {
    const records = await api.approvals();
    return records.some((record) => record.id === id) ? { destination, id, records } : null;
  }
  const records = await api.waiting();
  return records.some((record) => record.id === id) ? { destination, id, records } : null;
}

async function resolveNotificationPayload(data: unknown, api: NotificationLinkApi): Promise<NotificationPayloadTarget | null> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const payload = data as Record<string, unknown>;
  if (!hasKnownPayloadShape(payload)) return null;
  const destination = payload.tab;
  if (typeof destination !== 'string' || !protectedDestinations.has(destination as ProtectedDestination)) return null;
  const targetKind = destination === 'alerts' ? 'alertId' : destination === 'approvals' ? 'approvalId' : 'waitingId';
  const explicitId = payload[targetKind];
  const notificationId = payload.notificationId;
  if (explicitId !== undefined && !exactId(explicitId)) return null;
  if (notificationId !== undefined && !exactId(notificationId)) return null;
  if (explicitId === undefined && notificationId === undefined) return null;

  if (notificationId !== undefined) {
    const notifications = await api.alerts();
    const notification = notifications.find((record) => record.id === notificationId);
    if (!notification) return null;
    if (destination === 'alerts') {
      if (explicitId !== undefined && explicitId !== notificationId) return null;
      return { destination, id: notificationId, receiptId: notificationId };
    }
    const referencedId = notification.targetRef;
    if (!exactId(referencedId) || (explicitId !== undefined && explicitId !== referencedId)) return null;
    return { destination: destination as ProtectedDestination, id: referencedId, receiptId: notificationId };
  }

  return { destination: destination as ProtectedDestination, id: explicitId as string };
}

export function createNotificationLinkHandler(dependencies: NotificationLinkDependencies) {
  const opens = new Map<string, 'pending' | 'done'>();

  function reserve(key: string) {
    if (opens.has(key)) return false;
    if (opens.size >= MAX_GUARDED_OPENS) {
      const completedKey = [...opens].find(([, state]) => state === 'done')?.[0];
      if (!completedKey) return false;
      opens.delete(completedKey);
    }
    opens.set(key, 'pending');
    return true;
  }

  async function guarded(key: string, work: () => Promise<void>) {
    if (!reserve(key)) return false;
    try {
      await work();
      opens.set(key, 'done');
      return true;
    } catch {
      opens.delete(key);
      return false;
    }
  }

  async function openTarget(destination: ProtectedDestination, id: string, receiptId?: string) {
    const key = receiptId ? `notification:${receiptId}` : `target:${destination}:${id}`;
    return guarded(key, async () => {
      dependencies.clearFreshTarget?.();
      const api = dependencies.getApi();
      if (!api) throw new Error('A paired Owner API is required.');
      const target = await fetchFreshTarget(api, destination, id);
      if (!target) throw new Error('The referenced record is not available from the live Owner API.');
      await dependencies.cacheFreshTarget(target);
      await dependencies.navigate(destination, target.id);
      if (receiptId) {
        try {
          await api.markNotificationDelivery(receiptId, 'opened');
        } catch (error) {
          dependencies.reportReceiptFailure?.(error);
        }
      }
    });
  }

  return {
    async openLink(rawUrl: string) {
      const parsed = parseLeeLink(rawUrl);
      if (!parsed) return false;
      if (parsed.type === 'public') {
        dependencies.navigatePublic(parsed.destination, parsed.prompt);
        return true;
      }
      return openTarget(parsed.destination, parsed.id);
    },

    async openNotification(data: unknown) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
      const payload = data as Record<string, unknown>;
      if (!hasKnownPayloadShape(payload)) return false;
      if (payload.tab === 'index') {
        dependencies.navigatePublic('today');
        return true;
      }
      const destination = payload.tab;
      const explicitKind = destination === 'alerts' ? 'alertId' : destination === 'approvals' ? 'approvalId' : destination === 'waiting' ? 'waitingId' : null;
      const explicitId = explicitKind ? payload[explicitKind] : undefined;
      const notificationId = payload.notificationId;
      if (notificationId !== undefined && !exactId(notificationId)) return false;
      if (explicitId !== undefined && !exactId(explicitId)) return false;
      if (!explicitKind || (notificationId === undefined && explicitId === undefined) || isFamilyPayload(payload)) return false;
      const key = notificationId ? `notification:${notificationId}` : `target:${destination}:${explicitId}`;
      return guarded(key, async () => {
        dependencies.clearFreshTarget?.();
        const api = dependencies.getApi();
        if (!api) throw new Error('A paired Owner API is required.');
        const resolved = await resolveNotificationPayload(payload, api);
        if (!resolved) throw new Error('The notification reference is invalid or no longer available.');
        const target = await fetchFreshTarget(api, resolved.destination, resolved.id);
        if (!target) throw new Error('The referenced record is not available from the live Owner API.');
        await dependencies.cacheFreshTarget(target);
        await dependencies.navigate(resolved.destination, target.id);
        if (resolved.receiptId) {
          try {
            await api.markNotificationDelivery(resolved.receiptId, 'opened');
          } catch (error) {
            dependencies.reportReceiptFailure?.(error);
          }
        }
      });
    },
  };
}