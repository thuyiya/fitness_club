import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { isoDate, useAction, useApi } from "../../src/api/hooks";
import { Button, Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

type Mode = "menu" | "meal" | "activity" | "hydration";

const QUICK_WATER = [250, 330, 500, 750];

export default function QuickLog() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slot?: string; mealSlug?: string }>();
  const today = isoDate(new Date());

  const [mode, setMode] = useState<Mode>(params.slot || params.mealSlug ? "meal" : "menu");
  const [slot, setSlot] = useState(params.slot ?? "lunch");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { busy, error, run } = useAction();

  // Empty query lists the catalog; typing switches to search. Hybrid mode means
  // "chiken" finds chicken and "after training" finds the shake.
  const mealSearch = useApi<{ items: { id: string; name: string }[] }>(
    mode === "meal" ? (query.trim().length >= 2 ? `/v1/search?q=${encodeURIComponent(query)}&type=meals&limit=12` : null) : null,
    [query],
  );
  const activities = useApi<{ items: { id: string; name: string; met: string; group: string }[] }>(
    mode === "activity" ? `/v1/activities?limit=100${query.trim() ? `&q=${encodeURIComponent(query)}` : ""}` : null,
    [query],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace("/member"));

  const logMeal = async (mealId: string, name: string) => {
    const ok = await run(() =>
      api("/v1/logs/meals", { method: "POST", body: { date: today, mealType: slot, mealId, servings: 1 } }),
    );
    if (ok) { setSubmitted(`${name} logged`); setTimeout(close, 900); }
  };

  const logActivity = async (activityId: string, name: string, minutes: number) => {
    const ok = await run(() =>
      api("/v1/logs/activity", { method: "POST", body: { date: today, activityId, durationMinutes: minutes } }),
    );
    if (ok) { setSubmitted(`${name}, ${minutes} min`); setTimeout(close, 900); }
  };

  const logWater = async (ml: number) => {
    const ok = await run(() => api("/v1/logs/hydration", { method: "POST", body: { date: today, amountMl: ml } }));
    if (ok) { setSubmitted(`${ml} ml logged`); setTimeout(close, 700); }
  };

  const field = {
    backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1,
    borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink, marginBottom: space.md,
  };

  return (
    <Screen theme={theme}>
      <View style={{ padding: space.lg, paddingTop: insets.top + space.md, flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.lg }}>
          <Pressable onPress={() => (mode === "menu" ? close() : setMode("menu"))} hitSlop={12} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {mode !== "menu" && <Feather name="chevron-left" size={22} color={theme.inkSoft} />}
            <Text style={{ ...typo.display, color: theme.ink }}>
              {mode === "menu" ? "Quick log" : mode === "meal" ? "Log a meal" : mode === "activity" ? "Log training" : "Hydration"}
            </Text>
          </Pressable>
          <Pressable onPress={close} hitSlop={12}><Feather name="x" size={24} color={theme.inkSoft} /></Pressable>
        </View>

        {submitted && (
          <Card theme={theme} style={{ marginBottom: space.md, borderColor: theme.teal, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="check-circle" size={16} color={theme.teal} />
            <Text style={{ ...typo.body, color: theme.ink }}>{submitted}</Text>
          </Card>
        )}
        {error && (
          <Card theme={theme} style={{ marginBottom: space.md, borderColor: theme.danger }}>
            <Text style={{ ...typo.body, color: theme.danger }}>{error}</Text>
          </Card>
        )}

        {mode === "menu" && (
          <ScrollView>
            {([
              { m: "meal" as Mode, icon: "coffee" as const, label: "Meal", hint: "Search the food database", tone: theme.accent },
              { m: "activity" as Mode, icon: "activity" as const, label: "Exercise", hint: "A workout or a sport", tone: theme.teal },
              { m: "hydration" as Mode, icon: "droplet" as const, label: "Hydration", hint: "Add a glass or bottle", tone: theme.lime },
            ]).map((o) => (
              <Pressable
                key={o.label}
                onPress={() => { setQuery(""); setMode(o.m); }}
                style={({ pressed }) => ({
                  flexDirection: "row", alignItems: "center", gap: space.lg, padding: space.lg, marginBottom: space.md,
                  backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
                })}
              >
                <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: o.tone + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={o.icon} size={22} color={o.tone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{o.label}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{o.hint}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.muted} />
              </Pressable>
            ))}
            <Card theme={theme} style={{ opacity: 0.6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Feather name="camera" size={20} color={theme.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.inkSoft }}>Photo</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>Needs image upload — not wired yet</Text>
                </View>
              </View>
            </Card>
          </ScrollView>
        )}

        {mode === "meal" && (
          <>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: space.md }}>
              {["breakfast", "lunch", "dinner", "snack"].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSlot(s)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center", borderWidth: 1,
                    borderColor: slot === s ? theme.accent : theme.line,
                    backgroundColor: slot === s ? theme.accent + "14" : theme.card,
                  }}
                >
                  <Text style={{ ...typo.caption, color: slot === s ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={field}
              placeholder='Search meals — try "chiken" or "after training"'
              placeholderTextColor={theme.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {query.trim().length < 2 ? (
                <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>
                  Type at least two characters. Typos and plain descriptions both work.
                </Text>
              ) : mealSearch.loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
              ) : (mealSearch.data?.items.length ?? 0) === 0 ? (
                <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>No meals matched.</Text>
              ) : (
                mealSearch.data!.items.map((m) => (
                  <Pressable key={m.id} onPress={() => logMeal(m.id, m.name)} disabled={busy}>
                    <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                      <Text style={{ ...typo.body, color: theme.ink, flex: 1 }}>{m.name}</Text>
                      <Feather name="plus-circle" size={20} color={theme.accent} />
                    </Card>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </>
        )}

        {mode === "activity" && (
          <>
            <TextInput style={field} placeholder="Search activities" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} autoCorrect={false} />
            <ScrollView keyboardShouldPersistTaps="handled">
              {activities.loading && !activities.data ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
              ) : (
                activities.data?.items.slice(0, 25).map((a) => (
                  <Card key={a.id} theme={theme} style={{ marginBottom: space.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm }}>
                      <Text style={{ ...typo.body, color: theme.ink, flex: 1 }}>{a.name}</Text>
                      <Pill theme={theme} label={`MET ${a.met}`} tone={theme.muted} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {[20, 30, 45, 60].map((min) => (
                        <Pressable
                          key={min}
                          onPress={() => logActivity(a.id, a.name, min)}
                          disabled={busy}
                          style={{ flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center", backgroundColor: theme.accent + "14" }}
                        >
                          <Text style={{ ...typo.caption, color: theme.accent, fontWeight: "700" }}>{min}m</Text>
                        </Pressable>
                      ))}
                    </View>
                  </Card>
                ))
              )}
            </ScrollView>
          </>
        )}

        {mode === "hydration" && (
          <View>
            <Text style={{ ...typo.body, color: theme.muted, marginBottom: space.lg }}>How much did you drink?</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
              {QUICK_WATER.map((ml) => (
                <Pressable
                  key={ml}
                  onPress={() => logWater(ml)}
                  disabled={busy}
                  style={{
                    width: "47%", flexGrow: 1, paddingVertical: space.xl, alignItems: "center",
                    borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.card,
                  }}
                >
                  <Feather name="droplet" size={22} color={theme.teal} />
                  <Text style={{ ...typo.title, color: theme.ink, marginTop: space.sm }}>{ml}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted }}>ml</Text>
                </Pressable>
              ))}
            </View>
            {busy && <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} />}
          </View>
        )}
      </View>
    </Screen>
  );
}
