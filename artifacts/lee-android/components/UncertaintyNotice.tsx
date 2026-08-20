import React from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import type { UncertaintyRecord } from '@/lib/types';

export function highestUncertainty(items: UncertaintyRecord[]): UncertaintyRecord | null {
  const high = items.filter((item) => item.level === 'HIGH' || item.level === 'VERY HIGH');
  return high.sort((a, b) => (b.level === 'VERY HIGH' ? 2 : 1) - (a.level === 'VERY HIGH' ? 2 : 1) || b.score - a.score)[0] ?? null;
}

export function UncertaintyNotice({ item, offline = false }: { item: UncertaintyRecord; offline?: boolean }) {
  const colors = useColors();
  const veryHigh = item.level === 'VERY HIGH';
  const tone = veryHigh ? colors.destructive : colors.secondaryForeground;
  const background = veryHigh ? colors.destructive : colors.secondary;
  return (
    <Card style={[styles.card, { borderColor: tone, backgroundColor: veryHigh ? `${colors.destructive}22` : colors.secondary }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: background }]}>
          <Feather name={veryHigh ? 'alert-octagon' : 'alert-triangle'} size={16} color={veryHigh ? colors.destructiveForeground : tone} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: tone }]}>{veryHigh ? 'VERY HIGH UNCERTAINTY' : 'HIGH UNCERTAINTY'}{offline ? ' · CACHED' : ''}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{item.objectType} · {item.objectId === 'portfolio' ? 'Portfolio' : item.objectId}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{item.signals.slice(0, 2).join(' · ') || 'Several decision signals need validation before acting.'}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5 },
  row: { flexDirection: 'row', gap: 12 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold', textTransform: 'capitalize' },
  body: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
});