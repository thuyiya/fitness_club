import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface AdminGym {
  id: string; name: string; city: string | null; country: string | null; address: string | null;
  phone: string | null; website: string | null; status: string; capacity: number | null; createdAt: string;
  owner: { id: string; name: string; email: string; role: string };
  coachCount: number; memberCount: number; pendingRequests: number; openReports: number;
}

const FILTERS = ["all", "pending", "active", "rejected"] as const;

const tone = (t: ReturnType<typeof useAuth>["theme"], s: string) =>
  s === "active" ? t.teal : s === "pending" ? t.warning : s === "rejected" ? t.danger : t.muted;

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
};

export default function AdminGyms() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const { busy, run } = useAction();

  const gyms = useApi<{ items: AdminGym[]; totals: { all: number; pending: number; active: number } }>(
    `/v1/admin/gyms?${filter !== "all" ? `status=${filter}&` : ""}${query.trim() ? `q=${encodeURIComponent(query)}` : ""}`,
    [query, filter],
  );

  const decide = async (id: string, decision: "active" | "rejected") => {
    if (await run(() => api(`/v1/admin/gyms/${id}/decide`, { method: "POST", body: { decision } }))) gyms.refetch();
  };

  const items = gyms.data?.items ?? [];
  const totals = gyms.data?.totals;

  return (
    <Screen theme={theme}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md }}>
          <Text style={{ ...typo.display, color: theme.ink }}>Gyms</Text>
          {totals ? (
            <Text style={{ ...typo.caption, color: theme.muted }}>
              {totals.active} active · {totals.pending} pending
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12 }}>
          <Feather name="search" size={16} color={theme.muted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 11, fontSize: 15, color: theme.ink }}
            placeholder="Search by name or city"
            placeholderTextColor={theme.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={15} color={theme.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginTop: space.md }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 6 }}>
          {FILTERS.map((f) => {
            const on = filter === f;
            const count = f === "pending" ? totals?.pending : f === "active" ? totals?.active : f === "all" ? totals?.all : undefined;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1,
                borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
              }}>
                <Text style={{ ...typo.caption, color: on ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{f}</Text>
                {count !== undefined && (
                  <Text style={{ ...typo.caption, color: on ? theme.accent : theme.muted }}>{count}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={gyms.refetch} tintColor={theme.accent} />}
      >
        {gyms.loading && !gyms.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
        ) : items.length === 0 ? (
          <Card theme={theme}>
            <Text style={{ ...typo.body, color: theme.muted }}>
              {query ? `Nothing matched “${query}”.` : "No gyms in this state."}
            </Text>
          </Card>
        ) : items.map((g) => (
          <Pressable key={g.id} onPress={() => router.push({ pathname: "/admin/gym/[id]", params: { id: g.id } })}>
            <Card theme={theme} style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3 }}>
                    {[g.city, g.country].filter(Boolean).join(", ") || "No location set"}
                  </Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    by {g.owner.name} · created {ago(g.createdAt)}
                  </Text>
                </View>
                <Pill theme={theme} label={g.status} tone={tone(theme, g.status)} />
              </View>

              <View style={{ flexDirection: "row", marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
                {[
                  { k: "Coaches", v: g.coachCount, tone: theme.inkSoft },
                  { k: "Members", v: g.memberCount, tone: theme.inkSoft },
                  { k: "Requests", v: g.pendingRequests, tone: g.pendingRequests ? theme.warning : theme.inkSoft },
                  { k: "Reports", v: g.openReports, tone: g.openReports ? theme.danger : theme.inkSoft },
                ].map((s) => (
                  <View key={s.k} style={{ flex: 1 }}>
                    <Text style={{ ...typo.heading, color: s.tone }}>{s.v}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{s.k}</Text>
                  </View>
                ))}
              </View>

              {/* Approval is the reason this screen exists, so it is one tap
                  from the list rather than buried in the detail view. */}
              {g.status === "pending" && (
                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                  <Pressable onPress={() => decide(g.id, "active")} disabled={busy}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm, backgroundColor: theme.teal }}>
                    <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => decide(g.id, "rejected")} disabled={busy}
                    style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: theme.line }}>
                    <Text style={{ ...typo.heading, color: theme.inkSoft }}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
