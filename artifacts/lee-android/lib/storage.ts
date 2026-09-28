import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSecureCaptureQueue, createSecureStorage } from '@workspace/mobile-foundation';
import type { Approval, Brief, CachedValue, Capture, Freshness, UncertaintyRecord, WaitingLoop } from './types';
import type { SystemContract } from '@workspace/api-zod';
import type { ProjectOperationsProject, SelfAwarenessSnapshot } from './api';

const PAIRING_KEY = '@lee/pairing';
const CAPTURES_KEY = '@lee/captures';
const securePairing = createSecureStorage<Pairing>('owner', 'pairing');
const secureCaptureQueue = createSecureCaptureQueue('owner', { maxItems: 30 });
type CacheMetadata = { freshness?: Freshness; observedAt?: string | null; lastError?: string; privacyScope?: 'owner-private' | 'family-shared' | 'public'; serverRevision?: string | null; capabilityContext?: string[] };
function secureCache<T>(key: string) { return createSecureStorage<CachedValue<T>>('owner', `cache-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`); }
async function getCachedValue<T>(key: string): Promise<CachedValue<T> | null> {
  const parsed = await secureCache<T>(key).get();
  if (!parsed) return null;
  if (parsed.value !== undefined && typeof parsed.cachedAt === 'string' && parsed.privacyScope) return parsed;
  return { value: parsed.value, cachedAt: new Date(0).toISOString(), observedAt: null, freshness: 'stale', source: 'local', privacyScope: 'owner-private', capabilityContext: [] };
}
export async function saveCachedValue<T>(key: string, value: T, metadata: CacheMetadata = {}) { const cached: CachedValue<T> = { value, cachedAt: new Date().toISOString(), observedAt: metadata.observedAt ?? new Date().toISOString(), freshness: metadata.freshness ?? 'live', source: 'hosted', privacyScope: metadata.privacyScope ?? 'owner-private', serverRevision: metadata.serverRevision ?? null, capabilityContext: metadata.capabilityContext ?? [], ...(metadata.lastError ? { lastError: metadata.lastError } : {}) }; await secureCache<T>(key).set(cached); return cached; }
export async function markCachedValueStale<T>(cached: CachedValue<T> | null, error: string) { return cached ? { ...cached, freshness: 'stale' as const, lastError: error } : null; }
export type Pairing = { apiUrl: string; token: string; pairedAt: string };
export async function getPairing() { return securePairing.get(); }
export async function savePairing(pairing: Pairing) { await securePairing.set(pairing); }
export async function clearPairing() { await securePairing.clear(); await AsyncStorage.removeItem(PAIRING_KEY); }
export async function clearLegacyPlaintextState() { await AsyncStorage.multiRemove([PAIRING_KEY, CAPTURES_KEY, '@lee/brief', '@lee/waiting', '@lee/uncertainty', '@lee/system-contract', '@lee/approvals', '@lee/connections', '@lee/runtime', '@lee/health', '@lee/readiness', '@lee/operational-confidence', '@lee/project-operations', '@lee/self-awareness', '@lee/alerts']); }
export async function getCaptures() { return secureCaptureQueue.list<Capture>(); }
export async function saveCaptures(captures: Capture[]) { await secureCaptureQueue.replace(captures); await AsyncStorage.removeItem(CAPTURES_KEY); }
export async function getBrief() { return (await getBriefCache())?.value ?? null; }
export async function saveBrief(value: Brief) { await saveBriefCache(value); }
export async function getBriefCache() { return getCachedValue<Brief>('@lee/brief'); }
export async function saveBriefCache(value: Brief, metadata?: CacheMetadata) { return saveCachedValue('@lee/brief', value, metadata); }
export async function getUncertainty() { return (await getUncertaintyCache())?.value ?? []; }
export async function saveUncertainty(value: UncertaintyRecord[]) { await saveUncertaintyCache(value); }
export async function getUncertaintyCache() { return getCachedValue<UncertaintyRecord[]>('@lee/uncertainty'); }
export async function saveUncertaintyCache(value: UncertaintyRecord[], metadata?: CacheMetadata) { return saveCachedValue('@lee/uncertainty', value, metadata); }
export async function getWaitingCache() { return (await getWaitingSnapshot())?.value ?? []; }
export async function saveWaitingCache(value: WaitingLoop[]) { await saveWaitingSnapshot(value); }
export async function getWaitingSnapshot() { return getCachedValue<WaitingLoop[]>('@lee/waiting'); }
export async function saveWaitingSnapshot(value: WaitingLoop[], metadata?: CacheMetadata) { return saveCachedValue('@lee/waiting', value, metadata); }
export async function getContract() { return (await getContractCache())?.value ?? null; }
export async function saveContract(value: SystemContract) { await saveContractCache(value); }
export async function getContractCache() { return getCachedValue<SystemContract>('@lee/system-contract'); }
export async function saveContractCache(value: SystemContract, metadata?: CacheMetadata) { return saveCachedValue('@lee/system-contract', value, metadata); }
export async function getApprovals() { return (await getApprovalsCache())?.value ?? []; }
export async function saveApprovals(value: Approval[]) { await saveApprovalsCache(value); }
export async function getApprovalsCache() { return getCachedValue<Approval[]>('@lee/approvals'); }
export async function saveApprovalsCache(value: Approval[], metadata?: CacheMetadata) { return saveCachedValue('@lee/approvals', value, metadata); }
export async function getAlertsCache() { return getCachedValue<import('./types').Alert[]>('@lee/alerts'); }
export async function saveAlertsCache(value: import('./types').Alert[], metadata?: CacheMetadata) { return saveCachedValue('@lee/alerts', value, metadata); }
export async function getConnectionsCache<T>() { return getCachedValue<T>('@lee/connections'); }
export async function saveConnectionsCache<T>(value: T, metadata?: CacheMetadata) { return saveCachedValue('@lee/connections', value, metadata); }
export async function getRuntimeCache<T>() { return getCachedValue<T>('@lee/runtime'); }
export async function saveRuntimeCache<T>(value: T, metadata?: CacheMetadata) { return saveCachedValue('@lee/runtime', value, metadata); }
export async function getHealthCache<T>() { return getCachedValue<T>('@lee/health'); }
export async function saveHealthCache<T>(value: T, metadata?: CacheMetadata) { return saveCachedValue('@lee/health', value, metadata); }
export async function getReadinessCache<T>() { return getCachedValue<T>('@lee/readiness'); }
export async function saveReadinessCache<T>(value: T, metadata?: CacheMetadata) { return saveCachedValue('@lee/readiness', value, metadata); }
export async function getConfidenceCache<T>() { return getCachedValue<T>('@lee/operational-confidence'); }
export async function saveConfidenceCache<T>(value: T, metadata?: CacheMetadata) { return saveCachedValue('@lee/operational-confidence', value, metadata); }
export async function getProjectOperationsCache() { return getCachedValue<ProjectOperationsProject[]>('@lee/project-operations'); }
export async function saveProjectOperationsCache(value: ProjectOperationsProject[], metadata?: CacheMetadata) { return saveCachedValue('@lee/project-operations', value, metadata); }
export async function getSelfAwarenessCache() { return getCachedValue<SelfAwarenessSnapshot>('@lee/self-awareness'); }
export async function saveSelfAwarenessCache(value: SelfAwarenessSnapshot, metadata?: CacheMetadata) { return saveCachedValue('@lee/self-awareness', value, metadata); }