import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Eyebrow, PageBrand, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { MobileStatePill, mobileTokens } from '@workspace/mobile-foundation';

export default function WaitingTab() {
  const colors = useColors();
  const { waiting, hosted, authorizedNotificationTarget, waitingAction, refresh } = useLee();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const allLoops = waiting?.value ?? [];
  const loops = id
    ? authorizedNotificationTarget?.destination === 'waiting' && authorizedNotificationTarget.id === id
      ? authorizedNotificationTarget.records.filter((loop) => loop.id === id)
      : []
    : allLoops;
  const live = hosted.freshness === 'live';
  async function action(id: string, next: 'resolve' | 'snooze') {
    try { await waitingAction(id, next); } catch { /* The live gate keeps the loop unchanged. */ }
  }
  return (
    <Screen refreshing={false} onRefresh={() => void refresh()}>
      <PageBrand />
      <View style={styles.header}>
        <View style={styles.headerCopy}><Eyebrow>{live ? 'Open loops · live' : `Cached · ${hosted.freshness}`}</Eyebrow><Title subtitle="Small unresolved things become expensive when they stay invisible.">Waiting on.</Title></View>
      </View>
      <Card style={{ backgroundColor: colors.accent, borderColor: colors.accent }}>
        <View style={styles.summaryRow}><Text style={[styles.summary, { color: colors.accentForeground }]}>{loops.length} open loop{loops.length === 1 ? '' : 's'}</Text><MobileStatePill colors={colors} label={live ? 'Live' : 'Cached'} tone={live ? 'positive' : 'warning'} /></View>
        <Text style={[styles.body, { color: colors.accentForeground }]}>LEE ranks waiting from importance, elapsed time, cadence, deadlines, project impact, and evidence. It never sends a follow-up automatically.</Text>
        {!live && <Text style={[styles.meta, { color: colors.accentForeground }]}>Actions are disabled until the hosted Core is live.</Text>}
      </Card>
      <SectionLabel>By urgency</SectionLabel>
      {loops.length ? loops.map((loop) => {
        const score = Number(loop.waitingScore ?? loop.metadata?.waitingScore ?? 0);
        const risk = score >= 75 ? 'high' : score >= 48 ? 'medium' : 'low';
        return <Card key={loop.id}>
          <View style={styles.row}><View style={[styles.risk, { backgroundColor: risk === 'high' ? colors.destructive : risk === 'medium' ? colors.secondary : colors.accent }]}><Text style={[styles.riskText, { color: risk === 'high' ? colors.destructiveForeground : colors.foreground }]}>{risk.toUpperCase()}</Text></View><Text style={[styles.days, { color: colors.mutedForeground }]}>{Math.max(0, Math.floor((Date.now() - new Date(loop.waitingSince).getTime()) / 86400000))}d · {score || '—'}</Text></View>
          <Text style={[styles.title, { color: colors.foreground }]}>{loop.subject}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{loop.direction ? loop.direction.replaceAll('_', ' ') : loop.owner ?? 'Unassigned'} · {loop.nextCheckAt ? `next check ${new Date(loop.nextCheckAt).toLocaleDateString()}` : 'no check scheduled'}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{String(loop.metadata?.recommendedAction ?? 'Review the source and choose the next human action.')}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={!live} onPress={() => void action(loop.id, 'snooze')} style={[styles.smallButton, { borderColor: live ? colors.border : colors.secondary }]}><Text style={[styles.buttonLabel, { color: live ? colors.foreground : colors.mutedForeground }]}>Snooze</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!live} onPress={() => void action(loop.id, 'resolve')} style={[styles.smallButton, { backgroundColor: live ? colors.primary : colors.secondary }]}><Text style={[styles.buttonLabel, { color: live ? colors.primaryForeground : colors.mutedForeground }]}><Feather name="check" size={12} /> Resolve loop</Text></Pressable>
          </View>
        </Card>;
      }) : <Card><Text style={[styles.body, { color: colors.mutedForeground }]}>{id ? 'This waiting loop is no longer available from the live Owner service.' : hosted.freshness === 'unavailable' ? 'Hosted waiting loops are unavailable. No cached loops are available.' : 'Nothing is currently waiting on a person or system.'}</Text></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1 },
  summary: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  risk: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  riskText: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },
  days: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 22, lineHeight: 25, fontFamily: 'CormorantGaramond_600SemiBold' },
  meta: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  smallButton: { borderWidth: 1, borderRadius: mobileTokens.radius.sm, flex: 1, minHeight: mobileTokens.touchTarget, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  buttonLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});