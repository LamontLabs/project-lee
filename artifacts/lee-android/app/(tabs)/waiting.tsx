import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import type { WaitingLoop } from '@/lib/types';

const loops: WaitingLoop[] = [
  { id: '1', subject: 'Partner pilot response', project: 'CerbaSeal', days: 8, risk: 'high', action: 'Send a short, specific follow-up with the decision needed.' },
  { id: '2', subject: 'Design review feedback', project: 'Project LEE', days: 4, risk: 'medium', action: 'Ask for one decision rather than another broad review.' },
  { id: '3', subject: 'Calendar invite confirmation', project: 'Lamont Labs', days: 1, risk: 'low', action: 'Wait one more business day before nudging.' },
];

export default function WaitingTab() {
  const colors = useColors();
  return <Screen><Eyebrow>Open loops</Eyebrow><Title subtitle="Small unresolved things become expensive when they stay invisible.">Waiting on.</Title><Card style={{ backgroundColor: colors.accent, borderColor: colors.accent }}><Text style={[styles.summary, { color: colors.accentForeground }]}>3 open loops</Text><Text style={[styles.body, { color: colors.accentForeground }]}>One has crossed the attention threshold.</Text></Card><SectionLabel>By urgency</SectionLabel>{loops.map((loop) => <Card key={loop.id}><View style={styles.row}><View style={[styles.risk, { backgroundColor: loop.risk === 'high' ? colors.destructive : loop.risk === 'medium' ? colors.secondary : colors.accent }]}><Text style={[styles.riskText, { color: loop.risk === 'high' ? '#fff' : colors.foreground }]}>{loop.risk.toUpperCase()}</Text></View><Text style={[styles.days, { color: colors.mutedForeground }]}>{loop.days}d</Text></View><Text style={[styles.title, { color: colors.foreground }]}>{loop.subject}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{loop.project}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{loop.action}</Text><View style={styles.actions}><Pressable style={[styles.smallButton, { borderColor: colors.border }]}><Text style={[styles.buttonLabel, { color: colors.foreground }]}>Snooze</Text></Pressable><Pressable style={[styles.smallButton, { backgroundColor: colors.primary }]}><Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>Resolve</Text></Pressable></View></Card>)}</Screen>;
}
const styles = StyleSheet.create({ summary: { fontSize: 22, fontFamily: 'Inter_700Bold' }, body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, risk: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 }, riskText: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_700Bold' }, days: { fontSize: 13, fontFamily: 'Inter_600SemiBold' }, title: { fontSize: 16, fontFamily: 'Inter_700Bold' }, meta: { fontSize: 12, fontFamily: 'Inter_400Regular' }, actions: { flexDirection: 'row', gap: 8, marginTop: 4 }, smallButton: { borderWidth: 1, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 13 }, buttonLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' } });