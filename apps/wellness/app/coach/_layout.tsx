import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { coach } from "../../src/theme/tokens";

/**
 * Coach tabs. No Calendar tab: the calendar is reached from the home header,
 * which frees the slot for Progress --- where a coach sees revenue and their
 * own analytics. Gym, members and plans live under Settings.
 */
export default function CoachLayout() {
  const theme = coach;
  return (
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
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
