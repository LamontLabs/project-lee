import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
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
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { LeeProvider } from '@/context/LeeContext';
import { useLee } from '@/context/LeeContext';
import { setBaseUrl } from '@workspace/api-client-react';
import { createNotificationLinkHandler } from '@/lib/notification-links';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { pairing, api, isLoading, clearFreshNotificationTarget, cacheFreshNotificationTarget } = useLee();
  const apiRef = useRef(api);
  const clearTargetRef = useRef(clearFreshNotificationTarget);
  const cacheTargetRef = useRef(cacheFreshNotificationTarget);
  apiRef.current = isLoading ? null : api;
  clearTargetRef.current = clearFreshNotificationTarget;
  cacheTargetRef.current = cacheFreshNotificationTarget;
  const linkHandlerRef = useRef<ReturnType<typeof createNotificationLinkHandler> | null>(null);
  if (!linkHandlerRef.current) {
    linkHandlerRef.current = createNotificationLinkHandler({
      getApi: () => apiRef.current,
      clearFreshTarget: () => clearTargetRef.current(),
      cacheFreshTarget: (target) => cacheTargetRef.current(target),
      navigate: (destination, id) => {
        if (destination === 'alerts') router.replace({ pathname: '/(tabs)/alerts', params: { id } });
        else if (destination === 'approvals') router.replace({ pathname: '/(tabs)/approvals', params: { id } });
        else router.replace({ pathname: '/(tabs)/waiting', params: { id } });
      },
      navigatePublic: (destination, prompt) => {
        if (destination === 'ask') router.replace({ pathname: '/(tabs)/ask', params: prompt ? { prompt } : undefined });
        else router.replace('/(tabs)');
      },
      reportReceiptFailure: () => console.warn('LEE could not record notification receipt.'),
    });
  }

  useEffect(() => {
    if (Platform.OS === 'web' || !pairing || !api) return;
    let active = true;
    void (async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (!active || !('granted' in permission) || permission.granted !== true) return;
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
    if (isLoading) return;
    const handler = linkHandlerRef.current;
    if (!handler) return;
    const linkSubscription = Linking.addEventListener('url', ({ url }) => { void handler.openLink(url); });
    void Linking.getInitialURL().then((url) => { if (url) void handler.openLink(url); }).catch(() => undefined);
    const notificationSubscription = Platform.OS === 'web'
      ? null
      : Notifications.addNotificationResponseReceivedListener((response) => {
        void handler.openNotification(response.notification.request.content.data);
      });
    if (Platform.OS !== 'web') {
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) void handler.openNotification(response.notification.request.content.data);
      }).catch(() => undefined);
    }
    return () => {
      linkSubscription.remove();
      notificationSubscription?.remove();
    };
  }, [isLoading]);

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
