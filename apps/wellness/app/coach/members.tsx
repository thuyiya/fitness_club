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

interface Member { id: string; name: string; email: string; goalType: string | null }
interface Req { id: string; message: string | null; requestedCoachName: string | null; member: { id: string; name: string; email: string } }
interface Gym { id: string; name: string; pendingRequests: number }

export default function Members() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const gyms = useApi<{ items: Gym[] }>("/v1/gyms");
  const members = useApi<{ items: Member[] }>("/v1/members");
  const gymId = gyms.data?.items.find((g) => g.pendingRequests > 0)?.id ?? gyms.data?.items[0]?.id ?? null;
  const requests = useApi<{ items: Req[] }>(gymId ? `/v1/gyms/${gymId}/join-requests` : null, [gymId]);
  const { busy, run } = useAction();

  const decide = async (id: string, decision: "approved" | "rejected") => {
    if (await run(() => api(`/v1/join-requests/${id}/decide`, { method: "POST", body: { decision } }))) {
      requests.refetch(); members.refetch(); gyms.refetch();
    }
  };

  // Filtered on the client: a coach's roster is tens of people, not thousands,
  // and a round trip per keystroke would make it feel slower than it is.
  const q = query.trim().toLowerCase();
  const all = members.data?.items ?? [];
  const shown = q ? all.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) : all;

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>Members</Text>
      </View>

      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 11 }}>
          <Feather name="search" size={16} color={theme.muted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 11, fontSize: 15, color: theme.ink }}
            placeholder="Search by name or email"
            placeholderTextColor={theme.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Feather name="x" size={16} color={theme.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { members.refetch(); requests.refetch(); }} tintColor={theme.accent} />}
      >
        {!q && (requests.data?.items.length ?? 0) > 0 && (
          <>
            <Text style={{ ...typo.label, color: theme.warning, textTransform: "uppercase", marginBottom: space.sm }}>
              Join requests ({requests.data!.items.length})
            </Text>
            {requests.data!.items.map((r) => (
              <Card key={r.id} theme={theme} style={{ marginBottom: space.sm }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{r.member.name}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{r.member.email}</Text>
                {r.requestedCoachName ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.sm }}>
                    <Feather name="user-check" size={13} color={theme.teal} />
                    {/* Who they asked for matters: approving assigns them to
                        that coach, not to whoever clears the queue. */}
                    <Text style={{ ...typo.caption, color: theme.teal, fontWeight: "600" }}>
                      Asked for {r.requestedCoachName}
                    </Text>
                  </View>
                ) : null}
                {r.message && <Text style={{ ...typo.body, color: theme.inkSoft, marginTop: space.sm }}>&ldquo;{r.message}&rdquo;</Text>}
                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                  <Pressable onPress={() => decide(r.id, "approved")} disabled={busy}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center", backgroundColor: theme.teal }}>
                    <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => decide(r.id, "rejected")} disabled={busy}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center", borderWidth: 1, borderColor: theme.line }}>
                    <Text style={{ ...typo.heading, color: theme.inkSoft }}>Decline</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
            <View style={{ height: space.lg }} />
          </>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
          {q ? `${shown.length} match${shown.length === 1 ? "" : "es"}` : `Your members (${all.length})`}
        </Text>
        {members.loading && !members.data ? <ActivityIndicator color={theme.accent} /> :
          shown.length === 0 ? (
            <Card theme={theme}>
              <Text style={{ ...typo.body, color: theme.muted }}>
                {q
                  ? `Nobody matches "${query.trim()}".`
                  : "Nobody yet. Members appear once they request to join a gym you run and you approve them."}
              </Text>
            </Card>
          ) : shown.map((m) => (
            <Pressable key={m.id} onPress={() => router.push({ pathname: "/coach/member/[id]", params: { id: m.id } })}>
              <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...typo.heading, color: theme.accent }}>{m.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{m.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{m.email}</Text>
                </View>
                {m.goalType && <Pill theme={theme} label={m.goalType.replace(/_/g, " ")} tone={theme.teal} />}
                <Feather name="chevron-right" size={18} color={theme.muted} />
              </Card>
            </Pressable>
          ))}
      </ScrollView>
    </Screen>
  );
}
