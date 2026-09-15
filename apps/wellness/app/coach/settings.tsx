import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Button, Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Gym { id: string; name: string; city: string | null; memberCount: number; pendingRequests: number }
interface Req { id: string; message: string | null; member: { id: string; name: string; email: string } }
interface Plan { id: string; name: string; type: string; difficulty: string | null; dayCount: number; assignedCount: number }

export default function CoachSettings() {
  const { user, theme, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const gyms = useApi<{ items: Gym[] }>("/v1/gyms");
  const members = useApi<{ items: { id: string; name: string; email: string }[] }>("/v1/members");
  const plans = useApi<{ items: Plan[] }>("/v1/plans");
  const gymId = gyms.data?.items[0]?.id ?? null;
  const requests = useApi<{ items: Req[] }>(gymId ? `/v1/gyms/${gymId}/join-requests` : null, [gymId]);
  const { busy, run } = useAction();

  const decide = async (id: string, decision: "approved" | "rejected") => {
    const ok = await run(() => api(`/v1/join-requests/${id}/decide`, { method: "POST", body: { decision } }));
    if (ok) { requests.refetch(); members.refetch(); gyms.refetch(); }
  };

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
            <Text style={{ ...typo.caption, color: theme.muted }}>Coach · {user?.email}</Text>
          </View>
        </Card>

        {(requests.data?.items.length ?? 0) > 0 && (
          <>
            <Text style={{ ...typo.label, color: theme.warning, textTransform: "uppercase", marginBottom: space.sm }}>
              Join requests ({requests.data!.items.length})
            </Text>
            {requests.data!.items.map((r) => (
              <Card key={r.id} theme={theme} style={{ marginBottom: space.sm }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{r.member.name}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{r.member.email}</Text>
                {r.message && <Text style={{ ...typo.body, color: theme.inkSoft, marginTop: space.sm }}>&ldquo;{r.message}&rdquo;</Text>}
                <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                  <Pressable onPress={() => decide(r.id, "approved")} disabled={busy} style={{ flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center", backgroundColor: theme.teal }}>
                    <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Approve</Text>
                  </Pressable>
                  <Pressable onPress={() => decide(r.id, "rejected")} disabled={busy} style={{ flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center", borderWidth: 1, borderColor: theme.line }}>
                    <Text style={{ ...typo.heading, color: theme.inkSoft }}>Decline</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>Gyms</Text>
        {gyms.loading && !gyms.data ? <ActivityIndicator color={theme.accent} /> :
         (gyms.data?.items.length ?? 0) === 0 ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>You do not own a gym yet.</Text></Card>
         ) : gyms.data!.items.map((g) => (
          <Card key={g.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                {g.city ?? "—"} · {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
              </Text>
            </View>
            {g.pendingRequests > 0 && <Pill theme={theme} label={`${g.pendingRequests} pending`} tone={theme.warning} />}
          </Card>
        ))}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>
          Members ({members.data?.items.length ?? 0})
        </Text>
        {members.data?.items.map((m) => (
          <Card key={m.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
            <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...typo.heading, color: theme.accent }}>{m.name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.body, color: theme.ink }}>{m.name}</Text>
              <Text style={{ ...typo.caption, color: theme.muted }}>{m.email}</Text>
            </View>
          </Card>
        ))}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>
          Plans ({plans.data?.items.length ?? 0})
        </Text>
        {(plans.data?.items.length ?? 0) === 0 ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>No plans yet.</Text></Card>
        ) : plans.data!.items.map((p) => (
          <Card key={p.id} theme={theme} style={{ marginBottom: space.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{p.name}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                  {p.type} · {p.dayCount} day{p.dayCount === 1 ? "" : "s"} · {p.assignedCount} assigned
                </Text>
              </View>
              {p.difficulty && <Pill theme={theme} label={p.difficulty} tone={theme.teal} />}
            </View>
          </Card>
        ))}

        <Card theme={theme} style={{ marginTop: space.lg, marginBottom: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="tool" size={15} color={theme.muted} />
            <Text style={{ ...typo.caption, color: theme.muted, flex: 1 }}>
              Plan and meal builders are API-complete but have no screens yet.
            </Text>
          </View>
        </Card>

        <Button theme={theme} label="Sign out" variant="ghost" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}
