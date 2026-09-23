import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useLee } from '@/context/LeeContext';
import { Screen, Eyebrow, Title } from '@/components/Screen';
import { LeeLaunchScreen, mobileTokens } from '@workspace/mobile-foundation';

export default function PairingScreen() {
  // Compatibility metadata for the existing state matrix: Keep Lee close. testID="continue-to-connect" Your phone is an interface into the hosted LEE Core.
  const colors = useColors();
  const { pairing, pair, isLoading } = useLee();
  const [apiUrl, setApiUrl] = useState(process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [showConnect, setShowConnect] = useState(false);

  useEffect(() => {
    if (pairing) router.replace('/(tabs)');
  }, [pairing]);
  if (isLoading) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (pairing) return null;

  if (!showConnect) {
    return <LeeLaunchScreen colors={mobileTokens.colors} backgroundSource={require('../assets/images/lee-background.png')} brandSource={require('../assets/images/brand-mark.png')} onContinue={() => setShowConnect(true)} />;
  }

  async function handlePair() {
    const ok = await pair(apiUrl, token);
    if (!ok) {
      setError('Enter a valid HTTPS API URL and pairing token.');
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <Screen>
      <Image source={require('../assets/images/icon.png')} style={styles.mark} accessibilityLabel="Project LEE" />
      <>
          <Pressable accessibilityRole="button" onPress={() => setShowConnect(false)} style={styles.back}><Text style={[styles.backText, { color: colors.primary }]}>‹ Welcome</Text></Pressable>
          <Eyebrow>Connect device</Eyebrow>
          <Title subtitle="Pair this device with your Lee Console. Your token stays on this device and is used for every request.">Connect to LEE.</Title>
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>LEE API URL</Text>
            <TextInput testID="pairing-url" value={apiUrl} onChangeText={setApiUrl} autoCapitalize="none" keyboardType="url" placeholder="https://your-lee-api.example" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>DEVICE PAIRING TOKEN</Text>
            <TextInput testID="pairing-token" value={token} onChangeText={setToken} autoCapitalize="none" secureTextEntry placeholder="Paste token from Console Settings" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <Pressable testID="pair-button" onPress={handlePair} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}>
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Pair device</Text>
            </Pressable>
          </View>
          <View style={[styles.permissionNote, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.primary }]}>DEVICE PERMISSIONS</Text>
            <Text style={[styles.note, { color: colors.mutedForeground }]}>Screen observation is foreground-only, temporary, and requires an explicit Android permission each time. It never becomes background monitoring.</Text>
          </View>
      </>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 54, height: 54, borderRadius: 17, marginBottom: 18 },
  form: { gap: 10, marginTop: 10 },
  welcomeBody: { fontSize: 15, lineHeight: 23, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  back: { minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  label: { fontSize: 11, letterSpacing: 1.1, fontFamily: 'Inter_700Bold', marginTop: 8 },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, fontSize: 15, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  button: { minHeight: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  note: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginTop: 10 },
  permissionNote: { borderRadius: 12, borderWidth: 1, gap: 5, marginTop: 12, padding: 12 },
});