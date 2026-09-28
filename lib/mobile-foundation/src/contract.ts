export const MOBILE_PROTOCOL_VERSION = '1' as const;

export type MobileClientType = 'owner' | 'family';
export type MobilePersonType = 'owner' | 'family-member';
export type MobilePrivacyScope = 'owner-private' | 'family-shared' | 'public';
export type MobileCompatibilityState = 'compatible' | 'update-required' | 'unsupported';

export type MobileCapability =
  | 'ask'
  | 'capture.text'
  | 'capture.structured'
  | 'perception.camera'
  | 'perception.microphone'
  | 'perception.share'
  | 'perception.review'
  | 'perception.screen_observation'
  | 'today'
  | 'approvals.read'
  | 'approvals.decide'
  | 'connection.read'
  | 'device.manage';

export type ClientManifest = {
  clientType: MobileClientType;
  clientName: string;
  clientVersion: string;
  protocolVersion: typeof MOBILE_PROTOCOL_VERSION;
  capabilities: MobileCapability[];
  privacyScopes: MobilePrivacyScope[];
  authority: 'server-authorized';
};

export type DeviceMetadata = {
  deviceId: string;
  registeredAt: string;
  clientType: MobileClientType;
};

export type MobileCapabilityState = {
  declared: MobileCapability[];
  granted: MobileCapability[];
  denied: MobileCapability[];
};

export type MobileIdentity = {
  pairingId: string;
  personId: string;
  personType: MobilePersonType;
  relationship: string;
  deviceId: string;
  clientType: MobileClientType;
  clientName: string;
  clientVersion: string;
  protocolVersion: string;
  compatibility: {
    state: MobileCompatibilityState;
    reason: string;
  };
  privacyScopes: MobilePrivacyScope[];
  householdScopes?: string[];
  capabilities: MobileCapabilityState;
  registeredAt: string;
  lastSeenAt: string;
};

export const MOBILE_CAPABILITIES: readonly MobileCapability[] = [
  'ask',
  'capture.text',
  'capture.structured',
  'perception.camera',
  'perception.microphone',
  'perception.share',
  'perception.review',
  'perception.screen_observation',
  'today',
  'approvals.read',
  'approvals.decide',
  'connection.read',
  'device.manage',
];

export const MOBILE_CLIENT_CAPABILITIES: Record<MobileClientType, readonly MobileCapability[]> = {
  owner: MOBILE_CAPABILITIES,
  family: ['ask', 'capture.text', 'today', 'connection.read'],
};

export function capabilitiesForClientType(clientType: MobileClientType) {
  return [...MOBILE_CLIENT_CAPABILITIES[clientType]];
}

export function privacyScopesForClientType(clientType: MobileClientType): MobilePrivacyScope[] {
  return clientType === 'owner' ? ['owner-private', 'family-shared', 'public'] : ['family-shared', 'public'];
}