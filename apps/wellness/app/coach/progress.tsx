import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useApi } from "../../src/api/hooks";
import type { Revenue } from "../../src/api/types";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { space, type as typo } from "../../src/theme/tokens";

export default function CoachProgress() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const revenue = useApi<Revenue>("/v1/coach/revenue?months=6");
  const members = useApi<{ items: unknown[] }>("/v1/members");

  const series = revenue.data?.series ?? [];
  const max = Math.max(...series.map((s) => s.amount), 1);

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { revenue.refetch(); members.refetch(); }} tintColor={theme.accent} />}
      >
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Progress</Text>

        <Card theme={theme} style={{ marginBottom: space.md }}>
          <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase" }}>Revenue this month</Text>
          {revenue.loading && !revenue.data ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: space.lg }} />
          ) : series.length === 0 ? (
            <>
              <Text style={{ fontSize: 34, fontWeight: "700", color: theme.ink, letterSpacing: -1, marginTop: 6 }}>£0</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.sm }}>
                No payments recorded yet. Revenue appears here once store subscriptions are connected.
              </Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: 6, marginBottom: space.lg }}>
                <Text style={{ fontSize: 34, fontWeight: "700", color: theme.ink, letterSpacing: -1 }}>
                  £{revenue.data!.current.toLocaleString()}
                </Text>
                {revenue.data!.changePct != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 8 }}>
                    <Feather name={revenue.data!.changePct >= 0 ? "trending-up" : "trending-down"} size={14} color={revenue.data!.changePct >= 0 ? theme.teal : theme.danger} />
                    <Text style={{ ...typo.caption, color: revenue.data!.changePct >= 0 ? theme.teal : theme.danger, fontWeight: "700" }}>
                      {revenue.data!.changePct}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 10 }}>
                {series.map((r, i) => {
                  const last = i === series.length - 1;
                  return (
                    <View key={r.month} style={{ flex: 1, alignItems: "center" }}>
                      <View style={{ width: "100%", height: Math.max(4, (r.amount / max) * 80), backgroundColor: last ? theme.accent : theme.accent + "3D", borderRadius: 4 }} />
                      <Text style={{ fontSize: 10, color: last ? theme.ink : theme.muted, marginTop: 6 }}>{r.month.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </Card>

        <View style={{ flexDirection: "row", gap: space.md, marginBottom: space.xl }}>
          <Card theme={theme} style={{ flex: 1 }}>
            <Feather name="users" size={18} color={theme.teal} />
            <Text style={{ ...typo.title, color: theme.ink, marginTop: space.sm }}>{members.data?.items.length ?? "—"}</Text>
            <Text style={{ ...typo.caption, color: theme.muted }}>Active members</Text>
          </Card>
          <Card theme={theme} style={{ flex: 1 }}>
            <Feather name="credit-card" size={18} color={theme.lime} />
            <Text style={{ ...typo.title, color: theme.ink, marginTop: space.sm }}>
              {series.reduce((n, s) => n + s.payments, 0)}
            </Text>
            <Text style={{ ...typo.caption, color: theme.muted }}>Payments (6 mo)</Text>
          </Card>
        </View>

        <Card theme={theme}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="info" size={15} color={theme.muted} />
            <Text style={{ ...typo.caption, color: theme.muted, flex: 1 }}>
              Payments arrive from App Store and Play Store webhooks, which are not connected yet.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
