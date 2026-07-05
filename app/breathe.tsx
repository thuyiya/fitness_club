import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

/**
 * Full-screen breathing session — a distraction-free space to focus on the
 * animation. A single soft orb expands and contracts on a smooth sine curve
 * with the chosen rhythm, wrapped in guide rings that breathe with it. Ambient
 * audio plays underneath. Opening this leaves the tab UI behind entirely.
 */

const OUT = 0.55;
const IN = 1;

type Phase = { label: string; seconds: number; scale: number };
type Pattern = { id: string; name: string; phases: Phase[] };

const PATTERNS: Pattern[] = [
  {
    id: 'box',
    name: 'Steady Square',
    phases: [
      { label: 'Breathe in', seconds: 4, scale: IN },
      { label: 'Hold', seconds: 4, scale: IN },
      { label: 'Breathe out', seconds: 4, scale: OUT },
      { label: 'Hold', seconds: 4, scale: OUT },
    ],
  },
  {
    id: 'calm478',
    name: 'Deep Calm',
    phases: [
      { label: 'Breathe in', seconds: 4, scale: IN },
      { label: 'Hold', seconds: 7, scale: IN },
      { label: 'Breathe out', seconds: 8, scale: OUT },
    ],
  },
  {
    id: 'release',
    name: 'Let Go',
    phases: [
      { label: 'Breathe in', seconds: 4, scale: IN },
      { label: 'Hold', seconds: 2, scale: IN },
      { label: 'Breathe out', seconds: 6, scale: OUT },
    ],
  },
  {
    id: 'balance',
    name: 'Even Balance',
    phases: [
      { label: 'Breathe in', seconds: 5, scale: IN },
      { label: 'Breathe out', seconds: 5, scale: OUT },
    ],
  },
];

const ORB = ['#4BA3A0', '#6C86D9', '#9385D0'] as const;
const ACCENT = '#6C86D9';

