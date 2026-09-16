import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { isoDate, useAction, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Member { id: string; name: string; email: string }
interface Plan { plan: { id: string; name: string; type: string; difficulty: string | null; durationWeeks: number | null }; days: unknown[] }

/** Assign one plan to any number of members, as the design's Assign screen does. */
export default function AssignPlan() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [start, setStart] = useState(isoDate(new Date()));
  const { busy, error, run } = useAction();

  const plan = useApi<Plan>(planId ? `/v1/plans/${planId}` : null, [planId]);
  const members = useApi<{ items: Member[] }>("/v1/members");
  const already = useApi<{ items: { member: { id: string } }[] }>(planId ? `/v1/plans/${planId}/assignments` : null, [planId]);

  const assignedIds = new Set((already.data?.items ?? []).map((a) => a.member.id));
  const list = (members.data?.items ?? []).filter((m) => !query.trim() || m.name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const assign = async () => {
    if (picked.length === 0) return;
    if (await run(() => api(`/v1/plans/${planId}/assign-many`, { method: "POST", body: { memberIds: picked, startDate: start } })))
      router.back();
  };

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>Assign plan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {plan.data && (
          <Card theme={theme} style={{ marginBottom: space.lg }}>
            <Text style={{ ...typo.heading, color: theme.ink }}>{plan.data.plan.name}</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3 }}>
              {plan.data.plan.type} · {plan.data.days.length} day{plan.data.days.length === 1 ? "" : "s"}
              {plan.data.plan.durationWeeks ? ` · ${plan.data.plan.durationWeeks} weeks` : ""}
              {plan.data.plan.difficulty ? ` · ${plan.data.plan.difficulty}` : ""}
            </Text>
          </Card>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Assign to</Text>
        <TextInput
          style={{ backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink, marginBottom: space.md }}
          placeholder="Search members" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery}
        />

        {members.loading && !members.data ? <ActivityIndicator color={theme.accent} /> :
          list.map((m) => {
            const on = picked.includes(m.id);
            const has = assignedIds.has(m.id);
            return (
              <Pressable key={m.id} onPress={() => toggle(m.id)}>
                <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ ...typo.heading, color: theme.accent }}>{m.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typo.heading, color: theme.ink }}>{m.name}</Text>
                    {/* Already on it is worth saying --- assigning twice creates
                        a second overlapping assignment, not an update. */}
                    {has && <Text style={{ ...typo.caption, color: theme.warning, marginTop: 2 }}>Already following this plan</Text>}
                  </View>
                  <View style={{
                    width: 24, height: 24, borderRadius: radius.pill,
                    borderWidth: on ? 0 : 1.5, borderColor: theme.line,
                    backgroundColor: on ? theme.accent : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {on && <Feather name="check" size={14} color="#FFFFFF" />}
                  </View>
                </Card>
              </Pressable>
            );
          })}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>Start date</Text>
        <TextInput
          style={{ backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink }}
          value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted}
        />

        {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
      </ScrollView>

      <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: insets.bottom + space.lg }}>
        <Pressable onPress={assign} disabled={busy || picked.length === 0}
          style={{ backgroundColor: picked.length ? theme.accent : theme.cardAlt, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={{ ...typo.heading, color: picked.length ? "#FFFFFF" : theme.muted }}>
              {picked.length === 0 ? "Pick members" : `Assign to ${picked.length} member${picked.length === 1 ? "" : "s"}`}
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
