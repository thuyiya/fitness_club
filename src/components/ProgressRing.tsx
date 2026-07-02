import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientTo?: string;
  trackColor?: string;
  label?: string;
  value?: string;
  icon?: React.ReactNode;
  duration?: number;
}

/** Animated circular progress ring with gradient stroke. */
export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 12,
  color,
  gradientTo,
  trackColor,
  label,
  value,
  icon,
  duration = 900,
}: ProgressRingProps) {
  const theme = useTheme();
  const c = color ?? theme.colors.primary;
  const c2 = gradientTo ?? theme.colors.secondary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animated = useSharedValue(0);
  const target = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    animated.value = withTiming(target, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [target, duration, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const gradId = `ring-${c.replace('#', '')}-${c2.replace('#', '')}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? theme.colors.separator}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {icon}
        {value != null && (
          <Text variant="title3" style={{ marginTop: icon ? 2 : 0 }}>
            {value}
          </Text>
        )}
        {label != null && (
          <Text variant="caption" color="textTertiary">
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}
