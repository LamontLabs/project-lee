import React from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export function Screen({ children, refreshing = false, onRefresh }: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 94) },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.eyebrow, { color: colors.primary }]}>{children}</Text>;
}

export function Title({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={styles.titleBlock}>
      <Text style={[styles.title, { color: colors.foreground }]}>{children}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.section, { color: colors.mutedForeground }]}>{children}</Text>;
}

export const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  titleBlock: { gap: 6, marginBottom: 4 },
  eyebrow: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontSize: 32, lineHeight: 38, fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  section: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
});