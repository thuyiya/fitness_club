import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { MovementId } from "@/lib/exercisePlan";
import { useTheme } from "@/theme";
import { Text } from "./Text";
// Schematic start/end positions; written cues remain the primary form guide.
const poses: Record<MovementId, string[][]> = {
  squat: [
    ["48,29 48,61", "48,61 40,98", "48,61 62,98", "48,37 72,53"],
    ["48,37 35,65", "35,65 65,70 52,98", "48,43 78,43"],
  ],
  pushup: [
    ["42,28 58,62 68,99", "45,39 76,48 88,38"],
    ["61,35 48,66 35,99", "58,44 72,58 88,40"],
  ],
  bridge: [
    ["20,88 52,88 72,61 91,88", "32,89 52,94"],
    ["20,88 54,61 73,61 91,88", "32,85 50,92"],
  ],
  lunge: [
    ["48,29 48,60", "48,60 35,99", "48,60 67,99", "48,35 30,59"],
    ["48,36 48,65", "48,65 72,66 72,98", "48,65 26,90 9,90", "48,42 31,65"],
  ],
  deadbug: [
    ["20,88 53,88", "53,88 65,61 89,61", "32,88 32,47"],
    ["20,88 53,88", "53,88 65,61 89,61", "53,88 90,97", "32,88 5,58"],
  ],
  plank: [
    ["20,52 48,65 80,76", "28,56 24,88 44,88", "80,76 94,88"],
    ["20,52 50,64 88,80", "28,56 24,88 44,88", "88,80 96,89"],
  ],
};
const heads: Record<MovementId, number[][]> = {
  squat: [
    [48, 18],
    [51, 25],
  ],
  pushup: [
    [37, 17],
    [66, 24],
  ],
  bridge: [
    [12, 84],
    [12, 84],
  ],
  lunge: [
    [48, 18],
    [48, 25],
  ],
  deadbug: [
    [12, 84],
    [12, 84],
  ],
  plank: [
    [12, 46],
    [12, 46],
  ],
};
export function MovementGuide({ id }: { id: MovementId }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.primary + "0D",
        borderRadius: 18,
        padding: 8,
        marginVertical: 14,
      }}
    >
      {poses[id].map((lines, index) => (
        <View key={index} style={{ flex: 1, alignItems: "center" }}>
          <Svg width="100%" height={110} viewBox="0 0 110 110">
            <Line
              x1="5"
              y1="101"
              x2="105"
              y2="101"
              stroke={theme.colors.separator}
            />
            <Circle
              cx={heads[id][index][0]}
              cy={heads[id][index][1]}
              r="8"
              fill={index === 0 ? theme.colors.primary : theme.colors.secondary}
            />
            {lines.map((points, j) => (
              <Polyline
                key={j}
                points={points}
                fill="none"
                stroke={
                  index === 0 ? theme.colors.primary : theme.colors.secondary
                }
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          <Text variant="caption" color="textSecondary">
            {index === 0 ? "01 · Start" : "02 · Move"}
          </Text>
        </View>
      ))}
    </View>
  );
}
