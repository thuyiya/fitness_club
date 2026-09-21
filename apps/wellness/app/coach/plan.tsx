import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { PlanChangeSheet } from "../../src/components/PlanChangeSheet";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface PlanDay {
  id: string; weekNumber: number; dayNumber: number; title: string | null; isRestDay: boolean;
  exercises: { id: string; sets: number | null; reps: number | null; weightKg: string | null; restSeconds: number | null; durationSeconds: number | null; exercise: { id: string; name: string; loggingMode: string; discipline: string | null } }[];
  meals: { id: string; mealType: string; servings: string; meal: { id: string; name: string; calories: string; proteinG: string } }[];
}
interface PlanTree {
  plan: { id: string; name: string; type: string; goal: string | null; difficulty: string | null; durationWeeks: number | null; status: string; isTemplate: boolean };
  days: PlanDay[];
}

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

/**
 * Create or edit a plan. One screen serves workout and meal plans because they
 * are the same object with a different payload per day --- exercises or meals.
 */
export default function PlanBuilder() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; type?: string; assignTo?: string }>();
  const isNew = !params.id;
  const type = (params.type ?? "workout") as "workout" | "meal";

  const tree = useApi<PlanTree>(params.id ? `/v1/plans/${params.id}` : null, [params.id]);
  const { busy, error, run } = useAction();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [difficulty, setDifficulty] = useState<string>("beginner");
  const [planId, setPlanId] = useState<string | undefined>(params.id);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ members: { id: string; name: string }[] } | null>(null);

  useEffect(() => {
    if (!tree.data) return;
    setName(tree.data.plan.name);
    setGoal(tree.data.plan.goal ?? "");
    setWeeks(tree.data.plan.durationWeeks ?? 4);
    setDifficulty(tree.data.plan.difficulty ?? "beginner");
    setActiveDay((d) => d ?? tree.data!.days[0]?.id ?? null);
  }, [tree.data?.plan.id]);

  const planType = tree.data?.plan.type ?? type;
  const days = tree.data?.days ?? [];
  const day = days.find((d) => d.id === activeDay) ?? days[0];

  const save = async (strategy?: "propagate" | "fork" | "detach") => {
    if (!name.trim()) return;
    if (isNew && !planId) {
      const r = await run(async () => {
        const res = await api<{ plan: { id: string } }>("/v1/plans", {
          method: "POST",
          body: { type: planType, name: name.trim(), goal: goal.trim() || undefined, difficulty, durationWeeks: weeks },
        });
        setPlanId(res.plan.id);
        router.setParams({ id: res.plan.id });
        // Arriving from a member's profile means the plan is FOR them; assign
        // it on creation rather than making the coach find them again.
        if (params.assignTo) {
          await api(`/v1/plans/${res.plan.id}/assign-many`, {
            method: "POST",
            body: { memberIds: [params.assignTo], startDate: new Date().toISOString().slice(0, 10) },
          }).catch(() => {});
        }
        return res;
      });
      if (r) tree.refetch();
      return;
    }
    try {
      await api(`/v1/plans/${planId}`, {
        method: "PATCH",
        body: { name: name.trim(), goal: goal.trim() || undefined, difficulty, durationWeeks: weeks, ...(strategy ? { strategy } : {}) },
      });
      setConflict(null);
      tree.refetch();
    } catch (e) {
      // The API refuses to guess what should happen to people already on the
      // plan; surface that choice rather than silently picking one.
      if (e instanceof ApiError && e.code === "plan_has_assignments") {
        try { setConflict(JSON.parse(e.message)); } catch { setConflict({ members: [] }); }
      }
    }
  };

  const addDay = async () => {
    if (!planId) return;
    const next = Math.max(0, ...days.map((d) => d.dayNumber)) + 1;
    if (await run(() => api(`/v1/plans/${planId}/days`, { method: "POST", body: { dayNumber: Math.min(next, 7), title: `Day ${next}` } })))
      tree.refetch();
  };

  const saveTemplate = async () => {
    if (!planId) return;
    if (await run(() => api(`/v1/plans/${planId}/save-as-template`, { method: "POST", body: { name: name.trim() } })))
      Alert.alert?.("Saved", "Added to your template library.");
  };

  const field = { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink };
  const chip = (on: boolean) => ({
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
    borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
  });

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.title, color: theme.ink }}>
            {isNew && !planId ? (planType === "meal" ? "New meal plan" : "New workout plan") : name || "Plan"}
          </Text>
          {params.assignTo && !planId ? (
            <Text style={{ ...typo.caption, color: theme.accent, marginTop: 1 }}>Will be assigned on save</Text>
          ) : null}
        </View>
        <Pressable onPress={() => save()} hitSlop={12} disabled={busy || !name.trim()}>
          <Text style={{ ...typo.heading, color: name.trim() ? theme.accent : theme.muted }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <TextInput
          style={{ ...field, marginBottom: space.md }}
          placeholder={planType === "meal" ? "Plan name — e.g. Lean bulk 2,400 kcal" : "Plan name — e.g. Fat Loss Beginner"}
          placeholderTextColor={theme.muted}
          value={name}
          onChangeText={setName}
        />

        <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
          <TextInput
            style={{ ...field, flex: 1 }}
            placeholder="Goal — e.g. Fat loss"
            placeholderTextColor={theme.muted}
            value={goal}
            onChangeText={setGoal}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10 }}>
            <Pressable onPress={() => setWeeks(Math.max(1, weeks - 1))} hitSlop={8}><Feather name="minus" size={15} color={theme.inkSoft} /></Pressable>
            <Text style={{ ...typo.body, color: theme.ink, fontWeight: "600", minWidth: 52, textAlign: "center" }}>{weeks} wk</Text>
            <Pressable onPress={() => setWeeks(Math.min(52, weeks + 1))} hitSlop={8}><Feather name="plus" size={15} color={theme.inkSoft} /></Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.xl }}>
          {DIFFICULTIES.map((d) => (
            <Pressable key={d} onPress={() => setDifficulty(d)} style={chip(difficulty === d)}>
              <Text style={{ ...typo.caption, color: difficulty === d ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{d}</Text>
            </Pressable>
          ))}
        </View>

        {!planId ? (
          <Card theme={theme}>
            <Text style={{ ...typo.body, color: theme.muted }}>
              Save the plan first, then add {planType === "meal" ? "meals" : "days and exercises"}.
            </Text>
          </Card>
        ) : (
          <>
            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Week 1</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 6, marginBottom: space.md }}>
              {days.map((d) => (
                <Pressable key={d.id} onPress={() => setActiveDay(d.id)} style={chip(activeDay === d.id)}>
                  <Text style={{ ...typo.caption, color: activeDay === d.id ? theme.accent : theme.inkSoft, fontWeight: "600" }}>
                    {d.title ?? `Day ${d.dayNumber}`}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={addDay} style={{ ...chip(false), paddingHorizontal: 14 }}>
                <Feather name="plus" size={14} color={theme.accent} />
              </Pressable>
            </ScrollView>

            {tree.loading && !tree.data ? <ActivityIndicator color={theme.accent} /> : !day ? (
              <Card theme={theme} style={{ marginTop: space.md }}>
                <Text style={{ ...typo.body, color: theme.muted }}>Add a day to start building.</Text>
              </Card>
            ) : (
              <View style={{ marginTop: space.sm }}>
                {planType === "workout" ? (
                  <>
                    {day.exercises.length === 0 ? (
                      <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>No exercises on this day yet.</Text></Card>
                    ) : day.exercises.map((e) => (
                      <Card key={e.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ ...typo.heading, color: theme.ink }}>{e.exercise.name}</Text>
                          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                            {e.exercise.loggingMode === "hold"
                              ? `${e.sets ?? 1} × ${e.durationSeconds ?? 0}s`
                              : `${e.sets ?? 1} × ${e.reps ?? 0}${e.weightKg && Number(e.weightKg) > 0 ? ` @ ${Number(e.weightKg)}kg` : ""}`}
                            {e.restSeconds ? ` · ${e.restSeconds}s rest` : ""}
                          </Text>
                        </View>
                        {e.exercise.discipline && <Pill theme={theme} label={e.exercise.discipline} tone={theme.teal} />}
                      </Card>
                    ))}
                    <Pressable
                      onPress={() => router.push({ pathname: "/coach/add-exercises", params: { dayId: day.id, planId } })}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: theme.line, borderRadius: radius.pill, paddingVertical: 13, marginTop: space.sm }}
                    >
                      <Feather name="plus" size={16} color={theme.accent} />
                      <Text style={{ ...typo.heading, color: theme.accent }}>Add exercise</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {SLOTS.map((slot) => {
                      const onSlot = day.meals.filter((m) => m.mealType === slot);
                      return (
                        <Card key={slot} theme={theme} style={{ marginBottom: space.sm }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ ...typo.heading, color: theme.ink, textTransform: "capitalize" }}>{slot}</Text>
                              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                                {onSlot.length === 0 ? "Nothing yet"
                                  : onSlot.map((m) => `${m.meal.name} (${Math.round(Number(m.meal.calories))} kcal)`).join(", ")}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => router.push({ pathname: "/coach/add-exercises", params: { dayId: day.id, planId, mealType: slot, mode: "meal" } })}
                              hitSlop={8}
                              style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: theme.accent + "14", alignItems: "center", justifyContent: "center" }}
                            >
                              <Feather name="plus" size={17} color={theme.accent} />
                            </Pressable>
                          </View>
                        </Card>
                      );
                    })}
                    <Card theme={theme} style={{ marginTop: space.sm }}>
                      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Daily total</Text>
                      <View style={{ flexDirection: "row" }}>
                        {[
                          { k: "Calories", v: Math.round(day.meals.reduce((n, m) => n + Number(m.meal.calories) * Number(m.servings), 0)) },
                          { k: "Protein", v: `${Math.round(day.meals.reduce((n, m) => n + Number(m.meal.proteinG) * Number(m.servings), 0))}g` },
                          { k: "Items", v: day.meals.length },
                        ].map((s) => (
                          <View key={s.k} style={{ flex: 1 }}>
                            <Text style={{ ...typo.title, color: theme.ink }}>{s.v}</Text>
                            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                          </View>
                        ))}
                      </View>
                    </Card>
                  </>
                )}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.xl }}>
              <Pressable onPress={saveTemplate} disabled={busy}
                style={{ flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line }}>
                <Text style={{ ...typo.heading, color: theme.inkSoft }}>Save as template</Text>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: "/coach/assign", params: { planId } })}
                style={{ flex: 1, alignItems: "center", paddingVertical: 13, borderRadius: radius.pill, backgroundColor: theme.accent }}>
                <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Assign</Text>
              </Pressable>
            </View>
          </>
        )}

        {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
      </ScrollView>

      <PlanChangeSheet
        theme={theme}
        visible={!!conflict}
        members={conflict?.members ?? []}
        planName={name}
        onClose={() => setConflict(null)}
        onChoose={(strategy) => save(strategy)}
      />
    </Screen>
  );
}
