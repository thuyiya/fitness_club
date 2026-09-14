import React, { useState } from "react";
import { View } from "react-native";
import { Heart } from "lucide-react-native";
import { useHealthStore } from "@/store/healthStore";
import { localDate } from "@/lib/health";
import { useTheme } from "@/theme";
import { Card, Text, PillButton, WeightChart } from "@/components";
export function HealthProgress({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const [chartWidth, setChartWidth] = useState(280);
  const { enabled, data, busy, error, connect, refresh, disconnect } =
    useHealthStore();
  const today = data?.days.find((d) => d.date === localDate());
  const fmt = (value: number | null | undefined, digits = 0) =>
    value == null
      ? "—"
      : value.toLocaleString(undefined, { maximumFractionDigits: digits });
  return (
    <Card style={{ marginVertical: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Heart color={theme.colors.danger} size={20} />
        <Text variant="headline">Apple Health</Text>
      </View>
      <Text variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
        {enabled
          ? data
            ? `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · on this device`
            : "Waiting for shared readings"
          : "See your movement and weight from iPhone and Apple Watch."}
      </Text>
      {!!error && (
        <Text color="warning" variant="footnote" style={{ marginTop: 10 }}>
          {error}
        </Text>
      )}
      {enabled && (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 18,
              marginVertical: 18,
            }}
          >
            {[
              ["Steps", fmt(today?.steps)],
              ["Active kcal", fmt(today?.activeKcal)],
              ["Exercise min", fmt(today?.exerciseMinutes)],
              ["Distance km", fmt(today?.distanceKm, 1)],
            ].map(([label, value]) => (
              <View key={label} style={{ minWidth: "40%", flexGrow: 1 }}>
                <Text variant="title2">{value}</Text>
                <Text variant="caption" color="textSecondary">
                  {label}
                </Text>
              </View>
            ))}
          </View>
          {!compact && data && (
            <>
              <Text variant="footnote">Active energy · last 7 days</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  height: 105,
                  gap: 8,
                  marginVertical: 14,
                }}
              >
                {data.days.map((d) => (
                  <View
                    key={d.date}
                    style={{ flex: 1, alignItems: "center", gap: 5 }}
                  >
                    <Text variant="caption">{fmt(d.activeKcal)}</Text>
                    <View
                      style={{
                        width: "70%",
                        height:
                          d.activeKcal == null
                            ? 2
                            : Math.max(
                                3,
                                (d.activeKcal /
                                  Math.max(
                                    1,
                                    ...data.days.map((x) => x.activeKcal ?? 0),
                                  )) *
                                  60,
                              ),
                        borderRadius: 5,
                        backgroundColor:
                          d.activeKcal == null
                            ? theme.colors.separator
                            : theme.colors.primary,
                      }}
                    />
                    <Text variant="caption" color="textSecondary">
                      {new Date(d.date + "T12:00:00").toLocaleDateString(
                        undefined,
                        { weekday: "narrow" },
                      )}
                    </Text>
                  </View>
                ))}
              </View>
              <Text variant="footnote" color="textSecondary">
                Latest shared weight:{" "}
                {data.weights[0]
                  ? `${fmt(data.weights[0].kg, 1)} kg · ${new Date(data.weights[0].date).toLocaleDateString()}`
                  : "—"}
              </Text>
              <Text
                variant="footnote"
                color="textSecondary"
                style={{ marginTop: 8 }}
              >
                {data.workouts.length} shared workouts this week ·{" "}
                {Math.round(data.workouts.reduce((n, w) => n + w.minutes, 0))}{" "}
                minutes
              </Text>
            </>
          )}
          <Text
            variant="caption"
            color="textSecondary"
            style={{ marginVertical: 12 }}
          >
            A dash means no shared data, which can include missing permission.
            Health readings are shown separately from manual logs to avoid
            counting the same activity twice.
          </Text>
        </>
      )}
      {!compact && enabled && data && data.weights.length > 1 && <View onLayout={event => setChartWidth(event.nativeEvent.layout.width)} style={{ marginVertical: 16 }}><Text variant="footnote">Measured weight · Apple Health · last 90 days</Text><WeightChart data={[...data.weights].reverse().map(w => ({ x: w.date, y: w.kg }))} width={chartWidth} height={160}/></View>}
      <PillButton
        label={
          busy
            ? "Refreshing…"
            : enabled
              ? "Refresh Apple Health"
              : "Connect Apple Health"
        }
        loading={busy}
        disabled={busy}
        onPress={() => (enabled ? refresh() : connect())}
      />
      {enabled && !compact && (
        <PillButton
          label="Disconnect from this app"
          variant="ghost"
          onPress={disconnect}
          style={{ marginTop: 8 }}
        />
      )}
      {!compact && (
        <Text variant="caption" color="textTertiary" style={{ marginTop: 10 }}>
          Read-only. Manage shared categories in Apple Health → profile → Apps →
          Nutrition + Fitness. Disconnect clears this app’s readings; revoke
          permissions in Apple Health.
        </Text>
      )}
    </Card>
  );
}
