import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { isoDate, useApi } from "../../src/api/hooks";
import type { CoachToday } from "../../src/api/types";
import { Card, Pill, Screen } from "../../src/components/ui";
import { DateStrip, NotificationBell } from "../../src/components/DateStrip";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

type Row = CoachToday["members"][number];

export default function CoachHome() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());
  const today = useApi<CoachToday>(`/v1/coach/today?date=${isoDate(date)}`);
  const notifications = useApi<{ unreadCount: number }>("/v1/notifications");

  const members = today.data?.members ?? [];
  const done = members.filter((m) => m.done);
  const pending = members.filter((m) => !m.done);

  return (
    <Screen theme={theme}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { today.refetch(); notifications.refetch(); }} tintColor={theme.accent} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <DateStrip theme={theme} date={date} onChange={setDate} onOpenCalendar={() => router.push("/coach/calendar")} />
          <NotificationBell theme={theme} count={notifications.data?.unreadCount ?? 0} onPress={() => router.push("/coach/notifications")} />
        </View>

        {today.loading && !today.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : members.length === 0 ? (
          <Card theme={theme}>
            <Text style={{ ...typo.heading, color: theme.ink }}>No members yet</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
              Members appear here once they request to join your gym and you approve them.
            </Text>
          </Card>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: space.md, marginBottom: space.xl }}>
              <Card theme={theme} style={{ flex: 1 }}>
                <Text style={{ ...typo.display, color: theme.teal }}>{done.length}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>completed</Text>
              </Card>
              <Card theme={theme} style={{ flex: 1 }}>
                <Text style={{ ...typo.display, color: pending.length ? theme.warning : theme.muted }}>{pending.length}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>need attention</Text>
              </Card>
            </View>

            {pending.length > 0 && (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Needs attention</Text>
                {pending.map((m) => <MemberRow key={m.id} m={m} theme={theme} />)}
              </>
            )}
            {done.length > 0 && (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>Completed</Text>
                {done.map((m) => <MemberRow key={m.id} m={m} theme={theme} />)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function MemberRow({ m, theme }: { m: Row; theme: ReturnType<typeof useAuth>["theme"] }) {
  return (
    <Pressable onPress={() => router.push({ pathname: "/coach/member/[id]", params: { id: m.id } })}>
    <Card theme={theme} style={{ marginBottom: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: (m.done ? theme.teal : theme.warning) + "1F", alignItems: "center", justifyContent: "center" }}>
          <Feather name={m.done ? "check" : "clock"} size={18} color={m.done ? theme.teal : theme.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.heading, color: theme.ink }}>{m.name}</Text>
          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
            {m.sessionTitle ? `${m.sessionTitle} · ${m.minutes} min` : "No session logged"}
          </Text>
        </View>
        <Pill theme={theme} label={m.done ? "Done" : "Pending"} tone={m.done ? theme.teal : theme.warning} />
      </View>
      <View style={{ flexDirection: "row", marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
        {[
          { k: "Meals", v: `${m.mealsLogged}`, c: m.mealsLogged >= 3 ? theme.teal : theme.warning },
          { k: "Calories", v: m.kcalIn ? m.kcalIn.toLocaleString() : "—", c: theme.inkSoft },
          { k: "Protein", v: m.proteinG ? `${m.proteinG}g` : "—", c: theme.inkSoft },
          { k: "Water", v: m.hydrationMl ? `${(m.hydrationMl / 1000).toFixed(1)}L` : "—", c: m.hydrationMl >= 2000 ? theme.teal : theme.inkSoft },
        ].map((s) => (
          <View key={s.k} style={{ flex: 1 }}>
            <Text style={{ ...typo.caption, color: theme.muted }}>{s.k}</Text>
            <Text style={{ ...typo.body, color: s.c, fontWeight: "600", marginTop: 2 }}>{s.v}</Text>
          </View>
        ))}
      </View>
    </Card>
    </Pressable>
  );
}
