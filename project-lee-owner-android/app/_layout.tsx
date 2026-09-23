import React, { useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { LeeProvider } from '@/context/LeeContext';
import { useLee } from '@/context/LeeContext';
import { getInitialAndroidShare, subscribeToAndroidShare } from '@/lib/native-share';
import type { AndroidSystemSharePayload } from '@/lib/system-share';
import { setBaseUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();
const FONT_LOAD_TIMEOUT_MS = 2500;

function RootLayoutNav() {
  const colors = useColors();
  const { pairing, api, refresh, captureSystemShare, isLoading, observationSession, endObservationSession } = useLee();
  const captureSystemShareRef = useRef(captureSystemShare);
  captureSystemShareRef.current = captureSystemShare;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;
  const pendingShareRef = useRef<AndroidSystemSharePayload | null>(null);
  const consumedShareIdsRef = useRef(new Set<string>());
  const consumeShareRef = useRef<(payload: AndroidSystemSharePayload | null) => Promise<void>>(async () => undefined);
  consumeShareRef.current = async (payload) => {
    if (!payload) return;
    if (isLoadingRef.current) {
      pendingShareRef.current = payload;
      return;
    }
    if (consumedShareIdsRef.current.has(payload.captureId)) return;
    consumedShareIdsRef.current.add(payload.captureId);
    try {
      if (await captureSystemShareRef.current(payload)) router.replace('/(tabs)/capture');
    } catch {
      // The existing local-first queue owns all accepted system-share failures.
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    const subscription = subscribeToAndroidShare((payload) => {
      if (active) void consumeShareRef.current(payload);
    });
    void getInitialAndroidShare().then((payload) => {
      if (active) void consumeShareRef.current(payload);
    }).catch(() => undefined);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !pendingShareRef.current) return;
    const payload = pendingShareRef.current;
    pendingShareRef.current = null;
    void consumeShareRef.current(payload);
  }, [isLoading]);

  async function navigateToAuthorizedLink(url: string) {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? '').replace(/^\/+/, '');
    const [tab, id] = path.split('/');
    const safeId = id && /^[A-Za-z0-9._:-]{8,160}$/.test(id) ? id : undefined;
    if (pairing && api) {
      try { await refresh(); } catch { return; }
    } else if (tab !== 'index' && tab !== 'today') {
      return;
    }
    if (tab === 'alerts' || tab === 'approvals') {
      router.replace(safeId ? { pathname: `/(tabs)/${tab}`, params: { id: safeId } } : `/(tabs)/${tab}`);
    } else if (tab === 'waiting') {
      router.replace('/(tabs)/waiting');
    } else if (tab === 'ask') {
      const contextId = typeof parsed.queryParams?.alertId === 'string' && /^[A-Za-z0-9._:-]{8,160}$/.test(parsed.queryParams.alertId)
        ? parsed.queryParams.alertId
        : safeId;
      if (contextId) router.replace({ pathname: '/(tabs)/ask', params: { alertId: contextId } });
    } else if (tab === 'today' || tab === 'index') {
      router.replace('/(tabs)');
    }
  }

  useEffect(() => {
    if (Platform.OS === 'web' || !pairing || !api) return;
    let active = true;
    void (async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (!active || permission.status !== 'granted') return;
      await Promise.all([
        Notifications.setNotificationChannelAsync('brief', { name: 'Lee brief', importance: Notifications.AndroidImportance.HIGH }),
        Notifications.setNotificationChannelAsync('waiting', { name: 'Lee waiting', importance: Notifications.AndroidImportance.HIGH }),
        Notifications.setNotificationChannelAsync('approval', { name: 'Lee approvals', importance: Notifications.AndroidImportance.MAX }),
      ]);
       const deviceToken = await Notifications.getDevicePushTokenAsync();
       if (active && typeof deviceToken.data === 'string') await api.registerPushToken(deviceToken.data);
    })().catch(() => undefined);
    return () => { active = false; };
  }, [pairing, api]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const tab = data?.tab;
      const id = data?.contextId;
      const notificationId = typeof data?.notificationId === 'string' ? data.notificationId : null;
      if (notificationId && api) void api.markNotificationDelivery(notificationId, 'opened').catch(() => undefined);
      if (tab === 'waiting' || tab === 'alerts' || tab === 'approvals') {
        void navigateToAuthorizedLink(`lee-android://${tab}/${typeof id === 'string' ? id : ''}`);
      }
      else if (tab === 'index') void navigateToAuthorizedLink('lee-android://index');
    });
    return () => subscription.remove();
  }, [api, pairing, refresh]);

  useEffect(() => {
     void Linking.getInitialURL().then((url) => { if (url) void navigateToAuthorizedLink(url); }).catch(() => undefined);
     const subscription = Linking.addEventListener('url', ({ url }) => { void navigateToAuthorizedLink(url); });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.root}>
      {observationSession ? (
        <View style={[styles.observationBanner, { backgroundColor: colors.destructive }]}>
          <View style={styles.observationCopy}>
            <Text style={[styles.observationEyebrow, { color: colors.destructiveForeground }]}>{observationSession.sessionType === 'watch' ? 'WATCH ACTIVE' : 'OBSERVE ACTIVE'}</Text>
            <Text style={[styles.observationText, { color: colors.primaryForeground }]}>Screen capture is visible and temporary · ends {new Date(observationSession.hardExpiresAt).toLocaleTimeString()}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void endObservationSession('owner_stopped')} style={[styles.stopButton, { backgroundColor: colors.primaryForeground }]}>
            <Text style={[styles.stopButtonText, { color: colors.destructive }]}>STOP</Text>
          </Pressable>
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = React.useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError || Platform.OS === 'web') return;
    const timeout = setTimeout(() => setFontLoadTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  const startupReady = Platform.OS === 'web' || fontsLoaded || Boolean(fontError) || fontLoadTimedOut;

  useEffect(() => {
    if (startupReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [startupReady]);

  if (!startupReady && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LeeProvider>
            {React.createElement(
              GestureHandlerRootView,
              null,
              <View style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </View>,
            )}
          </LeeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  observationBanner: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 12 : 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  observationCopy: { flex: 1, gap: 2 },
  observationEyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.2 },
  observationText: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  stopButton: { borderRadius: 10, minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  stopButtonText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
});
