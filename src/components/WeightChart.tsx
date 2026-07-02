import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Line,
} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { Text } from './Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ChartPoint {
  x: number; // arbitrary ordinal (week index / timestamp)
  y: number; // weight
}

interface WeightChartProps {
  data: ChartPoint[];
  height?: number;
  width?: number;
  targetY?: number;
  color?: string;
}

/**
 * Animated weight timeline. Draws a smooth gradient-filled line that reveals
 * itself on mount, with an optional dashed target line.
 */
export function WeightChart({
  data,
  height = 200,
  width = 320,
  targetY,
  color,
}: WeightChartProps) {
  const theme = useTheme();
  const stroke = color ?? theme.colors.primary;
  const padX = 12;
  const padY = 24;

  const { linePath, areaPath, points, minY, maxY, targetLineY } = useMemo(() => {
    if (data.length === 0) {
      return { linePath: '', areaPath: '', points: [], minY: 0, maxY: 0, targetLineY: 0 };
    }
    const ys = data.map((d) => d.y).concat(targetY != null ? [targetY] : []);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const range = hi - lo || 1;
    const xs = data.map((d) => d.x);
    const xlo = Math.min(...xs);
    const xhi = Math.max(...xs);
    const xrange = xhi - xlo || 1;

    const sx = (x: number) => padX + ((x - xlo) / xrange) * (width - padX * 2);
    const sy = (y: number) => padY + (1 - (y - lo) / range) * (height - padY * 2);

    const pts = data.map((d) => ({ x: sx(d.x), y: sy(d.y) }));

    let line = '';
    pts.forEach((p, i) => {
      if (i === 0) {
        line += `M ${p.x} ${p.y}`;
      } else {
        const prev = pts[i - 1];
        const cx = (prev.x + p.x) / 2;
        line += ` C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
      }
    });

    const area =
      line +
      ` L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;

    return {
      linePath: line,
      areaPath: area,
      points: pts,
      minY: lo,
      maxY: hi,
      targetLineY: targetY != null ? sy(targetY) : 0,
    };
  }, [data, width, height, targetY]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) });
  }, [linePath, progress]);

  const PATH_LEN = 1000;
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_LEN * (1 - progress.value),
  }));

  if (data.length === 0) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text color="textTertiary">No data yet</Text>
      </View>
    );
  }

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.25} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {targetY != null && (
        <Line
          x1={padX}
          y1={targetLineY}
          x2={width - padX}
          y2={targetLineY}
          stroke={theme.colors.success}
          strokeWidth={1.5}
          strokeDasharray="6 6"
          opacity={0.7}
        />
      )}

      <Path d={areaPath} fill="url(#weightArea)" />
      <AnimatedPath
        d={linePath}
        stroke={stroke}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={PATH_LEN}
        animatedProps={animatedProps}
      />

      {points.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 5 : 3}
          fill={i === points.length - 1 ? theme.colors.success : stroke}
        />
      ))}
    </Svg>
  );
}
