import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { CoachActionSheet } from "../../src/components/CoachActionSheet";
import { radius } from "../../src/theme/tokens";
import { useAuth } from "../../src/state/auth";

/**
 * Coach tabs. No Calendar tab --- it is reached from the home header, which
 * frees the slot for Progress (revenue and the coach's own analytics). The
 * centre "+" opens the create sheet rather than navigating, matching the
 * member layout so the two personas feel like one product.
 */
export default function CoachLayout() {
  const { theme } = useAuth();
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.line, height: 88, paddingTop: 8 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} /> }} />
        <Tabs.Screen
          name="create"
          options={{
            title: "",
            tabBarButton: () => (
              <Pressable onPress={() => setSheet(true)} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <View style={{
                  width: 56, height: 56, borderRadius: radius.pill, backgroundColor: theme.accent,
                  alignItems: "center", justifyContent: "center", marginTop: -18,
                  shadowColor: theme.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                }}>
                  <Feather name="plus" size={28} color="#FFFFFF" />
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} /> }} />
        {/* Pushed from elsewhere, not tabs of their own. */}
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="member/[id]" options={{ href: null }} />
        <Tabs.Screen name="plan" options={{ href: null }} />
        <Tabs.Screen name="program" options={{ href: null }} />
        <Tabs.Screen name="templates" options={{ href: null }} />
        <Tabs.Screen name="assign" options={{ href: null }} />
        <Tabs.Screen name="add-exercises" options={{ href: null }} />
        <Tabs.Screen name="gyms" options={{ href: null }} />
        <Tabs.Screen name="members" options={{ href: null }} />
        <Tabs.Screen name="teams" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>

      <CoachActionSheet theme={theme} visible={sheet} onClose={() => setSheet(false)} />
    </>
  );
}
