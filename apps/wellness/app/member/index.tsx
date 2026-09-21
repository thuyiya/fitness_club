import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../../src/api/client";
import { isoDate, useApi } from "../../src/api/hooks";
import { Card, MacroBar, Pill, Screen } from "../../src/components/ui";
import { Stat } from "../../src/components/Ring";
import { DateStrip, NotificationBell } from "../../src/components/DateStrip";
import { useQuickLog } from "../../src/state/quicklog";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

interface Entry {
  kind: "meal" | "workout"; id: string; at: string; title: string; calories: number;
  proteinG?: number; carbsG?: number; fatG?: number; mealType?: string | null;
  durationMinutes?: number | null; intensity?: string | null; exercises?: string[]; setCount?: number;
}
interface Timeline {
  entries: Entry[]; loggedSlots: string[];
  totals: { calories: number; proteinG: number; carbsG: number; fatG: number; caloriesBurned: number };
  hydration: { totalMl: number; targetMl: number };
}
interface Alerts {
  count: number;
  hasCoach?: boolean;
  coach?: { coachId: string; name: string } | null;
  unreadNotifications: { id: string; kind: string; title: string; body: string | null }[];
  pendingSurveys: { assignmentId: string; surveyId: string; title: string; dueDate: string | null }[];
  recentAssignments: { id: string; planName: string; planType: string; startDate: string }[];
  todaySessions: { id: string; title: string; startsAt: string; location: string | null }[];
}
interface Targets { ready: boolean; missing?: string[]; targets: { calories: number; proteinG: number; hydrationMl: number } | null }

interface Rec { id: string; slug: string; name: string; servings: string; proteinG: string; carbsG: string; fatG: string; mealType: string | null }

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

