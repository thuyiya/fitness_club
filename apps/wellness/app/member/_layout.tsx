import { Feather } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Pressable, View } from "react-native";
import { member, radius } from "../../src/theme/tokens";

/**
 * Member tabs. The centre is not a tab but a raised action that opens the
 * quick-log modal --- logging is the thing a member does many times a day, and
 * burying it one level down is what makes food diaries get abandoned.
 */
export default function MemberLayout() {
  const theme = member;
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
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} /> }} />
      <Tabs.Screen
        name="log"
        options={{
          title: "",
          tabBarButton: () => (
            <Pressable onPress={() => router.push("/member/log")} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  width: 56, height: 56, borderRadius: radius.pill, backgroundColor: theme.accent,
                  alignItems: "center", justifyContent: "center", marginTop: -18,
                  shadowColor: theme.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                }}
              >
                <Feather name="plus" size={28} color="#FFFFFF" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
