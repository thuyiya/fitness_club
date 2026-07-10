import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components';
import { useSettingsStore } from '@/store/settingsStore';

const MARK = require('../assets/logo-mark.png');

/** Ember-brand splash: gently pulsing mark on warm charcoal, then into the app
 *  (or the one-time intro on the very first launch). */
export default function Splash() {
  const welcomeSeen = useSettingsStore((s) => s.welcomeSeen);
  const scale = useSharedValue(0.6);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.1, { duration: 600, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 300 }),
    );
    glow.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);

    const t = setTimeout(() => {
      router.replace(welcomeSeen ? '/(tabs)' : '/welcome');
    }, 1800);
    return () => clearTimeout(t);
  }, [welcomeSeen, scale, glow]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * 0.4,
    transform: [{ scale: 1 + glow.value * 0.25 }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#25201C', '#1C1917', '#120F0D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Particles />

      <View style={styles.markWrap}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={logoStyle}>
          <Image source={MARK} style={styles.mark} resizeMode="contain" />
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(500).duration(800)} style={styles.textWrap}>
        <Text variant="title3" center style={{ color: '#FB923C' }}>
          Let’s build your strength
        </Text>
      </Animated.View>
    </View>
  );
}

function Particles() {
  const particles = Array.from({ length: 14 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((_, i) => (
        <Particle key={i} index={i} />
      ))}
    </View>
  );
}

function Particle({ index }: { index: number }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);
  const left = (index * 37) % 100;
  const size = 4 + (index % 4) * 2;
  const startTop = 20 + ((index * 53) % 600);

  useEffect(() => {
    y.value = withDelay(
      index * 120,
      withRepeat(withTiming(-60, { duration: 3000 + index * 100 }), -1, true),
    );
    opacity.value = withDelay(
      index * 120,
      withRepeat(withTiming(0.7, { duration: 2000 }), -1, true),
    );
  }, [index, y, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${left}%`,
          top: startTop,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: '#F97316',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  textWrap: { position: 'absolute', bottom: 96, left: 0, right: 0, alignItems: 'center' },
  glow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(249,115,22,0.20)',
  },
  mark: { width: 84, height: 84 },
});
