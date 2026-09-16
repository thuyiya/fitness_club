import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { QuickLogSheet } from "../../src/components/QuickLogSheet";
import { QuickLogProvider, useQuickLog } from "../../src/state/quicklog";
import { member, radius } from "../../src/theme/tokens";

/**
 * Member tabs. The centre is not a tab but a raised action that opens the
 * quick-log SHEET over whatever screen you are on --- logging is the thing a
 * member does many times a day, and navigating away from their context to do
 * it is what makes food diaries get abandoned.
 */
function MemberTabs() {
  const theme = member;
  const quickLog = useQuickLog();

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
        <Tabs.Screen name="training" options={{ title: "Training", tabBarIcon: ({ color, size }) => <Feather name="repeat" size={size} color={color} /> }} />
        <Tabs.Screen
          name="add"
          options={{
            title: "",
            tabBarButton: () => (
              <Pressable onPress={() => quickLog.open("menu")} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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
        <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} /> }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="meal" options={{ href: null }} />
        <Tabs.Screen name="meal-detail" options={{ href: null }} />
        <Tabs.Screen name="exercise-detail" options={{ href: null }} />
      </Tabs>

      <QuickLogSheet
        theme={theme}
        visible={quickLog.visible}
        onClose={quickLog.close}
        onLogged={quickLog.bumpVersion}
        initialMode={quickLog.mode}
        initialSlot={quickLog.slot}
      />
    </>
  );
}

export default function MemberLayout() {
  return (
    <QuickLogProvider>
      <MemberTabs />
    </QuickLogProvider>
  );
}
