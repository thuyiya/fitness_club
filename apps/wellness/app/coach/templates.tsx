import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Plan {
  id: string; name: string; type: string; goal: string | null; difficulty: string | null;
  durationWeeks: number | null; dayCount: number; assignedCount: number; isTemplate: boolean;
}

export default function Templates() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<"all" | "workout" | "meal">("all");
  const plans = useApi<{ items: Plan[] }>("/v1/plans?templatesOnly=true");
  const { busy, run } = useAction();

  const list = (plans.data?.items ?? []).filter((p) => filter === "all" || p.type === filter);

  // useAction reports success as a boolean, so the created id is captured
  // here rather than threaded back through it.
  const use = async (t: Plan) => {
    let created: string | null = null;
    const ok = await run(async () => {
      const res = await api<{ plan: { id: string } }>(`/v1/plans/${t.id}/use-template`, { method: "POST", body: { name: t.name } });
      created = res.plan.id;
    });
    if (ok && created) {
      plans.refetch();
      router.push({ pathname: "/coach/plan", params: { id: created } });
    }
  };

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>Templates</Text>
        <Pressable onPress={() => router.push({ pathname: "/coach/plan", params: { type: "workout" } })} hitSlop={12}>
          <Feather name="plus" size={22} color={theme.accent} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: space.lg, marginBottom: space.md }}>
        {(["all", "workout", "meal"] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={{
            paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1,
            borderColor: filter === f ? theme.accent : theme.line,
            backgroundColor: filter === f ? theme.accent + "14" : theme.card,
          }}>
            <Text style={{ ...typo.caption, color: filter === f ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={plans.refetch} tintColor={theme.accent} />}
      >
        {plans.loading && !plans.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} /> :
          list.length === 0 ? (
            <Card theme={theme}>
              <Text style={{ ...typo.heading, color: theme.ink }}>No templates yet</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
                Build a plan, then use “Save as template” to reuse it for other members.
              </Text>
            </Card>
          ) : list.map((t) => (
            <Card key={t.id} theme={theme} style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{t.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3 }}>
                    {t.type} · {t.dayCount} day{t.dayCount === 1 ? "" : "s"}
                    {t.durationWeeks ? ` · ${t.durationWeeks} weeks` : ""}
                    {t.difficulty ? ` · ${t.difficulty}` : ""}
                  </Text>
                </View>
                <Pill theme={theme} label={t.type} tone={t.type === "meal" ? theme.lime : theme.teal} />
              </View>
              <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                <Pressable onPress={() => router.push({ pathname: "/coach/plan", params: { id: t.id } })}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: theme.line }}>
                  <Text style={{ ...typo.caption, color: theme.inkSoft, fontWeight: "600" }}>View</Text>
                </Pressable>
                <Pressable onPress={() => use(t)} disabled={busy}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm, backgroundColor: theme.accent }}>
                  <Text style={{ ...typo.caption, color: "#FFFFFF", fontWeight: "700" }}>Use template</Text>
                </Pressable>
              </View>
            </Card>
          ))}
      </ScrollView>
    </Screen>
  );
}
