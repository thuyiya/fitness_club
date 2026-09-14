import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface Bar {
  label: string;
  value: number;
}

interface BarChartProps {
  data: Bar[];
  height?: number;
  color?: string;
}

/** Simple animated bar chart used for weekly/monthly summaries. */
export function BarChart({ data, height = 160, color }: BarChartProps) {
  const theme = useTheme();
  const c = color ?? theme.colors.primary;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: height + 24,
        gap: 6,
      }}
    >
      {data.map((d, i) => (
        <AnimatedBar
          key={d.label + i}
          fraction={d.value / max}
          maxHeight={height}
          color={c}
          label={d.label}
          index={i}
        />
      ))}
    </View>
  );
}

function AnimatedBar({
  fraction,
  maxHeight,
  color,
  label,
  index,
}: {
  fraction: number;
  maxHeight: number;
  color: string;
  label: string;
  index: number;
}) {
  const theme = useTheme();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(
      index * 60,
      withTiming(Math.max(4, fraction * maxHeight), {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [fraction, maxHeight, index, h]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <Animated.View
        style={[
          {
            width: '70%',
            borderRadius: theme.radius.sm,
            backgroundColor: color,
          },
          style,
        ]}
      />
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
    </View>
  );
}
