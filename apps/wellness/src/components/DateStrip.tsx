import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

const fmt = (d: Date) => {
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const yday = new Date(today); yday.setDate(today.getDate() - 1);
  if (same) return "Today";
  if (d.toDateString() === yday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

/**
 * "Today" with arrows and a calendar, shared by the member and coach homes.
 * Forward navigation stops at today: there is nothing logged in the future,
 * and letting someone scroll into it just shows empty screens.
 */
export function DateStrip({ theme, date, onChange, onOpenCalendar }: { theme: Theme; date: Date; onChange: (d: Date) => void; onOpenCalendar?: () => void }) {
  const shift = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    if (next > new Date()) return;
    onChange(next);
  };
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <Pressable onPress={() => shift(-1)} hitSlop={10}>
        <Feather name="chevron-left" size={22} color={theme.inkSoft} />
      </Pressable>
      {/* The calendar icon opens the timeline; the label alone jumps to today. */}
      <Pressable onPress={onOpenCalendar} hitSlop={8}>
        <Feather name="calendar" size={16} color={theme.inkSoft} />
      </Pressable>
      <Pressable onPress={() => onChange(new Date())} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ ...typo.title, color: theme.ink }}>{fmt(date)}</Text>
      </Pressable>
      <Pressable onPress={() => shift(1)} hitSlop={10} disabled={isToday}>
        <Feather name="chevron-right" size={22} color={isToday ? theme.line : theme.inkSoft} />
      </Pressable>
    </View>
  );
}

export function NotificationBell({ theme, count = 0, onPress }: { theme: Theme; count?: number; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Feather name="bell" size={22} color={theme.inkSoft} />
      {count > 0 && (
        <View
          style={{
            position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, borderRadius: radius.pill,
            backgroundColor: theme.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}
