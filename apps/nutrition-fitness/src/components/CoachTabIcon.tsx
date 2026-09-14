/**
 * Lumora tab-bar icon with a circular download-progress ring.
 *
 * While the on-device model is downloading (or loading), a thin progress ring
 * wraps the chat icon — giving global, non-intrusive visibility without the
 * floating widget that used to collide with the tab bar. Otherwise it's just
 * the plain icon.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useAiCoachStore } from '@/store/aiCoachStore';

export function CoachTabIcon({ color, size }: { color: string; size: number }) {
  const theme = useTheme();
  const status = useAiCoachStore((s) => s.status);
  const progress = useAiCoachStore((s) => s.progress);

  const iconSize = size - 2;
  const active = status === 'downloading' || status === 'preparing';
  const diameter = iconSize + 12;
  const stroke = 2;
  const r = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  // 'preparing' has no meaningful percentage — show a full ring to read as "almost there".
  const pct = status === 'preparing' ? 1 : Math.max(0.03, Math.min(1, progress));

  return (
    <View style={{ width: diameter, height: diameter, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Svg width={diameter} height={diameter} style={{ position: 'absolute' }}>
          <Circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            stroke={theme.colors.cardBorder}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={r}
            stroke={theme.colors.primary}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
          />
        </Svg>
      )}
      <MessageCircle color={color} size={iconSize} />
    </View>
  );
}
