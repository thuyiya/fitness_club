import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import {
  Dumbbell,
  HeartPulse,
  LayoutDashboard,
  Settings,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { CoachTabIcon } from '@/components/CoachTabIcon';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme.mode === 'dark';
  // The bottom bar is user-customizable (Settings › Tab bar), capped at 5.
  const tabBar = useSettingsStore((s) => s.tabBar);
  const shown = (key: string) => (tabBar.includes(key as never) ? undefined : null);

  // Frosted-glass edge highlight — a bright hairline rim in light mode, a soft
  // luminous one in dark mode.
  const glassEdge = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        tabBarItemStyle: { paddingVertical: 6 },
        // A floating, rounded glass pill detached from the screen edges.
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: Math.max(insets.bottom, 12),
          height: 62,
          borderRadius: 26,
          borderTopWidth: 0,
          backgroundColor:
            Platform.OS === 'web' ? theme.colors.backgroundElevated : 'transparent',
          paddingTop: 8,
          paddingBottom: 8,
          ...theme.shadows.medium,
        },
        tabBarBackground: () =>
          Platform.OS === 'web' ? null : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 26,
                  overflow: 'hidden',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: glassEdge,
                },
              ]}
            >
              <BlurView
                intensity={isDark ? 40 : 55}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              >
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceGlass }]}
                />
              </BlurView>
            </View>
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: shown('index'),
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          href: shown('meals'),
          tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          href: shown('workouts'),
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="calm"
        options={{
          title: 'Calm',
          href: shown('calm'),
          tabBarIcon: ({ color, size }) => <HeartPulse color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          href: shown('progress'),
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Lumora',
          href: shown('coach'),
          tabBarIcon: ({ color, size }) => <CoachTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
