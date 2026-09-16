import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { isoDate, useAction, useApi } from "../../src/api/hooks";
import { Card, MacroBar, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Hit {
  id: string; name: string; calories?: string; proteinG?: string; carbsG?: string; fatG?: string;
  servingSize?: string; servingUnit?: string; allergens?: string[]; mealType?: string | null;
}
/** One line on the plate. `kind` decides how quantity is interpreted. */
interface PlateItem {
  key: string; kind: "meal" | "food"; id: string; name: string;
  quantity: number; unit: string;
  calories: number; proteinG: number; carbsG: number; fatG: number;
}

const scale = (h: Hit, kind: "meal" | "food", qty: number) => {
  // A catalog meal scales by servings; a food scales by its serving size.
  const factor = kind === "meal" ? qty : qty / Number(h.servingSize || 100);
  return {
    calories: Number(h.calories ?? 0) * factor,
    proteinG: Number(h.proteinG ?? 0) * factor,
    carbsG: Number(h.carbsG ?? 0) * factor,
    fatG: Number(h.fatG ?? 0) * factor,
  };
};

/**
 * Build a plate, then log it.
 *
 * A full screen rather than a sheet: assembling a meal from several items needs
 * room, and the member is deliberately leaving Home to do it. Logging returns
 * them to the card they started from.
 */
export default function MealBuilder() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slot?: string; date?: string }>();
  const slot = params.slot ?? "lunch";
  const date = params.date ?? isoDate(new Date());

  const [tab, setTab] = useState<"meals" | "foods">("meals");
  const [query, setQuery] = useState("");
  const [plate, setPlate] = useState<PlateItem[]>([]);
  const { busy, error, run } = useAction();

  const results = useApi<{ items: Hit[] }>(
    query.trim().length >= 2
      ? `/v1/search?q=${encodeURIComponent(query)}&type=${tab}&limit=15`
      : tab === "foods" ? "/v1/foods?limit=30" : null,
    [query, tab],
  );

  const add = (h: Hit, kind: "meal" | "food") => {
    const qty = kind === "meal" ? 1 : Number(h.servingSize || 100);
    setPlate((p) => [...p, {
      key: `${kind}:${h.id}:${Date.now()}`, kind, id: h.id, name: h.name,
      quantity: qty, unit: kind === "meal" ? "serving" : (h.servingUnit ?? "g"),
      ...scale(h, kind, qty),
    }]);
  };

  const setQty = (key: string, quantity: number) =>
    setPlate((p) => p.map((i) => {
      if (i.key !== key) return i;
      const per = i.quantity > 0 ? quantity / i.quantity : 0;
      return { ...i, quantity, calories: i.calories * per, proteinG: i.proteinG * per, carbsG: i.carbsG * per, fatG: i.fatG * per };
    }));

  const total = plate.reduce(
    (a, i) => ({ calories: a.calories + i.calories, proteinG: a.proteinG + i.proteinG, carbsG: a.carbsG + i.carbsG, fatG: a.fatG + i.fatG }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const log = async () => {
    if (plate.length === 0) return;
    const ok = await run(() =>
      api("/v1/logs/meals", {
        method: "POST",
        body: {
          date, mealType: slot, loggedAt: new Date().toISOString(),
          items: plate.map((i) => i.kind === "meal"
            ? { mealId: i.id, quantity: i.quantity, unit: "serving" }
            : { foodId: i.id, quantity: i.quantity, unit: i.unit }),
        },
      }),
    );
    if (ok) router.back();
  };

  const field = { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink };

  return (
    <Screen theme={theme}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={theme.inkSoft} />
          </Pressable>
          <Text style={{ ...typo.title, color: theme.ink, flex: 1, textTransform: "capitalize" }}>{slot}</Text>
          <Pill theme={theme} label={`${plate.length} item${plate.length === 1 ? "" : "s"}`} tone={plate.length ? theme.accent : theme.muted} />
        </View>

        <View style={{ flexDirection: "row", gap: 6, marginTop: space.md }}>
          {(["meals", "foods"] as const).map((t) => (
            <Pressable key={t} onPress={() => { setTab(t); setQuery(""); }} style={{
              flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center", borderWidth: 1,
              borderColor: tab === t ? theme.accent : theme.line,
              backgroundColor: tab === t ? theme.accent + "14" : theme.card,
            }}>
              <Text style={{ ...typo.body, color: tab === t ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>
                {t === "meals" ? "Meals" : "Ingredients"}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={{ ...field, marginTop: space.md }}
          placeholder={tab === "meals" ? 'Search meals — try "after training"' : "Search ingredients"}
          placeholderTextColor={theme.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: plate.length ? 230 : 120 }} keyboardShouldPersistTaps="handled">
        {results.loading && !results.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
        ) : !results.data ? (
          <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>
            Type at least two characters. Typos and plain descriptions both work.
          </Text>
        ) : (
          results.data.items.map((h) => {
            const kind = tab === "meals" ? "meal" : "food";
            return (
              <Pressable key={h.id} onPress={() => add(h, kind)}>
                <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typo.heading, color: theme.ink }} numberOfLines={1}>{h.name}</Text>
                      <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                        {Math.round(Number(h.calories ?? 0))} kcal
                        {kind === "food" ? ` per ${Number(h.servingSize ?? 100)}${h.servingUnit ?? "g"}` : " per serving"}
                        {(h.allergens?.length ?? 0) > 0 ? ` · ${h.allergens!.join(", ")}` : ""}
                      </Text>
                    </View>
                    <Feather name="plus-circle" size={21} color={theme.accent} />
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {plate.length > 0 && (
        <View style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.line,
          paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.md,
          borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
        }}>
          <ScrollView style={{ maxHeight: 150 }}>
            {plate.map((i) => (
              <View key={i.key} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.body, color: theme.ink }} numberOfLines={1}>{i.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted }}>{Math.round(i.calories)} kcal</Text>
                </View>
                <TextInput
                  style={{ width: 66, backgroundColor: theme.bg, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 8, color: theme.ink, textAlign: "right" }}
                  keyboardType="decimal-pad"
                  value={String(Math.round(i.quantity * 10) / 10)}
                  onChangeText={(v) => setQty(i.key, Number(v) || 0)}
                />
                <Text style={{ ...typo.caption, color: theme.muted, width: 40 }}>{i.unit}</Text>
                <Pressable onPress={() => setPlate((p) => p.filter((x) => x.key !== i.key))} hitSlop={8}>
                  <Feather name="x" size={17} color={theme.muted} />
                </Pressable>
              </View>
            ))}
          </ScrollView>

          <View style={{ marginTop: space.sm, marginBottom: space.md }}>
            <MacroBar theme={theme} protein={total.proteinG} carbs={total.carbsG} fat={total.fatG} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Text style={{ ...typo.heading, color: theme.ink }}>{Math.round(total.calories)} kcal</Text>
              <Text style={{ ...typo.caption, color: theme.accent }}>{total.proteinG.toFixed(0)}g P</Text>
              <Text style={{ ...typo.caption, color: theme.teal }}>{total.carbsG.toFixed(0)}g C</Text>
              <Text style={{ ...typo.caption, color: theme.warning }}>{total.fatG.toFixed(0)}g F</Text>
            </View>
          </View>

          {error && <Text style={{ ...typo.caption, color: theme.danger, marginBottom: space.sm }}>{error}</Text>}

          <Pressable onPress={log} disabled={busy} style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Log {slot}</Text>}
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
