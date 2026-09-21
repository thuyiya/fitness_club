import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "./ui";
import { useAuth } from "../state/auth";
import { space, type as typo } from "../theme/tokens";

/** Shared chrome for the screens behind a settings row. */
export function SettingsScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {subtitle ? <Text style={{ ...typo.body, color: theme.muted, marginBottom: space.lg }}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </Screen>
  );
}
