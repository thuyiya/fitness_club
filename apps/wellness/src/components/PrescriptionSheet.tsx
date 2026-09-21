import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApi } from "../api/hooks";
import { BottomSheet } from "./BottomSheet";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

export interface Exercise {
  id: string; name: string; loggingMode: string;
  discipline: string | null; primaryMuscle: string | null; equipment?: string[];
}
export interface Activity { id: string; name: string; group: string; met: string; intensity: string }

/** One prescribed item, in the shape POST /v1/plans/build accepts. */
export interface Prescription {
  exerciseId?: string;
  activityId?: string;
  sets?: number;
  reps?: number;
  restSeconds?: number;
  durationSeconds?: number;
  intensity?: "light" | "moderate" | "vigorous";
  /** Carried for display only; the API resolves names from the ids. */
  label: string;
  detail: string;
  isActivity: boolean;
}

const INTENSITIES = ["light", "moderate", "vigorous"] as const;
const DISCIPLINES = ["gym", "calisthenics", "cardio", "mobility"] as const;

/**
 * Add one piece of work to one day.
 *
 * The first question is sport or workout, because everything after it differs:
 * a sport is a bout (how long, how hard) and a workout is sets (how many, how
 * heavy). Asking "reps?" about football is how apps end up with 3 x 10 of
 * football in them.
 */
