import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

interface PillButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Large pill button with press spring + haptics — the app's primary CTA. */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  fullWidth = true,
  style,
}: PillButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.96, theme.timing.spring);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, theme.timing.spring);
  };
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.();
  };

  const isGradient = variant === 'primary';
  const textColor = variant === 'ghost' ? 'primary' : 'textInverse';

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.colors.primary : '#fff'} />
      ) : (
        <>
          {icon}
          <Text variant="headline" color={textColor}>
            {label}
          </Text>
        </>
      )}
    </>
  );

  const baseStyle: ViewStyle = {
    height: 56,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      style={[animatedStyle, style]}
    >
      {isGradient ? (
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[baseStyle, theme.shadows.glow]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <Animated.View
          style={[
            baseStyle,
            variant === 'secondary'
              ? { backgroundColor: theme.colors.secondary }
              : {
                  backgroundColor: 'transparent',
                  borderWidth: 1.5,
                  borderColor: theme.colors.primary,
                },
          ]}
        >
          {inner}
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = StyleSheet.create({});
