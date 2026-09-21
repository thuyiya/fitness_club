import { Platform, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card, Pill } from "../../src/components/ui";
import { SettingsScreen } from "../../src/components/SettingsScreen";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const SOURCES = [
  {
    id: "apple", label: "Apple Health", icon: "heart" as const, platform: "ios",
    reads: ["Steps", "Active energy", "Exercise minutes", "Resting heart rate", "Sleep"],
  },
  {
    id: "google", label: "Google Fit / Health Connect", icon: "activity" as const, platform: "android",
    reads: ["Steps", "Active energy", "Exercise minutes", "Heart rate", "Sleep"],
  },
];

export default function HealthConnections() {
  const { theme } = useAuth();

  return (
    <SettingsScreen
      title="Health connections"
      subtitle="Bring steps, energy and sleep in automatically so your summaries fill themselves."
    >
      {SOURCES.map((s) => {
        const relevant = Platform.OS === s.platform || Platform.OS === "web";
        return (
          <Card key={s.id} theme={theme} style={{ marginBottom: space.md, opacity: relevant ? 1 : 0.55 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                <Feather name={s.icon} size={19} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{s.label}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                  {relevant ? "Not connected" : `${s.platform === "ios" ? "iPhone" : "Android"} only`}
                </Text>
              </View>
              <Pill theme={theme} label="Not wired" tone={theme.muted} />
            </View>

            <View style={{ marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: 6 }}>WOULD READ</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {s.reads.map((r) => (
                  <View key={r} style={{ backgroundColor: theme.cardAlt, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 }}>
                    <Text style={{ ...typo.caption, color: theme.inkSoft }}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>
        );
      })}

      {/*
        The database side exists (health_summaries, with a source column so
        HealthKit and Google Fit rows can be told apart and de-duplicated);
        the native permission flow does not. Saying so beats a toggle that
        silently fails.
      */}
      <Card theme={theme}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Feather name="tool" size={15} color={theme.warning} style={{ marginTop: 2 }} />
          <Text style={{ ...typo.caption, color: theme.inkSoft, flex: 1 }}>
            Not connected yet. The app can already store and chart this data — what is missing is the
            native permission step, which needs a build with the health entitlement. Until then, log
            training and hydration by hand and the graphs work the same way.
          </Text>
        </View>
      </Card>

      <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.md }}>
        Connecting will always be optional, and revoking it in your device settings stops the sync immediately.
      </Text>
    </SettingsScreen>
  );
}
