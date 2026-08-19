import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import type { Alert } from '@/lib/types';

const alerts: Alert[] = [
  { id: '1', title: 'Approval waiting on you', reason: 'A consequential action is ready and has a two-day freshness window.', project: 'Project LEE', severity: 'critical' },
  { id: '2', title: 'Pilot thread is aging', reason: 'The partner response loop is now the oldest open loop in the portfolio.', project: 'CerbaSeal', severity: 'high' },
];

export default function AlertsTab() {
  const colors = useColors();
  return <Screen><Eyebrow>Signal above digest</Eyebrow><Title subtitle="Only items that need a change in attention show up here.">Alerts.</Title><SectionLabel>{alerts.length} active signals</SectionLabel>{alerts.map((alert) => <Card key={alert.id} style={{ borderColor: alert.severity === 'critical' ? colors.destructive : colors.border }}><View style={styles.row}><View style={[styles.icon, { backgroundColor: alert.severity === 'critical' ? '#3b201e' : colors.accent }]}><Feather name={alert.severity === 'critical' ? 'alert-octagon' : 'alert-triangle'} size={18} color={alert.severity === 'critical' ? colors.destructive : colors.primary} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>{alert.title}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{alert.project} · {alert.severity}</Text></View></View><Text style={[styles.body, { color: colors.mutedForeground }]}>{alert.reason}</Text><View style={styles.actions}><Pressable><Text style={[styles.action, { color: colors.mutedForeground }]}>Snooze</Text></Pressable><Pressable><Text style={[styles.action, { color: colors.primary }]}>Open Lee</Text></Pressable></View></Card>)}</Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, title: { fontSize: 15, fontFamily: 'Inter_700Bold' }, meta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 }, body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }, action: { fontSize: 12, fontFamily: 'Inter_700Bold' } });