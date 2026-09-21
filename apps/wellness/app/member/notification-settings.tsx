import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../src/components/ui";
import { SettingsScreen } from "../../src/components/SettingsScreen";
import { useAuth } from "../../src/state/auth";
import { space, type as typo } from "../../src/theme/tokens";

const KEY = "wellness.notificationPrefs";

const TOPICS = [
  { id: "coach_messages", label: "Messages from your coach", hint: "New messages in your thread" },
  { id: "plans", label: "Plans and assignments", hint: "When a plan or survey is assigned to you" },
  { id: "sessions", label: "Session reminders", hint: "Before a booked session" },
  { id: "hydration", label: "Hydration nudges", hint: "If you are behind on water for the day" },
  { id: "announcements", label: "Gym announcements", hint: "Notices from your gym" },
] as const;

type Prefs = Record<string, boolean>;
const DEFAULTS: Prefs = { coach_messages: true, plans: true, sessions: true, hydration: false, announcements: true };

export default function NotificationSettings() {
  const { theme } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v) { try { setPrefs({ ...DEFAULTS, ...JSON.parse(v) }); } catch {} } }).catch(() => {});
  }, []);

  const toggle = (id: string) => {
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <SettingsScreen title="Notifications" subtitle="Choose what you hear about. In-app alerts always appear on your home screen.">
      <Card theme={theme} style={{ marginBottom: space.lg, padding: 0 }}>
        {TOPICS.map((t, i) => (
          <View key={t.id} style={{
            flexDirection: "row", alignItems: "center", gap: space.md,
            paddingHorizontal: space.lg, paddingVertical: space.md,
            borderTopWidth: i ? 1 : 0, borderTopColor: theme.line,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.body, color: theme.ink }}>{t.label}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{t.hint}</Text>
            </View>
            <Switch
              value={prefs[t.id] ?? false}
              onValueChange={() => toggle(t.id)}
              trackColor={{ false: theme.cardAlt, true: theme.accent + "88" }}
              thumbColor={prefs[t.id] ? theme.accent : theme.muted}
            />
          </View>
        ))}
      </Card>

      {/* Saying what is not wired matters more than a switch that does nothing. */}
      <Card theme={theme}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Feather name="info" size={15} color={theme.muted} style={{ marginTop: 2 }} />
          <Text style={{ ...typo.caption, color: theme.muted, flex: 1 }}>
            These choices are saved on this device and applied to in-app alerts.
            {Platform.OS === "web"
              ? " Push notifications need the phone app."
              : " Push delivery is not connected yet, so nothing arrives while the app is closed."}
          </Text>
        </View>
      </Card>
    </SettingsScreen>
  );
}
