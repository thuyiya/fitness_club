import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface MoodSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** One color = solid fill; several = a gradient along the track. */
  trackColors: string[];
  /** Optional labels shown under the two ends of the track. */
  labels?: [string, string];
  /** Optional label centered above the track. */
  title?: string;
  /** Called once when the user lifts their finger — good for haptics/persist. */
  onSettle?: (value: number) => void;
}

const THUMB = 30;
const TRACK_H = 12;
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * A dependency-free horizontal slider built on gesture-handler + reanimated,
 * styled to match Solace. The thumb follows the finger on the UI thread and the
 * value is mirrored back to JS via runOnJS. Both tap-to-set (via pan) and drag
 * are supported. Accessible as an adjustable slider for screen readers.
 */
export function MoodSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  trackColors,
  labels,
  title,
  onSettle,
}: MoodSliderProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const usable = Math.max(width - THUMB, 1);
  const range = max - min || 1;

  // Position of the thumb centre-left along the track, in px.
  const x = useSharedValue(0);
  const pressed = useSharedValue(0);

  // Keep the thumb in sync when the width is measured or value changes externally.
  const syncFromValue = useCallback(
    (v: number) => {
      const clamped = Math.min(max, Math.max(min, v));
      x.value = ((clamped - min) / range) * usable;
    },
    [max, min, range, usable, x],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    const u = Math.max(w - THUMB, 1);
    x.value = ((Math.min(max, Math.max(min, value)) - min) / range) * u;
  };

  // Re-sync if the parent pushes a new value while we're not dragging.
  React.useEffect(() => {
    if (pressed.value === 0 && usable > 1) syncFromValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, usable]);

  const emit = useCallback(
    (px: number) => {
      const ratio = usable > 0 ? px / usable : 0;
      onChange(min + ratio * range);
    },
    [usable, min, range, onChange],
  );

  const settle = useCallback(
    (px: number) => {
      Haptics.selectionAsync().catch(() => {});
      const ratio = usable > 0 ? px / usable : 0;
      onSettle?.(min + ratio * range);
    },
    [usable, min, range, onSettle],
  );

  const gesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { start: number }>({
    onStart: (_e, ctx) => {
      ctx.start = x.value;
      pressed.value = withSpring(1, { damping: 15, stiffness: 200 });
    },
    onActive: (e, ctx) => {
      const next = Math.min(usable, Math.max(0, ctx.start + e.translationX));
      x.value = next;
      runOnJS(emit)(next);
    },
    onEnd: () => {
      pressed.value = withSpring(0, { damping: 15, stiffness: 200 });
      runOnJS(settle)(x.value);
    },
  });

  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + pressed.value * 0.18 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 0.6 + pressed.value * 0.9 }],
    opacity: pressed.value * 0.35,
  }));

  const accent = trackColors[trackColors.length - 1] ?? theme.colors.primary;
  const gradientColors = trackColors.length >= 2 ? trackColors : [trackColors[0], trackColors[0]];

  return (
    <View style={{ width: '100%' }}>
      {title && (
        <Text variant="footnote" color="textSecondary" style={{ marginBottom: theme.spacing.xs }}>
          {title}
        </Text>
      )}

      <PanGestureHandler onGestureEvent={gesture}>
        <Animated.View
          onLayout={onLayout}
          style={styles.hitArea}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={title}
          accessibilityValue={{
            min,
            max,
            now: Math.round(((value - min) / range) * 100) / 100,
          }}
        >
          {/* Track background */}
          <View
            style={[
              styles.track,
              { backgroundColor: theme.colors.separator, borderRadius: TRACK_H / 2 },
            ]}
          >
            {/* Gradient fill up to the thumb */}
            <AnimatedGradient
              colors={gradientColors as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { borderRadius: TRACK_H / 2 }, fillStyle]}
            />
          </View>

          {/* Press halo */}
          <Animated.View
            pointerEvents="none"
            style={[styles.halo, { backgroundColor: accent }, haloStyle]}
          />

          {/* Thumb */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                borderColor: accent,
                backgroundColor: theme.colors.backgroundElevated,
                ...theme.shadows.soft,
              },
              thumbStyle,
            ]}
          >
            <View style={[styles.thumbCore, { backgroundColor: accent }]} />
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      {labels && (
        <View style={styles.labels}>
          <Text variant="caption" color="textTertiary">
            {labels[0]}
          </Text>
          <Text variant="caption" color="textTertiary">
            {labels[1]}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_H,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: TRACK_H,
  },
  halo: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
});
