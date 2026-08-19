import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';

export default function BriefTab() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() { setRefreshing(true); await new Promise((resolve) => setTimeout(resolve, 500)); setRefreshing(false); }
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.headerRow}><View><Eyebrow>Wednesday · 19 Aug</Eyebrow><Title subtitle="A calm start to the operating day.">Good morning.</Title></View><View style={[styles.status, { backgroundColor: colors.accent }]}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={[styles.statusText, { color: colors.accentForeground }]}>SYNCED</Text></View></View>
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={[styles.kicker, { color: colors.primaryForeground }]}>TOP PRIORITY</Text>
        <Text style={[styles.priority, { color: colors.primaryForeground }]}>Protect the founder’s attention before optimizing throughput.</Text>
        <Text style={[styles.body, { color: colors.primaryForeground, opacity: 0.78 }]}>One focused block today will create more leverage than another round of system tuning.</Text>
        <Pressable style={styles.arrow}><Feather name="arrow-up-right" size={20} color={colors.primaryForeground} /></Pressable>
      </Card>
      <SectionLabel>At a glance</SectionLabel>
      <View style={styles.grid}>
        <Card style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>3</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Open loops</Text><Text style={[styles.statHint, { color: colors.destructive }]}>1 needs attention</Text></Card>
        <Card style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>2</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Meetings today</Text><Text style={[styles.statHint, { color: colors.mutedForeground }]}>First at 10:30</Text></Card>
      </View>
      <SectionLabel>Recommended focus</SectionLabel>
      <Card><View style={styles.row}><View style={[styles.iconCircle, { backgroundColor: colors.accent }]}><Feather name="crosshair" size={18} color={colors.primary} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Finish the pilot decision brief</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>The strongest next move is already visible. Give it a clean decision window.</Text></View></View></Card>
      <SectionLabel>Changed since yesterday</SectionLabel>
      <Card><Text style={[styles.body, { color: colors.foreground }]}>A new founder note was captured and is waiting for understanding. One approval is ready for review.</Text></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  status: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 }, priority: { fontSize: 24, lineHeight: 30, fontFamily: 'Inter_700Bold', marginTop: 4 }, body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' }, arrow: { alignSelf: 'flex-end', marginTop: 8 },
  grid: { flexDirection: 'row', gap: 10 }, stat: { flex: 1, minHeight: 122 }, statValue: { fontSize: 30, fontFamily: 'Inter_700Bold' }, statLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 2 }, statHint: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 'auto' },
  row: { flexDirection: 'row', gap: 12 }, iconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 4 },
});