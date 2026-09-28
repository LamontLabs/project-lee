import * as SecureStore from 'expo-secure-store';
import {
  MOBILE_PROTOCOL_VERSION,
  capabilitiesForClientType,
  privacyScopesForClientType,
  type ClientManifest,
  type DeviceMetadata,
  type MobileClientType,
  type MobilePrivacyScope,
} from './contract';
export type MobileFreshness = 'live' | 'stale' | 'unavailable' | 'unverified';
export type MobileConnectivityState =
  | 'offline'
  | 'connecting'
  | 'online'
  | 'stale'
  | 'reauthorization-required'
  | 'revoked'
  | 'incompatible';
export * from './contract';
export * from './design-tokens';

export type PerceptionCaptureType = 'text' | 'image' | 'audio' | 'screenshot' | 'file' | 'document' | 'pdf' | 'link' | 'share' | 'screen_observation';
export type PerceptionScope = 'owner-private' | 'family-shared' | 'public';
export type PerceptionObservationState = 'OBSERVED' | 'INTERPRETED' | 'INFERRED' | 'UNKNOWN';
export type PerceptionInterpretationState = 'not-requested' | 'available' | 'recorded' | 'unavailable';
export type PerceptionPromotionState = 'evidence_only' | 'review_available' | 'accepted_for_cognition' | 'rejected' | 'not_promoted';

export type PerceptionCapture = {
  captureId: string;
  captureType: PerceptionCaptureType;
  purpose: string;
  text?: string;
  filename?: string;
  mimeType?: string;
  contentBase64?: string;
  byteSize?: number;
  capturedAt: string;
  authorizedScope: PerceptionScope;
  sourceMetadata?: Record<string, unknown>;
  requestReview?: boolean;
  brainLinks: string[];
  sessionId?: string;
};

export type CaptureQueueItem = {
  id: string;
  text: string;
  tag?: string;
  status: 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict' | 'rejected';
  createdAt: string;
  clientType?: MobileClientType;
  personId?: string;
  deviceId?: string;
  privacyScope?: MobilePrivacyScope;
  fingerprint?: string;
  attempts?: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
  acknowledgement?: {
    status: 'accepted' | 'duplicate';
    serverId: string | null;
    perceptionId?: string | null;
    serverRevision: string | null;
    receivedAt: string;
  };
  conflict?: {
    reason: string;
    serverRevision?: string | null;
    detectedAt: string;
  };
};

const DEVICE_KEY_PREFIX = '@lee/mobile/device/';
const STORAGE_KEY_PREFIX = '@lee/mobile/secure/';

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function keyFor(scope: string, name: string) {
  return `${STORAGE_KEY_PREFIX}${scope}/${name}`;
}

export function createClientManifest(clientType: MobileClientType, clientVersion = '1.0.0'): ClientManifest {
  const owner = clientType === 'owner';
  return {
    clientType,
    clientName: owner ? 'Project LEE Android' : 'LEE Family Android',
    clientVersion,
    protocolVersion: MOBILE_PROTOCOL_VERSION,
    capabilities: owner
      ? capabilitiesForClientType('owner')
      : capabilitiesForClientType('family'),
    privacyScopes: privacyScopesForClientType(clientType),
    authority: 'server-authorized',
  };
}

export async function getOrCreateDeviceMetadata(clientType: MobileClientType): Promise<DeviceMetadata> {
  const key = `${DEVICE_KEY_PREFIX}${clientType}`;
  const stored = await SecureStore.getItemAsync(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as DeviceMetadata;
      if (parsed.deviceId && parsed.clientType === clientType && parsed.registeredAt) return parsed;
    } catch {
      // A malformed protected value is not trusted and is replaced below.
    }
  }
  const metadata: DeviceMetadata = {
    deviceId: randomId(clientType),
    registeredAt: new Date().toISOString(),
    clientType,
  };
  await SecureStore.setItemAsync(key, JSON.stringify(metadata));
  return metadata;
}

export async function getClientHeaders(manifest: ClientManifest, personId?: string): Promise<Record<string, string>> {
  const device = await getOrCreateDeviceMetadata(manifest.clientType);
  return {
    'X-LEE-Client-Type': manifest.clientType,
    'X-LEE-Client-Name': manifest.clientName,
    'X-LEE-Client-Version': manifest.clientVersion,
    'X-LEE-Protocol-Version': manifest.protocolVersion,
    'X-LEE-Device-Id': device.deviceId,
    'X-LEE-Capabilities': manifest.capabilities.join(','),
    'X-LEE-Privacy-Scopes': manifest.privacyScopes.join(','),
    'X-LEE-Person': personId || (manifest.clientType === 'owner' ? 'owner' : 'family-member'),
  };
}

export function createSecureStorage<T>(scope: string, name: string) {
  const key = keyFor(scope, name);
  return {
    async get(): Promise<T | null> {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        throw new Error(`Protected mobile storage value "${name}" is invalid.`);
      }
    },
    async set(value: T): Promise<void> {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    },
    async clear(): Promise<void> {
      await SecureStore.deleteItemAsync(key);
    },
  };
}

export function createSecureCaptureQueue(scope: string, options: { maxItems?: number } = {}) {
  const index = createSecureStorage<string[]>(scope, 'capture-index');
  const maxItems = options.maxItems ?? 30;
  let writeChain: Promise<void> = Promise.resolve();

  async function ids() {
    return (await index.get()) ?? [];
  }

  return {
    async list<T extends CaptureQueueItem>(): Promise<T[]> {
      const stored: T[] = [];
      for (const id of await ids()) {
        const item = await createSecureStorage<T>(scope, `capture-${id}`).get();
        if (item) stored.push(item);
      }
      return stored;
    },
    async replace<T extends CaptureQueueItem>(items: T[]): Promise<void> {
      const write = async () => {
        const bounded = items
          .slice()
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(-maxItems);
        const currentIds = await ids();
        const nextIds = bounded.map((item) => item.id);
        // Write the complete next generation before publishing its index. A
        // process death can leave orphaned values, but never an index to a
        // missing queued item.
        for (const item of bounded) {
          await createSecureStorage<T>(scope, `capture-${item.id}`).set(item);
        }
        await index.set(nextIds);
        for (const id of currentIds) {
          if (!nextIds.includes(id)) await createSecureStorage(scope, `capture-${id}`).clear();
        }
      };
      const next = writeChain.then(write, write);
      writeChain = next.catch(() => undefined);
      await next;
    },
  };
}

export {
  FreshnessPill,
  LeeBottomNav,
  LeeBody,
  LeeBrandMark,
  LeeButton,
  LeeCard,
  LeeDisplayTitle,
  LeeMeta,
  LeeMicroLabel,
  LeeLaunchScreen,
  LeeRow,
  LeeSegmentedControl,
  LeeSheet,
  LeeStatusPill,
  MobileButton,
  MobileCard,
  MobileStatePill,
  MobileStatusCard,
  RoseBackdrop,
} from './ui';