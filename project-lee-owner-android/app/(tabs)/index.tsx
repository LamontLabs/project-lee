import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  LeeBrandMark,
  LeeCard,
  LeeDisplayTitle,
  LeeRow,
  LeeStatusPill,
  type MobileFreshness,
} from '@workspace/mobile-foundation';
import { Screen } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { highestUncertainty, UncertaintyNotice } from '@/components/UncertaintyNotice';

function freshnessTone(freshness: MobileFreshness) {
  return freshness === 'live' ? 'positive' as const : freshness === 'stale' ? 'warning' as const : freshness === 'unavailable' ? 'danger' as const : 'neutral' as const;
}

function freshnessLabel(freshness: MobileFreshness) {
  return freshness === 'live' ? 'Live' : freshness === 'stale' ? 'Cached' : freshness === 'unavailable' ? 'Unavailable' : 'Unverified';
}

export default function BriefTab() {
  const colors = useColors();
  const { brief, uncertainty: uncertaintySnapshot, contract, connections, confidence, hosted, approvals, refresh } = useLee();
  const uncertainty = uncertaintySnapshot?.value ?? [];
  const topAlert = brief?.value.alerts[0];
  const pendingApprovals = approvals?.value.filter((approval) => approval.lifecycle === 'PENDING') ?? [];
  const connectionIssues = connections?.value.filter((item) => item.status !== 'connected') ?? [];
  const pageFreshness = brief?.freshness ?? hosted.freshness;
  const uncertaintyItem = highestUncertainty(uncertainty);

  const summary = useMemo(() => {
    if (brief?.value.alerts.length) return brief.value.alerts.slice(0, 2).map((alert) => alert.title).join(' · ');
    if (contract) return `System contract ${contract.value.health.overall.toLowerCase()} with no alert raised.`;
    return 'No current summary is available from hosted Core.';
  }, [brief, contract]);

  const alertCategory = 'OWNER';
  const motionDetail = confidence?.value.explanation ?? contract?.value.health.overall ?? 'No active hosted activity is available.';
  const watchingDetail = uncertainty.length
    ? `${uncertainty.length} uncertainty signal${uncertainty.length === 1 ? '' : 's'} remain visible for review.`
    : connectionIssues.length
      ? `${connectionIssues.length} connected system${connectionIssues.length === 1 ? '' : 's'} need attention.`
      : 'No uncertainty or connection signal is currently recorded.';

  return (
    <Screen refreshing={false} onRefresh={() => void refresh()}>
      <View style={styles.brand}>
        <LeeBrandMark colors={colors} source={require('../../assets/images/brand-mark.png')} />
      </View>

      <LeeDisplayTitle colors={colors}>
        Good morning,{'\n'}Jesse.
      </LeeDisplayTitle>

      <Text style={[styles.scopeState, { color: colors.mutedForeground }]}>Owner context · All authorized projections</Text>
      <Text style={[styles.scopeNote, { color: colors.mutedForeground }]}>Lab and Home views are unavailable because the hosted Today brief does not provide per-projection context metadata. No client-side filtering is applied.</Text>

      <LeeCard colors={colors} style={styles.itemCard}>
        <LeeRow
          colors={colors}
          icon={<Feather name="file-text" size={22} color={colors.foreground} />}
          title="Needs You"
          detail={topAlert?.body ?? (pendingApprovals.length ? `${pendingApprovals.length} owner approval${pendingApprovals.length === 1 ? '' : 's'} are waiting in the governed inbox.` : 'No owner action is currently recorded.')}
          detailNumberOfLines={1}
          state={<View style={styles.stateStack}><LeeStatusPill colors={colors} tone={pendingApprovals.length || topAlert ? 'warning' : 'neutral'} label={pendingApprovals.length ? 'Approval required' : topAlert ? topAlert.severity : 'Quiet'} /><Text style={[styles.category, { color: colors.mutedForeground }]}>{alertCategory}</Text></View>}
        />
      </LeeCard>

      <LeeCard colors={colors} style={styles.itemCard}>
        <LeeRow
          colors={colors}
          icon={<Feather name="refresh-cw" size={22} color={colors.foreground} />}
          title="In Motion"
          detail={motionDetail}
          detailNumberOfLines={1}
          state={<View style={styles.stateStack}><LeeStatusPill colors={colors} tone={pageFreshness === 'live' ? 'positive' : 'warning'} label={pageFreshness === 'live' ? 'In progress' : 'Cached'} /><Text style={[styles.category, { color: colors.mutedForeground }]}>SYSTEM</Text></View>}
        />
      </LeeCard>

      <LeeCard colors={colors} style={styles.itemCard}>
        <LeeRow
          colors={colors}
          icon={<Feather name="calendar" size={22} color={colors.foreground} />}
          title="Watching"
          detail={watchingDetail}
          detailNumberOfLines={1}
          state={<View style={styles.stateStack}><LeeStatusPill colors={colors} tone={uncertainty.length || connectionIssues.length ? 'warning' : 'positive'} label={uncertainty.length || connectionIssues.length ? 'Review' : 'Clear'} /><Text style={[styles.category, { color: colors.mutedForeground }]}>SIGNALS</Text></View>}
        />
      </LeeCard>

      <LeeCard colors={colors} style={[styles.itemCard, styles.summaryCard]}>
        <LeeRow
          colors={colors}
          icon={<Feather name="align-left" size={22} color={colors.foreground} />}
          title="LEE Summary"
          detail={summary}
          detailNumberOfLines={4}
        />
      </LeeCard>

      {uncertaintyItem ? <UncertaintyNotice item={uncertaintyItem} offline={hosted.freshness !== 'live'} /> : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { marginBottom: 6 },
  itemCard: { padding: 14 },
  stateStack: { alignItems: 'flex-start', gap: 5, minWidth: 78 },
  category: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  summaryCard: { minHeight: 120, paddingVertical: 12 },
  scopeNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: -2 },
  scopeState: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18 },
});