import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { clearPairing, getCaptures, getPairing, getContract, getUncertainty, saveCaptures, saveContract, savePairing, saveUncertainty, type Pairing } from '@/lib/storage';
import { createLeeApi } from '@/lib/api';
import type { Capture, UncertaintyRecord } from '@/lib/types';
import type { SystemContract } from '@workspace/api-zod';

type LeeContextValue = {
  pairing: Pairing | null;
  captures: Capture[];
  uncertainty: UncertaintyRecord[];
  isLoading: boolean;
  pair: (apiUrl: string, token: string) => Promise<boolean>;
  unpair: () => void;
  addCapture: (text: string, tag: string) => Promise<void>;
  syncCapture: (capture: Capture) => Promise<void>;
  api: ReturnType<typeof createLeeApi> | null;
  refresh: () => Promise<void>;
  contract: SystemContract | null;
};

const LeeContext = createContext<LeeContextValue | null>(null);

export function LeeProvider({ children }: { children: React.ReactNode }) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<SystemContract | null>(null);

  useEffect(() => {
    Promise.all([getPairing(), getCaptures(), getUncertainty(), getContract()]).then(([storedPairing, storedCaptures, storedUncertainty, storedContract]) => {
      setPairing(storedPairing);
      setCaptures(storedCaptures);
      setUncertainty(storedUncertainty);
      setContract(storedContract);
      setIsLoading(false);
    });
  }, []);

  const [uncertainty, setUncertainty] = useState<UncertaintyRecord[]>([]);

  useEffect(() => {
    if (!pairing) return;
    void Promise.all([createLeeApi(pairing).uncertainty(), createLeeApi(pairing).contract()]).then(([items, liveContract]) => {
      setUncertainty(items);
      setContract(liveContract);
      return Promise.all([saveUncertainty(items), saveContract(liveContract)]);
    }).catch(() => undefined);
  }, [pairing]);

  const value = useMemo<LeeContextValue>(() => ({
    pairing,
    captures,
    uncertainty,
    isLoading,
    async pair(apiUrl, token) {
      const normalizedUrl = apiUrl.trim().replace(/\/$/, '');
      if (!/^https?:\/\//i.test(normalizedUrl) || token.trim().length < 8) return false;
      const next = { apiUrl: normalizedUrl, token: token.trim(), pairedAt: new Date().toISOString() };
      try { await createLeeApi(next).health(); } catch { return false; }
      await savePairing(next);
      setPairing(next);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    },
    unpair() {
      void clearPairing();
      setPairing(null);
    },
    async addCapture(text, tag) {
      const capture: Capture = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: text.trim(),
        tag,
        status: 'queued',
        createdAt: new Date().toISOString(),
      };
      const next = [capture, ...captures].slice(0, 30);
      setCaptures(next);
      await saveCaptures(next);
      if (pairing) {
        try {
          await createLeeApi(pairing).capture({ text: capture.text, tag: capture.tag });
          const synced = next.map((item) => item.id === capture.id ? { ...item, status: 'synced' as const } : item);
          setCaptures(synced);
          await saveCaptures(synced);
          } catch (error) {
            const failed = next.map((item) => item.id === capture.id ? { ...item, status: 'failed' as const, lastError: error instanceof Error ? error.message : 'Capture sync failed.', attempts: (item.attempts ?? 0) + 1 } : item);
            setCaptures(failed);
            await saveCaptures(failed);
        }
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    async syncCapture(capture) {
      if (!pairing) return;
      try {
        await createLeeApi(pairing).capture({ text: capture.text, tag: capture.tag });
        const next = captures.map((item) => item.id === capture.id ? { ...item, status: 'synced' as const, lastError: undefined, attempts: (item.attempts ?? 0) + 1 } : item);
        setCaptures(next);
        await saveCaptures(next);
      } catch (error) {
        const next = captures.map((item) => item.id === capture.id ? { ...item, status: 'failed' as const, lastError: error instanceof Error ? error.message : 'Capture sync failed.', attempts: (item.attempts ?? 0) + 1 } : item);
        setCaptures(next);
        await saveCaptures(next);
        throw error;
      }
    },
    api: pairing ? createLeeApi(pairing) : null,
    contract,
    async refresh() {
      if (!pairing) return;
      const queued = captures.filter((capture) => capture.status !== 'synced');
      const syncedIds = new Set<string>();
      const failed = new Map<string, string>();
      for (const capture of queued) {
        try {
          await createLeeApi(pairing).capture({ text: capture.text, tag: capture.tag });
          syncedIds.add(capture.id);
        } catch (error) {
          failed.set(capture.id, error instanceof Error ? error.message : 'Capture sync failed.');
          break;
        }
      }
      if (queued.length) {
        const next = captures.map((capture) => {
          if (syncedIds.has(capture.id)) return { ...capture, status: 'synced' as const, lastError: undefined, attempts: (capture.attempts ?? 0) + 1 };
          if (failed.has(capture.id)) return { ...capture, status: 'failed' as const, lastError: failed.get(capture.id), attempts: (capture.attempts ?? 0) + 1 };
          return capture;
        });
        setCaptures(next); await saveCaptures(next);
      }
      try {
        const [items, liveContract] = await Promise.all([createLeeApi(pairing).uncertainty(), createLeeApi(pairing).contract()]);
        setUncertainty(items);
        setContract(liveContract);
        await Promise.all([saveUncertainty(items), saveContract(liveContract)]);
      } catch { /* Cached uncertainty remains available offline. */ }
    },
  }), [pairing, captures, uncertainty, isLoading, contract]);

  return <LeeContext.Provider value={value}>{children}</LeeContext.Provider>;
}

export function useLee() {
  const context = useContext(LeeContext);
  if (!context) throw new Error('useLee must be used inside LeeProvider');
  return context;
}