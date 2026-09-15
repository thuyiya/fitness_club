import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Button, Card, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

export default function MemberSettings() {
  const { user, theme, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const rows = [
    { icon: "user" as const, label: "Profile and body metrics" },
    { icon: "target" as const, label: "Goals and activity level" },
    { icon: "heart" as const, label: "Apple Health / Google Fit" },
    { icon: "bell" as const, label: "Notifications and reminders" },
    { icon: "alert-triangle" as const, label: "Allergens and dietary needs" },
  ];

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Settings</Text>

        <Card theme={theme} style={{ marginBottom: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View style={{ width: 52, height: 52, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...typo.title, color: theme.accent }}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typo.heading, color: theme.ink }}>{user?.name}</Text>
            <Text style={{ ...typo.caption, color: theme.muted }}>{user?.email}</Text>
          </View>
        </Card>

        {rows.map((r) => (
          <Card key={r.label} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Feather name={r.icon} size={18} color={theme.inkSoft} />
            <Text style={{ ...typo.body, color: theme.ink, flex: 1 }}>{r.label}</Text>
            <Feather name="chevron-right" size={18} color={theme.muted} />
          </Card>
        ))}

        <View style={{ marginTop: space.xl }}>
          <Button theme={theme} label="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}
