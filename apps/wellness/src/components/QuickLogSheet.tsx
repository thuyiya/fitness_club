import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../api/client";
import { isoDate, useAction, useApi } from "../api/hooks";
import { BottomSheet } from "./BottomSheet";
import { Card, MacroBar, Pill } from "./ui";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

type Mode = "menu" | "meal" | "exercise" | "activity" | "hydration";

interface MealHit {
  id: string; name: string; calories?: string; proteinG?: string; carbsG?: string; fatG?: string;
  mealType?: string | null; allergens?: string[]; prepMinutes?: number | null;
}
interface ExerciseHit { id: string; name: string; loggingMode?: string; discipline?: string; equipment?: string[] }

const WATER = [250, 330, 500, 750];
const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

/**
 * The centre "+" sheet. Everything a member logs many times a day lives one tap
 * from any screen; burying it a level down is what makes diaries get abandoned.
 */
export function QuickLogSheet({
  theme, visible, onClose, onLogged, initialMode = "menu", initialSlot = "lunch",
}: {
  theme: Theme; visible: boolean; onClose: () => void; onLogged?: () => void;
  initialMode?: Mode; initialSlot?: string;
}) {
  const today = isoDate(new Date());
  const [mode, setMode] = useState<Mode>(initialMode);
  const [slot, setSlot] = useState<string>(initialSlot);
  const [query, setQuery] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  // Exercise being logged, with its set rows.
  const [target, setTarget] = useState<ExerciseHit | null>(null);
  const [sets, setSets] = useState([{ reps: "", weightKg: "", durationSeconds: "", distanceMetres: "" }]);

  const meals = useApi<{ items: MealHit[] }>(
    mode === "meal" && query.trim().length >= 2 ? `/v1/search?q=${encodeURIComponent(query)}&type=meals&limit=12` : null, [query]);
  const exercises = useApi<{ items: ExerciseHit[] }>(
    mode === "exercise" ? (query.trim().length >= 2
      ? `/v1/search?q=${encodeURIComponent(query)}&type=exercises&limit=15`
      : "/v1/exercises?limit=20") : null, [query]);
  const activities = useApi<{ items: { id: string; name: string; met: string }[] }>(
    mode === "activity" ? `/v1/activities?limit=100${query.trim() ? `&q=${encodeURIComponent(query)}` : ""}` : null, [query]);

  const finish = (msg: string) => {
    setDone(msg);
    onLogged?.();
    setTimeout(() => { setDone(null); setMode("menu"); setQuery(""); setTarget(null); onClose(); }, 750);
  };

  const logMeal = async (m: MealHit) => {
    if (await run(() => api("/v1/logs/meals", { method: "POST", body: { date: today, mealType: slot, mealId: m.id, servings: 1 } })))
      finish(`${m.name} logged`);
  };

  const logSets = async () => {
    if (!target) return;
    const mode_ = target.loggingMode ?? "reps";
    const payload = sets
      .map((s) => ({
        reps: s.reps ? Number(s.reps) : undefined,
        weightKg: s.weightKg ? Number(s.weightKg) : undefined,
        durationSeconds: s.durationSeconds ? Number(s.durationSeconds) : undefined,
        distanceMetres: s.distanceMetres ? Number(s.distanceMetres) : undefined,
      }))
      .filter((s) =>
        mode_ === "reps" ? s.reps : mode_ === "hold" || mode_ === "duration" ? s.durationSeconds : mode_ === "distance" ? s.distanceMetres : s.reps);
    if (payload.length === 0) return;
    if (await run(() => api("/v1/logs/exercise", { method: "POST", body: { date: today, exerciseId: target.id, sets: payload } })))
      finish(`${target.name}, ${payload.length} set${payload.length === 1 ? "" : "s"}`);
  };

  const logActivity = async (id: string, name: string, minutes: number) => {
    if (await run(() => api("/v1/logs/activity", { method: "POST", body: { date: today, activityId: id, durationMinutes: minutes } })))
      finish(`${name}, ${minutes} min`);
  };

  const logWater = async (ml: number) => {
    if (await run(() => api("/v1/logs/hydration", { method: "POST", body: { date: today, amountMl: ml } })))
      finish(`${ml} ml logged`);
  };

  const field = {
    backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1,
    borderRadius: radius.sm, padding: 11, fontSize: 15, color: theme.ink,
  };

  const back = () => { if (target) setTarget(null); else if (mode !== "menu") { setMode("menu"); setQuery(""); } else onClose(); };
  const heading = target ? target.name
    : mode === "menu" ? "Quick log" : mode === "meal" ? "Log a meal"
    : mode === "exercise" ? "Log an exercise" : mode === "activity" ? "Log a session" : "Hydration";

  return (
    <BottomSheet theme={theme} visible={visible} onClose={onClose} heightRatio={mode === "menu" ? 0.5 : 0.82}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.md }}>
        {(mode !== "menu" || target) && (
          <Pressable onPress={back} hitSlop={12} style={{ marginRight: 6 }}>
            <Feather name="chevron-left" size={22} color={theme.inkSoft} />
          </Pressable>
        )}
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>{heading}</Text>
      </View>

      {done && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: space.md }}>
          <Feather name="check-circle" size={16} color={theme.teal} />
          <Text style={{ ...typo.body, color: theme.teal }}>{done}</Text>
        </View>
      )}
      {error && <Text style={{ ...typo.body, color: theme.danger, marginBottom: space.md }}>{error}</Text>}

      {mode === "menu" && (
        <View>
          {([
            { m: "meal" as Mode, icon: "coffee" as const, label: "Meal", hint: "Search meals and foods", tone: theme.accent },
            { m: "exercise" as Mode, icon: "repeat" as const, label: "Exercise", hint: "Sets, reps and load", tone: theme.teal },
            { m: "activity" as Mode, icon: "activity" as const, label: "Session or sport", hint: "Logged by duration", tone: theme.lime },
            { m: "hydration" as Mode, icon: "droplet" as const, label: "Hydration", hint: "Add a glass or bottle", tone: theme.warning },
          ]).map((o) => (
            <Pressable
              key={o.label}
              onPress={() => { setQuery(""); setMode(o.m); }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, marginBottom: space.sm,
                backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
              })}
            >
              <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: o.tone + "1F", alignItems: "center", justifyContent: "center" }}>
                <Feather name={o.icon} size={19} color={o.tone} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{o.label}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{o.hint}</Text>
              </View>
              <Feather name="chevron-right" size={19} color={theme.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {mode === "meal" && (
        <>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: space.md }}>
            {SLOTS.map((s) => (
              <Pressable key={s} onPress={() => setSlot(s)} style={{
                flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center", borderWidth: 1,
                borderColor: slot === s ? theme.accent : theme.line,
                backgroundColor: slot === s ? theme.accent + "14" : theme.card,
              }}>
                <Text style={{ ...typo.caption, color: slot === s ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={field} placeholder='Try "chiken" or "after training"' placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} autoCorrect={false} />
          <ScrollView style={{ marginTop: space.md }} keyboardShouldPersistTaps="handled">
            {query.trim().length < 2 ? (
              <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>
                Type at least two characters. Typos and plain descriptions both work.
              </Text>
            ) : meals.loading ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
            : (meals.data?.items.length ?? 0) === 0 ? (
              <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>Nothing matched.</Text>
            ) : meals.data!.items.map((m) => {
              const p = Number(m.proteinG ?? 0), c = Number(m.carbsG ?? 0), f = Number(m.fatG ?? 0);
              return (
                <Pressable key={m.id} onPress={() => logMeal(m)} disabled={busy}>
                  <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                      <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }} numberOfLines={1}>{m.name}</Text>
                      {m.calories && <Text style={{ ...typo.heading, color: theme.accent }}>{Math.round(Number(m.calories))}</Text>}
                      <Feather name="plus-circle" size={19} color={theme.accent} />
                    </View>
                    {/* Macros in the row: logging blind is what made the old
                        search useless --- the member could not tell meals apart. */}
                    {m.calories && (
                      <>
                        <View style={{ marginTop: space.sm }}><MacroBar theme={theme} protein={p} carbs={c} fat={f} /></View>
                        <View style={{ flexDirection: "row", gap: space.md, marginTop: 6 }}>
                          <Text style={{ ...typo.caption, color: theme.accent }}>{p.toFixed(0)}g P</Text>
                          <Text style={{ ...typo.caption, color: theme.teal }}>{c.toFixed(0)}g C</Text>
                          <Text style={{ ...typo.caption, color: theme.warning }}>{f.toFixed(0)}g F</Text>
                          {(m.allergens?.length ?? 0) > 0 && (
                            <Text style={{ ...typo.caption, color: theme.danger, marginLeft: "auto" }}>{m.allergens!.join(", ")}</Text>
                          )}
                        </View>
                      </>
                    )}
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {mode === "exercise" && !target && (
        <>
          <TextInput style={field} placeholder="Search exercises" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} autoCorrect={false} />
          <ScrollView style={{ marginTop: space.md }} keyboardShouldPersistTaps="handled">
            {exercises.loading && !exercises.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} /> :
              exercises.data?.items.map((e) => (
                <Pressable key={e.id} onPress={() => { setTarget(e); setSets([{ reps: "", weightKg: "", durationSeconds: "", distanceMetres: "" }]); }}>
                  <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md, flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typo.body, color: theme.ink }}>{e.name}</Text>
                      {e.discipline && <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{e.discipline} · {e.loggingMode}</Text>}
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.muted} />
                  </Card>
                </Pressable>
              ))}
          </ScrollView>
        </>
      )}

      {mode === "exercise" && target && (
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.md }}>
            {target.loggingMode === "hold" || target.loggingMode === "duration" ? "Logged in seconds"
              : target.loggingMode === "distance" ? "Logged in metres" : "Logged in reps and load"}
          </Text>
          {sets.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm }}>
              <Text style={{ ...typo.caption, color: theme.muted, width: 28 }}>#{i + 1}</Text>
              {target.loggingMode === "hold" || target.loggingMode === "duration" ? (
                <TextInput style={{ ...field, flex: 1 }} placeholder="seconds" placeholderTextColor={theme.muted} keyboardType="number-pad"
                  value={s.durationSeconds} onChangeText={(v) => setSets(sets.map((x, k) => k === i ? { ...x, durationSeconds: v } : x))} />
              ) : target.loggingMode === "distance" ? (
                <TextInput style={{ ...field, flex: 1 }} placeholder="metres" placeholderTextColor={theme.muted} keyboardType="number-pad"
                  value={s.distanceMetres} onChangeText={(v) => setSets(sets.map((x, k) => k === i ? { ...x, distanceMetres: v } : x))} />
              ) : (
                <>
                  <TextInput style={{ ...field, flex: 1 }} placeholder="reps" placeholderTextColor={theme.muted} keyboardType="number-pad"
                    value={s.reps} onChangeText={(v) => setSets(sets.map((x, k) => k === i ? { ...x, reps: v } : x))} />
                  <TextInput style={{ ...field, flex: 1 }} placeholder="kg" placeholderTextColor={theme.muted} keyboardType="decimal-pad"
                    value={s.weightKg} onChangeText={(v) => setSets(sets.map((x, k) => k === i ? { ...x, weightKg: v } : x))} />
                </>
              )}
              {sets.length > 1 && (
                <Pressable onPress={() => setSets(sets.filter((_, k) => k !== i))} hitSlop={8}>
                  <Feather name="x" size={18} color={theme.muted} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable
            onPress={() => setSets([...sets, { ...sets[sets.length - 1]! }])}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: space.sm }}
          >
            <Feather name="plus" size={16} color={theme.accent} />
            <Text style={{ ...typo.body, color: theme.accent }}>Add another set</Text>
          </Pressable>
          <Pressable
            onPress={logSets}
            disabled={busy}
            style={{ marginTop: space.md, backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 14, alignItems: "center" }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Save sets</Text>}
          </Pressable>
        </ScrollView>
      )}

      {mode === "activity" && (
        <>
          <TextInput style={field} placeholder="Search activities" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} autoCorrect={false} />
          <ScrollView style={{ marginTop: space.md }} keyboardShouldPersistTaps="handled">
            {activities.data?.items.slice(0, 30).map((a) => (
              <Card key={a.id} theme={theme} style={{ marginBottom: space.sm, padding: space.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm }}>
                  <Text style={{ ...typo.body, color: theme.ink, flex: 1 }}>{a.name}</Text>
                  <Pill theme={theme} label={`MET ${a.met}`} tone={theme.muted} />
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[20, 30, 45, 60].map((min) => (
                    <Pressable key={min} onPress={() => logActivity(a.id, a.name, min)} disabled={busy}
                      style={{ flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center", backgroundColor: theme.accent + "14" }}>
                      <Text style={{ ...typo.caption, color: theme.accent, fontWeight: "700" }}>{min}m</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            ))}
          </ScrollView>
        </>
      )}

      {mode === "hydration" && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
          {WATER.map((ml) => (
            <Pressable key={ml} onPress={() => logWater(ml)} disabled={busy}
              style={{ width: "47%", flexGrow: 1, paddingVertical: space.lg, alignItems: "center", borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.card }}>
              <Feather name="droplet" size={20} color={theme.teal} />
              <Text style={{ ...typo.title, color: theme.ink, marginTop: 6 }}>{ml}</Text>
              <Text style={{ ...typo.caption, color: theme.muted }}>ml</Text>
            </Pressable>
          ))}
        </View>
      )}
    </BottomSheet>
  );
}
