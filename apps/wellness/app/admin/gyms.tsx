import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { space, type as typo } from "../../src/theme/tokens";

interface Gym { id: string; name: string; city: string | null; status: string; memberCount: number; owner: { name: string; email: string } }

export default function AdminGyms() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const gyms = useApi<{ items: Gym[] }>("/v1/admin/gyms");
  const users = useApi<{ items: { id: string; name: string; email: string; role: string; status: string }[] }>("/v1/admin/users?limit=20");

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Gyms</Text>
        {gyms.loading && !gyms.data ? <ActivityIndicator color={theme.accent} /> :
         (gyms.data?.items.length ?? 0) === 0 ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>No gyms yet.</Text></Card>
        ) : gyms.data!.items.map((g) => (
          <Card key={g.id} theme={theme} style={{ marginBottom: space.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                  {g.city ?? "—"} · owned by {g.owner.name}
                </Text>
              </View>
              <Pill theme={theme} label={`${g.memberCount} members`} tone={theme.teal} />
            </View>
          </Card>
        ))}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Recent users
        </Text>
        {users.data?.items.map((u) => (
          <Card key={u.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.body, color: theme.ink }}>{u.name}</Text>
              <Text style={{ ...typo.caption, color: theme.muted }}>{u.email}</Text>
            </View>
            <Pill theme={theme} label={u.role} tone={u.role === "admin" ? theme.accent : u.role === "coach" ? theme.teal : theme.muted} />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
