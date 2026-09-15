import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { isoDate, useApi } from "../../src/api/hooks";
import type { DayLog, MealRec, Targets } from "../../src/api/types";
import { Card, MacroBar, Pill, Screen } from "../../src/components/ui";
import { Stat } from "../../src/components/Ring";
import { DateStrip, NotificationBell } from "../../src/components/DateStrip";
import { api } from "../../src/api/client";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function MemberHome() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const key = isoDate(date);

  const day = useApi<DayLog>(`/v1/logs/day?date=${key}`);
  const targets = useApi<Targets>("/v1/me/targets");
  const notifications = useApi<{ unreadCount: number }>("/v1/notifications");
  const [recs, setRecs] = useState<MealRec[] | null>(null);
  const [recsLoading, setRecsLoading] = useState(true);

  const t = targets.data?.targets;

  // Recommendations fill the gap between what is eaten and the day's target,
  // so they change as the day fills up rather than suggesting a full dinner
  // to someone who has already eaten one.
  useEffect(() => {
    if (!t || !day.data) return;
    const eaten = day.data.totals;
    const remaining = {
      calories: Math.max(200, t.calories - eaten.calories),
      proteinG: Math.max(10, t.proteinG - eaten.proteinG),
      carbsG: Math.max(10, t.carbsG - eaten.carbsG),
      fatG: Math.max(5, t.fatG - eaten.fatG),
    };
    setRecsLoading(true);
    api<{ items: MealRec[] }>("/v1/recommend/meals", { method: "POST", body: { ...remaining, limit: 6 } })
      .then((r) => setRecs(r.items))
      .catch(() => setRecs([]))
      .finally(() => setRecsLoading(false));
  }, [t?.calories, day.data?.totals.calories]);

  const refresh = () => { day.refetch(); targets.refetch(); notifications.refetch(); };
  const byType = (slot: string) => day.data?.meals.filter((m) => m.mealType === slot) ?? [];

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={day.loading && !!day.data} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <DateStrip theme={theme} date={date} onChange={setDate} />
          <NotificationBell theme={theme} count={notifications.data?.unreadCount ?? 0} />
        </View>

        {day.error && (
          <Card theme={theme} style={{ marginBottom: space.md, borderColor: theme.danger }}>
            <Text style={{ ...typo.body, color: theme.danger }}>{day.error}</Text>
          </Card>
        )}

        {/* Profile-incomplete is a real state, not an error: say what is missing. */}
        {targets.data && !targets.data.ready && (
          <Pressable onPress={() => router.push("/member/settings")}>
            <Card theme={theme} style={{ marginBottom: space.lg, borderColor: theme.warning }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="alert-circle" size={16} color={theme.warning} />
                <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }}>Finish your profile</Text>
                <Feather name="chevron-right" size={18} color={theme.muted} />
              </View>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
                Add {targets.data.missing?.join(", ")} so your targets can be calculated.
              </Text>
            </Card>
          </Pressable>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
          {t ? "To hit your remaining targets" : "Recommended for you"}
        </Text>

        {recsLoading && !recs ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: space.xl }} />
        ) : (recs?.length ?? 0) === 0 ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>Nothing to suggest right now.</Text></Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {recs!.map((m) => {
              const p = Number(m.proteinG), c = Number(m.carbsG), f = Number(m.fatG);
              return (
                <Pressable key={m.id} onPress={() => router.push({ pathname: "/member/log", params: { mealSlug: m.slug } })}>
                  <Card theme={theme} style={{ width: 230 }}>
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: space.sm, flexWrap: "wrap" }}>
                      {m.mealType && <Pill theme={theme} label={m.mealType} />}
                      {m.prepMinutes != null && <Pill theme={theme} label={`${m.prepMinutes} min`} tone={theme.teal} />}
                    </View>
                    <Text style={{ ...typo.heading, color: theme.ink, marginBottom: 6 }} numberOfLines={2}>{m.name}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>Serve {Number(m.servings).toFixed(2)}x</Text>
                    <MacroBar theme={theme} protein={p} carbs={c} fat={f} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.sm }}>
                      <Text style={{ ...typo.caption, color: theme.accent }}>{p.toFixed(0)}g P</Text>
                      <Text style={{ ...typo.caption, color: theme.teal }}>{c.toFixed(0)}g C</Text>
                      <Text style={{ ...typo.caption, color: theme.warning }}>{f.toFixed(0)}g F</Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Today's summary
        </Text>
        <Card theme={theme}>
          <View style={{ flexDirection: "row", gap: space.lg }}>
            <Stat theme={theme} label="Calories" value={day.data?.totals.calories ?? 0} target={t?.calories} color={theme.accent} />
            <Stat theme={theme} label="Protein" value={day.data?.totals.proteinG ?? 0} target={t?.proteinG} unit="g" color={theme.accent} />
            <Stat theme={theme} label="Water" value={(day.data?.hydration.totalMl ?? 0) / 1000} target={(t?.hydrationMl ?? day.data?.hydration.targetMl ?? 2500) / 1000} unit="L" color={theme.teal} />
          </View>
          {(day.data?.totals.caloriesBurned ?? 0) > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
              <Feather name="zap" size={13} color={theme.teal} />
              <Text style={{ ...typo.caption, color: theme.inkSoft }}>
                {day.data!.totals.caloriesBurned} kcal burned across {day.data!.workouts.length} session{day.data!.workouts.length === 1 ? "" : "s"}
              </Text>
            </View>
          )}
        </Card>

        {(day.data?.workouts.length ?? 0) > 0 && (
          <>
            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>Training</Text>
            {day.data!.workouts.map((w) => (
              <Card key={w.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: theme.teal + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="activity" size={16} color={theme.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{w.title ?? w.activityName ?? "Session"}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {w.durationMinutes} min · {w.caloriesBurned} kcal
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>Meals</Text>
        {SLOTS.map((slot) => {
          const logged = byType(slot);
          return (
            <Card key={slot} theme={theme} style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink, textTransform: "capitalize" }}>{slot}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {logged.length === 0
                      ? "Not logged yet"
                      : `${logged.map((m) => m.mealName ?? "Custom").join(", ")} · ${Math.round(logged.reduce((n, m) => n + Number(m.calories), 0))} kcal`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: "/member/log", params: { slot } })}
                  style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: theme.accent + "14", alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="plus" size={18} color={theme.accent} />
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
