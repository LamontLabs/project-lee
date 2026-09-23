import React from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { LeeBrandMark, LeeCard, LeeDisplayTitle, RoseBackdrop, mobileTokens } from '@workspace/mobile-foundation';

export function Screen({ children, refreshing = false, onRefresh, showArtwork = true }: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  showArtwork?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {showArtwork ? (
        <RoseBackdrop
          colors={colors}
          backgroundSource={require('../assets/images/lee-background.png')}
        />
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 44 : 22), paddingBottom: insets.bottom + (Platform.OS === 'web' ? 38 : 112) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.eyebrow, { color: colors.primary }]}>{children}</Text>;
}

export function PageBrand() {
  const colors = useColors();
  return (
    <View style={styles.brand}>
      <LeeBrandMark colors={colors} source={require('../assets/images/brand-mark.png')} />
    </View>
  );
}

export function Title({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={styles.titleBlock}>
      <LeeDisplayTitle subtitle={subtitle} colors={colors}>{children}</LeeDisplayTitle>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return <LeeCard colors={{ ...colors, surface: colors.card }} style={style}>{children}</LeeCard>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.section, { color: colors.mutedForeground }]}>{children}</Text>;
}

export const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1, position: 'relative', zIndex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  titleBlock: { gap: mobileTokens.spacing.sm, marginBottom: mobileTokens.spacing.xs },
  brand: { marginBottom: mobileTokens.spacing.sm },
  eyebrow: { fontSize: mobileTokens.typography.meta, fontFamily: 'Inter_700Bold', letterSpacing: 1.6, textTransform: 'uppercase' },
  subtitle: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  section: { fontSize: mobileTokens.typography.meta, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: mobileTokens.spacing.sm },
});