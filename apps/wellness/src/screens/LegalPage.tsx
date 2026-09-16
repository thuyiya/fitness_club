import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Card, Screen } from "../components/ui";
import { useAuth } from "../state/auth";
import { radius, space, type as typo } from "../theme/tokens";

export interface Section { heading: string; body: string }

/**
 * Shared shell for the policy pages. These are real product surfaces, not
 * placeholders: an app that handles body metrics, food diaries and coach
 * messages has to say what it does with them before review, not after.
 */
export function LegalPage({ title, updated, intro, sections, contact }: {
  title: string; updated: string; intro: string; sections: Section[]; contact?: { label: string; value: string }[];
}) {
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

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}>
        <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.md }}>Last updated {updated}</Text>
        <Text style={{ ...typo.body, color: theme.inkSoft, lineHeight: 21, marginBottom: space.xl }}>{intro}</Text>

        {sections.map((s) => (
          <View key={s.heading} style={{ marginBottom: space.lg }}>
            <Text style={{ ...typo.heading, color: theme.ink, marginBottom: 6 }}>{s.heading}</Text>
            <Text style={{ ...typo.body, color: theme.inkSoft, lineHeight: 21 }}>{s.body}</Text>
          </View>
        ))}

        {contact && (
          <Card theme={theme} style={{ marginTop: space.md }}>
            {contact.map((c, i) => (
              <View key={c.label} style={{ flexDirection: "row", paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
                <Text style={{ ...typo.caption, color: theme.muted, width: 92 }}>{c.label}</Text>
                <Text style={{ ...typo.body, color: theme.ink, flex: 1 }}>{c.value}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
