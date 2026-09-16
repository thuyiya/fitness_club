import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { daysAgo, isoDate, useApi } from "../../src/api/hooks";
import type { Goal, Series } from "../../src/api/types";
import { Card, Pill, Screen } from "../../src/components/ui";
import { GoalSheet } from "../../src/components/GoalSheet";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const DAY_LABEL = ["S", "M", "T", "W", "T", "F", "S"];

/** Bars sized by flex, so no chart library and no fixed pixel widths. */
function Bars({ theme, points, color, unit, decimals = 0 }: {
  theme: ReturnType<typeof useAuth>["theme"];
  points: { date: string; value: number }[];
  color: string; unit: string; decimals?: number;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: 6 }}>
      {points.map((p) => {
        const d = new Date(p.date + "T00:00:00");
        return (
          <View key={p.date} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: p.value > 0 ? color : "transparent", marginBottom: 4 }}>
              {p.value.toFixed(decimals)}{unit}
            </Text>
            <View style={{ width: "100%", height: Math.max(3, (p.value / max) * 76), backgroundColor: p.value > 0 ? color : theme.line, borderRadius: 4 }} />
            <Text style={{ fontSize: 10, marginTop: 6, color: theme.muted }}>{DAY_LABEL[d.getDay()]}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * One dot per evaluated day: filled when the target was met. A month of
 * adherence is readable at a glance, which a line of the underlying metric is not.
 */
/**
 * One dot per DAY over a fixed window, not one per entry.
 *
 * Drawing only the entries made a gap in logging look identical to a missed
 * target, and the row never lined up with the calendar --- two goals started on
 * different days rendered at different lengths. Three states now: met, missed,
 * and not logged at all, which are three different conversations with a coach.
 */
function DotGraph({
  entries, color, line, muted, days = 14, endDate,
}: { entries: Goal["entries"]; color: string; line: string; muted: string; days?: number; endDate: Date }) {
  const byDate = new Map(entries.map((e) => [e.date, e.achieved]));
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(endDate);
    d.setDate(d.getDate() - (days - 1 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { iso, state: byDate.has(iso) ? (byDate.get(iso) ? "met" : "missed") : "none", day: d };
  });

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {cells.map((c) => (
          <View key={c.iso} style={{ flex: 1, alignItems: "center" }}>
            <View
              style={{
                width: 13, height: 13, borderRadius: radius.pill,
                backgroundColor: c.state === "met" ? color : "transparent",
                borderWidth: c.state === "met" ? 0 : 1.5,
                borderColor: c.state === "missed" ? line : muted + "55",
                borderStyle: c.state === "none" ? "dashed" : "solid",
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
        {cells.map((c, i) => (
          <View key={c.iso} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 8, color: muted }}>
              {i % 2 === 0 ? c.day.toLocaleDateString(undefined, { weekday: "narrow" }) : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MemberProgress() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();

  const from = isoDate(daysAgo(6));
  const to = isoDate(daysAgo(0));
  const series = useApi<Series>(`/v1/logs/series?from=${from}&to=${to}`);
  const goals = useApi<{ items: Goal[] }>(`/v1/goals?from=${isoDate(daysAgo(13))}&to=${to}`);
  const [goalSheet, setGoalSheet] = useState(false);

  // The API returns only days that have data; the chart needs all seven.
  const week = Array.from({ length: 7 }, (_, i) => isoDate(daysAgo(6 - i)));
  const hydration = week.map((d) => ({ date: d, value: (series.data?.hydration.find((h) => h.date === d)?.ml ?? 0) / 1000 }));
  const activity = week.map((d) => ({ date: d, value: series.data?.activity.find((a) => a.date === d)?.minutes ?? 0 }));

  const avgWater = hydration.reduce((n, h) => n + h.value, 0) / 7;
  const totalMinutes = activity.reduce((n, a) => n + a.value, 0);
  const loading = series.loading || goals.loading;

  const palette = [theme.accent, theme.teal, theme.lime, theme.warning];

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { series.refetch(); goals.refetch(); }} tintColor={theme.accent} />}
      >
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.xs }}>Progress</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space.lg }}>
          <Feather name="activity" size={13} color={theme.muted} />
          <Text style={{ ...typo.caption, color: theme.muted }}>Last 7 days</Text>
        </View>

        {loading && !series.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: space.xxl }} />
        ) : (
          <>
            <Card theme={theme} style={{ marginBottom: space.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>Hydration</Text>
                <Pill theme={theme} label={`${avgWater.toFixed(1)}L avg`} tone={theme.teal} />
              </View>
              <Bars theme={theme} points={hydration} color={theme.teal} unit="L" decimals={1} />
            </Card>

            <Card theme={theme} style={{ marginBottom: space.xl }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>Active minutes</Text>
                <Pill theme={theme} label={`${totalMinutes} min`} />
              </View>
              <Bars theme={theme} points={activity} color={theme.accent} unit="" />
            </Card>

            {(series.data?.weight.length ?? 0) > 1 && (
              <Card theme={theme} style={{ marginBottom: space.xl }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>Weight</Text>
                  <Text style={{ ...typo.title, color: theme.ink }}>
                    {Number(series.data!.weight.at(-1)!.weightKg).toFixed(1)} kg
                  </Text>
                </View>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 4 }}>
                  {(() => {
                    const delta = Number(series.data!.weight.at(-1)!.weightKg) - Number(series.data!.weight[0]!.weightKg);
                    return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} kg this week`;
                  })()}
                </Text>
              </Card>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm }}>
              <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase" }}>Goals</Text>
              <Pressable onPress={() => setGoalSheet(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="plus" size={15} color={theme.accent} />
                <Text style={{ ...typo.caption, color: theme.accent, fontWeight: "700" }}>New goal</Text>
              </Pressable>
            </View>
            {(goals.data?.items.length ?? 0) === 0 ? (
              <Card theme={theme}>
                <Text style={{ ...typo.body, color: theme.muted }}>
                  No goals yet. Your coach can set them, or you can add your own.
                </Text>
              </Card>
            ) : (
              goals.data!.items.map((g, i) => (
                <Card key={g.id} theme={theme} style={{ marginBottom: space.sm }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
                    <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }}>{g.title}</Text>
                    <Pill
                      theme={theme}
                      label={g.source === "coach" ? "From coach" : "Personal"}
                      tone={g.source === "coach" ? theme.accent : theme.muted}
                    />
                  </View>
                  <DotGraph entries={g.entries} color={palette[i % palette.length]!} line={theme.line} muted={theme.muted} endDate={new Date()} />
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.sm }}>
                    {g.achievedCount} of {g.evaluatedCount} logged days met · target {Number(g.targetValue)}{g.unit ?? ""}
                  </Text>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>

      <GoalSheet
        theme={theme}
        visible={goalSheet}
        onClose={() => setGoalSheet(false)}
        onCreated={goals.refetch}
      />
    </Screen>
  );
}
