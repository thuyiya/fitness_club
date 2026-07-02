import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
}

/** Solid elevated card with soft shadow and large radius. */
export function Card({ children, style, padded = true }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.backgroundElevated,
          borderRadius: theme.radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.cardBorder,
          padding: padded ? theme.spacing.lg : 0,
          ...theme.shadows.soft,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
