import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Brain } from 'lucide-react-native';
import { Text } from '@/components';
import { palette } from '@/theme';
import { LOADING_MESSAGES } from '@/lib/planEngine';

/** Animated AI loading screen — rotates through generation steps then enters app. */
export default function AILoading() {
  const [index, setIndex] = useState(0);
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);

    const interval = setInterval(() => {
      setIndex((i) => {
        if (i >= LOADING_MESSAGES.length - 1) {
          clearInterval(interval);
          setTimeout(() => router.replace('/(tabs)'), 700);
          return i;
        }
        return i + 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [rotate, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const progress = (index + 1) / LOADING_MESSAGES.length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.primaryDark, palette.secondary, '#1E1B4B']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        <View style={styles.orbit}>
          <Animated.View style={[styles.ring, ringStyle]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.orbitDot,
                  {
                    transform: [{ rotate: `${i * 45}deg` }, { translateY: -70 }],
                    opacity: 0.3 + (i / 8) * 0.7,
                  },
                ]}
              />
            ))}
          </Animated.View>
          <Animated.View style={[styles.core, coreStyle]}>
            <Brain size={44} color="#fff" strokeWidth={2} />
          </Animated.View>
        </View>

        <Animated.View
          key={index}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={{ marginTop: 60 }}
        >
          <Text variant="title3" color="textInverse" center>
            {LOADING_MESSAGES[index]}
          </Text>
        </Animated.View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
          Building your personalized coach
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  orbit: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  orbitDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  core: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: 220,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 40,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#fff' },
});
