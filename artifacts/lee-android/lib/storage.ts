import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Approval, Brief, Capture, UncertaintyRecord, WaitingLoop } from './types';
import type { SystemContract } from '@workspace/api-zod';

const PAIRING_KEY = '@lee/pairing';
const CAPTURES_KEY = '@lee/captures';
const BRIEF_KEY = '@lee/brief';
const WAITING_KEY = '@lee/waiting';
const UNCERTAINTY_KEY = '@lee/uncertainty';
const CONTRACT_KEY = '@lee/system-contract';
const APPROVALS_KEY = '@lee/approvals';

export type Pairing = { apiUrl: string; token: string; pairedAt: string };

export async function getPairing(): Promise<Pairing | null> {
  const value = await AsyncStorage.getItem(PAIRING_KEY);
  return value ? (JSON.parse(value) as Pairing) : null;
}

export async function savePairing(pairing: Pairing): Promise<void> {
  await AsyncStorage.setItem(PAIRING_KEY, JSON.stringify(pairing));
}

export async function clearPairing(): Promise<void> {
  await AsyncStorage.removeItem(PAIRING_KEY);
}

export async function getCaptures(): Promise<Capture[]> {
  const value = await AsyncStorage.getItem(CAPTURES_KEY);
  return value ? (JSON.parse(value) as Capture[]) : [];
}

export async function saveCaptures(captures: Capture[]): Promise<void> {
  await AsyncStorage.setItem(CAPTURES_KEY, JSON.stringify(captures));
}

export async function getBrief(): Promise<Brief | null> {
  const value = await AsyncStorage.getItem(BRIEF_KEY);
  return value ? (JSON.parse(value) as Brief) : null;
}
export async function saveBrief(brief: Brief): Promise<void> { await AsyncStorage.setItem(BRIEF_KEY, JSON.stringify(brief)); }
export async function getUncertainty(): Promise<UncertaintyRecord[]> {
  const value = await AsyncStorage.getItem(UNCERTAINTY_KEY);
  return value ? (JSON.parse(value) as UncertaintyRecord[]) : [];
}
export async function saveUncertainty(items: UncertaintyRecord[]): Promise<void> {
  await AsyncStorage.setItem(UNCERTAINTY_KEY, JSON.stringify(items));
}
export async function getWaitingCache(): Promise<WaitingLoop[]> {
  const value = await AsyncStorage.getItem(WAITING_KEY);
  return value ? (JSON.parse(value) as WaitingLoop[]) : [];
}
export async function saveWaitingCache(items: WaitingLoop[]): Promise<void> { await AsyncStorage.setItem(WAITING_KEY, JSON.stringify(items)); }
export async function getContract(): Promise<SystemContract | null> {
  const value = await AsyncStorage.getItem(CONTRACT_KEY);
  return value ? JSON.parse(value) as SystemContract : null;
}
export async function saveContract(contract: SystemContract): Promise<void> {
  await AsyncStorage.setItem(CONTRACT_KEY, JSON.stringify(contract));
}

export async function getApprovals(): Promise<Approval[]> {
  const value = await AsyncStorage.getItem(APPROVALS_KEY);
  return value ? JSON.parse(value) as Approval[] : [];
}

export async function saveApprovals(approvals: Approval[]): Promise<void> {
  await AsyncStorage.setItem(APPROVALS_KEY, JSON.stringify(approvals));
}

export async function pairedHealthCheck(apiUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/healthz`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}