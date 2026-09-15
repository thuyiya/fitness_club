import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

export default function AdminSettings() {
  const { user, theme, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Settings</Text>
        <Card theme={theme} style={{ marginBottom: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View style={{ width: 52, height: 52, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...typo.title, color: theme.accent }}>{user?.name?.[0]?.toUpperCase() ?? "A"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typo.heading, color: theme.ink }}>{user?.name}</Text>
            <Text style={{ ...typo.caption, color: theme.muted }}>Platform administrator</Text>
          </View>
        </Card>
        <Button theme={theme} label="Sign out" variant="ghost" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}
