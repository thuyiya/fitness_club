import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Card, Pill, Screen } from "../../src/components/ui";
import { DateStrip, NotificationBell } from "../../src/components/DateStrip";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const MEMBERS = [
  { name: "Amara Osei", done: true,  session: "Upper push A",   volume: "4,250 kg", kcal: 1920, protein: 128, target: 150 },
  { name: "Tom Fischer", done: true,  session: "Zone 2 run",     volume: "8.2 km",   kcal: 2410, protein: 151, target: 150 },
  { name: "Priya Raman", done: false, session: "Lower pull B",   volume: "—",        kcal: 1180, protein: 64,  target: 130 },
  { name: "Ben Carter",  done: true,  session: "Full body",      volume: "3,100 kg", kcal: 2210, protein: 142, target: 140 },
  { name: "Lena Novak",  done: false, session: "Mobility",       volume: "—",        kcal: 890,  protein: 38,  target: 120 },
];

export default function CoachHome() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(new Date());

  const completed = MEMBERS.filter((m) => m.done);
  const attention = MEMBERS.filter((m) => !m.done);

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <DateStrip theme={theme} date={date} onChange={setDate} />
          <NotificationBell theme={theme} count={5} />
        </View>

        <View style={{ flexDirection: "row", gap: space.md, marginBottom: space.xl }}>
          <Card theme={theme} style={{ flex: 1 }}>
            <Text style={{ ...typo.display, color: theme.teal }}>{completed.length}</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>completed today</Text>
          </Card>
          <Card theme={theme} style={{ flex: 1 }}>
            <Text style={{ ...typo.display, color: theme.warning }}>{attention.length}</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>need attention</Text>
          </Card>
        </View>

        {attention.length > 0 && (
          <>
            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Needs attention</Text>
            {attention.map((m) => (
              <MemberRow key={m.name} m={m} theme={theme} />
            ))}
          </>
        )}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>
          Completed
        </Text>
        {completed.map((m) => (
          <MemberRow key={m.name} m={m} theme={theme} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function MemberRow({ m, theme }: { m: (typeof MEMBERS)[number]; theme: ReturnType<typeof useAuth>["theme"] }) {
  const hit = m.protein >= m.target;
  return (
    <Card theme={theme} style={{ marginBottom: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: (m.done ? theme.teal : theme.warning) + "1F", alignItems: "center", justifyContent: "center" }}>
          <Feather name={m.done ? "check" : "clock"} size={18} color={m.done ? theme.teal : theme.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.heading, color: theme.ink }}>{m.name}</Text>
          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{m.session}</Text>
        </View>
        <Pill theme={theme} label={m.done ? "Done" : "Pending"} tone={m.done ? theme.teal : theme.warning} />
      </View>
      <View style={{ flexDirection: "row", marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
        {[
          { k: "Volume", v: m.volume, c: theme.inkSoft },
          { k: "Calories", v: `${m.kcal}`, c: theme.inkSoft },
          { k: "Protein", v: `${m.protein}/${m.target}g`, c: hit ? theme.teal : theme.warning },
        ].map((s) => (
          <View key={s.k} style={{ flex: 1 }}>
            <Text style={{ ...typo.caption, color: theme.muted }}>{s.k}</Text>
            <Text style={{ ...typo.body, color: s.c, fontWeight: "600", marginTop: 2 }}>{s.v}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
