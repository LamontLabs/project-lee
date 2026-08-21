import React, { useEffect } from 'react';
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
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { LeeProvider } from '@/context/LeeContext';
import { useLee } from '@/context/LeeContext';
import { setBaseUrl } from '@workspace/api-client-react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { pairing, api } = useLee();

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
      const tab = response.notification.request.content.data?.tab;
      if (tab === 'waiting' || tab === 'alerts' || tab === 'approvals') router.replace(`/(tabs)/${tab}`);
      else if (tab === 'index') router.replace('/(tabs)');
    });
    return () => subscription.remove();
  }, []);

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
