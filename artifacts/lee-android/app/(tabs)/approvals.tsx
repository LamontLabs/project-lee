import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert as NativeAlert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Eyebrow, PageBrand, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import type { Approval } from '@/lib/types';
import { LeeSheet, LeeBody, LeeMeta, MobileStatePill, mobileTokens } from '@workspace/mobile-foundation';

export default function ApprovalsTab() {
  const colors = useColors();
  const { api, approvals: cachedApprovals, authorizedNotificationTarget, hosted, decideApproval, askWhy: askWhyRemote, refresh } = useLee();
  const allApprovals = cachedApprovals?.value ?? [];
  const offline = hosted.freshness !== 'live';
  const [busy, setBusy] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [sheet, setSheet] = useState<'review' | 'evidence' | 'why' | null>(null);
  const [whyText, setWhyText] = useState('');
  const { id } = useLocalSearchParams<{ id?: string }>();
  const approvals = id
    ? authorizedNotificationTarget?.destination === 'approvals' && authorizedNotificationTarget.id === id
      ? authorizedNotificationTarget.records.filter((approval) => approval.id === id)
      : []
    : allApprovals;

  function isActionable(approval: Approval) {
    return !offline && approval.lifecycle === 'PENDING' && (!approval.expiresAt || new Date(approval.expiresAt).getTime() > Date.now());
  }

  function decide(approval: Approval, decision: 'approve' | 'hold' | 'reject') {
    if (!api || offline) {
      NativeAlert.alert('Online confirmation required', 'This action stays safely unchanged until the paired Lee server is reachable and verified.');
      return;
    }
    if (!isActionable(approval)) {
      NativeAlert.alert('Decision expired', 'This approval is no longer actionable. Refresh the live queue before making a decision.');
      return;
    }
    NativeAlert.alert(
      `${decision[0].toUpperCase()}${decision.slice(1)} this action?`,
      'Your confirmation will be sent to Lee and rechecked by CerbaSeal. A phone decision cannot bypass the server-side gate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm online',
          style: decision === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setBusy(approval.id);
            try {
              await decideApproval(approval.id, decision);
            } catch (cause) {
              NativeAlert.alert('Decision blocked', cause instanceof Error ? cause.message : 'Lee did not release this decision.');
            } finally {
              setBusy('');
            }
          },
        },
      ],
    );
  }

  async function askWhy(approval: Approval) {
    if (offline) {
      NativeAlert.alert('Offline explanation unavailable', 'The cached approval remains available, but asking Lee why requires a live connection.');
      return;
    }
    setBusy(approval.id);
    try {
      const explanation = await askWhyRemote(approval.id);
      setWhyText(explanation);
      setSelectedApproval(approval);
      setSheet('why');
    } catch (cause) {
      NativeAlert.alert('Explanation unavailable', cause instanceof Error ? cause.message : 'Lee could not explain this approval.');
    } finally {
      setBusy('');
    }
  }

  return (
    <Screen refreshing={false} onRefresh={() => void refresh()}>
      <PageBrand />
      <Eyebrow>Unified owner inbox · {hosted.freshness}</Eyebrow>
      <Title subtitle="Lee can prepare the decision. You keep the final say.">Approvals.</Title>
      {offline ? <View style={[styles.banner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="wifi-off" size={15} color={colors.warning} />
        <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>Offline view · showing the last safely cached queue. Decisions are disabled.</Text>
      </View> : null}
      <SectionLabel>{approvals.length} pending decisions</SectionLabel>
      <View style={styles.groupRow}>
        {['Urgent', 'Ready for Review', 'This Week', 'Overdue'].map((label) => {
          const count = label === 'Urgent'
            ? approvals.filter((item) => /high|critical/i.test(item.risk)).length
            : label === 'Overdue'
              ? approvals.filter((item) => item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now()).length
              : label === 'Ready for Review'
                ? approvals.filter((item) => item.lifecycle === 'PENDING').length
                : approvals.filter((item) => item.lifecycle === 'PENDING').length;
          return <View key={label} style={[styles.groupPill, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.groupCount, { color: colors.foreground }]}>{count}</Text></View>;
        })}
      </View>
      {approvals.length ? approvals.map((approval) => {
        const actionable = isActionable(approval);
        const stateTone = approval.lifecycle === 'PENDING' && actionable ? 'warning' : approval.lifecycle === 'APPROVED' ? 'positive' : approval.lifecycle === 'REJECTED' ? 'danger' : 'neutral';
        const cerbaUnavailable = approval.cerbaSeal.state === 'UNAVAILABLE' || approval.cerbaSeal.state === 'EXPIRED';
        return (
          <Card key={approval.id} style={{ borderColor: approval.id === id ? colors.primary : cerbaUnavailable ? colors.destructive : colors.border }}>
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: cerbaUnavailable ? `${colors.destructive}22` : colors.accent }]}>
                <Feather name={cerbaUnavailable ? 'alert-triangle' : 'shield'} size={18} color={cerbaUnavailable ? colors.destructive : colors.primary} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: colors.foreground }]}>{approval.requestedAction}</Text>
                  <MobileStatePill colors={colors} label={approval.lifecycle.replaceAll('_', ' ')} tone={stateTone} />
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{approval.risk} risk · {approval.source.subsystem}</Text>
              </View>
            </View>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{approval.reason}</Text>
            <View style={styles.grid}>
              <Detail label="Target" value={approval.target} colors={colors} />
              <Detail label="Affected system" value={approval.affectedSystem} colors={colors} />
              <Detail label="CerbaSeal" value={approval.cerbaSeal.state === 'EXPIRED' ? 'Expired · fresh decision required' : approval.cerbaSeal.state.replaceAll('_', ' ')} colors={colors} danger={cerbaUnavailable} />
              <Detail label="Evidence" value={`${approval.evidence.length} refs`} colors={colors} />
              <Detail label="Owner confirmation" value={approval.ownerConfirmationRequired ? 'Required online' : 'Not required'} colors={colors} />
              <Detail label="Expires" value={approval.expiresAt ? new Date(approval.expiresAt).toLocaleDateString() : '—'} colors={colors} danger={!actionable && Boolean(approval.expiresAt)} />
            </View>
            <View style={[styles.verdict, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Proposed change</Text>
              <Text style={[styles.verdictText, { color: colors.foreground }]}>{approval.proposedChange}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>{approval.postApprovalEffect}</Text>
            </View>
            {!actionable && approval.lifecycle === 'PENDING' && approval.expiresAt && new Date(approval.expiresAt).getTime() <= Date.now()
              ? <Text style={[styles.expired, { color: colors.destructive }]}>Expired · no decision can be released from this device.</Text>
              : null}
             <View style={styles.actions}>
               <Action label="Review action" onPress={() => { setSelectedApproval(approval); setSheet('review'); }} disabled={false} color={colors.primary} primary />
               <Action label="Evidence / why" onPress={() => { setSelectedApproval(approval); setSheet('evidence'); }} disabled={false} color={colors.mutedForeground} />
              <Action label="Ask why" onPress={() => void askWhy(approval)} disabled={Boolean(busy)} color={colors.mutedForeground} />
              <Action label="Hold" onPress={() => decide(approval, 'hold')} disabled={Boolean(busy) || !actionable} color={actionable ? colors.mutedForeground : colors.border} />
              <Action label="Reject" onPress={() => decide(approval, 'reject')} disabled={Boolean(busy) || !actionable} color={actionable ? colors.destructive : colors.border} />
              <Action label="Approve" onPress={() => decide(approval, 'approve')} disabled={Boolean(busy) || !actionable} color={actionable ? colors.primary : colors.border} primary={actionable} />
            </View>
          </Card>
        );
      }) : <Card><Text style={[styles.body, { color: colors.mutedForeground }]}>{id ? 'This approval is no longer available from the live Owner service.' : 'No governed action is waiting for your decision.'}</Text></Card>}
      <LeeSheet
        colors={colors}
        title={sheet === 'review' ? 'Review action' : sheet === 'evidence' ? 'Evidence / why' : 'Why this is waiting'}
        visible={Boolean(sheet && selectedApproval)}
        onClose={() => { setSheet(null); setSelectedApproval(null); }}
      >
        {selectedApproval && sheet === 'review' ? (
          <View style={styles.sheetContent}>
            <LeeMeta colors={colors}>REQUESTED ACTION</LeeMeta>
            <LeeBody colors={colors}>{selectedApproval.requestedAction}</LeeBody>
            <SheetLine label="Destination" value={selectedApproval.target} colors={colors} />
            <SheetLine label="Scope" value={selectedApproval.affectedSystem} colors={colors} />
            <SheetLine label="Reason" value={selectedApproval.reason} colors={colors} />
            <SheetLine label="CerbaSeal" value={`${selectedApproval.cerbaSeal.state} · ${selectedApproval.cerbaSeal.verdict ?? 'no verdict'}`} colors={colors} danger={selectedApproval.cerbaSeal.state !== 'ALLOW'} />
            <SheetLine label="Owner pending" value={selectedApproval.ownerConfirmationRequired ? 'Your online confirmation is still required.' : 'No owner confirmation requested.'} colors={colors} />
            <Text style={[styles.sheetNote, { color: colors.mutedForeground }]}>APPROVED is not EXECUTED or VERIFIED. Any provider effect remains separately governed and must be independently evidenced.</Text>
          </View>
        ) : selectedApproval && sheet === 'evidence' ? (
          <View style={styles.sheetContent}>
            <LeeMeta colors={colors}>SOURCE-BACKED RECORDS</LeeMeta>
            {selectedApproval.evidence.length ? selectedApproval.evidence.map((item) => (
              <View key={item.id} style={[styles.evidenceRow, { borderColor: colors.border }]}>
                <Text style={[styles.evidenceLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>Source reference · {item.id}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>Relevance: evidence attached to this governed request.</Text>
              </View>
            )) : <LeeBody colors={colors}>No evidence references were returned for this request.</LeeBody>}
          </View>
        ) : (
          <View style={styles.sheetContent}>
            <LeeMeta colors={colors}>SERVER EXPLANATION</LeeMeta>
            <LeeBody colors={colors}>{whyText || 'No explanation was returned.'}</LeeBody>
            <Text style={[styles.sheetNote, { color: colors.mutedForeground }]}>This explanation is informational. It does not authorize an action or change the approval state.</Text>
          </View>
        )}
      </LeeSheet>
    </Screen>
  );
}

