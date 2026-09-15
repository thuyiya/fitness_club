import { Text, View } from "react-native";
import { radius, type as typo, type Theme } from "../theme/tokens";

/**
 * Progress readout as a filled bar rather than an SVG arc: no svg dependency,
 * and it stays legible at the small sizes the summary row uses.
 * Over-target fills completely and colours differently rather than overflowing.
 */
export function Stat({
  theme, label, value, target, unit, color,
}: { theme: Theme; label: string; value: number; target?: number | null; unit?: string; color: string }) {
  const pct = target ? Math.min(1, value / target) : 0;
  const over = target ? value > target : false;
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...typo.caption, color: theme.muted }}>{label}</Text>
      <Text style={{ ...typo.title, color: theme.ink, marginTop: 2 }}>
        {Math.round(value).toLocaleString()}
        <Text style={{ ...typo.caption, color: theme.muted }}>{unit}</Text>
      </Text>
      {target ? (
        <>
          <View style={{ height: 5, borderRadius: radius.pill, backgroundColor: theme.cardAlt, marginTop: 6, overflow: "hidden" }}>
            <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: over ? theme.teal : color }} />
          </View>
          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 4 }}>
            of {Math.round(target).toLocaleString()}{unit}
          </Text>
        </>
      ) : null}
    </View>
  );
}
