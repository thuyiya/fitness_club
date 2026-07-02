import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  gradient?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
}

/** Base screen wrapper with an optional gradient background and safe insets. */
export function Screen({
  children,
  scroll = true,
  gradient = true,
  padded = true,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const inner = (
    <View
      style={[
        { paddingTop: insets.top + theme.spacing.xs },
        padded && { paddingHorizontal: theme.spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
    >
      {inner}
    </ScrollView>
  ) : (
    inner
  );

  return (
    <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
      {gradient && (
        <LinearGradient
          colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
