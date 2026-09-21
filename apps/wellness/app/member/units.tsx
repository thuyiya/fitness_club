import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../src/components/ui";
import { SettingsScreen } from "../../src/components/SettingsScreen";
import { useAuth } from "../../src/state/auth";
import { useUnits, type UnitSystem } from "../../src/state/units";
import { space, type as typo } from "../../src/theme/tokens";

const OPTIONS: { id: UnitSystem; label: string; example: string }[] = [
  { id: "metric", label: "Metric", example: "kilograms, centimetres, litres" },
  { id: "imperial", label: "Imperial", example: "pounds, feet and inches, fluid ounces" },
];

export default function Units() {
  const { theme } = useAuth();
  const { system, setSystem, weight, height, volume } = useUnits();

  return (
    <SettingsScreen title="Units" subtitle="Changes how figures are shown. Nothing already recorded is altered.">
      {OPTIONS.map((o) => {
        const on = system === o.id;
        return (
          <Pressable key={o.id} onPress={() => setSystem(o.id)}>
            <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md, borderColor: on ? theme.accent : theme.line }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{o.label}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{o.example}</Text>
              </View>
              {on && <Feather name="check" size={19} color={theme.accent} />}
            </Card>
          </Pressable>
        );
      })}

      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.sm }}>
        Preview
      </Text>
      <Card theme={theme}>
        {[
          { k: "Weight", v: weight(78.5) },
          { k: "Height", v: height(178) },
          { k: "Water", v: volume(2500) },
        ].map((r, i) => (
          <View key={r.k} style={{ flexDirection: "row", paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
            <Text style={{ ...typo.body, color: theme.muted, flex: 1 }}>{r.k}</Text>
            <Text style={{ ...typo.body, color: theme.ink, fontWeight: "600" }}>{r.v}</Text>
          </View>
        ))}
      </Card>

      {/* Worth stating: a unit switch must never rewrite stored data. */}
      <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.md }}>
        Measurements are stored in metric and converted for display, so switching back and forth never changes your history.
      </Text>
    </SettingsScreen>
  );
}
