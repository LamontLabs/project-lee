import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Card, Eyebrow, PageBrand, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { MobileStatePill, mobileTokens } from '@workspace/mobile-foundation';

export default function AlertsTab() {
  const colors = useColors();
  const { alerts, hosted, alertAction, refresh } = useLee();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const items = alerts?.value ?? [];
  const live = hosted.freshness === 'live';
  async function dismiss(alertId: string) {
    try { await alertAction(alertId, 'dismiss'); } catch { /* The live gate keeps the signal unchanged. */ }
  }
  return (
    <Screen refreshing={false} onRefresh={() => void refresh()}>
      <PageBrand />
      <Eyebrow>{live ? 'Signal above digest · live' : `Cached · ${hosted.freshness}`}</Eyebrow>
      <Title subtitle="Only items that need a change in attention show up here.">Alerts.</Title>
      <Card style={{ backgroundColor: live ? colors.accent : colors.secondary, borderColor: live ? colors.accent : colors.border }}>
        <View style={styles.bannerRow}><MobileStatePill colors={colors} label={live ? 'Live' : 'Cached'} tone={live ? 'positive' : 'warning'} /><Text style={[styles.banner, { color: live ? colors.accentForeground : colors.mutedForeground }]}>{live ? 'Hosted signals are current.' : 'Cached signals are visible for continuity. Dismissal stays disabled until the hosted Core is live.'}</Text></View>
      </Card>
      <SectionLabel>{items.length} active signals</SectionLabel>
      {items.length ? items.map((alert) => <Card key={alert.id} style={{ borderColor: alert.id === id ? colors.primary : alert.severity === 'critical' ? colors.destructive : colors.border }}>
        <View style={styles.row}><View style={[styles.icon, { backgroundColor: alert.severity === 'critical' ? colors.destructive : colors.accent }]}><Feather name={alert.severity === 'critical' ? 'alert-octagon' : 'alert-triangle'} size={18} color={alert.severity === 'critical' ? colors.destructiveForeground : colors.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>{alert.title}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{alert.project ?? 'Lee'} · {alert.severity}</Text></View></View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{alert.reason ?? alert.body ?? 'This signal needs review.'}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={!live} onPress={() => void dismiss(alert.id)} style={[styles.actionButton, { borderColor: live ? colors.border : colors.secondary }]}><Text style={[styles.action, { color: live ? colors.mutedForeground : colors.border }]}>Dismiss</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/ask', params: { alertId: alert.id } })} style={[styles.actionButton, { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={[styles.action, { color: colors.primary }]}>Open in Ask Lee</Text></Pressable>
        </View>
      </Card>) : <Card><Text style={[styles.body, { color: colors.mutedForeground }]}>{hosted.freshness === 'unavailable' ? 'Hosted alerts are unavailable. No cached alerts are available.' : 'No alerts are currently above the digest level.'}</Text></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 22, lineHeight: 25, fontFamily: 'CormorantGaramond_600SemiBold' },
  meta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  actionButton: { minHeight: mobileTokens.touchTarget, borderWidth: 1, borderRadius: mobileTokens.radius.sm, justifyContent: 'center', paddingHorizontal: 12 },
  action: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});