import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

/** Bars are rendered from flex, so they scale to any width without a chart lib. */
function Bars({ data, color, max, unit }: { data: number[]; color: string; max: number; unit: string }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 110, gap: 8 }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 9, color, marginBottom: 4 }}>{v > 0 ? `${v}${unit}` : ""}</Text>
          <View style={{ width: "100%", height: Math.max(3, (v / max) * 72), backgroundColor: v > 0 ? color : color + "33", borderRadius: 4 }} />
          <Text style={{ fontSize: 10, marginTop: 6, opacity: 0.6, color }}>{days[i]}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Goal dot graph: one dot per day, filled when the goal was met. A member can
 * read a month of adherence in one glance, which a line chart of the
 * underlying metric does not give them.
 */
function DotGraph({ hits, color, line }: { hits: boolean[]; color: string; line: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {hits.map((hit, i) => (
        <View key={i} style={{ width: 14, height: 14, borderRadius: radius.pill, backgroundColor: hit ? color : "transparent", borderWidth: hit ? 0 : 1.5, borderColor: line }} />
      ))}
    </View>
  );
}

export default function MemberProgress() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();

  const hydration = [2.1, 2.4, 1.8, 2.6, 2.2, 1.4, 1.8];
  const exercise = [45, 0, 60, 30, 55, 0, 40];
  const goals = [
    { title: "Protein 150g daily", source: "coach", color: theme.accent, hits: [1,1,0,1,1,1,0,1,1,1,0,1,1,1].map(Boolean) },
    { title: "Train 4x per week", source: "coach", color: theme.teal, hits: [1,1,1,0,1,1,1,1,0,1,1,1,1,0].map(Boolean) },
    { title: "Walk 8,000 steps", source: "personal", color: theme.lime, hits: [1,0,1,1,0,1,1,0,1,1,1,0,1,1].map(Boolean) },
  ];

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.xs }}>Progress</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space.lg }}>
          <Feather name="activity" size={13} color={theme.muted} />
          <Text style={{ ...typo.caption, color: theme.muted }}>Synced from Apple Health</Text>
        </View>

        <Card theme={theme} style={{ marginBottom: space.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
            <Text style={{ ...typo.heading, color: theme.ink }}>Hydration</Text>
            <Pill theme={theme} label="2.0L avg" tone={theme.teal} />
          </View>
          <Bars data={hydration} color={theme.teal} max={3} unit="L" />
        </Card>

        <Card theme={theme} style={{ marginBottom: space.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
            <Text style={{ ...typo.heading, color: theme.ink }}>Active minutes</Text>
            <Pill theme={theme} label="230 min" />
          </View>
          <Bars data={exercise} color={theme.accent} max={70} unit="" />
        </Card>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Goals</Text>
        {goals.map((g) => {
          const met = g.hits.filter(Boolean).length;
          return (
            <Card key={g.title} theme={theme} style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
                <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }}>{g.title}</Text>
                <Pill theme={theme} label={g.source === "coach" ? "From coach" : "Personal"} tone={g.source === "coach" ? theme.accent : theme.muted} />
              </View>
              <DotGraph hits={g.hits} color={g.color} line={theme.line} />
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.sm }}>
                {met} of {g.hits.length} days met
              </Text>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
