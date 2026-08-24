import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Eyebrow, Screen, SectionLabel, Title } from '@/components/Screen';
import { useLee } from '@/context/LeeContext';
import { useColors } from '@/hooks/useColors';

export default function SystemsTab() {
  const colors = useColors();
  const { pairing, captures, uncertainty, contract, refresh } = useLee();
  const queued = captures.filter((capture) => capture.status !== 'synced').length;
  const contractState = contract?.health?.state ?? 'unavailable';
  const statusColor = pairing && contractState === 'available' ? colors.primary : colors.accent;

  return <Screen refreshing={false}>
    <Eyebrow>Companion health</Eyebrow>
    <Title subtitle="Connection, local capture, and system signals stay visible without making the phone a configuration surface.">Systems.</Title>
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: statusColor }]}><Feather name={pairing ? 'wifi' : 'wifi-off'} size={18} color={colors.primaryForeground} /></View>
        <View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>{pairing ? 'Paired to Lee' : 'Offline companion'}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{pairing ? `System contract ${contractState}.` : 'Capture remains local until the companion is paired.'}</Text></View>
      </View>
    </Card>
    <SectionLabel>Operational shortcuts</SectionLabel>
    <Card>
      <Pressable onPress={() => void refresh()} style={styles.actionRow}><Feather name="refresh-cw" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Refresh local and system status</Text></Pressable>
      <Pressable onPress={() => router.push('/(tabs)/waiting')} style={styles.actionRow}><Feather name="clock" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Waiting loops</Text></Pressable>
      <Pressable onPress={() => router.push('/(tabs)/approvals')} style={styles.actionRow}><Feather name="check-square" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Approvals</Text></Pressable>
    </Card>
    <Card><Text style={[styles.title, { color: colors.foreground }]}>{queued} local capture{queued === 1 ? '' : 's'} awaiting sync</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{uncertainty.length} uncertainty notice{uncertainty.length === 1 ? '' : 's'} remain visible across offline use.</Text></Card>
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  action: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});