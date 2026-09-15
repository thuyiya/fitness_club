import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const REVENUE = [
  { m: "Apr", v: 2140 }, { m: "May", v: 2480 }, { m: "Jun", v: 2310 },
  { m: "Jul", v: 2890 }, { m: "Aug", v: 3120 }, { m: "Sep", v: 3460 },
];

export default function CoachProgress() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const max = Math.max(...REVENUE.map((r) => r.v));
  const current = REVENUE.at(-1)!.v;
  const prev = REVENUE.at(-2)!.v;
  const change = (((current - prev) / prev) * 100).toFixed(1);

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Progress</Text>

        <Card theme={theme} style={{ marginBottom: space.md }}>
          <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase" }}>Revenue this month</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: 6, marginBottom: space.lg }}>
            <Text style={{ fontSize: 34, fontWeight: "700", color: theme.ink, letterSpacing: -1 }}>
              £{current.toLocaleString()}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 8 }}>
              <Feather name="trending-up" size={14} color={theme.teal} />
              <Text style={{ ...typo.caption, color: theme.teal, fontWeight: "700" }}>{change}%</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 10 }}>
            {REVENUE.map((r, i) => {
              const last = i === REVENUE.length - 1;
              return (
                <View key={r.m} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ width: "100%", height: Math.max(4, (r.v / max) * 80), backgroundColor: last ? theme.accent : theme.accent + "3D", borderRadius: 4 }} />
                  <Text style={{ fontSize: 10, color: last ? theme.ink : theme.muted, marginTop: 6 }}>{r.m}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={{ flexDirection: "row", gap: space.md, marginBottom: space.xl }}>
          {[
            { k: "Active members", v: "24", i: "users" as const, c: theme.teal },
            { k: "Retention", v: "92%", i: "repeat" as const, c: theme.lime },
          ].map((s) => (
            <Card key={s.k} theme={theme} style={{ flex: 1 }}>
              <Feather name={s.i} size={18} color={s.c} />
              <Text style={{ ...typo.title, color: theme.ink, marginTop: space.sm }}>{s.v}</Text>
              <Text style={{ ...typo.caption, color: theme.muted }}>{s.k}</Text>
            </Card>
          ))}
        </View>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Your own training</Text>
        <Card theme={theme}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ ...typo.heading, color: theme.ink }}>4 sessions this week</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>Coaches train too</Text>
            </View>
            <Pill theme={theme} label="On track" tone={theme.teal} />
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: space.md }}>
            {[1,1,0,1,1,0,0].map((h, i) => (
              <View key={i} style={{ flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: h ? theme.accent : theme.cardAlt }} />
            ))}
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
