import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { space, type as typo } from "../../src/theme/tokens";

export default function AdminOverview() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();

  const stats = [
    { k: "Gyms", v: "18", i: "home" as const },
    { k: "Coaches", v: "64", i: "users" as const },
    { k: "Members", v: "1,284", i: "user" as const },
    { k: "MRR", v: "£28.4k", i: "credit-card" as const },
  ];

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Overview</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, marginBottom: space.xl }}>
          {stats.map((s) => (
            <Card key={s.k} theme={theme} style={{ width: "47%", flexGrow: 1 }}>
              <Feather name={s.i} size={18} color={theme.accent} />
              <Text style={{ ...typo.title, color: theme.ink, marginTop: space.sm }}>{s.v}</Text>
              <Text style={{ ...typo.caption, color: theme.muted }}>{s.k}</Text>
            </Card>
          ))}
        </View>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Platform health</Text>
        {[
          { k: "API", v: "Operational", ok: true },
          { k: "Database", v: "51 tables, 5 migrations", ok: true },
          { k: "Semantic search", v: "pgvector active, 225 embedded", ok: true },
        ].map((r) => (
          <Card key={r.k} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ ...typo.heading, color: theme.ink }}>{r.k}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{r.v}</Text>
            </View>
            <Pill theme={theme} label={r.ok ? "OK" : "Down"} tone={r.ok ? theme.teal : theme.danger} />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
