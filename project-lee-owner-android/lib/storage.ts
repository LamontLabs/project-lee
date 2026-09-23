import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSecureCaptureQueue, createSecureStorage } from '@workspace/mobile-foundation';
import type { Approval, Brief, CachedValue, Capture, Freshness, UncertaintyRecord, WaitingLoop } from './types';
import type { SystemContract } from '@workspace/api-zod';
import type { ProjectOperationsProject, SelfAwarenessSnapshot } from './api';

const PAIRING_KEY = '@lee/pairing';
const CAPTURES_KEY = '@lee/captures';
const BRIEF_KEY = '@lee/brief';
const WAITING_KEY = '@lee/waiting';
const UNCERTAINTY_KEY = '@lee/uncertainty';
const CONTRACT_KEY = '@lee/system-contract';
const APPROVALS_KEY = '@lee/approvals';
const CONNECTIONS_KEY = '@lee/connections';
const RUNTIME_KEY = '@lee/runtime';
const HEALTH_KEY = '@lee/health';
const READINESS_KEY = '@lee/readiness';
const CONFIDENCE_KEY = '@lee/operational-confidence';
const PROJECT_OPERATIONS_KEY = '@lee/project-operations';
const SELF_AWARENESS_KEY = '@lee/self-awareness';
const securePairing = createSecureStorage<Pairing>('owner', 'pairing');
const secureCaptureQueue = createSecureCaptureQueue('owner', { maxItems: 30 });

type CacheMetadata = {
  freshness?: Freshness;
  observedAt?: string | null;
  lastError?: string;
  privacyScope?: 'owner-private' | 'family-shared' | 'public';
  serverRevision?: string | null;
  capabilityContext?: string[];
};

