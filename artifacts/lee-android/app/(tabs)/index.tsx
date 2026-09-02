import React, { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Card, Eyebrow, SectionLabel, Title } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import type { ConnectionSummary } from '@/lib/api';
import { getBrief, saveBrief } from '@/lib/storage';
import type { Brief } from '@/lib/types';
import { highestUncertainty, UncertaintyNotice } from '@/components/UncertaintyNotice';

export default function BriefTab() {
  const colors = useColors();
  const { api, uncertainty, contract } = useLee();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [connection, setConnection] = useState<{ connected: boolean; status: string; lastVerifiedAt: string } | null>(null);
  const [operationalConfidence, setOperationalConfidence] = useState<{ score: number; explanation: string; factors: Array<{ label: string; contribution: number; detail: string }> } | null>(null);
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  useEffect(() => { void (async () => { const cached = await getBrief(); if (cached) setBrief(cached); if (api) try { const [live, health, confidence, connectionItems] = await Promise.all([api.brief(), api.health(), api.operationalConfidence(), api.connections()]); setBrief(live); setConnection(health); setOperationalConfidence(confidence); setConnections(connectionItems); await saveBrief(live); setOffline(false); } catch { setConnection(null); setOffline(true); } })(); }, [api]);
  async function refresh() { if (!api) return; setRefreshing(true); try { const [live, health, connectionItems] = await Promise.all([api.brief(), api.health(), api.connections()]); setBrief(live); setConnection(health); setConnections(connectionItems); await saveBrief(live); setOffline(false); } catch { setConnection(null); setOffline(true); } finally { setRefreshing(false); } }
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
       <View style={styles.headerRow}><View><Eyebrow>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</Eyebrow><Title subtitle={offline ? 'Showing your last saved brief.' : 'A calm start to the operating day.'}>Good morning.</Title></View><View style={[styles.status, { backgroundColor: offline ? colors.secondary : colors.accent }]}><View style={[styles.dot, { backgroundColor: offline ? colors.secondaryForeground : colors.primary }]} /><Text style={[styles.statusText, { color: offline ? colors.secondaryForeground : colors.accentForeground }]}>{offline ? 'OFFLINE' : connection?.status === 'healthy' ? 'CONNECTED' : 'SYNCED'}</Text></View></View>
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={[styles.kicker, { color: colors.primaryForeground }]}>TOP PRIORITY</Text>
        <Text style={[styles.priority, { color: colors.primaryForeground }]}>{brief?.alerts[0]?.title ?? 'No priority has been raised yet.'}</Text>
        <Text style={[styles.body, { color: colors.primaryForeground, opacity: 0.78 }]}>{brief?.alerts[0]?.body ?? 'Capture context or ask Lee for the next grounded move.'}</Text>
        <Pressable style={styles.arrow}><Feather name="arrow-up-right" size={20} color={colors.primaryForeground} /></Pressable>
      </Card>
       {(() => { const item = highestUncertainty(uncertainty); return item ? <UncertaintyNotice item={item} offline={offline} /> : null; })()}
       <SectionLabel>System contract</SectionLabel>
       <Card><View style={styles.row}><View style={[styles.iconCircle, { backgroundColor: contract?.health.state === 'available' ? colors.accent : colors.secondary }]}><Feather name="shield" size={18} color={contract?.health.state === 'available' ? colors.primary : colors.secondaryForeground} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{contract ? `Project LEE · v${contract.contractVersion}` : 'System contract unavailable'}</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{contract ? `${contract.health.overall} · ${contract.health.freshness} · ${contract.dependencies.filter((item) => item.state === 'available').length}/${contract.dependencies.length} dependencies available` : 'No live or cached contract is available. Capture remains local-first.'}</Text></View></View></Card>
       <SectionLabel>At a glance</SectionLabel>
       <Card><View style={styles.row}><View style={[styles.iconCircle, { backgroundColor: offline ? colors.secondary : colors.accent }]}><Feather name={offline ? 'wifi-off' : 'wifi'} size={18} color={offline ? colors.secondaryForeground : colors.primary} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Android connection</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{offline ? 'The API could not verify this device. Cached data remains available.' : `Healthy · verified ${connection ? new Date(connection.lastVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}`}</Text></View></View></Card>
       <Card><View style={styles.row}><View style={[styles.iconCircle, { backgroundColor: connections.some((item) => ['needs_reauthorization', 'degraded', 'unavailable'].includes(item.status)) ? colors.secondary : colors.accent }]}><Feather name="link" size={18} color={connections.some((item) => ['needs_reauthorization', 'degraded', 'unavailable'].includes(item.status)) ? colors.secondaryForeground : colors.primary} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Connected systems</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{connections.length ? `${connections.length} registered · ${connections.filter((item) => item.status === 'connected').length} healthy` : 'No connected systems reported.'}</Text>{connections.filter((item) => item.status === 'needs_reauthorization').length > 0 && <Text style={[styles.body, { color: colors.destructive, marginTop: 4 }]}>Reauthorization needed for one or more systems.</Text>}</View></View></Card>
      {operationalConfidence && <Card><View style={styles.row}><View style={[styles.confidenceCircle, { backgroundColor: colors.accent }]}><Text style={[styles.confidenceScore, { color: colors.primary }]}>{operationalConfidence.score}</Text></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Operational confidence</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>{operationalConfidence.explanation}</Text></View></View></Card>}
      <View style={styles.grid}>
         <Card style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{brief?.unreadAlerts ?? 0}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active alerts</Text><Text style={[styles.statHint, { color: colors.destructive }]}>{brief?.unreadAlerts ? 'Needs attention' : 'Quiet signal'}</Text></Card>
         <Card style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{brief?.alerts.length ?? 0}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Brief signals</Text><Text style={[styles.statHint, { color: colors.mutedForeground }]}>Source-backed</Text></Card>
      </View>
      <SectionLabel>Recommended focus</SectionLabel>
      <Card><View style={styles.row}><View style={[styles.iconCircle, { backgroundColor: colors.accent }]}><Feather name="crosshair" size={18} color={colors.primary} /></View><View style={styles.flex}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Finish the pilot decision brief</Text><Text style={[styles.body, { color: colors.mutedForeground }]}>The strongest next move is already visible. Give it a clean decision window.</Text></View></View></Card>
      <SectionLabel>Changed since yesterday</SectionLabel>
       <Card><Text style={[styles.body, { color: colors.foreground }]}>{brief?.alerts.length ? brief.alerts.map((alert) => alert.title).join(' · ') : 'No changes requiring your attention have been recorded.'}</Text></Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  status: { flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  kicker: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 }, priority: { fontSize: 24, lineHeight: 30, fontFamily: 'Inter_700Bold', marginTop: 4 }, body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' }, arrow: { alignSelf: 'flex-end', marginTop: 8 },
  grid: { flexDirection: 'row', gap: 10 }, stat: { flex: 1, minHeight: 122 }, statValue: { fontSize: 30, fontFamily: 'Inter_700Bold' }, statLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 2 }, statHint: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 'auto' },
  row: { flexDirection: 'row', gap: 12 }, iconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  confidenceCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }, confidenceScore: { fontSize: 20, fontFamily: 'Inter_700Bold' },
});