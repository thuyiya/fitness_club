import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  padded?: boolean;
}

/**
 * Frosted-glass card. Uses a real blur on native and a translucent fallback
 * on web where BlurView performance is poor.
 */
export function GlassCard({ children, style, intensity = 40, padded = true }: GlassCardProps) {
  const theme = useTheme();
  const content = (
    <View style={padded ? { padding: theme.spacing.lg } : undefined}>{children}</View>
  );

  const base: ViewStyle = {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.soft,
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[base, { backgroundColor: theme.colors.surfaceGlass }, style]}>{content}</View>
    );
  }

  return (
    <View style={[base, style]}>
      <BlurView
        intensity={intensity}
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceGlass }]} />
      {content}
    </View>
  );
}