function secureCache<T>(key: string) {
  return createSecureStorage<CachedValue<T>>('owner', `cache-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
}

async function getCachedValue<T>(key: string): Promise<CachedValue<T> | null> {
  const parsed = await secureCache<T>(key).get();
  if (!parsed) return null;
  if (parsed.value !== undefined && typeof parsed.cachedAt === 'string' && parsed.privacyScope) {
    return parsed;
  }
  return {
    value: parsed.value,
    cachedAt: new Date(0).toISOString(),
    observedAt: null,
    freshness: 'stale',
    source: 'local',
    privacyScope: 'owner-private',
    capabilityContext: [],
  };
}

export async function saveCachedValue<T>(key: string, value: T, metadata: CacheMetadata = {}): Promise<CachedValue<T>> {
  const cached: CachedValue<T> = {
    value,
    cachedAt: new Date().toISOString(),
    observedAt: metadata.observedAt ?? new Date().toISOString(),
    freshness: metadata.freshness ?? 'live',
    source: 'hosted',
    privacyScope: metadata.privacyScope ?? 'owner-private',
    serverRevision: metadata.serverRevision ?? null,
    capabilityContext: metadata.capabilityContext ?? [],
    ...(metadata.lastError ? { lastError: metadata.lastError } : {}),
  };
  await secureCache<T>(key).set(cached);
  return cached;
}

export async function markCachedValueStale<T>(cached: CachedValue<T> | null, error: string): Promise<CachedValue<T> | null> {
  if (!cached) return null;
  return { ...cached, freshness: 'stale', lastError: error };
}

export type Pairing = { apiUrl: string; token: string; pairedAt: string };

export async function getPairing(): Promise<Pairing | null> {
  return securePairing.get();
}

export async function savePairing(pairing: Pairing): Promise<void> {
  await securePairing.set(pairing);
}

export async function clearPairing(): Promise<void> {
  await securePairing.clear();
  await AsyncStorage.removeItem(PAIRING_KEY);
}

export async function clearLegacyPlaintextState(): Promise<void> {
  await AsyncStorage.multiRemove([
    PAIRING_KEY,
    CAPTURES_KEY,
    BRIEF_KEY,
    WAITING_KEY,
    UNCERTAINTY_KEY,
    CONTRACT_KEY,
    APPROVALS_KEY,
    CONNECTIONS_KEY,
    RUNTIME_KEY,
    HEALTH_KEY,
    READINESS_KEY,
    CONFIDENCE_KEY,
    PROJECT_OPERATIONS_KEY,
    SELF_AWARENESS_KEY,
    '@lee/alerts',
  ]);
}

export async function getCaptures(): Promise<Capture[]> {
  return secureCaptureQueue.list<Capture>();
}

export async function saveCaptures(captures: Capture[]): Promise<void> {
  await secureCaptureQueue.replace(captures);
  await AsyncStorage.removeItem(CAPTURES_KEY);
}

export async function getBrief(): Promise<Brief | null> {
  return (await getBriefCache())?.value ?? null;
}
export async function saveBrief(brief: Brief): Promise<void> { await saveBriefCache(brief); }
export async function getBriefCache() { return getCachedValue<Brief>(BRIEF_KEY); }
export async function saveBriefCache(brief: Brief, metadata?: CacheMetadata) { return saveCachedValue(BRIEF_KEY, brief, metadata); }
export async function getUncertainty(): Promise<UncertaintyRecord[]> {
  return (await getUncertaintyCache())?.value ?? [];
}
export async function saveUncertainty(items: UncertaintyRecord[]): Promise<void> {
  await saveUncertaintyCache(items);
}
export async function getUncertaintyCache() { return getCachedValue<UncertaintyRecord[]>(UNCERTAINTY_KEY); }
export async function saveUncertaintyCache(items: UncertaintyRecord[], metadata?: CacheMetadata) { return saveCachedValue(UNCERTAINTY_KEY, items, metadata); }
export async function getWaitingCache(): Promise<WaitingLoop[]> {
  return (await getWaitingSnapshot())?.value ?? [];
}
export async function saveWaitingCache(items: WaitingLoop[]): Promise<void> { await saveWaitingSnapshot(items); }
export async function getWaitingSnapshot() { return getCachedValue<WaitingLoop[]>(WAITING_KEY); }
export async function saveWaitingSnapshot(items: WaitingLoop[], metadata?: CacheMetadata) { return saveCachedValue(WAITING_KEY, items, metadata); }
export async function getContract(): Promise<SystemContract | null> {
  return (await getContractCache())?.value ?? null;
}
export async function saveContract(contract: SystemContract): Promise<void> {
  await saveContractCache(contract);
}
export async function getContractCache() { return getCachedValue<SystemContract>(CONTRACT_KEY); }
export async function saveContractCache(contract: SystemContract, metadata?: CacheMetadata) { return saveCachedValue(CONTRACT_KEY, contract, metadata); }

export async function getApprovals(): Promise<Approval[]> {
  return (await getApprovalsCache())?.value ?? [];
}

export async function saveApprovals(approvals: Approval[]): Promise<void> {
  await saveApprovalsCache(approvals);
}
export async function getApprovalsCache() { return getCachedValue<Approval[]>(APPROVALS_KEY); }
export async function saveApprovalsCache(approvals: Approval[], metadata?: CacheMetadata) { return saveCachedValue(APPROVALS_KEY, approvals, metadata); }

export async function getAlertsCache() { return getCachedValue<import('./types').Alert[]>('@lee/alerts'); }
export async function saveAlertsCache(alerts: import('./types').Alert[], metadata?: CacheMetadata) { return saveCachedValue('@lee/alerts', alerts, metadata); }
export async function getConnectionsCache<T>() { return getCachedValue<T>(CONNECTIONS_KEY); }
export async function saveConnectionsCache<T>(connections: T, metadata?: CacheMetadata) { return saveCachedValue(CONNECTIONS_KEY, connections, metadata); }
export async function getRuntimeCache<T>() { return getCachedValue<T>(RUNTIME_KEY); }
export async function saveRuntimeCache<T>(runtime: T, metadata?: CacheMetadata) { return saveCachedValue(RUNTIME_KEY, runtime, metadata); }
export async function getHealthCache<T>() { return getCachedValue<T>(HEALTH_KEY); }
export async function saveHealthCache<T>(health: T, metadata?: CacheMetadata) { return saveCachedValue(HEALTH_KEY, health, metadata); }
export async function getReadinessCache<T>() { return getCachedValue<T>(READINESS_KEY); }
export async function saveReadinessCache<T>(readiness: T, metadata?: CacheMetadata) { return saveCachedValue(READINESS_KEY, readiness, metadata); }
export async function getConfidenceCache<T>() { return getCachedValue<T>(CONFIDENCE_KEY); }
export async function saveConfidenceCache<T>(confidence: T, metadata?: CacheMetadata) { return saveCachedValue(CONFIDENCE_KEY, confidence, metadata); }
export async function getProjectOperationsCache() { return getCachedValue<ProjectOperationsProject[]>(PROJECT_OPERATIONS_KEY); }
export async function saveProjectOperationsCache(projects: ProjectOperationsProject[], metadata?: CacheMetadata) { return saveCachedValue(PROJECT_OPERATIONS_KEY, projects, metadata); }
export async function getSelfAwarenessCache() { return getCachedValue<SelfAwarenessSnapshot>(SELF_AWARENESS_KEY); }
export async function saveSelfAwarenessCache(snapshot: SelfAwarenessSnapshot, metadata?: CacheMetadata) { return saveCachedValue(SELF_AWARENESS_KEY, snapshot, metadata); }

export async function pairedHealthCheck(apiUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/readyz`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}