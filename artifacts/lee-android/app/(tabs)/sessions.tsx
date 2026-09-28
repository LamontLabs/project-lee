import React, { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, PageBrand, Screen, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import type { ObservationSession } from '@/lib/api';
import { captureScreenObservationSample, requestScreenObservationPermission } from '@/lib/native-watch';
import { MobileStatePill, mobileTokens } from '@workspace/mobile-foundation';

function timeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
}

export default function SessionsTab() {
  const colors = useColors();
  const {
    api,
    pairing,
    hosted,
    observationSession,
    setObservationSession,
    endObservationSession,
    capturePerception,
  } = useLee();
  const [sessionType, setSessionType] = useState<'watch' | 'observe'>('watch');
  const [screenSelected, setScreenSelected] = useState(true);
  const [history, setHistory] = useState<ObservationSession[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(() => Date.now());

  const active = observationSession;
  const remaining = useMemo(() => active ? Math.max(0, Math.ceil((new Date(active.hardExpiresAt).getTime() - clock) / 1000)) : 0, [active, clock]);

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  }

  async function refreshSessions() {
    if (!api) {
      setHistory([]);
      return;
    }
    try {
      const sessions = await api.observationSessions();
      setHistory(sessions);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    void refreshSessions();
  }, [api]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setClock(Date.now());
      if (Date.now() >= new Date(active.hardExpiresAt).getTime()) {
        void endObservationSession('hard_expiry');
        showNotice('The hard session limit was reached. Screen capture stopped.');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active?.sessionId]);

  useEffect(() => {
    if (active && hosted.freshness !== 'live') {
      void endObservationSession('core_unavailable');
      showNotice('Hosted Core became unavailable. The observation session was stopped safely.');
    }
  }, [active?.sessionId, hosted.freshness]);

  async function start() {
    if (!api || !pairing) {
      showNotice('Pair the Owner Android with hosted Core before starting a session.');
      return;
    }
    if (hosted.freshness !== 'live') {
      showNotice('A live hosted Core check is required before starting observation.');
      return;
    }
    if (!screenSelected) {
      showNotice('Select the screen modality explicitly before starting.');
      return;
    }
    setBusy(true);
    let requested: ObservationSession | null = null;
    try {
      requested = await api.createObservationSession({
        sessionType,
        enabledModalities: ['screen'],
        hardExpirySeconds: 300,
        privacyScope: 'owner-private',
      });
      const permission = await requestScreenObservationPermission();
      if (!permission) {
        await api.failObservationSession(requested.sessionId, 'screen_permission_denied');
        showNotice('Android screen-capture permission was not granted. Nothing is observing.');
        return;
      }
      const started = await api.activateObservationSession(requested.sessionId);
      setObservationSession(started);
      showNotice(`${sessionType === 'watch' ? 'Watch' : 'Observe'} is active. Use Stop at any time.`);
      await refreshSessions();
    } catch (error) {
      if (requested) {
        await api.failObservationSession(requested.sessionId, 'activation_failed').catch(() => undefined);
      }
      showNotice(error instanceof Error ? error.message : 'The observation session could not start.');
    } finally {
      setBusy(false);
    }
  }

  async function stop(reason = 'owner_stopped') {
    setBusy(true);
    try {
      await endObservationSession(reason);
      await refreshSessions();
      showNotice('Observation stopped. No background or reboot restart is enabled.');
    } finally {
      setBusy(false);
    }
  }

  async function sample() {
    if (!active) return;
    if (hosted.freshness !== 'live') {
      await stop('core_unavailable');
      return;
    }
    setBusy(true);
    try {
      const frame = await captureScreenObservationSample();
      await capturePerception({
        captureType: 'screen_observation',
        sessionId: active.sessionId,
        purpose: active.sessionType === 'watch' ? 'bounded_watch_screen_sample' : 'explicit_observe_screen_sample',
        text: 'Owner-approved bounded screen observation',
        filename: frame.filename,
        mimeType: frame.mimeType,
        contentBase64: frame.contentBase64,
        byteSize: frame.byteSize,
        capturedAt: frame.capturedAt,
        authorizedScope: 'owner-private',
        sourceMetadata: {
          captureOrigin: 'android-media-projection',
          sessionType: active.sessionType,
          sampleKind: 'single-bounded-frame',
          rawScreenHistory: false,
          interpretation: 'not-requested',
        },
        brainLinks: [],
        requestReview: true,
      });
      showNotice('One bounded frame was added to evidence. It was not promoted to Brain memory.');
      await refreshSessions();
    } catch (error) {
      await stop('sample_failed');
      showNotice(error instanceof Error ? error.message : 'The screen sample failed; the session was stopped.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <PageBrand />
      <Eyebrow>Owner control</Eyebrow>
      <Title subtitle="Explicit foreground-only screen sessions. No covert monitoring, silent restart, or automatic Brain promotion.">Watch / Observe</Title>
      {active ? (
        <Card style={{ borderColor: colors.destructive, borderWidth: 1.5 }}>
          <View style={styles.activeHeader}>
            <View style={styles.activeTitle}>
              <Feather name="eye" size={18} color={colors.destructive} />
              <Text style={[styles.heading, { color: colors.foreground }]}>{active.sessionType === 'watch' ? 'Watch active' : 'Observe active'}</Text>
            </View>
            <MobileStatePill colors={colors} label={`Live · ${remaining}s`} tone="danger" />
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>Android screen-capture permission is active for this foreground session. Samples are single bounded evidence items with provenance and review state.</Text>
          <View style={styles.buttonRow}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void sample()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.45 : pressed ? 0.8 : 1 }]}>
              <Feather name="camera" size={16} color={colors.primaryForeground} />
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Capture one frame</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void stop()} style={({ pressed }) => [styles.stopButton, { borderColor: colors.destructive, opacity: busy ? 0.45 : pressed ? 0.7 : 1 }]}>
              <Text style={[styles.stopText, { color: colors.destructive }]}>Stop now</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card>
          <SectionLabel>New session</SectionLabel>
          <View style={styles.choiceRow}>
            {(['watch', 'observe'] as const).map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: sessionType === item }} onPress={() => setSessionType(item)} style={[styles.choice, { backgroundColor: sessionType === item ? colors.accent : colors.secondary }]}>
                <Text style={[styles.choiceText, { color: sessionType === item ? colors.accentForeground : colors.mutedForeground }]}>{item === 'watch' ? 'Watch · 5 min' : 'Observe · 5 min'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: screenSelected }} onPress={() => setScreenSelected((value) => !value)} style={styles.modalityRow}>
            <View style={[styles.checkbox, { backgroundColor: screenSelected ? colors.primary : colors.secondary, borderColor: screenSelected ? colors.primary : colors.border }]}>
              {screenSelected ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
            </View>
            <View style={styles.modalityCopy}>
              <Text style={[styles.heading, { color: colors.foreground }]}>Screen</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>Requires Android’s explicit MediaProjection permission. Camera, microphone, and other sensors are not enabled by this screen.</Text>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy || !screenSelected} onPress={() => void start()} style={({ pressed }) => [styles.startButton, { backgroundColor: colors.primary, opacity: busy || !screenSelected ? 0.5 : pressed ? 0.8 : 1 }]}>
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{busy ? 'Checking…' : 'Request permission and start'}</Text>
          </Pressable>
        </Card>
      )}
      <Card>
        <SectionLabel>Safety boundary</SectionLabel>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Every start, activation, sample, stop, and revoke rechecks the paired Owner identity, device, capability, privacy scope, and session expiry. A session ID grants no authority. Interpretation remains optional and separate from direct observation.</Text>
      </Card>
      {notice ? <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text> : null}
      <SectionLabel>Recent sessions</SectionLabel>
      {history.length === 0 ? <Text style={[styles.body, { color: colors.mutedForeground }]}>No Watch or Observe sessions have been recorded on this pairing.</Text> : history.map((session) => (
        <Card key={session.sessionId} style={{ gap: 5 }}>
          <View style={styles.historyHeader}>
            <Text style={[styles.heading, { color: colors.foreground }]}>{session.sessionType === 'watch' ? 'Watch' : 'Observe'} · {session.status}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{timeLabel(session.startedAt ?? session.requestedAt)}</Text>
          </View>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{session.evidenceRefs.length} bounded evidence item{session.evidenceRefs.length === 1 ? '' : 's'} · expires {timeLabel(session.hardExpiresAt)}{session.revocationReason ? ` · ${session.revocationReason}` : ''}</Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  activeTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 20, lineHeight: 23, fontFamily: 'CormorantGaramond_600SemiBold' },
  body: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primaryButton: { flex: 1, borderRadius: mobileTokens.radius.sm, minHeight: mobileTokens.touchTarget, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  stopButton: { borderWidth: 1, borderRadius: mobileTokens.radius.sm, minHeight: mobileTokens.touchTarget, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  stopText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  buttonText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: mobileTokens.touchTarget, borderRadius: mobileTokens.radius.sm, padding: 11, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  modalityRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  modalityCopy: { flex: 1, gap: 3 },
  startButton: { borderRadius: mobileTokens.radius.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  notice: { textAlign: 'center', fontSize: 13, lineHeight: 19, fontFamily: 'Inter_600SemiBold' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  meta: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
});