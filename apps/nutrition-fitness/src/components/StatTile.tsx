import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { GlassCard } from './GlassCard';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  accent?: string;
  style?: ViewStyle;
}

/** Compact metric tile: icon + big number + label. */
export function StatTile({ label, value, unit, icon, accent, style }: StatTileProps) {
  const theme = useTheme();
  return (
    <GlassCard style={style} padded={false}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
        {icon && (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: (accent ?? theme.colors.primary) + '20',
            }}
          >
            {icon}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <Text variant="title3">{value}</Text>
          {unit && (
            <Text variant="footnote" color="textTertiary">
              {unit}
            </Text>
          )}
        </View>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
    </GlassCard>
  );
}
