import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

/** The centre "+" destination: four one-tap paths into logging. */
export default function QuickLog() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();

  const options = [
    { icon: "coffee" as const, label: "Meal", hint: "Search the food database", tone: theme.accent },
    { icon: "activity" as const, label: "Exercise", hint: "Workout or a sport", tone: theme.teal },
    { icon: "droplet" as const, label: "Hydration", hint: "Add a glass or bottle", tone: theme.lime },
    { icon: "camera" as const, label: "Photo", hint: "Progress or meal snap", tone: theme.warning },
  ];

  return (
    <Screen theme={theme}>
      <View style={{ padding: space.lg, paddingTop: insets.top + space.md, flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.xl }}>
          <Text style={{ ...typo.display, color: theme.ink }}>Quick log</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={24} color={theme.inkSoft} />
          </Pressable>
        </View>

        {options.map((o) => (
          <Pressable
            key={o.label}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg, marginBottom: space.md,
              backgroundColor: pressed ? theme.cardAlt : theme.card,
              borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
            })}
          >
            <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: o.tone + "1F", alignItems: "center", justifyContent: "center" }}>
              <Feather name={o.icon} size={22} color={o.tone} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.heading, color: theme.ink }}>{o.label}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{o.hint}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.muted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
