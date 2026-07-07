import React, { useEffect } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Pause, Play, Square } from 'lucide-react-native';
import { Text } from '@/components';
import { GUIDED_SESSIONS } from '@/lib/calmSessions';
import { formatTime, usePlayerStore } from '@/lib/useGuidedPlayer';

/**
 * Full-screen guided-meditation player. A scene chosen for the journey sits
 * behind frosted-glass controls, with a slow breathing animation in the middle
 * to settle into. Audio is driven by the shared player store, so closing this
 * screen leaves it playing (in the background too).
 */
export default function Player() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const activeId = usePlayerStore((s) => s.activeId);
  const loadingId = usePlayerStore((s) => s.loadingId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const stop = usePlayerStore((s) => s.stop);

  const session = GUIDED_SESSIONS.find((s) => s.id === id) ?? GUIDED_SESSIONS[0];
  const isThis = activeId === session.id;
  const playingThis = isThis && isPlaying;
  const loadingThis = loadingId === session.id;

  const onToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isThis) togglePlay();
    else play(session);
  };

  const onStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    stop();
    router.back();
  };

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <ImageBackground source={session.image} style={styles.fill} resizeMode="cover">
        {/* Legibility + mood wash over the scene */}
        <LinearGradient
          colors={['rgba(10,16,20,0.35)', 'rgba(10,16,20,0.15)', 'rgba(8,14,18,0.75)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top glass bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <GlassButton onPress={() => router.back()}>
            <ChevronDown size={24} color="#fff" />
          </GlassButton>
          <GlassPill>
            <Text variant="caption" style={{ color: '#fff', letterSpacing: 1 }}>
              {session.technique.toUpperCase()}
            </Text>
          </GlassPill>
          <View style={{ width: 48 }} />
        </View>

        {/* Middle — breathing animation */}
        <View style={styles.center} pointerEvents="none">
          <BreathingScene accent={session.accent} playing={playingThis} />
        </View>

        {/* Bottom glass control card */}
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
          <BlurView intensity={40} tint="dark" style={styles.controls}>
            <View style={styles.controlsInner}>
              <Text variant="title2" style={{ color: '#fff' }} numberOfLines={1}>
                {session.title}
              </Text>
              <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2 }} numberOfLines={1}>
                {session.subtitle}
              </Text>

              {/* Progress */}
              <View style={styles.track}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${Math.round((isThis ? progress : 0) * 100)}%`, backgroundColor: session.accent },
                  ]}
                />
              </View>
              <View style={styles.times}>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {formatTime(isThis ? positionMs : 0)}
                </Text>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {isThis && durationMs ? formatTime(durationMs) : session.duration}
                </Text>
              </View>

              {/* Transport */}
              <View style={styles.transport}>
                <View style={{ width: 56 }} />
                <Pressable onPress={onToggle}>
                  {({ pressed }) => (
                    <LinearGradient
                      colors={[session.accent, '#ffffff40']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.playBtn, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      {loadingThis ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : playingThis ? (
                        <Pause size={30} color="#fff" fill="#fff" />
                      ) : (
                        <Play size={30} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
                      )}
                    </LinearGradient>
                  )}
                </Pressable>
                <Pressable onPress={onStop} hitSlop={8} style={styles.stopBtn}>
                  <Square size={20} color="#fff" fill="#fff" />
                </Pressable>
              </View>
            </View>
          </BlurView>
        </View>
      </ImageBackground>
    </View>
  );
}

/* ---- Middle breathing animation: concentric rings + soft orb + particles ---- */

function BreathingScene({ accent, playing }: { accent: string; playing: boolean }) {
  return (
    <View style={styles.scene}>
      <Ring accent={accent} playing={playing} size={260} delay={0} />
      <Ring accent={accent} playing={playing} size={200} delay={200} />
      <Ring accent={accent} playing={playing} size={140} delay={400} />
      <Orb accent={accent} playing={playing} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Particle key={i} index={i} playing={playing} />
      ))}
    </View>
  );
}

function Ring({
  accent,
  playing,
  size,
  delay,
}: {
  accent: string;
  playing: boolean;
  size: number;
  delay: number;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      v.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    } else {
      cancelAnimation(v);
      v.value = withTiming(0.5, { duration: 800 });
    }
    return () => cancelAnimation(v);
  }, [playing, v, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.85 + v.value * 0.35 }],
    opacity: 0.12 + v.value * 0.22,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: accent,
        },
        style,
      ]}
    />
  );
}

function Orb({ accent, playing }: { accent: string; playing: boolean }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      v.value = withRepeat(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(v);
      v.value = withTiming(0.4, { duration: 800 });
    }
    return () => cancelAnimation(v);
  }, [playing, v]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + v.value * 0.3 }],
    opacity: 0.55 + v.value * 0.35,
  }));

  return (
    <Animated.View style={style}>
      <LinearGradient
        colors={[accent, 'rgba(255,255,255,0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.orb}
      />
    </Animated.View>
  );
}

function Particle({ index, playing }: { index: number; playing: boolean }) {
  const v = useSharedValue(0);
  const angle = (index / 8) * Math.PI * 2;
  const radius = 150;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  useEffect(() => {
    if (playing) {
      v.value = withDelay(
        index * 260,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 0 }),
          ),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(v);
      v.value = withTiming(0, { duration: 500 });
    }
    return () => cancelAnimation(v);
  }, [playing, v, index]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value * 0.7 * (1 - v.value),
    transform: [{ translateX: x * v.value }, { translateY: y * v.value }, { scale: 0.5 + v.value }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
        style,
      ]}
    />
  );
}

/* ---- Glass helpers ---- */

function GlassButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <BlurView intensity={30} tint="dark" style={styles.glassBtn}>
        {children}
      </BlurView>
    </Pressable>
  );
}

function GlassPill({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <BlurView intensity={30} tint="dark" style={styles.glassPill}>
        {children}
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#0A1014' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scene: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  orb: { width: 96, height: 96, borderRadius: 48 },
  controls: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlsInner: { padding: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginTop: 16,
  },
  trackFill: { height: 4, borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  glassPill: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
