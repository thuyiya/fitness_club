/**
 * FeelingTree — a living picture of how the user has been feeling.
 *
 * Each recent mood check-in becomes a leaf on the tree, coloured by how
 * pleasant that moment felt (lush green = good, cool blue/slate = heavy).
 * The more you check in, the fuller the canopy grows — empty slots show as
 * faint buds waiting to open. A soft glow behind the leaves reflects the
 * average mood. With no check-ins yet it's a bare little sapling.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Ellipse, Path, G } from 'react-native-svg';
import { useTheme } from '@/theme';

/** Maps a valence (-1…1) to a leaf colour on a warm→cool nature scale. */
export function feelingColor(v: number): string {
  if (v >= 0.5) return '#7FB86A'; // flourishing green
  if (v >= 0.15) return '#A7CE86'; // soft green
  if (v > -0.15) return '#CBB86E'; // olive / amber (neutral)
  if (v > -0.5) return '#7CA6C6'; // cool blue (low)
  return '#8A97A6'; // muted slate (heavy)
}

type Slot = { x: number; y: number; rot: number };

// Canopy leaf positions, inner ring first so the tree fills outward as more
// check-ins arrive. Deterministic (no randomness) so the tree is stable.
const CANOPY = { cx: 100, cy: 64 };
const RINGS: { r: number; count: number; offset: number }[] = [
  { r: 0, count: 1, offset: 0 },
  { r: 20, count: 5, offset: 0 },
  { r: 37, count: 7, offset: 25 },
  { r: 54, count: 8, offset: 12 },
];

const SLOTS: Slot[] = RINGS.flatMap(({ r, count, offset }) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (-90 + offset + (i * 360) / count) * (Math.PI / 180);
    return {
      x: CANOPY.cx + r * Math.cos(angle),
      y: CANOPY.cy + r * 0.82 * Math.sin(angle), // squish → wider canopy
      rot: (Math.atan2(Math.sin(angle), Math.cos(angle)) * 180) / Math.PI + 90,
    };
  }),
);

export interface FeelingTreeProps {
  /** Recent valences (newest first). Each fills one leaf slot. */
  valences: number[];
  /** Average valence for the canopy glow, or null when there are no entries. */
  avgValence: number | null;
  size?: number;
}

export function FeelingTree({ valences, avgValence, size = 200 }: FeelingTreeProps) {
  const theme = useTheme();
  const trunk = '#9A7B5A';
  const bud = theme.colors.textTertiary;
  const filled = Math.min(valences.length, SLOTS.length);
  const glow = avgValence === null ? theme.colors.separator : feelingColor(avgValence);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* ground shadow */}
        <Ellipse cx={100} cy={182} rx={44} ry={7} fill={theme.colors.textTertiary} opacity={0.12} />

        {/* trunk + two branches */}
        <G stroke={trunk} strokeLinecap="round" fill="none">
          <Path
            d="M100 182 C 98 150 98 130 100 108"
            strokeWidth={filled > 0 ? 11 : 7}
          />
          <Path d="M100 130 C 88 122 80 116 74 108" strokeWidth={5} />
          <Path d="M100 124 C 112 118 120 112 126 104" strokeWidth={5} />
        </G>

        {/* canopy glow */}
        <Ellipse cx={CANOPY.cx} cy={CANOPY.cy} rx={78} ry={66} fill={glow} opacity={0.1} />

        {/* leaves + buds */}
        {SLOTS.map((s, i) => {
          const isLeaf = i < filled;
          const color = isLeaf ? feelingColor(valences[i]) : bud;
          return (
            <Ellipse
              key={i}
              cx={s.x}
              cy={s.y}
              rx={10}
              ry={13}
              fill={isLeaf ? color : 'none'}
              stroke={isLeaf ? 'none' : bud}
              strokeWidth={isLeaf ? 0 : 1.2}
              strokeDasharray={isLeaf ? undefined : '2 3'}
              opacity={isLeaf ? 0.92 : 0.32}
              transform={`rotate(${s.rot} ${s.x} ${s.y})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}
