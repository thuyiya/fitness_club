import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { isoDate, useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { DateStrip } from "../../src/components/DateStrip";
import { useQuickLog } from "../../src/state/quicklog";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface ExerciseRef {
  id: string; slug: string | null; name: string;
  discipline: string | null; loggingMode: string;
  equipment?: string[]; primaryMuscle: string | null;
}
interface DayExercises {
  prescribed: {
    planExerciseId: string; planName: string; sets: number | null; reps: number | null;
    weightKg: string | null; durationSeconds: number | null; restSeconds: number | null;
    notes: string | null; exercise: ExerciseRef; logged: boolean;
  }[];
  logged: {
    exercise: ExerciseRef;
    sets: { id: string; setNumber: number; reps: number | null; weightKg: string | null; durationSeconds: number | null; distanceMetres: string | null; rpe: string | null }[];
  }[];
}

/** One set, rendered by the mode it was logged in. */
function setLabel(s: DayExercises["logged"][number]["sets"][number], mode: string) {
  if (mode === "hold" || mode === "duration") return `${s.durationSeconds}s`;
  if (mode === "distance") return `${Number(s.distanceMetres ?? 0)}m`;
  const load = s.weightKg && Number(s.weightKg) > 0 ? ` × ${Number(s.weightKg)}kg` : "";
  return `${s.reps ?? 0}${load}`;
}

function prescriptionLabel(p: DayExercises["prescribed"][number]) {
  const mode = p.exercise.loggingMode;
  if (mode === "hold" || mode === "duration") return `${p.sets ?? 1} × ${p.durationSeconds ?? 0}s`;
  const load = p.weightKg && Number(p.weightKg) > 0 ? ` @ ${Number(p.weightKg)}kg` : "";
  return `${p.sets ?? 1} × ${p.reps ?? 0}${load}`;
}

export default function Training() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const quickLog = useQuickLog();
  const [date, setDate] = useState(new Date());
  const key = isoDate(date);

  const day = useApi<DayExercises>(`/v1/logs/exercises?date=${key}`, [quickLog.version]);
  const prescribed = day.data?.prescribed ?? [];
  const logged = day.data?.logged ?? [];

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={day.refetch} tintColor={theme.accent} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <DateStrip theme={theme} date={date} onChange={setDate} />
          <Pressable
            onPress={() => quickLog.open("exercise")}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.accent, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={{ ...typo.caption, color: "#FFFFFF", fontWeight: "700" }}>Log</Text>
          </Pressable>
        </View>

        {day.loading && !day.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : (
          <>
            {/* Prescribed work is shown as a checklist, never auto-logged. A
                plan is what the coach asked for; the log is what happened. */}
            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              From your coach
            </Text>
            {prescribed.length === 0 ? (
              <Card theme={theme} style={{ marginBottom: space.xl }}>
                <Text style={{ ...typo.body, color: theme.muted }}>Nothing assigned for this day.</Text>
              </Card>
            ) : (
              <View style={{ marginBottom: space.xl }}>
                {prescribed.map((p) => (
                  <Pressable key={p.planExerciseId} onPress={() => quickLog.open("exercise")}>
                    <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                      <View style={{
                        width: 26, height: 26, borderRadius: radius.pill,
                        borderWidth: p.logged ? 0 : 1.5, borderColor: theme.line,
                        backgroundColor: p.logged ? theme.teal : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {p.logged && <Feather name="check" size={15} color="#FFFFFF" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typo.heading, color: theme.ink, textDecorationLine: p.logged ? "line-through" : "none" }}>
                          {p.exercise.name}
                        </Text>
                        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                          {prescriptionLabel(p)}
                          {p.restSeconds ? ` · ${p.restSeconds}s rest` : ""}
                          {p.planName ? ` · ${p.planName}` : ""}
                        </Text>
                      </View>
                      {!p.logged && <Feather name="plus-circle" size={20} color={theme.accent} />}
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              Logged today
            </Text>
            {logged.length === 0 ? (
              <Card theme={theme}>
                <Text style={{ ...typo.body, color: theme.muted }}>
                  Nothing logged yet. Tap Log to record sets as you go.
                </Text>
              </Card>
            ) : (
              logged.map((l) => {
                const volume = l.sets.reduce((n, s) => n + (s.reps ?? 0) * Number(s.weightKg ?? 0), 0);
                return (
                  <Card key={l.exercise.id} theme={theme} style={{ marginBottom: space.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typo.heading, color: theme.ink }}>{l.exercise.name}</Text>
                        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                          {l.sets.length} set{l.sets.length === 1 ? "" : "s"}
                          {volume > 0 ? ` · ${volume.toLocaleString()} kg volume` : ""}
                        </Text>
                      </View>
                      {l.exercise.discipline && <Pill theme={theme} label={l.exercise.discipline} tone={theme.teal} />}
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {l.sets.map((s) => (
                        <View key={s.id} style={{ backgroundColor: theme.cardAlt, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ ...typo.caption, color: theme.ink, fontWeight: "600" }}>
                            {setLabel(s, l.exercise.loggingMode)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
