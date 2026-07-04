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
 * decorative and driven by two shared values from the screen:
 *  - `scale`     — the orb's breath (OUT_SCALE → IN_SCALE)
 *  - `ambiance`  — 0 when idle, 1 while a session runs (fades the aura in/out)
 *  - `ripple`    — pulsed 0→1 on every inhale to send a ring outward
 *
 * Layers, back to front: a soft color wash that brightens on the inhale,
 * three concentric rings that breathe with the orb, an expanding inhale
 * ripple, a slow ring of orbiting dots, and gently rising particles.
 */

const OUT = 0.55;
const IN = 1;

type Props = {
  scale: SharedValue<number>;
  ambiance: SharedValue<number>;
  ripple: SharedValue<number>;
  colors: readonly string[];
};

export function BreathingAura({ scale, ambiance, ripple, colors }: Props) {
  const tint = colors[1] ?? '#38BDF8';

  // Soft color wash — brightens and swells slightly on the inhale.
  const washStyle = useAnimatedStyle(() => ({
    opacity: ambiance.value * interpolate(scale.value, [OUT, IN], [0.12, 0.28]),
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.1, 1.5]) }],
  }));

  // Concentric rings breathe with the orb at gentle, differing depths.
  const ring1 = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.5,
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.18 * 0.94, 1.18 * 1.04]) }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.32,
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.42 * 0.94, 1.42 * 1.04]) }],
  }));
  const ring3 = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.18,
    transform: [{ scale: interpolate(scale.value, [OUT, IN], [1.68 * 0.94, 1.68 * 1.04]) }],
  }));

  // Inhale ripple — a ring that expands outward and fades on each breath in.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ambiance.value * (1 - ripple.value) * 0.5,
    transform: [{ scale: interpolate(ripple.value, [0, 1], [0.85, 2.1]) }],
  }));

  return (
    <View pointerEvents="none" style={{ ...abs, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: tint },
          washStyle,
        ]}
      />

      <Ring size={240} color={tint} style={ring1} />
      <Ring size={240} color={tint} style={ring2} />
      <Ring size={240} color={tint} style={ring3} />

      <Ring size={240} color={tint} width={1.5} style={rippleStyle} />

      <OrbitDots color={tint} ambiance={ambiance} />
      <Particles color={tint} ambiance={ambiance} />
    </View>
  );
}

function Ring({
  size,
  color,
  width = 1,
  style,
}: {
  size: number;
  color: string;
  width?: number;
  style: any;
}) {
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
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
    spin.value = withRepeat(withTiming(1, { duration: 32000, easing: Easing.linear }), -1, false);
  }, [spin]);

  const style = useAnimatedStyle(() => ({
    opacity: ambiance.value * 0.6,
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const RADIUS = 150;
  const dots = [0, 120, 240];

  return (
    <Animated.View style={[{ position: 'absolute', width: 300, height: 300, alignItems: 'center', justifyContent: 'center' }, style]}>
      {dots.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <View
            key={deg}
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
              transform: [
                { translateX: Math.cos(rad) * RADIUS },
                { translateY: Math.sin(rad) * RADIUS },
              ],
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

  // Deterministic-ish spread from the index so particles don't clump.
  const startX = (index - 3) * 34 + (index % 2 === 0 ? 12 : -8);
  const duration = 7000 + index * 900;
  const size = 3 + (index % 3);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [p, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: ambiance.value * interpolate(p.value, [0, 0.15, 0.8, 1], [0, 0.7, 0.5, 0]),
    transform: [
      { translateX: startX + Math.sin(p.value * Math.PI * 2) * 14 },
      { translateY: interpolate(p.value, [0, 1], [120, -150]) },
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
