import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { isoDate, useAction, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useQuickLog } from "../../src/state/quicklog";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Logged {
  exercise: { id: string; name: string; loggingMode: string; discipline: string | null };
  sets: { id: string; setNumber: number; reps: number | null; weightKg: string | null; durationSeconds: number | null; distanceMetres: string | null }[];
}
interface DayExercises { logged: Logged[] }
interface Timeline { entries: { kind: string; id: string; at: string; title: string; calories: number; durationMinutes: number | null; intensity: string | null; exercises: string[] }[] }

const INTENSITIES = ["light", "moderate", "vigorous"] as const;
const DURATIONS = [15, 20, 30, 45, 60, 90];

/**
 * Edit a logged session: when it happened, how long, how hard, and what was in
 * it. Calories re-derive from MET × weight × duration on the server whenever
 * duration or activity changes, unless a measured figure is supplied.
 */
export default function ExerciseDetail() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const quickLog = useQuickLog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = isoDate(new Date());

  const timeline = useApi<Timeline>(`/v1/logs/timeline?date=${today}`, [id]);
  const day = useApi<DayExercises>(`/v1/logs/exercises?date=${today}`, [id]);
  const { busy, error, run } = useAction();

  const entry = timeline.data?.entries.find((e) => e.kind === "workout" && e.id === id);

  const [minutes, setMinutes] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setMinutes(entry.durationMinutes ?? 45);
    setIntensity(entry.intensity ?? "moderate");
    setTime(new Date(entry.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }));
  }, [entry?.id]);

  const save = async () => {
    const [h, mi] = time.split(":").map(Number);
    const startedAt = new Date(entry ? new Date(entry.at) : new Date());
    if (Number.isFinite(h) && Number.isFinite(mi)) startedAt.setHours(h!, mi!, 0, 0);

    const ok = await run(() =>
      api(`/v1/logs/workout/${id}`, {
        method: "PATCH",
        body: { durationMinutes: minutes ?? undefined, intensity: intensity ?? undefined, startedAt: startedAt.toISOString() },
      }),
    );
    if (ok) { quickLog.bumpVersion(); setDirty(false); timeline.refetch(); }
  };

  const remove = async () => {
    if (await run(() => api(`/v1/logs/workout/${id}`, { method: "DELETE" }))) {
      quickLog.bumpVersion();
      router.back();
    }
  };

  const dropSet = async (setId: string) => {
    if (await run(() => api(`/v1/logs/sets/${setId}`, { method: "DELETE" }))) {
      day.refetch();
      quickLog.bumpVersion();
    }
  };

  const mine = (day.data?.logged ?? []).filter((l) => (entry?.exercises ?? []).includes(l.exercise.name));
  const chip = (on: boolean) => ({
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1,
    borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
  });

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }} numberOfLines={1}>{entry?.title ?? "Session"}</Text>
        <Pressable onPress={remove} hitSlop={12} disabled={busy}>
          <Feather name="trash-2" size={20} color={theme.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {timeline.loading && !timeline.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : !entry ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>This session is not on today.</Text></Card>
        ) : (
          <>
            <Card theme={theme} style={{ marginBottom: space.lg, flexDirection: "row" }}>
              {[
                { k: "Burned", v: `${entry.calories}`, u: "kcal" },
                { k: "Duration", v: `${minutes ?? 0}`, u: "min" },
                { k: "Effort", v: intensity ?? "—", u: "" },
              ].map((s) => (
                <View key={s.k} style={{ flex: 1 }}>
                  <Text style={{ ...typo.title, color: theme.ink, textTransform: "capitalize" }}>{s.v}<Text style={{ ...typo.caption, color: theme.muted }}>{s.u}</Text></Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                </View>
              ))}
            </Card>

            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>STARTED AT</Text>
            <TextInput
              style={{ backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 13, fontSize: 18, fontWeight: "600", color: theme.ink, marginBottom: space.lg }}
              value={time}
              onChangeText={(v) => { setTime(v); setDirty(true); }}
              placeholder="09:30"
              placeholderTextColor={theme.muted}
            />

            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>DURATION</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
              {DURATIONS.map((d) => (
                <Pressable key={d} onPress={() => { setMinutes(d); setDirty(true); }} style={chip(minutes === d)}>
                  <Text style={{ ...typo.caption, color: minutes === d ? theme.accent : theme.inkSoft, fontWeight: "600" }}>{d} min</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>INTENSITY</Text>
            <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
              {INTENSITIES.map((i) => (
                <Pressable key={i} onPress={() => { setIntensity(i); setDirty(true); }} style={{ ...chip(intensity === i), flex: 1, alignItems: "center" }}>
                  <Text style={{ ...typo.caption, color: intensity === i ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{i}</Text>
                </Pressable>
              ))}
            </View>

            {mine.length > 0 && (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Exercises in this session</Text>
                {mine.map((l) => (
                  <Card key={l.exercise.id} theme={theme} style={{ marginBottom: space.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.sm }}>
                      <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }}>{l.exercise.name}</Text>
                      {l.exercise.discipline && <Pill theme={theme} label={l.exercise.discipline} tone={theme.teal} />}
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {l.sets.map((s) => (
                        <Pressable key={s.id} onLongPress={() => dropSet(s.id)} style={{ backgroundColor: theme.cardAlt, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ ...typo.caption, color: theme.ink, fontWeight: "600" }}>
                            {l.exercise.loggingMode === "hold" || l.exercise.loggingMode === "duration"
                              ? `${s.durationSeconds}s`
                              : l.exercise.loggingMode === "distance"
                                ? `${Number(s.distanceMetres ?? 0)}m`
                                : `${s.reps ?? 0}${s.weightKg && Number(s.weightKg) > 0 ? ` × ${Number(s.weightKg)}kg` : ""}`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>Long-press a set to remove it</Text>
                  </Card>
                ))}
              </>
            )}

            <Pressable
              onPress={() => quickLog.open("exercise")}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: theme.line, borderRadius: radius.pill, paddingVertical: 13, marginTop: space.md }}
            >
              <Feather name="plus" size={16} color={theme.accent} />
              <Text style={{ ...typo.heading, color: theme.accent }}>Add an exercise</Text>
            </Pressable>

            {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
          </>
        )}
      </ScrollView>

      {dirty && (
        <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: insets.bottom + space.lg }}>
          <Pressable onPress={save} disabled={busy} style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Save changes</Text>}
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