export default function Breathe() {
  const insets = useSafeAreaInsets();
  const { pattern: initialPattern } = useLocalSearchParams<{ pattern: string }>();
  const [patternId, setPatternId] = useState(initialPattern ?? PATTERNS[0].id);
  const pattern = PATTERNS.find((p) => p.id === patternId) ?? PATTERNS[0];

  const audio = useCalmAudio();
  const calmBed = useSettingsStore((s) => s.calmBed) as BedId;
  const addRound = useCalmStore((s) => s.addRound);

  const [running, setRunning] = useState(true);
  const [phaseLabel, setPhaseLabel] = useState('Breathe in');
  const [count, setCount] = useState(pattern.phases[0].seconds);
  const [rounds, setRounds] = useState(0);

  const breath = useSharedValue(OUT);
  const spin = useSharedValue(0);
  const idxRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  // Start the ambient bed on mount; slow continuous rotation for the guide dots.
  useEffect(() => {
    audio.startBed(calmBed);
    spin.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(spin);
      audio.stopBed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The breathing loop. Runs while `running`; resumes from the current phase.
  useEffect(() => {
    if (!running) {
      clearTimers();
      cancelAnimation(breath);
      return;
    }
    const phases = pattern.phases;

    const startPhase = (k: number) => {
      idxRef.current = k;
      const phase = phases[k];
      setPhaseLabel(phase.label);
      setCount(phase.seconds);
      // Smooth sine easing gives an organic, focus-friendly rise and fall.
      breath.value = withTiming(phase.scale, {
        duration: phase.seconds * 1000,
        easing: Easing.inOut(Easing.sin),
      });
      Haptics.selectionAsync().catch(() => {});

      let remaining = phase.seconds;
      intervalRef.current = setInterval(() => {
        remaining -= 1;
        setCount(Math.max(remaining, 0));
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const next = (k + 1) % phases.length;
        if (next === 0) {
          setRounds((r) => r + 1);
          addRound();
        }
        startPhase(next);
      }, phase.seconds * 1000);
    };

    startPhase(idxRef.current);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, patternId]);

  const selectRhythm = (id: string) => {
    if (id === patternId) return;
    Haptics.selectionAsync().catch(() => {});
    idxRef.current = 0;
    setPatternId(id);
    setRunning(true);
  };

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (running) audio.pauseBed();
    else audio.startBed(calmBed);
    setRunning((r) => !r);
  };

  const leave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * 1.28 }],
    opacity: 0.18 + (breath.value - OUT) * 0.5,
  }));
  const ringStyle = (mult: number, base: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      transform: [{ scale: breath.value * mult }],
      opacity: base,
    }));
  const ring1 = ringStyle(1.35, 0.28);
  const ring2 = ringStyle(1.7, 0.16);
  const ring3 = ringStyle(2.05, 0.09);
  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: breath.value * 1.9 }],
    opacity: 0.5,
  }));

  return (
    <View style={styles.fill}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0B1220', '#0E1526', '#0A0F1C']} style={StyleSheet.absoluteFill} />
      {/* Soft accent wash from the top */}
      <LinearGradient
        colors={[ACCENT + '33', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={leave} hitSlop={8}>
          <BlurView intensity={30} tint="dark" style={styles.glassBtn}>
            <ChevronDown size={24} color="#fff" />
          </BlurView>
        </Pressable>
        <BlurView intensity={30} tint="dark" style={styles.glassPill}>
          <Text variant="caption" style={{ color: '#fff', letterSpacing: 1 }}>
            {pattern.name.toUpperCase()}
          </Text>
        </BlurView>
        <View style={{ width: 48 }} />
      </View>

      {/* Center scene */}
      <View style={styles.center}>
        <View style={styles.scene} pointerEvents="none">
          <Animated.View style={[ring(300), { borderColor: ACCENT }, ring3]} />
          <Animated.View style={[ring(300), { borderColor: ACCENT }, ring2]} />
          <Animated.View style={[ring(300), { borderColor: ACCENT }, ring1]} />

          {/* Orbiting guide dots */}
          <Animated.View style={[styles.dots, dotsStyle]}>
            {[0, 90, 180, 270].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <View
                  key={deg}
                  style={[
                    styles.dot,
                    { transform: [{ translateX: Math.cos(rad) * 150 }, { translateY: Math.sin(rad) * 150 }] },
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Glow */}
          <Animated.View
            style={[
              { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: ORB[1] },
              glowStyle,
            ]}
          />

          {/* Orb */}
          <Animated.View style={orbStyle}>
            <LinearGradient colors={ORB as unknown as string[]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orb}>
              <Text variant="title2" style={{ color: '#fff', opacity: 0.97 }}>
                {phaseLabel}
              </Text>
              {count > 0 && (
                <Text variant="numberLarge" style={{ color: '#fff' }}>
                  {count}
                </Text>
              )}
            </LinearGradient>
          </Animated.View>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={{ alignItems: 'center', paddingBottom: insets.bottom + 28, gap: 16 }}>
        {/* Rhythm switcher */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 }}>
          {PATTERNS.map((p) => {
            const active = p.id === patternId;
            return (
              <Pressable key={p.id} onPress={() => selectRhythm(p.id)}>
                <BlurView intensity={active ? 0 : 24} tint="dark" style={styles.rhythmPill}>
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        borderRadius: 15,
                        backgroundColor: active ? ACCENT : 'transparent',
                      },
                    ]}
                  />
                  <Text
                    variant="caption"
                    style={{ color: '#fff', opacity: active ? 1 : 0.75, fontWeight: '600' }}
                  >
                    {p.name}
                  </Text>
                </BlurView>
              </Pressable>
            );
          })}
        </View>

        <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {rounds} {rounds === 1 ? 'round' : 'rounds'} · let each exhale be longer
        </Text>
        <Pressable onPress={toggle}>
          {({ pressed }) => (
            <LinearGradient
              colors={[ORB[1], ORB[2]]}
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

const ring = (size: number) => ({
  position: 'absolute' as const,
  width: size,
  height: size,
  borderRadius: size / 2,
  borderWidth: 1.5,
});

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
  dots: { position: 'absolute', width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' },
  orb: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
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
  rhythmPill: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  playBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
