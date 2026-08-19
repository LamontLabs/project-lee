import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Alert as NativeAlert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import type { Approval } from '@/lib/types';

const approvals: Approval[] = [
  { id: '1', action: 'Share the pilot decision brief', risk: 'high', reason: 'The partner needs the final version to proceed.', source: 'Founder note · 18 Aug', verdict: 'Approve if the final scope is unchanged.' },
  { id: '2', action: 'Archive an inactive waiting loop', risk: 'medium', reason: 'No response after three follow-ups.', source: 'Operations ledger', verdict: 'Hold until the owner confirms.' },
];

export default function ApprovalsTab() {
  const colors = useColors();
  function confirm(action: string) { NativeAlert.alert(action, 'This action is recorded as a human decision.', [{ text: 'Cancel', style: 'cancel' }, { text: action, style: action === 'Reject' ? 'destructive' : 'default' }]); }
  return <Screen><Eyebrow>Governance queue</Eyebrow><Title subtitle="Lee can prepare the decision. You keep the final say.">Approvals.</Title><SectionLabel>{approvals.length} pending decisions</SectionLabel>{approvals.map((approval) => <Card key={approval.id}><View style={styles.row}><Feather name="shield" size={18} color={approval.risk === 'high' ? colors.destructive : colors.primary} /><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>{approval.action}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{approval.risk} risk · {approval.source}</Text></View></View><Text style={[styles.body, { color: colors.mutedForeground }]}>{approval.reason}</Text><View style={[styles.verdict, { backgroundColor: colors.secondary }]}><Text style={[styles.verdictText, { color: colors.foreground }]}>{approval.verdict}</Text></View><View style={styles.actions}><Pressable onPress={() => confirm('Hold')}><Text style={[styles.action, { color: colors.mutedForeground }]}>Hold</Text></Pressable><Pressable onPress={() => confirm('Reject')}><Text style={[styles.action, { color: colors.destructive }]}>Reject</Text></Pressable><Pressable onPress={() => confirm('Approve')}><Text style={[styles.action, { color: colors.primary }]}>Approve</Text></Pressable></View></Card>)}</Screen>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, copy: { flex: 1 }, title: { fontSize: 15, fontFamily: 'Inter_700Bold' }, meta: { fontSize: 11, marginTop: 4, fontFamily: 'Inter_400Regular' }, body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' }, verdict: { borderRadius: 10, padding: 11 }, verdictText: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }, action: { fontSize: 12, fontFamily: 'Inter_700Bold' } });