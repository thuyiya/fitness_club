import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/api/client";
import { Card, MacroBar, Pill, Screen } from "../../src/components/ui";
import { DateStrip, NotificationBell } from "../../src/components/DateStrip";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface MealRec {
  id: string; slug: string; name: string; mealType: string | null; tags: string[];
  servings: string; proteinG: string; carbsG: string; fatG: string; prepMinutes: number | null;
}

export default function MemberHome() {
  const { user, theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const [recs, setRecs] = useState<MealRec[]>([]);
  const [loading, setLoading] = useState(true);

  // Recommendations lead the screen because that is the question a member
  // opens the app with: "what should I eat now?"
  const load = useCallback(async () => {
    try {
      const res = await api<{ items: MealRec[] }>("/v1/recommend/meals", {
        method: "POST",
        body: { calories: 550, proteinG: 40, carbsG: 50, fatG: 18, limit: 4 },
      });
      setRecs(res.items);
    } catch {
      setRecs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={theme.accent} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <DateStrip theme={theme} date={date} onChange={setDate} />
          <NotificationBell theme={theme} count={3} />
        </View>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
          Recommended for you
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: space.xl }} />
        ) : recs.length === 0 ? (
          <Card theme={theme}>
            <Text style={{ ...typo.body, color: theme.muted }}>
              No recommendations yet. Check the API is running.
            </Text>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {recs.map((m) => {
              const p = Number(m.proteinG), c = Number(m.carbsG), f = Number(m.fatG);
              return (
                <Card key={m.id} theme={theme} style={{ width: 230 }}>
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: space.sm, flexWrap: "wrap" }}>
                    {m.mealType && <Pill theme={theme} label={m.mealType} />}
                    {m.prepMinutes != null && <Pill theme={theme} label={`${m.prepMinutes} min`} tone={theme.teal} />}
                  </View>
                  <Text style={{ ...typo.heading, color: theme.ink, marginBottom: 6 }} numberOfLines={2}>{m.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>
                    Serve {Number(m.servings).toFixed(2)}x
                  </Text>
                  <MacroBar theme={theme} protein={p} carbs={c} fat={f} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.sm }}>
                    <Text style={{ ...typo.caption, color: theme.accent }}>{p.toFixed(0)}g P</Text>
                    <Text style={{ ...typo.caption, color: theme.teal }}>{c.toFixed(0)}g C</Text>
                    <Text style={{ ...typo.caption, color: theme.warning }}>{f.toFixed(0)}g F</Text>
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Today's summary
        </Text>
        <Card theme={theme}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[
              { label: "Calories", value: "1,840", of: "2,400", icon: "zap" as const },
              { label: "Protein", value: "112g", of: "150g", icon: "award" as const },
              { label: "Water", value: "1.8L", of: "2.5L", icon: "droplet" as const },
            ].map((s) => (
              <View key={s.label} style={{ alignItems: "center", flex: 1 }}>
                <Feather name={s.icon} size={18} color={theme.accent} />
                <Text style={{ ...typo.title, color: theme.ink, marginTop: 6 }}>{s.value}</Text>
                <Text style={{ ...typo.caption, color: theme.muted }}>of {s.of}</Text>
                <Text style={{ ...typo.caption, color: theme.inkSoft, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.xl, marginBottom: space.sm }}>
          Meals
        </Text>
        {["Breakfast", "Lunch", "Dinner", "Snack"].map((slot) => (
          <Card key={slot} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ ...typo.heading, color: theme.ink }}>{slot}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>Not logged yet</Text>
            </View>
            <View style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: theme.accent + "14", alignItems: "center", justifyContent: "center" }}>
              <Feather name="plus" size={18} color={theme.accent} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