export function PrescriptionSheet({
  theme, visible, dateLabel, onClose, onAdd,
}: {
  theme: Theme;
  visible: boolean;
  dateLabel: string;
  onClose: () => void;
  onAdd: (p: Prescription) => void;
}) {
  const [kind, setKind] = useState<"choose" | "sport" | "workout">("choose");
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);

  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [seconds, setSeconds] = useState("45");
  const [minutes, setMinutes] = useState("60");
  const [rest, setRest] = useState("90");
  const [intensity, setIntensity] = useState<(typeof INTENSITIES)[number]>("moderate");

  const picking = kind !== "choose" && !exercise && !activity;

  const exercises = useApi<{ items: Exercise[] }>(
    visible && kind === "workout" && !exercise
      ? `/v1/exercises?limit=40${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}${discipline ? `&discipline=${discipline}` : ""}`
      : null,
    [kind, query, discipline, exercise, visible],
  );
  const activities = useApi<{ items: Activity[] }>(
    visible && kind === "sport" && !activity
      ? `/v1/activities?kind=sport&limit=60${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`
      : null,
    [kind, query, activity, visible],
  );

  const reset = () => {
    setKind("choose"); setQuery(""); setDiscipline(null);
    setExercise(null); setActivity(null);
    setSets("3"); setReps("10"); setSeconds("45"); setMinutes("60"); setRest("90"); setIntensity("moderate");
  };
  const close = () => { reset(); onClose(); };

  const back = () => {
    if (exercise || activity) { setExercise(null); setActivity(null); return; }
    if (kind !== "choose") { setKind("choose"); setQuery(""); return; }
    close();
  };

  // A hold or a timed movement has no rep count; the exercise's own logging
  // mode decides which fields are even askable.
  const timed = exercise ? exercise.loggingMode === "hold" || exercise.loggingMode === "duration" : false;

  const submit = () => {
    const n = (s: string, fallback: number) => {
      const v = Number.parseInt(s, 10);
      return Number.isFinite(v) && v > 0 ? v : fallback;
    };
    if (activity) {
      const mins = n(minutes, 60);
      onAdd({
        activityId: activity.id, durationSeconds: mins * 60, intensity,
        label: activity.name, detail: `${mins} min · ${intensity}`, isActivity: true,
      });
    } else if (exercise) {
      const s = n(sets, 3);
      if (timed) {
        const secs = n(seconds, 45);
        onAdd({
          exerciseId: exercise.id, sets: s, durationSeconds: secs, restSeconds: n(rest, 60), intensity,
          label: exercise.name, detail: `${s} × ${secs}s · ${intensity}`, isActivity: false,
        });
      } else {
        const r = n(reps, 10);
        onAdd({
          exerciseId: exercise.id, sets: s, reps: r, restSeconds: n(rest, 90), intensity,
          label: exercise.name, detail: `${s} × ${r} · ${intensity}`, isActivity: false,
        });
      }
    }
    reset();
  };

  const field = {
    backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1,
    borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12, fontSize: 16, color: theme.ink,
    textAlign: "center" as const, minWidth: 74,
  };
  const chip = (on: boolean) => ({
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
    borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
  });

  return (
    <BottomSheet theme={theme} visible={visible} onClose={close} heightRatio={picking ? 0.82 : 0.6}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.md }}>
        <Pressable onPress={back} hitSlop={12} style={{ marginRight: 6 }}>
          <Feather name={kind === "choose" ? "x" : "chevron-left"} size={22} color={theme.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.title, color: theme.ink }}>
            {exercise?.name ?? activity?.name ?? (kind === "sport" ? "Pick a sport" : kind === "workout" ? "Pick a movement" : "Add to this day")}
          </Text>
          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{dateLabel}</Text>
        </View>
      </View>

      {kind === "choose" && (
        <View style={{ gap: space.sm }}>
          <Choice theme={theme} icon="award" tone={theme.teal} label="Sport"
            hint="Football, swimming, cycling — timed, at an intensity"
            onPress={() => setKind("sport")} />
          <Choice theme={theme} icon="repeat" tone={theme.accent} label="Workout"
            hint="A movement from the library — sets, reps and rest"
            onPress={() => setKind("workout")} />
        </View>
      )}

      {picking && (
        <>
          <TextInput
            style={{ backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 11, fontSize: 15, color: theme.ink }}
            placeholder={kind === "sport" ? "Search sports" : "Search the exercise library"}
            placeholderTextColor={theme.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />

          {kind === "workout" && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginTop: space.sm }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 6 }}>
              {DISCIPLINES.map((d) => (
                <Pressable key={d} onPress={() => setDiscipline(discipline === d ? null : d)} style={chip(discipline === d)}>
                  <Text style={{ ...typo.caption, color: discipline === d ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView style={{ marginTop: space.md }} keyboardShouldPersistTaps="handled">
            {(exercises.loading || activities.loading) && !(exercises.data || activities.data) ? (
              <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} />
            ) : kind === "sport" ? (
              (activities.data?.items ?? []).map((a) => (
                <Row key={a.id} theme={theme} title={a.name} subtitle={`${a.group.replace(/_/g, " ")} · MET ${Number(a.met)}`}
                  onPress={() => { setActivity(a); setIntensity((a.intensity as typeof intensity) ?? "moderate"); }} />
              ))
            ) : (
              (exercises.data?.items ?? []).map((e) => (
                <Row key={e.id} theme={theme} title={e.name}
                  subtitle={[e.primaryMuscle?.replace(/_/g, " "), e.discipline, e.loggingMode === "reps" ? null : e.loggingMode].filter(Boolean).join(" · ")}
                  onPress={() => setExercise(e)} />
              ))
            )}
            {!(exercises.loading || activities.loading) &&
              (kind === "sport" ? activities.data?.items.length === 0 : exercises.data?.items.length === 0) && (
                <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>Nothing matched.</Text>
              )}
          </ScrollView>
        </>
      )}

      {(exercise || activity) && (
        <ScrollView keyboardShouldPersistTaps="handled">
          {activity ? (
            <Field theme={theme} label="How long">
              <TextInput style={field} value={minutes} onChangeText={setMinutes} keyboardType="number-pad" accessibilityLabel="Minutes" />
              <Text style={{ ...typo.body, color: theme.inkSoft }}>minutes</Text>
            </Field>
          ) : (
            <>
              <Field theme={theme} label="Sets">
                <TextInput style={field} value={sets} onChangeText={setSets} keyboardType="number-pad" accessibilityLabel="Sets" />
                <Text style={{ ...typo.body, color: theme.inkSoft }}>sets</Text>
              </Field>
              <Field theme={theme} label={timed ? "Hold for" : "Reps"}>
                <TextInput
                  style={field}
                  value={timed ? seconds : reps}
                  onChangeText={timed ? setSeconds : setReps}
                  keyboardType="number-pad"
                  accessibilityLabel={timed ? "Seconds" : "Reps"}
                />
                <Text style={{ ...typo.body, color: theme.inkSoft }}>{timed ? "seconds each" : "reps per set"}</Text>
              </Field>
              <Field theme={theme} label="Rest">
                <TextInput style={field} value={rest} onChangeText={setRest} keyboardType="number-pad" accessibilityLabel="Rest seconds" />
                <Text style={{ ...typo.body, color: theme.inkSoft }}>seconds between sets</Text>
              </Field>
            </>
          )}

          <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.md, marginBottom: space.sm }}>Intensity</Text>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {INTENSITIES.map((i) => (
              <Pressable key={i} onPress={() => setIntensity(i)} style={{ ...chip(intensity === i), flex: 1, alignItems: "center" }}>
                <Text style={{ ...typo.caption, color: intensity === i ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{i}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={submit}
            style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center", marginTop: space.xl }}
          >
            <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Add to day</Text>
          </Pressable>
        </ScrollView>
      )}
    </BottomSheet>
  );
}

function Choice({ theme, icon, tone, label, hint, onPress }: {
  theme: Theme; icon: keyof typeof Feather.glyphMap; tone: string; label: string; hint: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md,
      backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
    })}>
      <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: tone + "1F", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={19} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.heading, color: theme.ink }}>{label}</Text>
        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={19} color={theme.muted} />
    </Pressable>
  );
}

function Row({ theme, title, subtitle, onPress }: { theme: Theme; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 11, paddingHorizontal: space.md,
      backgroundColor: pressed ? theme.cardAlt : "transparent", borderRadius: radius.sm,
    })}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.heading, color: theme.ink }}>{title}</Text>
        {!!subtitle && <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2, textTransform: "capitalize" }}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={17} color={theme.muted} />
    </Pressable>
  );
}

function Field({ theme, label, children }: { theme: Theme; label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>{children}</View>
    </View>
  );
}
