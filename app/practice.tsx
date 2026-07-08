import React, { useEffect, useRef, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronDown, Pause, Play } from 'lucide-react-native';
import { Text } from '@/components';
import { useCalmAudio } from '@/lib/useCalmAudio';
import { useSettingsStore } from '@/store/settingsStore';
import { useCalmStore } from '@/store/calmStore';
import { BedId } from '@/lib/calmSounds';
import { practiceById } from '@/lib/practices';
import { pickPracticeImage, pickPracticeMusic } from '@/lib/practiceSounds';
import { prefetchAudio } from '@/lib/remoteAsset';
import {
  endNowPlaying,
  setNowPlayingHandlers,
  startNowPlaying,
  updateNowPlaying,
} from '@/lib/nowPlaying';

/**
 * Full-screen guided practice — Focus, Relax the Body, Loving-Kindness, Let Go.
 * A soft orb breathes on a slow, continuous rhythm while the guidance prompts
 * cycle underneath at their own pace. Distraction-free, with an ambient bed.
 */

const OUT = 0.62;
const IN = 1;

export default function Practice() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const practice = practiceById(id);
  const phases = practice.phases ?? [];
  const accent = practice.accent;

  const audio = useCalmAudio();
  const calmBed = useSettingsStore((s) => s.calmBed) as BedId;
  const addRound = useCalmStore((s) => s.addRound);

  // A random music variant for this practice, chosen once per session. Falls
  // back to the shared ambient bed if a practice has no dedicated music yet.
  const [track] = useState(() => pickPracticeMusic(practice.id));
  const [scene] = useState(() => pickPracticeImage(practice.id));
  const startMusic = () => (track ? audio.startTrack(track) : audio.startBed(calmBed));
  const resumeMusic = () => (track ? audio.resumeTrack() : audio.startBed(calmBed));

  // Download + cache this practice's music while the user reads the intro, so it
  // is saved on the device and plays instantly (and offline) on start.
  useEffect(() => {
    if (track) prefetchAudio(track);
  }, [track]);

  const [running, setRunning] = useState(true);
  const [label, setLabel] = useState(phases[0]?.label ?? '');
  const [cycles, setCycles] = useState(0);
  // A gentle 4-3-2-1 settle-in countdown before the guidance begins.
  const [countdown, setCountdown] = useState<number | null>(4);

  useEffect(() => {
    if (countdown === null) return;
    Haptics.selectionAsync().catch(() => {});
    const t = setTimeout(() => setCountdown((c) => (c && c > 1 ? c - 1 : null)), 1200);
    return () => clearTimeout(t);
  }, [countdown]);

  const breath = useSharedValue(OUT);
  const idxRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // So the Lock-Screen play/pause button always calls the latest toggle.
  const toggleRef = useRef<() => void>(() => {});

  const clearTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  };

  // Continuous slow orb breathing + ambient bed while the session is open.
  useEffect(() => {
    startMusic();
    startNowPlaying({
      title: practice.name,
      artist: practice.technique,
      artwork: scene,
      isPlaying: true,
    });
    setNowPlayingHandlers({ onToggle: () => toggleRef.current() });
    breath.value = withRepeat(
      withTiming(IN, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(breath);
      audio.stopBed();
      endNowPlaying();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance the guidance prompts on their own timers whenever running.
  useEffect(() => {
    if (!running || countdown !== null || phases.length === 0) {
      clearTimer();
      return;
    }
    const step = (k: number) => {
      idxRef.current = k;
      setLabel(phases[k].label);
      Haptics.selectionAsync().catch(() => {});
      timeoutRef.current = setTimeout(() => {
        const next = (k + 1) % phases.length;
        if (next === 0) {
          setCycles((c) => c + 1);
          addRound();
        }
        step(next);
      }, phases[k].seconds * 1000);
    };
    step(idxRef.current);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, countdown]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (running) {
      audio.pauseBed();
      cancelAnimation(breath);
    } else {
      resumeMusic();
      breath.value = withRepeat(
        withTiming(IN, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    setRunning((r) => !r);
    updateNowPlaying(!running);
  };
  toggleRef.current = toggle;

  const leave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * 1.28 }],
    opacity: 0.18 + (breath.value - OUT) * 0.5,
  }));

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      {scene ? (
        <ImageBackground source={scene} style={StyleSheet.absoluteFill} resizeMode="cover">
          {/* Darken for legibility and mood */}
          <LinearGradient
            colors={['rgba(10,15,28,0.45)', 'rgba(10,15,28,0.35)', 'rgba(10,15,28,0.8)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[accent + '33', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
          />
        </ImageBackground>
      ) : (
        <>
          <LinearGradient colors={['#0B1220', '#0E1526', '#0A0F1C']} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[accent + '33', 'transparent']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
          />
        </>
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={leave} hitSlop={8}>
          <BlurView intensity={30} tint="dark" style={styles.glassBtn}>
            <ChevronDown size={24} color="#fff" />
          </BlurView>
        </Pressable>
        <BlurView intensity={30} tint="dark" style={styles.glassPill}>
          <Text variant="caption" style={{ color: '#fff', letterSpacing: 1 }}>
            {practice.technique.toUpperCase()}
          </Text>
        </BlurView>
        <View style={{ width: 48 }} />
      </View>

      {/* Center orb with the current prompt */}
      <View style={styles.center}>
        <View style={styles.scene} pointerEvents="none">
          <Animated.View
            style={[
              { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: accent },
              glowStyle,
            ]}
          />
          <Animated.View style={orbStyle}>
            <LinearGradient
              colors={[accent, '#ffffff22']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.orb}
            >
              {countdown !== null ? (
                <>
                  <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Relax
                  </Text>
                  <Text variant="numberLarge" style={{ color: '#fff' }}>
                    {countdown}
                  </Text>
                </>
              ) : (
                <Text
                  variant="title3"
                  style={{ color: '#fff', opacity: 0.98, textAlign: 'center', lineHeight: 28 }}
                >
                  {label}
                </Text>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={{ alignItems: 'center', paddingBottom: insets.bottom + 28, gap: 18 }}>
        <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {countdown !== null
            ? 'Find a comfortable position…'
            : `${practice.name} · ${cycles} ${cycles === 1 ? 'round' : 'rounds'}`}
        </Text>
        <Pressable onPress={toggle}>
          {({ pressed }) => (
            <LinearGradient
              colors={[accent, '#ffffff40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.playBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              {running ? (
                <Pause size={30} color="#fff" fill="#fff" />
              ) : (
                <Play size={30} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
              )}
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#0A0F1C' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scene: { width: 320, height: 320, alignItems: 'center', justifyContent: 'center' },
  orb: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
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
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
