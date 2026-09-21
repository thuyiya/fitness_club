import { Text, View } from "react-native";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import { Card } from "../../src/components/ui";
import { SettingsScreen } from "../../src/components/SettingsScreen";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

export default function About() {
  const { theme } = useAuth();
  const version = Constants.expoConfig?.version ?? "2.0.0";

  return (
    <SettingsScreen title="About">
      <View style={{ alignItems: "center", marginBottom: space.xl }}>
        <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
          <Feather name="activity" size={30} color="#FFFFFF" />
        </View>
        <Text style={{ ...typo.title, color: theme.ink, marginTop: space.md }}>Wellness</Text>
        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>Version {version}</Text>
      </View>

      <Text style={{ ...typo.body, color: theme.inkSoft, lineHeight: 21, marginBottom: space.lg }}>
        Coaching, nutrition and training in one place. Your coach writes the plan; you log what
        actually happened; both of you see the same numbers.
      </Text>

      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
        Where the numbers come from
      </Text>
      <Card theme={theme} style={{ marginBottom: space.lg }}>
        {[
          { k: "Energy needs", v: "Mifflin-St Jeor equation with standard activity multipliers" },
          { k: "Calorie burn", v: "MET values from the Compendium of Physical Activities" },
          { k: "Food data", v: "USDA FoodData Central, plus a curated catalog" },
          { k: "Sport nutrition", v: "ACSM and ISSN joint position stands" },
          { k: "Maps", v: "© OpenStreetMap contributors" },
        ].map((r, i) => (
          <View key={r.k} style={{ paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
            <Text style={{ ...typo.body, color: theme.ink }}>{r.k}</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{r.v}</Text>
          </View>
        ))}
      </Card>

      {/* The same caveat the terms carry, where someone is most likely to read it. */}
      <Card theme={theme} style={{ borderColor: theme.warning }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Feather name="alert-circle" size={15} color={theme.warning} style={{ marginTop: 2 }} />
          <Text style={{ ...typo.caption, color: theme.inkSoft, flex: 1 }}>
            Figures shown are estimates from published formulas, not medical advice. Anyone with a
            medical condition, an injury, or who is pregnant should speak to a clinician before
            following a plan.
          </Text>
        </View>
      </Card>
    </SettingsScreen>
  );
}
