import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Text } from './Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface GaugeProps {
  value: number; // 0..1 fill
  size?: number;
  label: string;
  displayValue: string;
  color?: string;
  gradientTo?: string;
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const start = toXY(startDeg);
  const end = toXY(endDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

/** Semicircular gauge used across the Health Dashboard. */
export function Gauge({
  value,
  size = 140,
  label,
  displayValue,
  color,
  gradientTo,
}: GaugeProps) {
  const theme = useTheme();
  const c = color ?? theme.colors.primary;
  const c2 = gradientTo ?? theme.colors.secondary;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const START = 135;
  const SWEEP = 270;

  const track = arc(cx, cy, r, START, START + SWEEP);
  const LEN = 1000;

  const anim = useSharedValue(0);
  const target = Math.max(0, Math.min(1, value));
  useEffect(() => {
    anim.value = withTiming(target, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [target, anim]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: LEN * (1 - anim.value),
  }));

  const gradId = `gauge-${c.replace('#', '')}`;

  return (
    <View style={{ alignItems: 'center', width: size }}>
      <Svg width={size} height={size * 0.78}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        <Path
          d={track}
          stroke={theme.colors.separator}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedPath
          d={track}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={LEN}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={{ position: 'absolute', top: size * 0.28, alignItems: 'center' }}>
        <Text variant="title3">{displayValue}</Text>
        <Text variant="caption" color="textTertiary">
          {label}
        </Text>
      </View>
    </View>
  );
}