export default function MemberHome() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const quickLog = useQuickLog();
  const [date, setDate] = useState(new Date());
  const key = isoDate(date);

  const timeline = useApi<Timeline>(`/v1/logs/timeline?date=${key}`, [quickLog.version]);
  const alerts = useApi<Alerts>("/v1/me/alerts", [quickLog.version]);
  const targets = useApi<Targets>("/v1/me/targets");
  // An ACTIVE coach link, from the alerts endpoint. Having merely messaged a
  // coach is not having one, and using a thread as the proxy hid the prompt
  // from exactly the people who still needed it.
  const hasCoach = alerts.data?.hasCoach ?? false;
  const [recs, setRecs] = useState<Record<string, Rec[]>>({});

  const t = targets.data?.targets;
  const logged = new Set(timeline.data?.loggedSlots ?? []);

  // Suggestions are fetched per slot and rendered UNDER that slot's card, so
  // "what should I eat for lunch?" is answered where the question is asked
  // rather than in a carousel detached from any meal.
  useEffect(() => {
    if (!t || !timeline.data) return;
    const remaining = t.calories - timeline.data.totals.calories;
    const open = SLOTS.filter((s) => !logged.has(s)).slice(0, 2);
    open.forEach((slot) => {
      const share = slot === "snack" ? 0.15 : 0.32;
      // Ask for a realistic PORTION, not the leftover crumbs. Someone already
      // over their target still eats dinner, and a 200 kcal ask matches nothing
      // because every meal would have to scale below the 0.5x serving floor.
      const floor = slot === "snack" ? 180 : 420;
      const wanted = Math.max(floor, Math.round(remaining * (slot === "snack" ? 0.4 : 0.9)));
      api<{ items: Rec[] }>("/v1/recommend/meals", {
        method: "POST",
        body: {
          calories: wanted,
          proteinG: Math.max(12, Math.round(t.proteinG * share)), carbsG: 40, fatG: 15,
          mealType: slot, limit: 3,
        },
      })
        .then((r) => setRecs((prev) => ({ ...prev, [slot]: r.items })))
        .catch(() => {});
    });
  }, [t?.calories, timeline.data?.totals.calories, key]);

  const refresh = () => { timeline.refetch(); alerts.refetch(); targets.refetch(); };
  const entries = timeline.data?.entries ?? [];

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <DateStrip theme={theme} date={date} onChange={setDate} onOpenCalendar={() => router.push("/member/calendar")} />
          <NotificationBell theme={theme} count={alerts.data?.count ?? 0} onPress={() => router.push("/member/notifications")} />
        </View>

        {/* What CHANGED, not arithmetic the summary already shows. */}
        {(alerts.data?.count ?? 0) > 0 && (
          <View style={{ marginBottom: space.lg }}>
            {alerts.data!.todaySessions.map((s) => (
              <AlertRow key={s.id} theme={theme} icon="calendar" tone={theme.accent}
                title={s.title} body={`${hhmm(s.startsAt)}${s.location ? ` · ${s.location}` : ""}`}
                onPress={() => router.push("/member/calendar")} />
            ))}
            {alerts.data!.pendingSurveys.map((s) => (
              <AlertRow key={s.assignmentId} theme={theme} icon="check-square" tone={theme.warning}
                title={s.title} body={s.dueDate ? `Due ${s.dueDate}` : "From your coach"}
                onPress={() => router.push("/member/notifications")} />
            ))}
            {alerts.data!.unreadNotifications.slice(0, 3).map((n) => (
              <AlertRow key={n.id} theme={theme} icon={n.kind === "message" ? "message-circle" : n.kind === "plan_assigned" ? "clipboard" : "bell"}
                tone={theme.teal} title={n.title} body={n.body ?? ""}
                onPress={() => router.push(n.kind === "message" ? "/member/chat" : "/member/notifications")} />
            ))}
          </View>
        )}

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

        <Card theme={theme} style={{ marginBottom: space.xl }}>
          <View style={{ flexDirection: "row", gap: space.lg }}>
            <Stat theme={theme} label="Calories" value={timeline.data?.totals.calories ?? 0} target={t?.calories} color={theme.accent} />
            <Stat theme={theme} label="Protein" value={timeline.data?.totals.proteinG ?? 0} target={t?.proteinG} unit="g" color={theme.accent} />
            <Stat theme={theme} label="Water" value={(timeline.data?.hydration.totalMl ?? 0) / 1000}
              target={(t?.hydrationMl ?? timeline.data?.hydration.targetMl ?? 2500) / 1000} unit="L" color={theme.teal} />
          </View>
          {(timeline.data?.totals.caloriesBurned ?? 0) > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
              <Feather name="zap" size={13} color={theme.teal} />
              <Text style={{ ...typo.caption, color: theme.inkSoft }}>{timeline.data!.totals.caloriesBurned} kcal burned</Text>
            </View>
          )}
        </Card>

        {/* The day in the order it happened. */}
        {/* Placed above the day, not below it: someone without a coach has an
            empty day, and burying the way out of that under empty cards is how
            an app loses them in week one. */}
        {!hasCoach && (
          <Pressable onPress={() => router.push("/member/find-coach")} style={{ marginBottom: space.xl }}>
            <Card theme={theme} style={{ borderColor: theme.accent }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="search" size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>Find your coach</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    Browse by gym or by name, and message them before you join
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.muted} />
              </View>
            </Card>
          </Pressable>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Your day</Text>

        {timeline.loading && !timeline.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: space.xl }} />
        ) : entries.length === 0 ? (
          <Card theme={theme} style={{ marginBottom: space.lg }}>
            <Text style={{ ...typo.body, color: theme.muted }}>Nothing logged yet today.</Text>
          </Card>
        ) : (
          entries.map((e) => (
            <Pressable
              key={`${e.kind}-${e.id}`}
              onPress={() => e.kind === "meal"
                ? router.push({ pathname: "/member/meal-detail", params: { id: e.id } })
                : router.push({ pathname: "/member/exercise-detail", params: { id: e.id } })}
            >
              <Card theme={theme} style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <View style={{ alignItems: "center", width: 44 }}>
                    <Text style={{ ...typo.heading, color: theme.ink }}>{hhmm(e.at)}</Text>
                  </View>
                  <View style={{
                    width: 34, height: 34, borderRadius: radius.pill,
                    backgroundColor: (e.kind === "meal" ? theme.accent : theme.teal) + "1F",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name={e.kind === "meal" ? "coffee" : "activity"} size={16} color={e.kind === "meal" ? theme.accent : theme.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typo.heading, color: theme.ink, textTransform: e.kind === "meal" ? "capitalize" : "none" }}>{e.title}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                      {e.kind === "meal"
                        ? `${e.calories} kcal · ${Math.round(e.proteinG ?? 0)}g protein`
                        : [
                            e.durationMinutes ? `${e.durationMinutes} min` : null,
                            e.calories > 0 ? `${e.calories} kcal` : null,
                            e.setCount ? `${e.setCount} sets` : null,
                            e.exercises?.length ? e.exercises.slice(0, 2).join(", ") : null,
                          ].filter(Boolean).join(" · ") || "Tap to add details"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={theme.muted} />
                </View>
                {e.kind === "meal" && (e.proteinG ?? 0) + (e.carbsG ?? 0) + (e.fatG ?? 0) > 0 && (
                  <View style={{ marginTop: space.sm }}>
                    <MacroBar theme={theme} protein={e.proteinG ?? 0} carbs={e.carbsG ?? 0} fat={e.fatG ?? 0} />
                  </View>
                )}
              </Card>
            </Pressable>
          ))
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>Meals</Text>
        {SLOTS.map((slot) => {
          const isLogged = logged.has(slot);
          const suggestions = recs[slot] ?? [];
          return (
            <View key={slot} style={{ marginBottom: space.md }}>
              <Card theme={theme} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink, textTransform: "capitalize" }}>{slot}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {isLogged
                      ? entries.filter((e) => e.kind === "meal" && e.mealType === slot).map((e) => `${e.calories} kcal`).join(" + ")
                      : "Not logged yet"}
                  </Text>
                </View>
                {/* Logged shows a tick, but stays tappable --- people eat twice
                    at the same slot and a locked card makes that unloggable. */}
                <Pressable
                  onPress={() => router.push({ pathname: "/member/meal", params: { slot, date: key } })}
                  hitSlop={8}
                  style={{
                    width: 34, height: 34, borderRadius: radius.pill,
                    backgroundColor: isLogged ? theme.teal : theme.accent + "14",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Feather name={isLogged ? "check" : "plus"} size={18} color={isLogged ? "#FFFFFF" : theme.accent} />
                </Pressable>
              </Card>

              {!isLogged && suggestions.length > 0 && (
                <View style={{ marginTop: space.sm, marginLeft: space.md }}>
                  <Text style={{ ...typo.caption, color: theme.muted, marginBottom: 6 }}>Suggested</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
                    {suggestions.map((r) => (
                      <Pressable key={r.id} onPress={() => router.push({ pathname: "/member/meal", params: { slot, date: key } })}>
                        <View style={{ width: 170, backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, padding: space.md }}>
                          <Text style={{ ...typo.body, color: theme.ink, fontWeight: "600" }} numberOfLines={2}>{r.name}</Text>
                          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 4 }}>
                            {Math.round(Number(r.proteinG))}g P · serve {Number(r.servings).toFixed(1)}x
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function AlertRow({ theme, icon, tone, title, body, onPress }: {
  theme: ReturnType<typeof useAuth>["theme"]; icon: keyof typeof Feather.glyphMap;
  tone: string; title: string; body: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md, borderLeftWidth: 3, borderLeftColor: tone }}>
        <Feather name={icon} size={17} color={tone} />
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.heading, color: theme.ink }} numberOfLines={1}>{title}</Text>
          {!!body && <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }} numberOfLines={1}>{body}</Text>}
        </View>
        <Feather name="chevron-right" size={17} color={theme.muted} />
      </Card>
    </Pressable>
  );
}
