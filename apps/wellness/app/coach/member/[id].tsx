import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/api/client";
import { useApi } from "../../../src/api/hooks";
import { Card, MacroBar, Pill, Screen } from "../../../src/components/ui";
import { useAuth } from "../../../src/state/auth";
import { radius, space, type as typo } from "../../../src/theme/tokens";

interface Detail {
  member: { id: string; name: string; email: string; sex: string | null; goalType: string | null; activityLevel: string | null };
  date: string;
  latestWeightKg: string | null;
  today: {
    meals: { id: string; mealType: string; calories: string; proteinG: string; carbsG: string; fatG: string; name: string | null }[];
    workouts: { id: string; title: string | null; durationMinutes: number | null; caloriesBurned: number | null }[];
    hydrationMl: number; calories: number; proteinG: number;
  };
  week: { trend: { date: string; minutes: number }[]; from: string; to: string };
  goals: { id: string; title: string; source: string; targetValue: string; unit: string | null; achieved: number; evaluated: number }[];
  assignments: { id: string; planName: string; planType: string; startDate: string; status: string }[];
}

export default function MemberDetail() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useApi<Detail>(id ? `/v1/coach/members/${id}` : null, [id]);
  const data = d.data;

  const openThread = async () => {
    try {
      const r = await api<{ thread: { id: string } }>("/v1/threads/direct", { method: "POST", body: { userId: id } });
      if (r.thread) router.push("/coach/chat");
    } catch { /* the chat tab shows the thread either way */ }
  };

  const maxMinutes = Math.max(...(data?.week.trend.map((t) => t.minutes) ?? [1]), 1);

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>{data?.member.name ?? "Member"}</Text>
        <Pressable onPress={openThread} hitSlop={12}>
          <Feather name="message-circle" size={22} color={theme.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={d.refetch} tintColor={theme.accent} />}
      >
        {d.loading && !data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : !data ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.danger }}>{d.error ?? "Could not load"}</Text></Card>
        ) : (
          <>
            <Card theme={theme} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: "row" }}>
                {[
                  { k: "Weight", v: data.latestWeightKg ? `${Number(data.latestWeightKg).toFixed(1)}kg` : "—" },
                  { k: "Goal", v: data.member.goalType?.replace(/_/g, " ") ?? "—" },
                  { k: "Activity", v: data.member.activityLevel?.replace(/_/g, " ") ?? "—" },
                ].map((s) => (
                  <View key={s.k} style={{ flex: 1 }}>
                    <Text style={{ ...typo.caption, color: theme.muted }}>{s.k}</Text>
                    <Text style={{ ...typo.body, color: theme.ink, fontWeight: "600", marginTop: 2, textTransform: "capitalize" }}>{s.v}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Today</Text>
            <Card theme={theme} style={{ marginBottom: space.md }}>
              <View style={{ flexDirection: "row", marginBottom: space.md }}>
                {[
                  { k: "Calories", v: data.today.calories.toLocaleString() },
                  { k: "Protein", v: `${data.today.proteinG}g` },
                  { k: "Water", v: `${(data.today.hydrationMl / 1000).toFixed(1)}L` },
                  { k: "Sessions", v: `${data.today.workouts.length}` },
                ].map((s) => (
                  <View key={s.k} style={{ flex: 1 }}>
                    <Text style={{ ...typo.title, color: theme.ink }}>{s.v}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                  </View>
                ))}
              </View>
              {data.today.meals.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.line, paddingTop: space.md }}>
                  {data.today.meals.map((m) => (
                    <View key={m.id} style={{ marginBottom: space.sm }}>
                      <View style={{ flexDirection: "row", marginBottom: 4 }}>
                        <Text style={{ ...typo.caption, color: theme.inkSoft, flex: 1, textTransform: "capitalize" }}>
                          {m.mealType} · {m.name ?? "Custom"}
                        </Text>
                        <Text style={{ ...typo.caption, color: theme.muted }}>{Math.round(Number(m.calories))} kcal</Text>
                      </View>
                      <MacroBar theme={theme} protein={Number(m.proteinG)} carbs={Number(m.carbsG)} fat={Number(m.fatG)} />
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Last 7 days</Text>
            <Card theme={theme} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, gap: 6 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(data.week.to);
                  day.setDate(day.getDate() - 6 + i);
                  const iso = day.toISOString().slice(0, 10);
                  const mins = data.week.trend.find((t) => t.date === iso)?.minutes ?? 0;
                  return (
                    <View key={iso} style={{ flex: 1, alignItems: "center" }}>
                      <View style={{ width: "100%", height: Math.max(3, (mins / maxMinutes) * 56), backgroundColor: mins ? theme.accent : theme.line, borderRadius: 3 }} />
                      <Text style={{ fontSize: 9, color: theme.muted, marginTop: 4 }}>
                        {day.toLocaleDateString(undefined, { weekday: "narrow" })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Goals</Text>
            {data.goals.length === 0 ? (
              <Card theme={theme} style={{ marginBottom: space.lg }}>
                <Text style={{ ...typo.body, color: theme.muted }}>No active goals.</Text>
              </Card>
            ) : data.goals.map((g) => (
              <Card key={g.id} theme={theme} style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typo.heading, color: theme.ink }}>{g.title}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                      {g.achieved} of {g.evaluated} days met this week
                    </Text>
                  </View>
                  <Pill theme={theme} label={g.source === "coach" ? "Assigned" : "Self-set"} tone={g.source === "coach" ? theme.accent : theme.teal} />
                </View>
              </Card>
            ))}

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>Assigned plans</Text>
            {data.assignments.length === 0 ? (
              <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>Nothing assigned.</Text></Card>
            ) : data.assignments.map((a) => (
              <Card key={a.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center" }}>
                <Feather name={a.planType === "meal" ? "coffee" : "repeat"} size={17} color={theme.teal} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <Text style={{ ...typo.body, color: theme.ink }}>{a.planName}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>from {a.startDate}</Text>
                </View>
                <Pill theme={theme} label={a.status} tone={theme.muted} />
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
