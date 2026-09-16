import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApi } from "../api/hooks";
import { Card, Pill } from "./ui";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

interface Tree {
  disciplines: { id: string; count: number; categories: { id: string; count: number }[] }[];
  sportGroups: { id: string; kind: string; count: number }[];
}
export interface PickedExercise {
  kind: "exercise"; id: string; name: string; loggingMode: string; discipline: string | null;
}
export interface PickedActivity {
  kind: "activity"; id: string; name: string; met: string; intensity: string; group: string;
}
export type Picked = PickedExercise | PickedActivity;

const DISCIPLINE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  calisthenics: "user", gym: "layers", cardio: "wind", mobility: "refresh-cw",
};
const GROUP_LABEL = (g: string) => g.replace(/_/g, " ");

/**
 * Two-level picker: choose the KIND of training first, then the movement.
 *
 * A flat search over 149 rows assumes the member already knows the name of what
 * they did. Most do not --- they know they "did calisthenics" or "played
 * squash", so the first screen is that choice, and the catalog is only revealed
 * once it has been narrowed.
 */
export function ExercisePicker({ theme, onPick }: { theme: Theme; onPick: (p: Picked) => void }) {
  const [level, setLevel] = useState<
    | { at: "root" }
    | { at: "discipline"; discipline: string }
    | { at: "sports" }
    | { at: "group"; group: string }
  >({ at: "root" });
  const [query, setQuery] = useState("");

  const tree = useApi<Tree>("/v1/exercise-tree");

  const exercises = useApi<{ items: PickedExercise[] & { loggingMode: string }[] }>(
    level.at === "discipline"
      ? `/v1/exercises?discipline=${level.discipline}&limit=100${query.trim() ? `&q=${encodeURIComponent(query)}` : ""}`
      : null,
    [level, query],
  );
  const activities = useApi<{ items: { id: string; name: string; met: string; intensity: string; group: string }[] }>(
    level.at === "group"
      ? `/v1/activities?group=${level.group}&limit=100`
      : level.at === "sports"
        ? `/v1/activities?limit=100${query.trim() ? `&q=${encodeURIComponent(query)}` : ""}`
        : null,
    [level, query],
  );

  const searchAll = useApi<{ items: (PickedExercise & { loggingMode: string })[] }>(
    level.at === "root" && query.trim().length >= 2
      ? `/v1/search?q=${encodeURIComponent(query)}&type=exercises&limit=15`
      : null,
    [query],
  );

  const field = { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 11, fontSize: 15, color: theme.ink };

  const Row = ({ icon, title, sub, onPress, tone }: { icon: keyof typeof Feather.glyphMap; title: string; sub?: string; onPress: () => void; tone?: string }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, marginBottom: space.sm,
      backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
    })}>
      <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: (tone ?? theme.accent) + "1F", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={18} color={tone ?? theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.heading, color: theme.ink, textTransform: "capitalize" }}>{title}</Text>
        {sub && <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{sub}</Text>}
      </View>
      <Feather name="chevron-right" size={18} color={theme.muted} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      {level.at !== "root" && (
        <Pressable onPress={() => { setLevel({ at: "root" }); setQuery(""); }} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: space.sm }}>
          <Feather name="chevron-left" size={17} color={theme.accent} />
          <Text style={{ ...typo.body, color: theme.accent }}>All types</Text>
        </Pressable>
      )}

      <TextInput
        style={field}
        placeholder={level.at === "root" ? "Search everything, or pick a type below" : "Filter"}
        placeholderTextColor={theme.muted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <ScrollView style={{ marginTop: space.md }} keyboardShouldPersistTaps="handled">
        {level.at === "root" && query.trim().length >= 2 && (
          searchAll.loading ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} /> :
          (searchAll.data?.items ?? []).map((e) => (
            <Pressable key={e.id} onPress={() => onPick({ kind: "exercise", id: e.id, name: e.name, loggingMode: e.loggingMode, discipline: e.discipline })}>
              <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.body, color: theme.ink }}>{e.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{e.discipline} · {e.loggingMode}</Text>
                </View>
                <Feather name="plus-circle" size={19} color={theme.accent} />
              </Card>
            </Pressable>
          ))
        )}

        {level.at === "root" && query.trim().length < 2 && (
          <>
            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              Workouts · logged as sets
            </Text>
            {tree.loading && !tree.data ? <ActivityIndicator color={theme.accent} /> :
              tree.data?.disciplines.map((d) => (
                <Row
                  key={d.id}
                  icon={DISCIPLINE_ICON[d.id] ?? "activity"}
                  title={d.id}
                  sub={`${d.count} exercises · ${d.categories.map((c) => c.id).slice(0, 3).join(", ")}`}
                  onPress={() => { setLevel({ at: "discipline", discipline: d.id }); setQuery(""); }}
                />
              ))}

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>
              Sports and sessions · logged by duration
            </Text>
            {tree.data?.sportGroups
              .filter((g) => g.kind !== "daily_living")
              .map((g) => (
                <Row key={g.id} icon="activity" tone={theme.teal} title={GROUP_LABEL(g.id)} sub={`${g.count} activities`}
                  onPress={() => { setLevel({ at: "group", group: g.id }); setQuery(""); }} />
              ))}
          </>
        )}

        {level.at === "discipline" && (
          exercises.loading && !exercises.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} /> :
          (exercises.data?.items ?? []).map((e) => (
            <Pressable key={e.id} onPress={() => onPick({ kind: "exercise", id: e.id, name: e.name, loggingMode: e.loggingMode, discipline: e.discipline })}>
              <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.body, color: theme.ink }}>{e.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>
                    {e.loggingMode === "reps" ? "sets and reps" : e.loggingMode === "hold" ? "timed hold" : e.loggingMode}
                  </Text>
                </View>
                <Feather name="plus-circle" size={19} color={theme.accent} />
              </Card>
            </Pressable>
          ))
        )}

        {(level.at === "group" || level.at === "sports") && (
          activities.loading && !activities.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} /> :
          (activities.data?.items ?? []).map((a) => (
            <Pressable key={a.id} onPress={() => onPick({ kind: "activity", id: a.id, name: a.name, met: a.met, intensity: a.intensity, group: a.group })}>
              <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md, flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.body, color: theme.ink }}>{a.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{a.intensity}</Text>
                </View>
                <Pill theme={theme} label={`MET ${a.met}`} tone={theme.muted} />
                <Feather name="plus-circle" size={19} color={theme.teal} />
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
