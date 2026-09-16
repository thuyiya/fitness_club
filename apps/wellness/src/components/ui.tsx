import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ backgroundColor: theme.card, borderRadius: radius.md, padding: space.lg, borderWidth: 1, borderColor: theme.line }, style]}>
      {children}
    </View>
  );
}

export function Button({
  theme,
  label,
  onPress,
  variant = "primary",
  busy,
  disabled,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  busy?: boolean;
  disabled?: boolean;
}) {
  const primary = variant === "primary";
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        {
          backgroundColor: primary ? (pressed ? theme.accentDeep : theme.accent) : "transparent",
          borderColor: primary ? "transparent" : theme.line,
          borderWidth: primary ? 0 : 1,
          borderRadius: radius.pill,
          paddingVertical: 14,
          paddingHorizontal: space.xl,
          alignItems: "center",
          opacity: off ? 0.55 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? "#FFFFFF" : theme.ink} />
      ) : (
        <Text style={{ ...typo.heading, color: primary ? "#FFFFFF" : theme.ink }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Pill({ theme, label, tone }: { theme: Theme; label: string; tone?: string }) {
  return (
    <View style={{ backgroundColor: (tone ?? theme.accent) + "1F", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ ...typo.caption, color: tone ?? theme.accent, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

/** Horizontal macro bar. Widths are shares of the total, not of the target. */
export function MacroBar({ theme, protein, carbs, fat }: { theme: Theme; protein: number; carbs: number; fat: number }) {
  const total = Math.max(protein + carbs + fat, 0.0001);
  const seg = [
    { v: protein, c: theme.accent },
    { v: carbs, c: theme.teal },
    { v: fat, c: theme.warning },
  ];
  return (
    <View style={{ flexDirection: "row", height: 8, borderRadius: radius.pill, overflow: "hidden", backgroundColor: theme.cardAlt }}>
      {seg.map((s, i) => (
        <View key={i} style={{ flex: s.v / total, backgroundColor: s.c }} />
      ))}
    </View>
  );
}

export function Screen({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return <View style={[styles.screen, { backgroundColor: theme.bg }]}>{children}</View>;
}

const styles = StyleSheet.create({ screen: { flex: 1 } });


/**
 * Grouped settings rows with a single rounded outline, as the design shows.
 * Dividers sit between rows rather than around each one, so the group reads as
 * one object instead of a stack of cards.
 */
export function SettingsGroup({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line, overflow: "hidden" }}>
      {children}
    </View>
  );
}

export function SettingsRow({
  theme, icon, avatar, title, subtitle, badge, badgeTone, onPress, last,
}: {
  theme: Theme;
  icon?: keyof typeof Feather.glyphMap;
  avatar?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: space.md,
        paddingHorizontal: space.lg, paddingVertical: avatar ? space.lg : 15,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.line,
        backgroundColor: pressed ? theme.cardAlt : "transparent",
      })}
    >
      {avatar ? (
        <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...typo.title, color: "#FFFFFF" }}>{avatar}</Text>
        </View>
      ) : icon ? (
        <Feather name={icon} size={19} color={theme.inkSoft} />
      ) : null}

      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.body, color: theme.ink, fontWeight: avatar ? "700" : "400" }}>{title}</Text>
        {subtitle ? <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>

      {badge ? (
        <View style={{ backgroundColor: (badgeTone ?? theme.muted) + "26", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ ...typo.caption, color: badgeTone ?? theme.inkSoft, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={18} color={theme.muted} />
    </Pressable>
  );
}
