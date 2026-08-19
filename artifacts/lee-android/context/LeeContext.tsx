import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { getCaptures, getPairing, saveCaptures, savePairing, type Pairing } from '@/lib/storage';
import type { Capture } from '@/lib/types';

type LeeContextValue = {
  pairing: Pairing | null;
  captures: Capture[];
  isLoading: boolean;
  pair: (apiUrl: string, token: string) => Promise<boolean>;
  unpair: () => void;
  addCapture: (text: string, tag: string) => Promise<void>;
  markCaptureSynced: (id: string) => Promise<void>;
};

const LeeContext = createContext<LeeContextValue | null>(null);

export function LeeProvider({ children }: { children: React.ReactNode }) {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPairing(), getCaptures()]).then(([storedPairing, storedCaptures]) => {
      setPairing(storedPairing);
      setCaptures(storedCaptures);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo<LeeContextValue>(() => ({
    pairing,
    captures,
    isLoading,
    async pair(apiUrl, token) {
      const normalizedUrl = apiUrl.trim().replace(/\/$/, '');
      if (!/^https?:\/\//i.test(normalizedUrl) || token.trim().length < 8) return false;
      const next = { apiUrl: normalizedUrl, token: token.trim(), pairedAt: new Date().toISOString() };
      await savePairing(next);
      setPairing(next);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    },
    unpair() {
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    async markCaptureSynced(id) {
      const next = captures.map((capture) => capture.id === id ? { ...capture, status: 'synced' as const } : capture);
      setCaptures(next);
      await saveCaptures(next);
    },
  }), [pairing, captures, isLoading]);

  return <LeeContext.Provider value={value}>{children}</LeeContext.Provider>;
}

export function useLee() {
  const context = useContext(LeeContext);
  if (!context) throw new Error('useLee must be used inside LeeProvider');
  return context;
}