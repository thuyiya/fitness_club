import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

/** YYYY-MM-DD in local terms --- toISOString would shift the day west of UTC. */
export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Every date from `from` to `to` inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const cursor = parseDay(from);
  const end = parseDay(to);
  while (cursor <= end) {
    out.push(isoDay(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * A month grid that picks a START then an END.
 *
 * Two separate pickers would let a coach set an end before the start and only
 * find out on save. Here the second tap is interpreted against the first: tap
 * earlier than the start and it becomes the new start, so there is no state in
 * which the range is backwards.
 */
export function DateRangePicker({
  theme, start, end, onChange,
}: {
  theme: Theme;
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
}) {
  const [month, setMonth] = useState(() => {
    const base = start ? parseDay(start) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  // Monday-first, matching the rest of the app's week strips.
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDay(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];

  const pick = (day: string) => {
    if (!start || (start && end)) return onChange(day, null);
    if (day < start) return onChange(day, null);
    onChange(start, day);
  };

  const shiftMonth = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const today = isoDay(new Date());

  return (
    <View style={{ backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, padding: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm }}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} accessibilityLabel="Previous month">
          <Feather name="chevron-left" size={20} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.heading, color: theme.ink }}>
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12} accessibilityLabel="Next month">
          <Feather name="chevron-right" size={20} color={theme.inkSoft} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
            <Text style={{ ...typo.caption, color: theme.muted }}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((day, i) => {
          if (!day) return <View key={`pad-${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
          const isStart = day === start;
          const isEnd = day === end;
          const inRange = !!start && !!end && day > start && day < end;
          const edge = isStart || isEnd;
          return (
            <Pressable
              key={day}
              onPress={() => pick(day)}
              accessibilityLabel={day}
              style={{
                width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center",
                backgroundColor: inRange ? theme.accent + "1A" : "transparent",
              }}
            >
              <View style={{
                width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
                backgroundColor: edge ? theme.accent : "transparent",
                borderWidth: !edge && day === today ? 1 : 0, borderColor: theme.accent,
              }}>
                <Text style={{
                  ...typo.body,
                  fontWeight: edge ? "700" : "400",
                  color: edge ? "#FFFFFF" : theme.ink,
                }}>
                  {parseDay(day).getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.sm, textAlign: "center" }}>
        {!start ? "Tap a day to start the block"
          : !end ? "Now tap the last day"
          : `${eachDay(start, end).length} days · ${parseDay(start).toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${parseDay(end).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
      </Text>
    </View>
  );
}
