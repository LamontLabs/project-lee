import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Capture } from './types';

const PAIRING_KEY = '@lee/pairing';
const CAPTURES_KEY = '@lee/captures';

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