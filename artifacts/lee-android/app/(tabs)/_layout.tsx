import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const tabIcons: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'sun',
  capture: 'mic',
  waiting: 'clock',
  alerts: 'bell',
  ask: 'message-circle',
  approvals: 'check-square',
  systems: 'activity',
};

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: Platform.OS === 'web' ? 84 : 78, paddingTop: 8 },
        tabBarIcon: ({ color, size }: { color: string; size: number }) => <Feather name={tabIcons[route.name] ?? 'circle'} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask Lee' }} />
      <Tabs.Screen name="capture" options={{ title: 'Capture' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="systems" options={{ title: 'Systems' }} />
      <Tabs.Screen name="waiting" options={{ href: null }} />
      <Tabs.Screen name="approvals" options={{ href: null }} />
    </Tabs>
  );
}