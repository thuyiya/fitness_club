import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Ex { id: string; name: string; loggingMode: string; discipline: string | null; primaryMuscle: string | null; equipment: string[] }
interface Meal { id: string; name: string; calories: string; proteinG: string; carbsG: string; fatG: string; allergens?: string[] }

const MUSCLES = ["chest", "back", "quadriceps", "hamstrings", "shoulders", "biceps", "triceps", "abdominals", "glutes"];

/**
 * Adds items to one day of a plan. `mode=meal` picks meals for a slot;
 * otherwise it picks exercises. Selection is multi --- a coach builds a day in
 * one pass, not by returning to this screen once per exercise.
 */
export default function AddToPlan() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const { dayId, planId, mealType, mode } = useLocalSearchParams<{ dayId: string; planId: string; mealType?: string; mode?: string }>();
  const isMeal = mode === "meal";

  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const { busy, error, run } = useAction();

  const exercises = useApi<{ items: Ex[] }>(
    !isMeal ? `/v1/exercises?limit=60${query.trim() ? `&q=${encodeURIComponent(query)}` : ""}${muscle ? `&muscle=${muscle}` : ""}` : null,
    [query, muscle],
  );
  const meals = useApi<{ items: Meal[] }>(
    isMeal ? (query.trim().length >= 2 ? `/v1/search?q=${encodeURIComponent(query)}&type=meals&limit=20` : null) : null,
    [query],
  );

  const items: (Ex | Meal)[] = isMeal ? (meals.data?.items ?? []) : (exercises.data?.items ?? []);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const add = async () => {
    if (picked.length === 0) return;
    const ok = await run(async () => {
      for (const [i, id] of picked.entries()) {
        if (isMeal) {
          await api(`/v1/plan-days/${dayId}/meals`, {
            method: "POST",
            body: { mealId: id, mealType: mealType ?? "lunch", position: i, servings: 1 },
          });
        } else {
          const ex = (exercises.data?.items ?? []).find((e) => e.id === id);
          // Sensible defaults per logging mode; the coach tunes them on the day.
          const body = ex?.loggingMode === "hold" || ex?.loggingMode === "duration"
            ? { exerciseId: id, position: i, sets: 3, durationSeconds: 45, restSeconds: 60 }
            : { exerciseId: id, position: i, sets: 3, reps: 10, restSeconds: 90 };
          await api(`/v1/plan-days/${dayId}/exercises`, { method: "POST", body });
        }
      }
    });
    if (ok) router.back();
  };

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1, textTransform: "capitalize" }}>
          {isMeal ? `Add to ${mealType ?? "meal"}` : "Add exercises"}
        </Text>
      </View>

      <View style={{ paddingHorizontal: space.lg }}>
        <TextInput
          style={{ backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink }}
          placeholder={isMeal ? "Search meals" : "Search the exercise library"}
          placeholderTextColor={theme.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        {!isMeal && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginTop: space.md }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 6 }}>
            {MUSCLES.map((m) => {
              const on = muscle === m;
              return (
                <Pressable key={m} onPress={() => setMuscle(on ? null : m)} style={{
                  paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1,
                  borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
                }}>
                  <Text style={{ ...typo.caption, color: on ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{m}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {(exercises.loading || meals.loading) && items.length === 0 ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
        ) : items.length === 0 ? (
          <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>
            {isMeal ? "Type at least two characters to search meals." : "Nothing matched."}
          </Text>
        ) : items.map((it) => {
          const on = picked.includes(it.id);
          const ex = it as Ex;
          const ml = it as Meal;
          return (
            <Pressable key={it.id} onPress={() => toggle(it.id)}>
              <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{it.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {isMeal
                      ? `${Math.round(Number(ml.calories))} kcal · ${Math.round(Number(ml.proteinG))}g protein`
                      : [ex.primaryMuscle?.replace(/_/g, " "), ex.discipline, ex.equipment?.[0]?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                  </Text>
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
        {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
      </ScrollView>

      <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: insets.bottom + space.lg }}>
        <Pressable onPress={add} disabled={busy || picked.length === 0}
          style={{ backgroundColor: picked.length ? theme.accent : theme.cardAlt, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={{ ...typo.heading, color: picked.length ? "#FFFFFF" : theme.muted }}>
              {picked.length === 0 ? "Select items" : `Add ${picked.length} ${isMeal ? "meal" : "exercise"}${picked.length === 1 ? "" : "s"}`}
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}
