import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { LeeBottomNav } from '@workspace/mobile-foundation';

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarStyle: { display: 'none' },
      })}
      tabBar={({ state, navigation }) => (
        <LeeBottomNav
          state={state}
          navigation={navigation}
          colors={colors}
          bottomInset={Platform.OS === 'web' ? 8 : insets.bottom}
          renderIcon={(name, color, size) => <Feather name={name as keyof typeof Feather.glyphMap} color={color} size={size} />}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask Lee' }} />
      <Tabs.Screen name="capture" options={{ title: 'Capture' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="systems" options={{ href: null }} />
      <Tabs.Screen name="sessions" options={{ title: 'Watch' }} />
      <Tabs.Screen name="waiting" options={{ href: null }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals' }} />
    </Tabs>
  );
}