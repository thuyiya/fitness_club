import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../src/components/ui";
import { SettingsScreen } from "../../src/components/SettingsScreen";
import { useAuth } from "../../src/state/auth";
import { useTheme, type ThemePreference } from "../../src/state/theme";
import { radius, space, type as typo } from "../../src/theme/tokens";

const OPTIONS: { id: ThemePreference; icon: keyof typeof Feather.glyphMap; label: string; hint: string }[] = [
  { id: "light", icon: "sun", label: "Light", hint: "Easier to read in a bright gym" },
  { id: "dark", icon: "moon", label: "Dark", hint: "Easier on the eyes at night" },
  { id: "system", icon: "smartphone", label: "System", hint: "Follow your device setting" },
];

export default function Appearance() {
  const { theme } = useAuth();
  const { preference, scheme, setPreference } = useTheme();

  return (
    <SettingsScreen title="Appearance" subtitle="Applies to this device only.">
      {OPTIONS.map((o) => {
        const on = preference === o.id;
        return (
          <Pressable key={o.id} onPress={() => setPreference(o.id)}>
            <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md, borderColor: on ? theme.accent : theme.line }}>
              <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: (on ? theme.accent : theme.muted) + "1F", alignItems: "center", justifyContent: "center" }}>
                <Feather name={o.icon} size={18} color={on ? theme.accent : theme.inkSoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{o.label}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                  {o.hint}
                  {o.id === "system" ? ` · currently ${scheme}` : ""}
                </Text>
              </View>
              {on && <Feather name="check" size={19} color={theme.accent} />}
            </Card>
          </Pressable>
        );
      })}
    </SettingsScreen>
  );
}
