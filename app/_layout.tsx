import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '@/theme';
import { AiBootstrap } from '@/components/AiBootstrap';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function StackNavigator() {
  const theme = useTheme();

  // Drive the OS status bar from our own theme (not the system appearance).
  // 'light-content' = white icons for our dark/glass backgrounds; 'dark-content'
  // for the light (cream) theme. On iOS this requires
  // UIViewControllerBasedStatusBarAppearance = NO (set in app.json infoPlist).
  useEffect(() => {
    const barStyle = theme.mode === 'dark' ? 'light-content' : 'dark-content';
    StatusBar.setBarStyle(barStyle, true);
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
  }, [theme.mode]);

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="ai-loading" />
        <Stack.Screen name="ai-setup" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {/* Auto-start / reattach the background model download. Progress is shown
          as a ring around the Lumora tab icon and in-chat — no overlay. */}
      <AiBootstrap />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Note: the OS "Reduce Motion" setting is neutralised in index.js so the
          ring/chart animations always play — see the comment there. */}
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <StackNavigator />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
