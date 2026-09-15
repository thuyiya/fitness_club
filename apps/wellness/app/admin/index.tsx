import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApi } from "../../src/api/hooks";
import type { AdminOverview } from "../../src/api/types";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { space, type as typo } from "../../src/theme/tokens";

export default function AdminHome() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const overview = useApi<AdminOverview>("/v1/admin/overview");
  const p = overview.data?.platform;
  const c = overview.data?.catalog;

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={overview.refetch} tintColor={theme.accent} />}
      >
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Overview</Text>

        {overview.loading && !overview.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md, marginBottom: space.xl }}>
              {[
                { k: "Gyms", v: p?.gyms, i: "home" as const },
                { k: "Coaches", v: p?.coaches, i: "users" as const },
                { k: "Members", v: p?.members, i: "user" as const },
                { k: "MRR", v: p ? `£${p.mrr.toLocaleString()}` : "—", i: "credit-card" as const },
              ].map((s) => (
                <Card key={s.k} theme={theme} style={{ width: "47%", flexGrow: 1 }}>
                  <Feather name={s.i} size={18} color={theme.accent} />
                  <Text style={{ ...typo.title, color: theme.ink, marginTop: space.sm }}>{s.v ?? "—"}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted }}>{s.k}</Text>
                </Card>
              ))}
            </View>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Activity</Text>
            <Card theme={theme} style={{ marginBottom: space.xl, flexDirection: "row" }}>
              {[
                { k: "Meals logged today", v: p?.logsToday },
                { k: "Pending join requests", v: p?.pendingRequests },
                { k: "Active subscriptions", v: p?.activeSubs },
              ].map((s) => (
                <View key={s.k} style={{ flex: 1 }}>
                  <Text style={{ ...typo.title, color: theme.ink }}>{s.v ?? "—"}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                </View>
              ))}
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Catalog</Text>
            {[
              { k: "Foods", v: c?.foods },
              { k: "Meals", v: c?.meals },
              { k: "Exercises", v: c?.exercises },
              { k: "Activities", v: c?.activities },
            ].map((r) => (
              <Card key={r.k} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...typo.body, color: theme.ink }}>{r.k}</Text>
                <Text style={{ ...typo.heading, color: theme.inkSoft }}>{r.v ?? "—"}</Text>
              </Card>
            ))}

            <Card theme={theme} style={{ marginTop: space.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>Semantic search</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                  {c ? `${c.embedded} rows embedded` : "—"}
                </Text>
              </View>
              <Pill theme={theme} label={c?.vectorReady ? "pgvector active" : "unavailable"} tone={c?.vectorReady ? theme.teal : theme.danger} />
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
