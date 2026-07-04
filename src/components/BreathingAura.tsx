import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * The living backdrop behind the Calm breathing orb. Everything here is
 * decorative and driven by shared values from the screen:
 *  - `scale`     — the orb's breath (OUT_SCALE → IN_SCALE)
 *  - `ambiance`  — 0 when idle, 1 while a session runs (fades the aura in/out)
 *  - `ripple`    — pulsed 0→1 on every inhale to send a ring outward
 *
 * Sizes are kept within a ~300px circle so the aura never bleeds past the
 * orb area into the surrounding UI (it's rendered inside a circular clip).
 * Opacities are deliberately gentle for comfortable viewing in a dark room.
 */

const OUT = 0.55;
const IN = 1;
const RING_BASE = 210;

type Props = {
  scale: SharedValue<number>;
  ambiance: SharedValue<number>;
  ripple: SharedValue<number>;
  colors: readonly string[];
};

export function BreathingAura({ scale, ambiance, ripple, colors }: Props) {
  const tint = colors[1] ?? '#5B7FD1';

  // Soft color wash — brightens and swells slightly on the inhale.
  const washStyle = useAnimatedStyle(() => ({
    opacity: ambiance.value * interpolate(scale.value, [OUT, IN], [0.08, 0.18]),
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.05, 1.28]) }],
  }));

  // Concentric rings breathe with the orb at gentle, differing depths.
  const ring1 = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.36,
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.02 * 0.96, 1.02 * 1.03]) }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.22,
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.2 * 0.96, 1.2 * 1.03]) }],
  }));
  const ring3 = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.12,
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.36 * 0.96, 1.36 * 1.03]) }],
  }));

  // Inhale ripple — a ring that expands outward and fades on each breath in.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ambiance.value * (1 - ripple.value) * 0.4,
    transform: [{ scale: interpolate(ripple.value, [0, 1], [0.85, 1.36]) }],
  }));

  return (
    <View pointerEvents="none" style={{ ...abs, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: tint },
          washStyle,
        ]}
      />

      <Ring color={tint} style={ring1} />
      <Ring color={tint} style={ring2} />
      <Ring color={tint} style={ring3} />
      <Ring color={tint} width={1.5} style={rippleStyle} />

      <OrbitDots color={tint} ambiance={ambiance} />
      <Particles color={tint} ambiance={ambiance} />
    </View>
  );
}

function Ring({ color, width = 1, style }: { color: string; width?: number; style: any }) {
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: RING_BASE,
          height: RING_BASE,
          borderRadius: RING_BASE / 2,
          borderWidth: width,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/** A slow ring of small dots orbiting the orb — subtle sign of life. */
function OrbitDots({ color, ambiance }: { color: string; ambiance: SharedValue<number> }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 34000, easing: Easing.linear }), -1, false);
  }, [spin]);

  const style = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.45,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const RADIUS = 118;
  const dots = [0, 120, 240];

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {dots.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: color,
              transform: [{ translateX: Math.cos(rad) * RADIUS }, { translateY: Math.sin(rad) * RADIUS }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

/** A handful of particles drifting slowly upward, fading in and out. */
function Particles({ color, ambiance }: { color: string; ambiance: SharedValue<number> }) {
  const seeds = [0, 1, 2, 3, 4, 5, 6];
  return (
    <>
      {seeds.map((i) => (
        <Particle key={i} index={i} color={color} ambiance={ambiance} />
      ))}
    </>
  );
}

function Particle({
  index,
  color,
  ambiance,
}: {
  index: number;
  color: string;
  ambiance: SharedValue<number>;
}) {
  const p = useSharedValue(0);

  const startX = (index - 3) * 22 + (index % 2 === 0 ? 8 : -6);
  const duration = 7000 + index * 900;
  const size = 2.5 + (index % 3);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [p, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: ambiance.value * interpolate(p.value, [0, 0.15, 0.8, 1], [0, 0.55, 0.4, 0]),
    transform: [
      { translateX: startX + Math.sin(p.value * Math.PI * 2) * 10 },
      { translateY: interpolate(p.value, [0, 1], [95, -115]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const abs = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };
