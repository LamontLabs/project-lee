import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { Screen, Eyebrow, Title } from '@/components/Screen';
import { LeeLaunchScreen, RoseBackdrop } from '@workspace/mobile-foundation';

export default function PairingScreen() {
  const colors = useColors();
  const { pairing, pairingError, isClaimingInvite, isLoading } = useLee();
  const [hasContinued, setHasContinued] = useState(false);
  useEffect(() => { if (pairing) router.replace('/(tabs)'); }, [pairing]);
  if (isLoading) return <View style={[styles.loading, { backgroundColor: colors.background }]}><RoseBackdrop colors={colors} backgroundSource={require('../assets/images/lee-background.png')} /><ActivityIndicator color={colors.primary} /></View>;
  if (pairing) return null;
  if (!hasContinued) return <LeeLaunchScreen colors={colors} backgroundSource={require('../assets/images/lee-background.png')} brandSource={require('../assets/images/brand-mark.png')} onContinue={() => setHasContinued(true)} />;
  return <Screen><Image source={require('../assets/images/icon.png')} style={styles.mark} accessibilityLabel="Project LEE" /><Eyebrow>Automatic setup</Eyebrow><Title subtitle="Open the one-time invitation from your Lee Console. This app configures the hosted Core and protects its credential on this device.">Connect to LEE.</Title><View style={[styles.inviteCard, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={[styles.label, { color: colors.primary }]}>{isClaimingInvite ? 'CONNECTING…' : pairingError ? 'INVITATION NEEDS ATTENTION' : 'WAITING FOR INVITATION'}</Text><Text style={[styles.note, { color: colors.mutedForeground }]}>{pairingError ?? 'No URL or token entry is needed. Ask the owner to open a one-time LEE invitation on this device.'}</Text></View><View style={[styles.permissionNote, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={[styles.label, { color: colors.primary }]}>DEVICE PERMISSIONS</Text><Text style={[styles.note, { color: colors.mutedForeground }]}>Screen observation is foreground-only, temporary, and requires an explicit Android permission each time. It never becomes background monitoring.</Text></View></Screen>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, mark: { width: 54, height: 54, borderRadius: 17, marginBottom: 18 }, inviteCard: { borderRadius: 12, borderWidth: 1, gap: 5, marginTop: 12, padding: 14 }, label: { fontSize: 11, letterSpacing: 1.1, fontFamily: 'Inter_700Bold', marginTop: 8 }, note: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginTop: 10 }, permissionNote: { borderRadius: 12, borderWidth: 1, gap: 5, marginTop: 12, padding: 12 } });