import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useApi } from "../../src/api/hooks";
import { Button, Screen, SettingsGroup, SettingsRow } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

/**
 * Coach settings. Two groups only --- what the coach MANAGES, and their own
 * preferences. Anything that reported backend state (build notes, API
 * readiness) has been removed: it belonged in a README, not in the product.
 */
export default function CoachSettings() {
  const { user, theme, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const gyms = useApi<{ items: { id: string; pendingRequests: number }[] }>("/v1/gyms");
  const members = useApi<{ items: unknown[] }>("/v1/members");
  const plans = useApi<{ items: { isTemplate: boolean }[] }>("/v1/plans");

  const gymCount = gyms.data?.items.length ?? 0;
  const requests = (gyms.data?.items ?? []).reduce((n, g) => n + (g.pendingRequests ?? 0), 0);
  const planCount = plans.data?.items.length ?? 0;

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
            onPress={() => router.push("/coach/profile")}
            last
          />
        </SettingsGroup>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Manage
        </Text>
        <SettingsGroup theme={theme}>
          <SettingsRow theme={theme} icon="map-pin" title="Gyms"
            badge={requests > 0 ? String(requests) : gymCount ? String(gymCount) : undefined}
            badgeTone={requests > 0 ? theme.warning : undefined}
            onPress={() => router.push("/coach/gyms")} />
          <SettingsRow theme={theme} icon="users" title="Members"
            badge={members.data ? String(members.data.items.length) : undefined}
            onPress={() => router.push("/coach/members")} />
          <SettingsRow theme={theme} icon="clipboard" title="Plans & templates"
            badge={planCount ? String(planCount) : undefined}
            onPress={() => router.push("/coach/templates")} />
          <SettingsRow theme={theme} icon="layers" title="Teams" onPress={() => router.push("/coach/teams")} last />
        </SettingsGroup>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Preferences
        </Text>
        <SettingsGroup theme={theme}>
          <SettingsRow theme={theme} icon="lock" title="Privacy" onPress={() => router.push("/legal/privacy")} />
          <SettingsRow theme={theme} icon="file-text" title="Terms and conditions" onPress={() => router.push("/legal/terms")} />
          <SettingsRow theme={theme} icon="help-circle" title="Help and support" onPress={() => router.push("/legal/help")} last />
        </SettingsGroup>

        <View style={{ marginTop: space.xl }}>
          <Button theme={theme} label="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}
