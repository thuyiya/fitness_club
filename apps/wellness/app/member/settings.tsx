import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, Screen, SettingsGroup, SettingsRow } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { useTheme } from "../../src/state/theme";
import { useUnits } from "../../src/state/units";
import { space, type as typo } from "../../src/theme/tokens";

/**
 * Member settings: a menu, not a form.
 *
 * Every row opens its own screen. The previous version edited weight, theme and
 * profile inline, which made one screen carry four unrelated jobs and left no
 * room for any of them to explain itself.
 */
export default function MemberSettings() {
  const { user, theme, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { preference } = useTheme();
  const { system } = useUnits();

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Settings</Text>

        <SettingsGroup theme={theme}>
          <SettingsRow
            theme={theme}
            avatar={user?.name?.[0]?.toUpperCase() ?? "?"}
            title={user?.name ?? ""}
            subtitle={user?.email}
            onPress={() => router.push("/member/profile")}
            last
          />
        </SettingsGroup>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Preferences
        </Text>
        <SettingsGroup theme={theme}>
          <SettingsRow theme={theme} icon="sun" title="Appearance"
            badge={preference === "system" ? "System" : preference === "dark" ? "Dark" : "Light"}
            onPress={() => router.push("/member/appearance")} />
          <SettingsRow theme={theme} icon="bell" title="Notifications"
            onPress={() => router.push("/member/notification-settings")} />
          <SettingsRow theme={theme} icon="heart" title="Health connections"
            onPress={() => router.push("/member/health")} />
          <SettingsRow theme={theme} icon="sliders" title="Units"
            badge={system === "metric" ? "Metric" : "Imperial"}
            onPress={() => router.push("/member/units")} last />
        </SettingsGroup>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Support
        </Text>
        <SettingsGroup theme={theme}>
          <SettingsRow theme={theme} icon="lock" title="Privacy" onPress={() => router.push("/legal/privacy")} />
          <SettingsRow theme={theme} icon="file-text" title="Terms and conditions" onPress={() => router.push("/legal/terms")} />
          <SettingsRow theme={theme} icon="help-circle" title="Help" onPress={() => router.push("/legal/help")} />
          <SettingsRow theme={theme} icon="info" title="About" onPress={() => router.push("/legal/about")} last />
        </SettingsGroup>

        <View style={{ marginTop: space.xl }}>
          <Button theme={theme} label="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}
