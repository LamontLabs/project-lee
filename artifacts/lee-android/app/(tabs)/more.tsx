import React, { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Eyebrow, PageBrand, Screen, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { LeeBody, LeeRow, LeeSheet, LeeStatusPill } from '@workspace/mobile-foundation';

const unavailable = 'Not exposed by the current mobile API. Nothing was changed.';

export default function MoreTab() {
  const colors = useColors();
  const [frontierVisible, setFrontierVisible] = useState(false);
  return (
    <Screen>
      <PageBrand />
      <Eyebrow>Private companion</Eyebrow>
      <Title subtitle="Read-only entry points stay explicit. Hosted authority remains on LEE Core.">More.</Title>
      <SectionLabel>Owner context</SectionLabel>
      <Card>
        <LeeRow colors={colors} icon={<Feather name="briefcase" size={19} color={colors.primary} />} title="Projects" detail={unavailable} state={<LeeStatusPill colors={colors} label="Unavailable" tone="neutral" />} chevron />
        <LeeRow colors={colors} icon={<Feather name="users" size={19} color={colors.primary} />} title="People" detail={unavailable} state={<LeeStatusPill colors={colors} label="Unavailable" tone="neutral" />} chevron />
        <LeeRow colors={colors} icon={<Feather name="target" size={19} color={colors.primary} />} title="Objectives" detail={unavailable} state={<LeeStatusPill colors={colors} label="Unavailable" tone="neutral" />} chevron />
      </Card>
      <SectionLabel>Companion</SectionLabel>
      <Card>
        <LeeRow
          colors={colors}
          icon={<Feather name="cpu" size={19} color={colors.primary} />}
          title="Systems"
          detail="Connection health, runtime, contract, and project-operation projections."
          onPress={() => router.push('/(tabs)/systems')}
          chevron
        />
        <LeeRow colors={colors} icon={<Feather name="lock" size={19} color={colors.primary} />} title="Settings & Privacy" detail="Pairing and privacy controls remain server-governed. No local settings write is available." state={<LeeStatusPill colors={colors} label="Read only" tone="neutral" />} chevron />
        <LeeRow colors={colors} icon={<Feather name="zap" size={19} color={colors.primary} />} title="Frontier approval" detail="Jesse-only planned workflow; no mobile endpoint is connected." state={<LeeStatusPill colors={colors} label="Feature gated" tone="warning" />} onPress={() => setFrontierVisible(true)} chevron />
      </Card>
      <Card>
        <LeeRow colors={colors} icon={<Feather name="shield" size={19} color={colors.primary} />} title="Authority boundary" detail="Owner approvals still require a live Core and a fresh server-side CerbaSeal decision. APPROVED never means EXECUTED." />
      </Card>
      <LeeSheet colors={colors} title="Frontier approval" visible={frontierVisible} onClose={() => setFrontierVisible(false)}>
        <View style={styles.sheetContent}>
          <LeeStatusPill colors={colors} label="Unavailable · endpoint missing" tone="warning" />
          <LeeBody colors={colors}>A frontier request would require a separate server-authorized Owner approval flow.</LeeBody>
          <SheetLine colors={colors} label="Requester" value="Jesse / Owner" />
          <SheetLine colors={colors} label="Task type" value="Illustrative only · not submitted" />
          <SheetLine colors={colors} label="Privacy scope" value="owner-private only" />
          <SheetLine colors={colors} label="Proposed model / provider / cost" value="Not available until Core supplies a governed proposal." />
          <SheetLine colors={colors} label="Cheaper option" value="Use standard reasoning" />
          <Text style={[styles.sheetNote, { color: colors.mutedForeground }]}>No family content is included. This screen cannot request, approve, or spend frontier budget until the mobile-specific backend flow exists.</Text>
        </View>
      </LeeSheet>
    </Screen>
  );
}

function SheetLine({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof import('@/hooks/useColors').useColors> }) {
  return <View style={styles.sheetLine}><Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.sheetValue, { color: colors.foreground }]}>{value}</Text></View>;
}

const styles = {
  sheetContent: { gap: 12 },
  sheetLine: { gap: 3 },
  sheetLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' as const },
  sheetValue: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  sheetNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
};