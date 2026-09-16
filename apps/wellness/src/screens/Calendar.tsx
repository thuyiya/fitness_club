import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { isoDate, useApi } from "../api/hooks";
import { Card, Pill, Screen } from "../components/ui";
import { useAuth } from "../state/auth";
import { radius, space, type as typo } from "../theme/tokens";

interface Appointment {
  id: string; kind: string; title: string; location: string | null;
  startsAt: string; endsAt: string; status: string;
  member: { id: string; name: string; avatarUrl: string | null } | null;
}
interface CalendarData {
  appointments: Appointment[];
  planWindows: { id: string; planName: string; planType: string; startDate: string; endDate: string | null }[];
}

/** The hours the timeline draws. Outside these, bookings are rare enough that
 *  a full 24-hour axis would be mostly empty space. */
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

const STATUS_TONE: Record<string, "teal" | "accent" | "muted" | "danger"> = {
  confirmed: "teal", completed: "teal", scheduled: "accent", cancelled: "danger", no_show: "danger",
};

/**
 * A timeline day view rather than a list.
 *
 * The point of a calendar for a coach is seeing the GAPS --- a list of three
 * bookings tells you nothing about whether 14:00 is free. Blocks are laid out
 * against an hour axis and sized by duration, so free time is visible as space.
 */
export function CalendarScreen() {
  const { user, theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const key = isoDate(date);
  const isCoach = user?.role !== "member";

  const data = useApi<CalendarData>(`/v1/calendar?from=${key}&to=${key}`, [key]);
  const appointments = data.data?.appointments ?? [];
  const windows = data.data?.planWindows ?? [];

  const shift = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    setDate(next);
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const place = (a: Appointment) => {
    const s = new Date(a.startsAt), e = new Date(a.endsAt);
    const top = (s.getHours() + s.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT;
    const height = Math.max(34, ((e.getTime() - s.getTime()) / 3600000) * HOUR_HEIGHT);
    return { top, height };
  };

  const label = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const isToday = key === isoDate(new Date());

  return (
    <Screen theme={theme}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: theme.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={theme.inkSoft} />
          </Pressable>
          <Text style={{ ...typo.title, color: theme.ink }}>{isToday ? "Today" : label}</Text>
          <Pressable onPress={() => setDate(new Date())} hitSlop={12}>
            <Text style={{ ...typo.caption, color: isToday ? "transparent" : theme.accent, fontWeight: "700" }}>Today</Text>
          </Pressable>
        </View>

        {/* A week strip: the fastest way to move a few days either way. */}
        <View style={{ flexDirection: "row", marginTop: space.md, gap: 4 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(date);
            d.setDate(d.getDate() - 3 + i);
            const active = isoDate(d) === key;
            return (
              <Pressable key={i} onPress={() => setDate(d)} style={{
                flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.sm,
                backgroundColor: active ? theme.accent : "transparent",
              }}>
                <Text style={{ ...typo.caption, color: active ? "#FFFFFF" : theme.muted }}>
                  {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                </Text>
                <Text style={{ ...typo.heading, color: active ? "#FFFFFF" : theme.ink, marginTop: 2 }}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={data.refetch} tintColor={theme.accent} />}
      >
        {windows.length > 0 && (
          <View style={{ padding: space.lg, paddingBottom: 0 }}>
            {windows.map((w) => (
              <View key={w.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Feather name={w.planType === "meal" ? "coffee" : "repeat"} size={13} color={theme.teal} />
                <Text style={{ ...typo.caption, color: theme.inkSoft }}>{w.planName} is active</Text>
              </View>
            ))}
          </View>
        )}

        {data.loading && !data.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : (
          <View style={{ flexDirection: "row", padding: space.lg }}>
            <View style={{ width: 44 }}>
              {hours.map((h) => (
                <View key={h} style={{ height: HOUR_HEIGHT }}>
                  <Text style={{ ...typo.caption, color: theme.muted }}>{String(h).padStart(2, "0")}:00</Text>
                </View>
              ))}
            </View>

            <View style={{ flex: 1, position: "relative" }}>
              {hours.map((h) => (
                <View key={h} style={{ height: HOUR_HEIGHT, borderTopWidth: 1, borderTopColor: theme.line }} />
              ))}

              {appointments.length === 0 && (
                <View style={{ position: "absolute", top: HOUR_HEIGHT * 2, left: 0, right: 0, alignItems: "center" }}>
                  <Text style={{ ...typo.body, color: theme.muted }}>
                    {isCoach ? "No sessions booked" : "Nothing scheduled"}
                  </Text>
                </View>
              )}

              {appointments.map((a) => {
                const { top, height } = place(a);
                const tone = theme[STATUS_TONE[a.status] ?? "accent"];
                const cancelled = a.status === "cancelled" || a.status === "no_show";
                return (
                  <View
                    key={a.id}
                    style={{
                      position: "absolute", top, height, left: 6, right: 0,
                      backgroundColor: cancelled ? theme.cardAlt : tone + "1F",
                      borderLeftWidth: 3, borderLeftColor: tone,
                      borderRadius: radius.sm, padding: 8, justifyContent: "center",
                      opacity: cancelled ? 0.6 : 1,
                    }}
                  >
                    <Text numberOfLines={1} style={{ ...typo.caption, color: theme.ink, fontWeight: "700", textDecorationLine: cancelled ? "line-through" : "none" }}>
                      {isCoach && a.member ? a.member.name : a.title}
                    </Text>
                    <Text numberOfLines={1} style={{ ...typo.caption, color: theme.inkSoft, marginTop: 1 }}>
                      {hhmm(a.startsAt)}–{hhmm(a.endsAt)}
                      {a.location ? ` · ${a.location}` : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {appointments.length > 0 && (
          <View style={{ paddingHorizontal: space.lg }}>
            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              {appointments.length} booking{appointments.length === 1 ? "" : "s"}
            </Text>
            {appointments.map((a) => (
              <Card key={a.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ alignItems: "center", width: 48 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{hhmm(a.startsAt)}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted }}>{hhmm(a.endsAt)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{a.title}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {isCoach && a.member ? a.member.name : a.kind.replace(/_/g, " ")}
                    {a.location ? ` · ${a.location}` : ""}
                  </Text>
                </View>
                <Pill theme={theme} label={a.status.replace(/_/g, " ")} tone={theme[STATUS_TONE[a.status] ?? "accent"]} />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
