import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { clearPairing, getCaptures, getPairing, getUncertainty, saveCaptures, savePairing, saveUncertainty, type Pairing } from '@/lib/storage';
import { createLeeApi } from '@/lib/api';
import type { Capture, UncertaintyRecord } from '@/lib/types';

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
};

const LeeContext = createContext<LeeContextValue | null>(null);

export function LeeProvider({ children }: { children: React.ReactNode }) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPairing(), getCaptures(), getUncertainty()]).then(([storedPairing, storedCaptures, storedUncertainty]) => {
      setPairing(storedPairing);
      setCaptures(storedCaptures);
      setUncertainty(storedUncertainty);
      setIsLoading(false);
    });
  }, []);

  const [uncertainty, setUncertainty] = useState<UncertaintyRecord[]>([]);

  useEffect(() => {
    if (!pairing) return;
    void createLeeApi(pairing).uncertainty().then((items) => {
      setUncertainty(items);
      return saveUncertainty(items);
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
        } catch {
          // Keep the local queue intact until the next refresh.
        }
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    async syncCapture(capture) {
      if (!pairing) return;
      await createLeeApi(pairing).capture({ text: capture.text, tag: capture.tag });
      const next = captures.map((item) => item.id === capture.id ? { ...item, status: 'synced' as const } : item);
      setCaptures(next);
      await saveCaptures(next);
    },
    api: pairing ? createLeeApi(pairing) : null,
    async refresh() {
      if (!pairing) return;
      const queued = captures.filter((capture) => capture.status === 'queued');
      for (const capture of queued) {
        try { await createLeeApi(pairing).capture({ text: capture.text, tag: capture.tag }); } catch { break; }
      }
      if (queued.length) {
        const next = captures.map((capture) => queued.some((item) => item.id === capture.id) ? { ...capture, status: 'synced' as const } : capture);
        setCaptures(next); await saveCaptures(next);
      }
      try {
        const items = await createLeeApi(pairing).uncertainty();
        setUncertainty(items);
        await saveUncertainty(items);
      } catch { /* Cached uncertainty remains available offline. */ }
    },
  }), [pairing, captures, uncertainty, isLoading]);

  return <LeeContext.Provider value={value}>{children}</LeeContext.Provider>;
}

export function useLee() {
  const context = useContext(LeeContext);
  if (!context) throw new Error('useLee must be used inside LeeProvider');
  return context;
}