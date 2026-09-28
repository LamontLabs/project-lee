import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card, Eyebrow, PageBrand, Screen, SectionLabel, Title } from '@/components/Screen';
import { useLee } from '@/context/LeeContext';
import { useColors } from '@/hooks/useColors';
import type { CognitiveRuntimeSnapshot, ConnectionSummary } from '@/lib/api';
import { createClientManifest, getOrCreateDeviceMetadata } from '@workspace/mobile-foundation';
import { MobileStatePill, mobileTokens } from '@workspace/mobile-foundation';

export default function SystemsTab() {
  const colors = useColors();
  const { pairing, captures, uncertainty, contract, connections: cachedConnections, projectOperations: cachedProjectOperations, selfAwareness: cachedSelfAwareness, runtime: cachedRuntime, hosted, refresh } = useLee();
  const connections = cachedConnections?.value ?? [];
  const runtime = cachedRuntime?.value ?? null;
  const projects = cachedProjectOperations?.value ?? [];
  const selfModel = cachedSelfAwareness?.value;
  const hostedMilestone = selfModel?.hostedReality.milestone;
  const clientManifest = createClientManifest('owner', '1.0.0');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const queued = captures.filter((capture) => capture.status !== 'synced').length;
  const contractState = contract?.value.health?.state ?? 'unavailable';
  const statusColor = pairing && contractState === 'available' ? colors.primary : colors.accent;

  useEffect(() => {
    void getOrCreateDeviceMetadata('owner').then((metadata) => setDeviceId(metadata.deviceId)).catch(() => setDeviceId(null));
  }, []);

  return <Screen refreshing={false} onRefresh={() => void refresh()}>
    <PageBrand />
    <Eyebrow>Companion health</Eyebrow>
    <Title subtitle="Connection, local capture, and system signals stay visible without making the phone a configuration surface.">More.</Title>
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: statusColor }]}><Feather name={pairing ? 'wifi' : 'wifi-off'} size={18} color={colors.primaryForeground} /></View>
        <View style={styles.copy}><View style={styles.titleRow}><Text style={[styles.title, { color: colors.foreground }]}>{pairing ? 'Paired to Lee' : 'Offline companion'}</Text><MobileStatePill colors={colors} label={pairing ? contractState : 'Offline'} tone={pairing && contractState === 'available' ? 'positive' : 'warning'} /></View><Text style={[styles.body, { color: colors.mutedForeground }]}>{pairing ? `System contract ${contractState}.` : 'Capture remains local until the companion is paired.'}</Text></View>
      </View>
    </Card>
    <SectionLabel>Client and session</SectionLabel>
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: hosted.freshness === 'live' ? colors.primary : colors.accent }]}><Feather name="smartphone" size={18} color={colors.primaryForeground} /></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{clientManifest.clientName} · v{clientManifest.clientVersion}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>Core status: {hosted.freshness} · {hosted.detail}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{pairing ? `Session paired ${new Date(pairing.pairedAt).toLocaleString()} · bearer token remains in OS-protected storage.` : 'No active session. Pairing is required for hosted reads and governed actions.'}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{deviceId ? `Device ${deviceId}` : 'Device identity is unavailable until protected storage is ready.'}</Text>
        </View>
      </View>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>Capabilities: {clientManifest.capabilities.join(' · ')}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>Client type identifies the surface; Core authorization and CerbaSeal still govern access and consequential actions.</Text>
    </Card>
    <SectionLabel>Hosted self-model</SectionLabel>
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: hostedMilestone?.status === 'complete' || hostedMilestone?.status === 'current' ? colors.primary : colors.accent }]}><Feather name="layers" size={18} color={colors.primaryForeground} /></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{hostedMilestone?.title ?? 'Hosted reality unavailable'}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{hostedMilestone?.status ?? 'unverified'} · {cachedSelfAwareness?.freshness ?? 'unverified'} · {hostedMilestone?.freshness ?? 'unverified'} evidence</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{hostedMilestone?.detail ?? 'Pair with the hosted Core to inspect the shared self-awareness projection.'}</Text>
        </View>
      </View>
      {hostedMilestone?.blockers?.length ? <Text style={[styles.warning, { color: colors.accentForeground }]}>{hostedMilestone.blockers.length} hosted evidence gap{hostedMilestone.blockers.length === 1 ? '' : 's'} remain visible. K6 desktop work stays deferred.</Text> : null}
      {selfModel?.hostedReality.deferredDesktop && <Text style={[styles.body, { color: colors.mutedForeground }]}>{selfModel.hostedReality.deferredDesktop.label}: {selfModel.hostedReality.deferredDesktop.status} · does not block hosted Core.</Text>}
    </Card>
    <SectionLabel>Project operations</SectionLabel>
    <Card>
      {projects.length ? projects.map((project) => {
        const operations = project.projectOperations;
        const attention = !['healthy', 'current'].includes(operations.health.status) || !['current'].includes(operations.freshness.state);
        return <View key={project.id} style={styles.connectionRow}>
          <View style={[styles.statusDot, { backgroundColor: attention ? colors.accent : colors.primary }]} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.foreground }]}>{project.name}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{operations.health.status} · {operations.freshness.state} · {operations.transport.adapter} transport</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{operations.permissions.capabilityLevel} · {operations.permissions.ownerReviewRequired ? 'owner review required for writes' : 'observe-only'}</Text>
            {attention && <Text style={[styles.warning, { color: colors.accentForeground }]}>{operations.health.detail} {operations.recommendations[0] ?? ''}</Text>}
          </View>
        </View>;
      }) : <Text style={[styles.body, { color: colors.mutedForeground }]}>{pairing ? 'No registered project operations are visible.' : 'Project operations are unavailable while offline.'}</Text>}
      {cachedProjectOperations && <Text style={[styles.body, { color: colors.mutedForeground }]}>Project status is {cachedProjectOperations.freshness}; cached values never imply live authority.</Text>}
    </Card>
    <SectionLabel>Cognitive runtime</SectionLabel>
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: runtime?.status === 'completed' ? colors.primary : colors.accent }]}><Feather name="cpu" size={18} color={colors.primaryForeground} /></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{runtime ? `${runtime.status} runtime` : 'Runtime unavailable'}</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>{runtime?.lastRefreshAt ? `Last refresh ${new Date(runtime.lastRefreshAt).toLocaleString()}.` : 'Pair with Lee to read the latest runtime cycle.'}</Text>
          {runtime?.summary?.mostImportantAction && <Text style={[styles.warning, { color: colors.accentForeground }]}>{runtime.summary.mostImportantAction}</Text>}
        </View>
      </View>
      {runtime && <Text style={[styles.body, { color: colors.mutedForeground }]}>{runtime.staleModels.length} aging/stale model{runtime.staleModels.length === 1 ? '' : 's'} · {runtime.degradedModels.length} degraded/unavailable</Text>}
    </Card>
    <SectionLabel>Connection health</SectionLabel>
    <Card>
      {connections.length ? connections.map((connection) => {
        const attention = connection.status !== 'connected';
        return <View key={connection.id} style={styles.connectionRow}>
          <View style={[styles.statusDot, { backgroundColor: attention ? colors.accent : colors.primary }]} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.foreground }]}>{connection.displayName}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{connection.statusLabel ?? connection.status} · {connection.authority?.primary ?? 'OBSERVE'} authority</Text>
            {attention && <Text style={[styles.warning, { color: colors.accentForeground }]}>{connection.health?.whatFailed ?? connection.health?.summary ?? 'This connection needs attention.'} {connection.health?.remainsAvailable ?? 'Cached and local records remain available.'} {connection.health?.blocked ?? 'Live operations may be blocked.'} {connection.health?.ownerActionRequired ? 'Owner action required.' : connection.health?.recoveryAutomatic ? 'LEE will retry automatically.' : ''}</Text>}
          </View>
        </View>;
      }) : <Text style={[styles.body, { color: colors.mutedForeground }]}>{pairing ? 'No external connections are registered.' : 'Connection health is unavailable while offline. Local capture remains available.'}</Text>}
    </Card>
    <SectionLabel>Operational shortcuts</SectionLabel>
    <Card>
       <Pressable accessibilityRole="button" onPress={() => void refresh()} style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.72 : 1 }]}><Feather name="refresh-cw" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Refresh local and system status</Text></Pressable>
       <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/sessions')} style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.72 : 1 }]}><Feather name="eye" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Watch / Observe</Text></Pressable>
       <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/waiting')} style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.72 : 1 }]}><Feather name="clock" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Waiting loops</Text></Pressable>
       <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/approvals')} style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.72 : 1 }]}><Feather name="check-square" size={17} color={colors.primary} /><Text style={[styles.action, { color: colors.foreground }]}>Approvals</Text></Pressable>
    </Card>
     <Card><Text style={[styles.title, { color: colors.foreground }]}>{queued} local capture{queued === 1 ? '' : 's'} awaiting sync</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{uncertainty?.value.length ?? 0} uncertainty notice{(uncertainty?.value.length ?? 0) === 1 ? '' : 's'} remain visible across offline use.</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{hosted.detail}</Text></Card>
  </Screen>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: mobileTokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 20, lineHeight: 23, fontFamily: 'CormorantGaramond_600SemiBold' },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular', marginTop: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: mobileTokens.touchTarget, paddingVertical: 8 },
  action: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  connectionRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  warning: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium', marginTop: 5 },
});