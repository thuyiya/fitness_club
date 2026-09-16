import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Screen } from "./ui";
import { space, type as typo, type Theme } from "../theme/tokens";

/**
 * Honest stub for a screen that is designed but not yet built. It states what
 * is missing rather than showing fake content --- a screen full of plausible
 * dummy data is how a demo hides how much is left.
 */
export function Placeholder({ theme, title, planned }: { theme: Theme; title: string; planned: string[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg }}>
          <Pressable onPress={() => router.canGoBack() && router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={theme.inkSoft} />
          </Pressable>
          <Text style={{ ...typo.display, color: theme.ink }}>{title}</Text>
        </View>
        <Card theme={theme}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.md }}>
            <Feather name="tool" size={16} color={theme.warning} />
            <Text style={{ ...typo.heading, color: theme.ink }}>Not built yet</Text>
          </View>
          {planned.map((p) => (
            <View key={p} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              <Text style={{ color: theme.muted }}>—</Text>
              <Text style={{ ...typo.body, color: theme.inkSoft, flex: 1 }}>{p}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