function SheetLine({ label, value, colors, danger = false }: { label: string; value: string; colors: ReturnType<typeof import('@/hooks/useColors').useColors>; danger?: boolean }) {
  return <View style={styles.sheetLine}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.sheetValue, { color: danger ? colors.destructive : colors.foreground }]}>{value}</Text></View>;
}

function Detail({ label, value, colors, danger = false }: { label: string; value: string; colors: ReturnType<typeof import('@/hooks/useColors').useColors>; danger?: boolean }) {
  return <View style={styles.detailCell}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.value, { color: danger ? colors.destructive : colors.foreground }]}>{value}</Text></View>;
}

function Action({ label, onPress, disabled, color, primary = false }: { label: string; onPress: () => void; disabled: boolean; color: string; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { borderColor: primary ? color : 'transparent', backgroundColor: primary ? `${color}18` : 'transparent', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}><Text style={[styles.actionText, { color }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: mobileTokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 20, lineHeight: 23, fontFamily: 'CormorantGaramond_600SemiBold' },
  meta: { fontSize: 11, lineHeight: 16, marginTop: 4, fontFamily: 'Inter_400Regular' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', marginTop: 12 },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  value: { fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: 'Inter_500Medium' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  detailCell: { width: '47%', minWidth: 120 },
  verdict: { borderRadius: mobileTokens.radius.sm, borderWidth: 1, padding: 12, marginTop: 14 },
  verdictText: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium', marginTop: 4 },
  expired: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, marginTop: 14 },
  action: { minHeight: mobileTokens.touchTarget, borderWidth: 1, borderRadius: mobileTokens.radius.sm, justifyContent: 'center', paddingHorizontal: 12 },
  actionText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  banner: { borderRadius: mobileTokens.radius.sm, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText: { fontSize: 12, lineHeight: 18, flex: 1, fontFamily: 'Inter_400Regular' },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  groupPill: { borderRadius: mobileTokens.radius.sm, borderWidth: 1, flexGrow: 1, minWidth: 76, padding: 9 },
  groupLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  groupCount: { fontSize: 18, fontFamily: 'CormorantGaramond_600SemiBold', marginTop: 2 },
  sheetContent: { gap: 12 },
  sheetLine: { gap: 3 },
  sheetValue: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  sheetNote: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  evidenceRow: { borderWidth: 1, borderRadius: mobileTokens.radius.sm, gap: 3, padding: 11 },
  evidenceLabel: { fontSize: 14, lineHeight: 19, fontFamily: 'CormorantGaramond_600SemiBold' },
});